import type { DeterministicMetricsSnapshotV1 } from '../metrics/metrics';
import type { WorldSnapshot } from '../model/world';
import { createCoreParameterRegistry, type ParameterRegistry } from '../parameters/registry';
import { SimulationRunner } from '../runner/runner';
import type { RunnerInput } from '../runner/input';
import { normalizeScenario, type CoreScenario } from '../scenario/schema';
import type { EvidenceProvenanceV1 } from '../trace/protocol';

export const COMPARISON_SCHEMA_VERSION = 1 as const;
export const MATERIAL_DIVERGENCE_METRIC_ID = 'cell-material-hamming-v1' as const;
export const FULL_SCAN_REFERENCE_STRATEGY = 'phase-clock-v1' as const;

export type ComparisonRoleV1 = 'baseline' | 'optimized';

export interface ComparisonSideMetricsV1 {
  readonly role: ComparisonRoleV1;
  readonly provenance: EvidenceProvenanceV1;
  readonly frame: number;
  readonly phase: number;
  readonly tick: number;
  readonly phaseCount: number;
  readonly metrics: DeterministicMetricsSnapshotV1;
}

export interface WorkRatioV1 {
  readonly baselineWorkUnits: number;
  readonly optimizedWorkUnits: number;
  readonly optimizedToBaseline: number | null;
  readonly reductionFraction: number | null;
}

export interface MaterialStateDivergenceV1 {
  readonly metricId: typeof MATERIAL_DIVERGENCE_METRIC_ID;
  readonly mismatchedCells: number;
  readonly totalCells: number;
  readonly normalized: number;
}

export interface ProvenancedMaterialStateDivergenceV1 extends MaterialStateDivergenceV1 {
  readonly baselineProvenance: EvidenceProvenanceV1;
  readonly optimizedProvenance: EvidenceProvenanceV1;
}

export interface ComparisonSnapshotV1 {
  readonly version: typeof COMPARISON_SCHEMA_VERSION;
  readonly scenarioId: string;
  readonly baseline: ComparisonSideMetricsV1;
  readonly optimized: ComparisonSideMetricsV1;
  readonly workRatio: WorkRatioV1;
  readonly divergence: ProvenancedMaterialStateDivergenceV1;
}

export function createFullScanReferenceScenario(source: CoreScenario): CoreScenario {
  return normalizeScenario({
    ...source,
    scheduler: { strategy: FULL_SCAN_REFERENCE_STRATEGY, phaseCount: 1 },
    presentation: {
      ...source.presentation,
      notes:
        'SD-008 baseline role: one deterministic full interior scan for every comparison scheduler tick. This is a work reference, not a wall-clock speed or physical-equivalence claim.',
    },
  });
}

export function measureMaterialStateDivergence(
  baseline: WorldSnapshot,
  optimized: WorldSnapshot,
): MaterialStateDivergenceV1 {
  if (baseline.width !== optimized.width || baseline.height !== optimized.height) {
    throw new RangeError('Material divergence requires worlds with identical dimensions.');
  }
  if (baseline.cells.length !== optimized.cells.length) {
    throw new RangeError('Material divergence requires worlds with identical cell counts.');
  }

  let mismatchedCells = 0;
  for (let index = 0; index < baseline.cells.length; index += 1) {
    if (baseline.cells[index] !== optimized.cells[index]) mismatchedCells += 1;
  }

  return Object.freeze({
    metricId: MATERIAL_DIVERGENCE_METRIC_ID,
    mismatchedCells,
    totalCells: baseline.cells.length,
    normalized: baseline.cells.length === 0 ? 0 : mismatchedCells / baseline.cells.length,
  });
}

function sideMetrics(
  role: ComparisonRoleV1,
  runner: SimulationRunner,
  comparisonClock: Readonly<{ frame: number; phase: number; tick: number; phaseCount: number }>,
): ComparisonSideMetricsV1 {
  return Object.freeze({
    role,
    provenance: runner.getProvenance(),
    ...comparisonClock,
    metrics: runner.getMetricsSnapshot(),
  });
}

function workRatio(
  baseline: DeterministicMetricsSnapshotV1,
  optimized: DeterministicMetricsSnapshotV1,
): WorkRatioV1 {
  const baselineWorkUnits = baseline.work.total;
  const optimizedWorkUnits = optimized.work.total;
  if (baselineWorkUnits === 0) {
    return Object.freeze({
      baselineWorkUnits,
      optimizedWorkUnits,
      optimizedToBaseline: null,
      reductionFraction: null,
    });
  }
  return Object.freeze({
    baselineWorkUnits,
    optimizedWorkUnits,
    optimizedToBaseline: optimizedWorkUnits / baselineWorkUnits,
    reductionFraction: (baselineWorkUnits - optimizedWorkUnits) / baselineWorkUnits,
  });
}

export class DeterministicComparison {
  private readonly scenario: CoreScenario;
  private readonly baseline: SimulationRunner;
  private readonly optimized: SimulationRunner;

