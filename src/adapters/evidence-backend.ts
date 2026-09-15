import type { WorldSnapshot } from '../core/model/world';
import type { DeterministicMetricsSnapshotV1 } from '../core/metrics/metrics';
import type { ParameterStoreSnapshot } from '../core/parameters/store';
import type { SimulationRunner } from '../core/runner/runner';
import type { EvidenceProvenanceV1, TraceSnapshotV1 } from '../core/trace/protocol';

export const EVIDENCE_BACKEND_ADAPTER_VERSION = 1 as const;

export interface SimulationEvidenceStateV1 {
  readonly scenarioId: string;
  readonly seed: number;
  readonly frame: number;
  readonly tick: number;
  readonly world: WorldSnapshot;
  readonly parameters: ParameterStoreSnapshot;
  readonly stateHash: string;
}

export interface SchedulerChunkStateV1 {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly state: 'active' | 'sleeping';
  readonly reason: string | null;
}

export interface SchedulerEvidenceStateV1 {
  readonly strategyId: string;
  readonly frame: number;
  readonly nextPhase: number;
  readonly tick: number;
  readonly phaseCount: number;
  readonly chunks: readonly SchedulerChunkStateV1[];
}

export interface BackendEvidenceSnapshotV1 {
  readonly version: typeof EVIDENCE_BACKEND_ADAPTER_VERSION;
  readonly provenance: EvidenceProvenanceV1;
  readonly simulation: SimulationEvidenceStateV1;
  readonly scheduler: SchedulerEvidenceStateV1;
  readonly trace: TraceSnapshotV1;
  readonly metrics: DeterministicMetricsSnapshotV1;
}

export interface EvidenceBackendV1 {
  readonly adapterVersion: typeof EVIDENCE_BACKEND_ADAPTER_VERSION;
  readEvidence(): BackendEvidenceSnapshotV1;
}

export class TeachingModelEvidenceBackendV1 implements EvidenceBackendV1 {
  public readonly adapterVersion = EVIDENCE_BACKEND_ADAPTER_VERSION;

  public constructor(private readonly runner: SimulationRunner) {}

  public readEvidence(): BackendEvidenceSnapshotV1 {
    const runner = this.runner.getSnapshot();
    const provenance = this.runner.getProvenance();

    return Object.freeze({
      version: EVIDENCE_BACKEND_ADAPTER_VERSION,
      provenance,
      simulation: Object.freeze({
        scenarioId: runner.scenarioId,
        seed: runner.seed,
        frame: runner.frame,
        tick: runner.tick,
        world: runner.world,
        parameters: runner.parameters,
        stateHash: this.runner.getStateHash(),
      }),
      scheduler: Object.freeze({
        strategyId: provenance.strategyId,
        frame: runner.frame,
        nextPhase: runner.phase,
        tick: runner.tick,
        phaseCount: runner.phaseCount,
        chunks: Object.freeze([]),
      }),
      trace: this.runner.getTraceSnapshot(),
      metrics: this.runner.getMetricsSnapshot(),
    });
  }
}
