import type { DeterministicMetricsSnapshotV1 } from '../core/metrics/metrics';
import type { WorldSnapshot } from '../core/model/world';
import type { ParameterStoreSnapshot } from '../core/parameters/store';
import type { SimulationRunner } from '../core/runner/runner';
import {
  TRACE_PROTOCOL_VERSION,
  type EvidenceProvenanceV1,
  type TraceRecordV1,
  type TraceSnapshotV1,
} from '../core/trace/protocol';

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

export interface BackendTraceWindowV1 {
  readonly version: typeof TRACE_PROTOCOL_VERSION;
  readonly provenance: EvidenceProvenanceV1;
  readonly retainedFirstSequence: number;
  readonly windowFirstSequence: number;
  readonly nextSequence: number;
  readonly droppedRecords: number;
  readonly retainedRecords: number;
  readonly records: readonly TraceRecordV1[];
}

export interface BackendPresentationEvidenceSnapshotV1 {
  readonly version: typeof EVIDENCE_BACKEND_ADAPTER_VERSION;
  readonly provenance: EvidenceProvenanceV1;
  readonly simulation: SimulationEvidenceStateV1;
  readonly scheduler: SchedulerEvidenceStateV1;
  readonly trace: BackendTraceWindowV1;
  readonly metrics: DeterministicMetricsSnapshotV1;
}

export interface EvidenceBackendV1 {
  readonly adapterVersion: typeof EVIDENCE_BACKEND_ADAPTER_VERSION;
  readEvidence(): BackendEvidenceSnapshotV1;
  readPresentationEvidence?(maxTraceRecords: number): BackendPresentationEvidenceSnapshotV1;
}

function simulationState(runner: SimulationRunner): SimulationEvidenceStateV1 {
  const snapshot = runner.getSnapshot();
  return Object.freeze({
    scenarioId: snapshot.scenarioId,
    seed: snapshot.seed,
    frame: snapshot.frame,
    tick: snapshot.tick,
    world: snapshot.world,
    parameters: snapshot.parameters,
    stateHash: runner.getStateHash(),
  });
}

function schedulerState(
  runner: SimulationRunner,
  provenance: EvidenceProvenanceV1,
): SchedulerEvidenceStateV1 {
  const snapshot = runner.getSnapshot();
  return Object.freeze({
    strategyId: provenance.strategyId,
    frame: snapshot.frame,
    nextPhase: snapshot.phase,
    tick: snapshot.tick,
    phaseCount: snapshot.phaseCount,
    chunks: Object.freeze([]),
  });
}

export class TeachingModelEvidenceBackendV1 implements EvidenceBackendV1 {
  public readonly adapterVersion = EVIDENCE_BACKEND_ADAPTER_VERSION;

  public constructor(private readonly runner: SimulationRunner) {}

  public readEvidence(): BackendEvidenceSnapshotV1 {
    const provenance = this.runner.getProvenance();

    return Object.freeze({
      version: EVIDENCE_BACKEND_ADAPTER_VERSION,
      provenance,
      simulation: simulationState(this.runner),
      scheduler: schedulerState(this.runner, provenance),
      trace: this.runner.getTraceSnapshot(),
      metrics: this.runner.getMetricsSnapshot(),
    });
  }

  public readPresentationEvidence(maxTraceRecords: number): BackendPresentationEvidenceSnapshotV1 {
    const provenance = this.runner.getProvenance();
    const trace = this.runner.getRecentTraceWindow(maxTraceRecords);

    return Object.freeze({
      version: EVIDENCE_BACKEND_ADAPTER_VERSION,
      provenance,
      simulation: simulationState(this.runner),
      scheduler: schedulerState(this.runner, provenance),
      trace: Object.freeze({
        version: TRACE_PROTOCOL_VERSION,
        provenance,
        retainedFirstSequence: trace.retainedFirstSequence,
        windowFirstSequence: trace.windowFirstSequence,
        nextSequence: trace.nextSequence,
        droppedRecords: trace.droppedRecords,
        retainedRecords: trace.retainedRecords,
        records: trace.records,
      }),
      metrics: this.runner.getMetricsSnapshot(),
    });
  }
}
