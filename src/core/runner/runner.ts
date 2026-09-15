import { EvidenceRecorderV1 } from '../evidence/recorder';
import type { DeterministicMetricsSnapshotV1 } from '../metrics/metrics';
import {
  LogicalWorld,
  type SandStepObserver,
  type SandTieBreakMode,
  type WorldSnapshot,
} from '../model/world';
import { CoreParameterId, type ParameterValue } from '../parameters/definitions';
import { createCoreParameterRegistry, type ParameterRegistry } from '../parameters/registry';
import { ParameterStore, type ParameterStoreSnapshot } from '../parameters/store';
import { SeededPrng } from '../random/prng';
import { normalizeScenario, type CoreScenario, type ScenarioEventV1 } from '../scenario/schema';
import {
  createEvidenceProvenanceV1,
  type EvidenceProvenanceV1,
  type TraceContextV1,
  type TraceSnapshotV1,
} from '../trace/protocol';
import type { RecentTraceWindowV1 } from '../trace/sink';
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
  private readonly resetOverrides = new Map<string, ParameterValue>();
  private readonly evidence: EvidenceRecorderV1;
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
    this.evidence = new EvidenceRecorderV1(this.createProvenance());
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
    const pendingReset = this.parameters.getSnapshot().pendingReset;
    for (const mutation of pendingReset) {
      this.resetOverrides.set(mutation.parameterId, mutation.value);
    }
    this.rebuildParameters();
    this.rebuildDeterministicState();
  }

  public loadScenario(scenario: CoreScenario): void {
    this.scenario = normalizeScenario(scenario, this.registry);
    this.resetOverrides.clear();
    this.rebuildParameters();
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

  public getProvenance(): EvidenceProvenanceV1 {
    return this.createProvenance();
  }

  public getTraceSnapshot(): TraceSnapshotV1 {
    return this.evidence.getTraceSnapshot();
  }

  public getRecentTraceWindow(limit: number): RecentTraceWindowV1 {
    return this.evidence.getRecentTraceWindow(limit);
  }

  public getMetricsSnapshot(): DeterministicMetricsSnapshotV1 {
    return this.evidence.getMetricsSnapshot();
  }

  private createProvenance(): EvidenceProvenanceV1 {
    return createEvidenceProvenanceV1({
      backendId: 'sandimations-teaching-model-v1',
      backendKind: 'teaching-model',
      strategyId: this.scenario.scheduler.strategy,
      scenarioId: this.scenario.id,
    });
  }

  private rebuildParameters(): void {
    const values: Record<string, ParameterValue> = { ...this.scenario.parameters };
    for (const [id, value] of this.resetOverrides) {
      values[id] = value;
    }
    this.parameters = new ParameterStore(this.registry, values);
  }

  private rebuildDeterministicState(): void {
    this.world = new LogicalWorld(this.scenario.world);
    this.prng = new SeededPrng(this.getEffectiveSeed());
    this.frame = 0;
    this.phase = 0;
    this.tick = 0;
    this.eventCursor = 0;
    this.playing = false;
    this.evidence.reset(this.createProvenance());
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
    const context = this.currentTraceContext();
    this.applyScenarioEventsAtCurrentTick();
    this.parameters.applyNextStep();
    this.evidence.record(context, {
      type: 'phase-started',
      phaseCount: this.scenario.scheduler.phaseCount,
    });

    const completesFrame = this.phase + 1 >= this.scenario.scheduler.phaseCount;
    if (completesFrame && this.parameters.getBoolean(CoreParameterId.sandEnabled)) {
      this.world.stepSand(
        this.prng,
        tieBreakMode(this.parameters.getString(CoreParameterId.sandTieBreak)),
        this.createSandObserver(context),
      );
    }

    this.evidence.record(context, {
      type: 'phase-completed',
      phaseCount: this.scenario.scheduler.phaseCount,
    });

    this.tick += 1;
    this.phase += 1;
    if (this.phase >= this.scenario.scheduler.phaseCount) {
      this.phase = 0;
      this.frame += 1;
    }
  }

  private currentTraceContext(): TraceContextV1 {
    return Object.freeze({
      frame: this.frame,
      phase: this.phase,
      tick: this.tick,
    });
  }

  private createSandObserver(context: TraceContextV1): SandStepObserver {
    return {
      examined: (x, y, material) => {
        this.evidence.record(context, {
          type: 'cell-examined',
          cell: Object.freeze({ x, y }),
          material,
        });
      },
      skipped: (x, y, material, reason) => {
        this.evidence.record(context, {
          type: 'cell-skipped',
          cell: Object.freeze({ x, y }),
          material,
          reason,
        });
      },
      blocked: (x, y, material, reason) => {
        this.evidence.record(context, {
          type: 'cell-blocked',
          cell: Object.freeze({ x, y }),
          material,
          reason,
        });
      },
      moved: (fromX, fromY, toX, toY, material, reason) => {
        this.evidence.record(context, {
          type: 'cell-moved',
          from: Object.freeze({ x: fromX, y: fromY }),
          to: Object.freeze({ x: toX, y: toY }),
          material,
          reason,
        });
      },
    };
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
