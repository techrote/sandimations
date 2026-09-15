import type {
  BackendEvidenceSnapshotV1,
  EvidenceBackendV1,
  SchedulerEvidenceStateV1,
  SimulationEvidenceStateV1,
} from '../adapters/evidence-backend';
import type { DeterministicMetricsSnapshotV1 } from '../core/metrics/metrics';
import type { EvidenceProvenanceV1, TraceRecordV1 } from '../core/trace/protocol';

export interface PresentationEvidenceViewModelV1 {
  readonly provenance: EvidenceProvenanceV1;
  readonly simulation: SimulationEvidenceStateV1;
  readonly scheduler: SchedulerEvidenceStateV1;
  readonly traceRecords: readonly TraceRecordV1[];
  readonly metrics: DeterministicMetricsSnapshotV1;
}

function adaptSnapshot(snapshot: BackendEvidenceSnapshotV1): PresentationEvidenceViewModelV1 {
  return Object.freeze({
    provenance: snapshot.provenance,
    simulation: snapshot.simulation,
    scheduler: snapshot.scheduler,
    traceRecords: snapshot.trace.records,
    metrics: snapshot.metrics,
  });
}

export class PresentationEvidenceAdapterV1 {
  public constructor(private readonly backend: EvidenceBackendV1) {}

  public read(): PresentationEvidenceViewModelV1 {
    return adaptSnapshot(this.backend.readEvidence());
  }
}
