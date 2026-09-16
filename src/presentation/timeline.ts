import type { TraceRecordV1 } from '../core/trace/protocol';

export interface TimelinePhaseEntry {
  readonly tick: number;
  readonly frame: number;
  readonly phase: number;
  readonly phaseCount: number | null;
  readonly firstSequence: number;
  readonly lastSequence: number;
  readonly recordCount: number;
  readonly examined: number;
  readonly moved: number;
  readonly blocked: number;
  readonly skipped: number;
  readonly selectedCount: number | null;
  readonly activeCount: number | null;
  readonly chunkTransitions: number;
  readonly eventTypes: readonly string[];
}

interface MutableEntry {
  tick: number;
  frame: number;
  phase: number;
  phaseCount: number | null;
  firstSequence: number;
  lastSequence: number;
  recordCount: number;
  examined: number;
  moved: number;
  blocked: number;
  skipped: number;
  selectedCount: number | null;
  activeCount: number | null;
  chunkTransitions: number;
  eventTypes: string[];
}

function updateEntry(entry: MutableEntry, record: TraceRecordV1): void {
  entry.lastSequence = record.sequence;
  entry.recordCount += 1;
  if (!entry.eventTypes.includes(record.type)) entry.eventTypes.push(record.type);

  switch (record.type) {
    case 'phase-started':
    case 'phase-completed':
      entry.phaseCount = record.phaseCount;
      break;
    case 'phase-selection':
      entry.phaseCount = record.phaseCount;
      entry.selectedCount = record.selectedCount;
      entry.activeCount = record.activeCount;
      break;
    case 'cell-examined':
      entry.examined += 1;
      break;
    case 'cell-moved':
      entry.moved += 1;
      break;
    case 'cell-blocked':
      entry.blocked += 1;
      break;
    case 'cell-skipped':
      entry.skipped += 1;
      break;
    case 'chunk-activated':
    case 'chunk-slept':
    case 'chunk-woken':
      entry.chunkTransitions += 1;
      break;
  }
}

function freezeEntry(entry: MutableEntry): TimelinePhaseEntry {
  return Object.freeze({
    ...entry,
    eventTypes: Object.freeze([...entry.eventTypes]),
  });
}

export function buildTimelinePhaseEntries(
  records: readonly TraceRecordV1[],
  recordLimit: number,
): readonly TimelinePhaseEntry[] {
  if (!Number.isSafeInteger(recordLimit) || recordLimit < 1) {
    throw new RangeError('Timeline record limit must be a positive safe integer.');
  }

  const bounded = records.slice(Math.max(0, records.length - recordLimit));
  const byTick = new Map<number, MutableEntry>();
  for (const record of bounded) {
    let entry = byTick.get(record.tick);
    if (entry === undefined) {
      entry = {
        tick: record.tick,
        frame: record.frame,
        phase: record.phase,
        phaseCount: null,
        firstSequence: record.sequence,
        lastSequence: record.sequence,
        recordCount: 0,
        examined: 0,
        moved: 0,
        blocked: 0,
        skipped: 0,
        selectedCount: null,
        activeCount: null,
        chunkTransitions: 0,
        eventTypes: [],
      };
      byTick.set(record.tick, entry);
    }
    updateEntry(entry, record);
  }

  return Object.freeze([...byTick.values()].map(freezeEntry));
}

export function describeTimelineEntry(entry: TimelinePhaseEntry): string {
  const phase =
    entry.phaseCount === null ? `phase ${entry.phase + 1}` : `phase ${entry.phase + 1}/${entry.phaseCount}`;
  const selection =
    entry.selectedCount === null || entry.activeCount === null
      ? ''
      : ` · selected ${entry.selectedCount}/${entry.activeCount}`;
  return `frame ${entry.frame} · ${phase} · tick ${entry.tick}${selection} · ${entry.recordCount} records`;
}
