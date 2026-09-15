import type { Material } from '../model/material';

export const TRACE_PROTOCOL_VERSION = 1 as const;

export type EvidenceBackendKind = 'teaching-model' | 'recorded-trace' | 'wasm';

export interface EvidenceProvenanceV1 {
  readonly protocolVersion: typeof TRACE_PROTOCOL_VERSION;
  readonly backendId: string;
  readonly backendKind: EvidenceBackendKind;
  readonly strategyId: string;
  readonly scenarioId: string;
}

export interface TraceContextV1 {
  readonly frame: number;
  readonly phase: number;
  readonly tick: number;
}

export interface CellRefV1 {
  readonly x: number;
  readonly y: number;
}

export interface ChunkRefV1 {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface PhaseStartedEventV1 {
  readonly type: 'phase-started';
  readonly phaseCount: number;
}

export interface PhaseCompletedEventV1 {
  readonly type: 'phase-completed';
  readonly phaseCount: number;
}

export interface CellExaminedEventV1 {
  readonly type: 'cell-examined';
  readonly cell: CellRefV1;
  readonly material: Material;
}

export interface CellMovedEventV1 {
  readonly type: 'cell-moved';
  readonly from: CellRefV1;
  readonly to: CellRefV1;
  readonly material: Material;
  readonly reason: string;
}

export interface CellSkippedEventV1 {
  readonly type: 'cell-skipped';
  readonly cell: CellRefV1;
  readonly material: Material;
  readonly reason: string;
}

export interface CellBlockedEventV1 {
  readonly type: 'cell-blocked';
  readonly cell: CellRefV1;
  readonly material: Material;
  readonly reason: string;
}

export interface ChunkActivatedEventV1 {
  readonly type: 'chunk-activated';
  readonly chunk: ChunkRefV1;
  readonly reason: string;
}

export interface ChunkSleptEventV1 {
  readonly type: 'chunk-slept';
  readonly chunk: ChunkRefV1;
  readonly reason: string;
}

export interface ChunkWokenEventV1 {
  readonly type: 'chunk-woken';
  readonly chunk: ChunkRefV1;
  readonly reason: string;
}

export type TraceEventV1 =
  | PhaseStartedEventV1
  | PhaseCompletedEventV1
  | CellExaminedEventV1
  | CellMovedEventV1
  | CellSkippedEventV1
  | CellBlockedEventV1
  | ChunkActivatedEventV1
  | ChunkSleptEventV1
  | ChunkWokenEventV1;

export type TraceRecordV1 = Readonly<
  TraceContextV1 &
    TraceEventV1 & {
      readonly sequence: number;
    }
>;

export interface TraceSnapshotV1 {
  readonly version: typeof TRACE_PROTOCOL_VERSION;
  readonly provenance: EvidenceProvenanceV1;
  readonly firstSequence: number;
  readonly nextSequence: number;
  readonly droppedRecords: number;
  readonly records: readonly TraceRecordV1[];
}

function requireStableIdentifier(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new RangeError(`${label} must not be empty.`);
  }
  return normalized;
}

export function createEvidenceProvenanceV1(
  source: Omit<EvidenceProvenanceV1, 'protocolVersion'>,
): EvidenceProvenanceV1 {
  return Object.freeze({
    protocolVersion: TRACE_PROTOCOL_VERSION,
    backendId: requireStableIdentifier(source.backendId, 'backendId'),
    backendKind: source.backendKind,
    strategyId: requireStableIdentifier(source.strategyId, 'strategyId'),
    scenarioId: requireStableIdentifier(source.scenarioId, 'scenarioId'),
  });
}
