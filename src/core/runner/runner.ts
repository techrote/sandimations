import { LogicalWorld, type SandTieBreakMode, type WorldSnapshot } from '../model/world';
import {
  CoreParameterId,
  type ParameterValue,
} from '../parameters/definitions';
import { createCoreParameterRegistry, type ParameterRegistry } from '../parameters/registry';
import { ParameterStore, type ParameterStoreSnapshot } from '../parameters/store';
import { SeededPrng } from '../random/prng';
import { normalizeScenario, type CoreScenario, type ScenarioEventV1 } from '../scenario/schema';
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
  readonly parameters: ParameterStoreSnapshot;
  readonly playing: boolean;
  readonly playbackRate: number;
}

function tieBreakMode(value: string): SandTieBreakMode {
  if (value === 'seeded-random' || value === 'left-first' || value === 'right-first') {
    return value;
  }
  throw new Error(`Unsupported sand tie-break mode: ${value}.`);
}

export class SimulationRunner {
  private scenario: CoreScenario;
  private world: LogicalWorld;
  private prng: SeededPrng;
  private parameters: ParameterStore;
  private frame = 0;
  private phase = 0;
  private tick = 0;
  private eventCursor = 0;
  private playing = false;
  private playbackRate = 1;

  public constructor(
    scenario: CoreScenario,
    private readonly registry: ParameterRegistry = createCoreParameterRegistry(),
  ) {
    this.scenario = normalizeScenario(scenario, this.registry);
    this.parameters = new ParameterStore(this.registry, this.scenario.parameters);
    this.world = new LogicalWorld(this.scenario.world);
    this.prng = new SeededPrng(this.getEffectiveSeed());
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

  public requestParameterMutation(id: string, value: unknown): void {
    this.parameters.requestMutation(id, value);
  }

  public getParameterValue(id: string): ParameterValue {
    return this.parameters.get(id);
  }

  public reset(): void {
    this.parameters.applyResetRequired();
    this.rebuildDeterministicState();
  }

  public loadScenario(scenario: CoreScenario): void {
    this.scenario = normalizeScenario(scenario, this.registry);
    this.parameters = new ParameterStore(this.registry, this.scenario.parameters);
    this.rebuildDeterministicState();
  }

  public getSnapshot(): RunnerSnapshot {
    return Object.freeze({
      scenarioId: this.scenario.id,
      seed: this.scenario.seed,
      frame: this.frame,
      phase: this.phase,
      tick: this.tick,
      phaseCount: this.scenario.scheduler.phaseCount,
      prngState: this.prng.getState(),
      world: this.world.toSnapshot(),
      parameters: this.parameters.getSnapshot(),
      playing: this.playing,
      playbackRate: this.playbackRate,
    });
  }

  public getStateHash(): string {
    return hashDeterministicState(this.getSnapshot());
  }

  private rebuildDeterministicState(): void {
    this.world = new LogicalWorld(this.scenario.world);
    this.prng = new SeededPrng(this.getEffectiveSeed());
    this.frame = 0;
    this.phase = 0;
    this.tick = 0;
    this.eventCursor = 0;
    this.playing = false;
  }

  private getEffectiveSeed(): number {
    const variant = this.parameters.getNumber(CoreParameterId.seedVariant) >>> 0;
    return (this.scenario.seed ^ variant) >>> 0;
  }

  private advanceToNextFrame(): void {
    const targetFrame = this.frame + 1;
    while (this.frame < targetFrame) {
      this.advanceOnePhase();
    }
  }

  private advanceOnePhase(): void {
    this.applyScenarioEventsAtCurrentTick();
    this.parameters.applyNextStep();
    this.tick += 1;
    this.phase += 1;

    if (this.phase >= this.scenario.scheduler.phaseCount) {
      this.phase = 0;
      if (this.parameters.getBoolean(CoreParameterId.sandEnabled)) {
        this.world.stepSand(
          this.prng,
          tieBreakMode(this.parameters.getString(CoreParameterId.sandTieBreak)),
        );
      }
      this.frame += 1;
    }
  }

  private applyScenarioEventsAtCurrentTick(): void {
    while (this.eventCursor < this.scenario.events.length) {
      const event = this.scenario.events[this.eventCursor];
      if (event === undefined || event.tick !== this.tick) {
        break;
      }
      this.applyScenarioEvent(event);
      this.eventCursor += 1;
    }
  }

  private applyScenarioEvent(event: ScenarioEventV1): void {
    if (event.type === 'input') {
      this.applyInput(event.input);
      return;
    }
    this.parameters.requestMutation(event.parameterId, event.value);
  }
}
