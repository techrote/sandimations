import type {
  BackendEvidenceSnapshotV1,
  BackendPresentationEvidenceSnapshotV1,
  EvidenceBackendV1,
  SchedulerEvidenceStateV1,
  SimulationEvidenceStateV1,
} from '../adapters/evidence-backend';
import type { DeterministicMetricsSnapshotV1 } from '../core/metrics/metrics';
import type { EvidenceProvenanceV1, TraceRecordV1 } from '../core/trace/protocol';

export const DEFAULT_PRESENTATION_TRACE_RECORDS = 512;

export interface PresentationTraceRetentionV1 {
  readonly retainedFirstSequence: number;
  readonly windowFirstSequence: number;
  readonly nextSequence: number;
  readonly droppedRecords: number;
  readonly retainedRecords: number;
}

export interface PresentationEvidenceViewModelV1 {
  readonly provenance: EvidenceProvenanceV1;
  readonly simulation: SimulationEvidenceStateV1;
  readonly scheduler: SchedulerEvidenceStateV1;
  readonly traceRecords: readonly TraceRecordV1[];
  readonly traceRetention: PresentationTraceRetentionV1;
  readonly metrics: DeterministicMetricsSnapshotV1;
}

function assertTraceLimit(limit: number): void {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new RangeError('Presentation trace limit must be a non-negative safe integer.');
  }
}

function adaptWindow(snapshot: BackendPresentationEvidenceSnapshotV1): PresentationEvidenceViewModelV1 {
  return Object.freeze({
    provenance: snapshot.provenance,
    simulation: snapshot.simulation,
    scheduler: snapshot.scheduler,
    traceRecords: snapshot.trace.records,
    traceRetention: Object.freeze({
      retainedFirstSequence: snapshot.trace.retainedFirstSequence,
      windowFirstSequence: snapshot.trace.windowFirstSequence,
      nextSequence: snapshot.trace.nextSequence,
      droppedRecords: snapshot.trace.droppedRecords,
      retainedRecords: snapshot.trace.retainedRecords,
    }),
    metrics: snapshot.metrics,
  });
}

function adaptFull(
  snapshot: BackendEvidenceSnapshotV1,
  maxTraceRecords: number,
): PresentationEvidenceViewModelV1 {
  const records = snapshot.trace.records.slice(-maxTraceRecords || snapshot.trace.records.length);
  const windowFirstSequence = records[0]?.sequence ?? snapshot.trace.nextSequence;

  return Object.freeze({
    provenance: snapshot.provenance,
    simulation: snapshot.simulation,
    scheduler: snapshot.scheduler,
    traceRecords: Object.freeze(records),
    traceRetention: Object.freeze({
      retainedFirstSequence: snapshot.trace.firstSequence,
      windowFirstSequence,
      nextSequence: snapshot.trace.nextSequence,
      droppedRecords: snapshot.trace.droppedRecords,
      retainedRecords: snapshot.trace.records.length,
    }),
    metrics: snapshot.metrics,
  });
}

export class PresentationEvidenceAdapterV1 {
  public constructor(private readonly backend: EvidenceBackendV1) {}

  public read(maxTraceRecords = DEFAULT_PRESENTATION_TRACE_RECORDS): PresentationEvidenceViewModelV1 {
    assertTraceLimit(maxTraceRecords);
    if (this.backend.readPresentationEvidence !== undefined) {
      return adaptWindow(this.backend.readPresentationEvidence(maxTraceRecords));
    }
    return adaptFull(this.backend.readEvidence(), maxTraceRecords);
  }
}
