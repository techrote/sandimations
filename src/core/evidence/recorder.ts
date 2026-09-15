import {
  TraceDerivedMetricsCollectorV1,
  type DeterministicMetricsSnapshotV1,
} from '../metrics/metrics';
import {
  type EvidenceProvenanceV1,
  type TraceContextV1,
  type TraceEventV1,
  type TraceRecordV1,
  type TraceSnapshotV1,
} from '../trace/protocol';
import { InMemoryTraceSinkV1 } from '../trace/sink';

export class EvidenceRecorderV1 {
  private readonly trace: InMemoryTraceSinkV1;
  private readonly metrics: TraceDerivedMetricsCollectorV1;

  public constructor(provenance: EvidenceProvenanceV1) {
    this.trace = new InMemoryTraceSinkV1(provenance);
    this.metrics = new TraceDerivedMetricsCollectorV1(provenance);
  }

  public reset(provenance: EvidenceProvenanceV1): void {
    this.trace.reset(provenance);
    this.metrics.reset(provenance);
  }

  public record(context: TraceContextV1, event: TraceEventV1): TraceRecordV1 {
    const record = this.trace.record(context, event);
    this.metrics.consume(record);
    return record;
  }

  public getTraceSnapshot(): TraceSnapshotV1 {
    return this.trace.getSnapshot();
  }

  public getMetricsSnapshot(): DeterministicMetricsSnapshotV1 {
    return this.metrics.getSnapshot();
  }
}
