import {
  TRACE_PROTOCOL_VERSION,
  type EvidenceProvenanceV1,
  type TraceContextV1,
  type TraceEventV1,
  type TraceRecordV1,
  type TraceSnapshotV1,
} from './protocol';

export const DEFAULT_TRACE_CAPACITY = 16_384;

export interface RecentTraceWindowV1 {
  readonly retainedFirstSequence: number;
  readonly windowFirstSequence: number;
  readonly nextSequence: number;
  readonly droppedRecords: number;
  readonly retainedRecords: number;
  readonly records: readonly TraceRecordV1[];
}

export interface TraceSinkV1 {
  reset(provenance: EvidenceProvenanceV1): void;
  record(context: TraceContextV1, event: TraceEventV1): TraceRecordV1;
  getSnapshot(): TraceSnapshotV1;
  getRecentWindow(limit: number): RecentTraceWindowV1;
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer.`);
  }
}

function assertCapacity(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError('Trace capacity must be a positive safe integer.');
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
  private retained = 0;
  private writeIndex = 0;
  private droppedRecords = 0;
  private records: Array<TraceRecordV1 | undefined>;

  public constructor(
    provenance: EvidenceProvenanceV1,
    private readonly capacity: number = DEFAULT_TRACE_CAPACITY,
  ) {
    assertCapacity(capacity);
    this.provenance = provenance;
    this.records = new Array<TraceRecordV1 | undefined>(capacity);
  }

  public reset(provenance: EvidenceProvenanceV1): void {
    this.provenance = provenance;
    this.sequence = 0;
    this.retained = 0;
    this.writeIndex = 0;
    this.droppedRecords = 0;
    this.records = new Array<TraceRecordV1 | undefined>(this.capacity);
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

    if (this.retained === this.capacity) {
      this.droppedRecords += 1;
    } else {
      this.retained += 1;
    }
    this.records[this.writeIndex] = record;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    return record;
  }

  public getSnapshot(): TraceSnapshotV1 {
    const retainedRecords = this.readChronologicalWindow(0, this.retained);
    const firstSequence = retainedRecords[0]?.sequence ?? this.sequence;
    return Object.freeze({
      version: TRACE_PROTOCOL_VERSION,
      provenance: this.provenance,
      firstSequence,
      nextSequence: this.sequence,
      droppedRecords: this.droppedRecords,
      records: Object.freeze(retainedRecords),
    });
  }

  public getRecentWindow(limit: number): RecentTraceWindowV1 {
    assertNonNegativeInteger(limit, 'Trace window limit');
    const count = Math.min(limit, this.retained);
    const offset = this.retained - count;
    const records = this.readChronologicalWindow(offset, count);
    const retainedFirstSequence = this.sequence - this.retained;
    const windowFirstSequence = records[0]?.sequence ?? this.sequence;

    return Object.freeze({
      retainedFirstSequence,
      windowFirstSequence,
      nextSequence: this.sequence,
      droppedRecords: this.droppedRecords,
      retainedRecords: this.retained,
      records: Object.freeze(records),
    });
  }

  private readChronologicalWindow(offset: number, count: number): TraceRecordV1[] {
    const output: TraceRecordV1[] = [];
    const retainedStart = this.retained === this.capacity ? this.writeIndex : 0;

    for (let index = 0; index < count; index += 1) {
      const recordIndex = (retainedStart + offset + index) % this.capacity;
      const record = this.records[recordIndex];
      if (record === undefined) {
        throw new Error('Trace ring buffer contains an unexpected empty slot.');
      }
      output.push(record);
    }
    return output;
  }
}
