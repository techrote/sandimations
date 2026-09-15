import { LogicalWorld, type WorldSnapshot } from '../model/world';
import { SeededPrng } from '../random/prng';
import type { CoreScenario } from '../scenario/scenario';
import type { RunnerInput } from './input';
import { hashDeterministicState } from './state-hash';

export interface RunnerSnapshot {
  readonly scenarioId: string;
  readonly seed: number;
  readonly frame: number;
  readonly phase: number;
  readonly tick: number;
  readonly phaseCount: number;
  readonly prngState: number;
  readonly world: WorldSnapshot;
  readonly playing: boolean;
  readonly playbackRate: number;
}

function copyScenario(scenario: CoreScenario): CoreScenario {
  if (scenario.id.trim().length === 0) {
    throw new RangeError('Scenario id must not be empty.');
  }
  if (!Number.isInteger(scenario.phaseCount) || scenario.phaseCount < 1) {
    throw new RangeError('Scenario phaseCount must be a positive integer.');
  }

  const world = new LogicalWorld(scenario.world).toSnapshot();
  return Object.freeze({
    id: scenario.id,
    seed: scenario.seed >>> 0,
    phaseCount: scenario.phaseCount,
    world,
  });
}

export class SimulationRunner {
  private scenario: CoreScenario;
  private world: LogicalWorld;
  private prng: SeededPrng;
  private frame = 0;
  private phase = 0;
  private tick = 0;
  private playing = false;
  private playbackRate = 1;

  public constructor(scenario: CoreScenario) {
    this.scenario = copyScenario(scenario);
    this.world = new LogicalWorld(this.scenario.world);
    this.prng = new SeededPrng(this.scenario.seed);
  }

  public play(): void {
    this.playing = true;
  }

  public pause(): void {
    this.playing = false;
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  public setPlaybackRate(rate: number): void {
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new RangeError('Playback rate must be a finite positive number.');
    }
    this.playbackRate = rate;
  }

  public getPlaybackRate(): number {
    return this.playbackRate;
  }

  public stepPhase(): void {
    this.pause();
    this.advanceOnePhase();
  }

  public stepFrame(): void {
    this.pause();
    this.advanceToNextFrame();
  }

  public stepFrames(count: number): void {
    if (!Number.isInteger(count) || count < 0) {
      throw new RangeError('Frame count must be a non-negative integer.');
    }

    this.pause();
    for (let index = 0; index < count; index += 1) {
      this.advanceToNextFrame();
    }
  }

  public advancePlaybackFrame(): boolean {
    if (!this.playing) {
      return false;
    }
    this.advanceToNextFrame();
    return true;
  }

  public applyInput(input: RunnerInput): void {
    if (input.type === 'set-cell') {
      this.world.set(input.x, input.y, input.material);
    }
  }

  public reset(): void {
    this.world = new LogicalWorld(this.scenario.world);
    this.prng = new SeededPrng(this.scenario.seed);
    this.frame = 0;
    this.phase = 0;
    this.tick = 0;
    this.playing = false;
  }

  public loadScenario(scenario: CoreScenario): void {
    this.scenario = copyScenario(scenario);
    this.reset();
  }

  public getSnapshot(): RunnerSnapshot {
    return Object.freeze({
      scenarioId: this.scenario.id,
      seed: this.scenario.seed,
      frame: this.frame,
      phase: this.phase,
      tick: this.tick,
      phaseCount: this.scenario.phaseCount,
      prngState: this.prng.getState(),
      world: this.world.toSnapshot(),
      playing: this.playing,
      playbackRate: this.playbackRate,
    });
  }

  public getStateHash(): string {
    return hashDeterministicState(this.getSnapshot());
  }

  private advanceToNextFrame(): void {
    const targetFrame = this.frame + 1;
    while (this.frame < targetFrame) {
      this.advanceOnePhase();
    }
  }

  private advanceOnePhase(): void {
    this.tick += 1;
    this.phase += 1;

    if (this.phase >= this.scenario.phaseCount) {
      this.phase = 0;
      this.world.stepSand(this.prng);
      this.frame += 1;
    }
  }
}
