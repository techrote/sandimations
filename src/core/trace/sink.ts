import {
  TRACE_PROTOCOL_VERSION,
  type EvidenceProvenanceV1,
  type TraceContextV1,
  type TraceEventV1,
  type TraceRecordV1,
  type TraceSnapshotV1,
} from './protocol';

export interface TraceSinkV1 {
  reset(provenance: EvidenceProvenanceV1): void;
  record(context: TraceContextV1, event: TraceEventV1): TraceRecordV1;
  getSnapshot(): TraceSnapshotV1;
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer.`);
  }
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }
  return Object.freeze(value);
}

export class InMemoryTraceSinkV1 implements TraceSinkV1 {
  private provenance: EvidenceProvenanceV1;
  private sequence = 0;
  private records: TraceRecordV1[] = [];

  public constructor(provenance: EvidenceProvenanceV1) {
    this.provenance = provenance;
  }

  public reset(provenance: EvidenceProvenanceV1): void {
    this.provenance = provenance;
    this.sequence = 0;
    this.records = [];
  }

  public record(context: TraceContextV1, event: TraceEventV1): TraceRecordV1 {
    assertNonNegativeInteger(context.frame, 'frame');
    assertNonNegativeInteger(context.phase, 'phase');
    assertNonNegativeInteger(context.tick, 'tick');

    const record = deepFreeze({
      sequence: this.sequence,
      frame: context.frame,
      phase: context.phase,
      tick: context.tick,
      ...event,
    }) as TraceRecordV1;
    this.sequence += 1;
    this.records.push(record);
    return record;
  }

  public getSnapshot(): TraceSnapshotV1 {
    return Object.freeze({
      version: TRACE_PROTOCOL_VERSION,
      provenance: this.provenance,
      records: Object.freeze([...this.records]),
    });
  }
}