  public constructor(
    scenario: CoreScenario,
    private readonly registry: ParameterRegistry = createCoreParameterRegistry(),
  ) {
    this.scenario = normalizeScenario(scenario, registry);
    if (
      this.scenario.scheduler.strategy !== 'chunk-sleep-wake-v1' &&
      this.scenario.scheduler.strategy !== 'phased-sampling-v1'
    ) {
      throw new Error(
        'SD-008 comparison requires a chunk-sleep-wake-v1 or phased-sampling-v1 optimized scenario.',
      );
    }
    this.baseline = new SimulationRunner(createFullScanReferenceScenario(this.scenario), registry);
    this.optimized = new SimulationRunner(this.scenario, registry);
    this.setPlaybackRate(this.scenario.presentation.defaultPlaybackRate);
    this.assertSynchronizedTick();
  }

  public getBaselineRunner(): SimulationRunner {
    return this.baseline;
  }

  public getOptimizedRunner(): SimulationRunner {
    return this.optimized;
  }

  public play(): void {
    this.baseline.play();
    this.optimized.play();
  }

  public pause(): void {
    this.baseline.pause();
    this.optimized.pause();
  }

  public isPlaying(): boolean {
    const baselinePlaying = this.baseline.isPlaying();
    const optimizedPlaying = this.optimized.isPlaying();
    if (baselinePlaying !== optimizedPlaying) {
      throw new Error('Comparison runners have divergent play/pause state.');
    }
    return optimizedPlaying;
  }

  public setPlaybackRate(rate: number): void {
    this.baseline.setPlaybackRate(rate);
    this.optimized.setPlaybackRate(rate);
  }

  public getPlaybackRate(): number {
    const baselineRate = this.baseline.getPlaybackRate();
    const optimizedRate = this.optimized.getPlaybackRate();
    if (baselineRate !== optimizedRate) {
      throw new Error('Comparison runners have divergent playback rates.');
    }
    return optimizedRate;
  }

  public stepPhase(): void {
    this.pause();
    this.advanceOneComparisonTick(false);
  }

  public stepFrame(): void {
    this.pause();
    const targetFrame = this.optimized.getSnapshot().frame + 1;
    while (this.optimized.getSnapshot().frame < targetFrame) this.advanceOneComparisonTick(false);
  }

  public stepFrames(count: number): void {
    if (!Number.isInteger(count) || count < 0) {
      throw new RangeError('Frame count must be a non-negative integer.');
    }
    this.pause();
    for (let index = 0; index < count; index += 1) {
      const targetFrame = this.optimized.getSnapshot().frame + 1;
      while (this.optimized.getSnapshot().frame < targetFrame) this.advanceOneComparisonTick(false);
    }
  }

  public advancePlaybackPhase(): boolean {
    if (!this.isPlaying()) return false;
    this.advanceOneComparisonTick(true);
    return true;
  }

  public applyInput(input: RunnerInput): void {
    this.baseline.applyInput(input);
    this.optimized.applyInput(input);
  }

  public requestParameterMutation(id: string, value: unknown): void {
    this.registry.validate(id, value);
    this.baseline.requestParameterMutation(id, value);
    this.optimized.requestParameterMutation(id, value);
  }

  public reset(): void {
    const rate = this.getPlaybackRate();
    this.baseline.reset();
    this.optimized.reset();
    this.setPlaybackRate(rate);
    this.assertSynchronizedTick();
  }

  public getSnapshot(): ComparisonSnapshotV1 {
    this.assertSynchronizedTick();
    const clock = this.optimized.getSnapshot();
    const comparisonClock = Object.freeze({
      frame: clock.frame,
      phase: clock.phase,
      tick: clock.tick,
      phaseCount: clock.phaseCount,
    });
    const baselineSide = sideMetrics('baseline', this.baseline, comparisonClock);
    const optimizedSide = sideMetrics('optimized', this.optimized, comparisonClock);
    const measured = measureMaterialStateDivergence(
      this.baseline.getSnapshot().world,
      this.optimized.getSnapshot().world,
    );
    return Object.freeze({
      version: COMPARISON_SCHEMA_VERSION,
      scenarioId: this.scenario.id,
      baseline: baselineSide,
      optimized: optimizedSide,
      workRatio: workRatio(baselineSide.metrics, optimizedSide.metrics),
      divergence: Object.freeze({
        ...measured,
        baselineProvenance: baselineSide.provenance,
        optimizedProvenance: optimizedSide.provenance,
      }),
    });
  }

  private advanceOneComparisonTick(playback: boolean): void {
    if (playback) {
      const baselineAdvanced = this.baseline.advancePlaybackFrame();
      const optimizedAdvanced = this.optimized.advancePlaybackPhase();
      if (!baselineAdvanced || !optimizedAdvanced) {
        throw new Error('Comparison runners did not advance playback together.');
      }
    } else {
      this.baseline.stepFrame();
      this.optimized.stepPhase();
    }
    this.assertSynchronizedTick();
  }

  private assertSynchronizedTick(): void {
    const baselineTick = this.baseline.getSnapshot().tick;
    const optimizedTick = this.optimized.getSnapshot().tick;
    if (baselineTick !== optimizedTick) {
      throw new Error(
        `Comparison runner ticks diverged: baseline ${baselineTick}, optimized ${optimizedTick}.`,
      );
    }
  }
}
