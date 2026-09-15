import type { EvidenceProvenanceV1, TraceRecordV1 } from '../trace/protocol';

export const METRICS_SCHEMA_VERSION = 1 as const;

export interface CellMetricsV1 {
  readonly examined: number;
  readonly moved: number;
  readonly skipped: number;
  readonly blocked: number;
}

export interface ChunkMetricsV1 {
  readonly active: number;
  readonly sleeping: number;
  readonly activated: number;
  readonly slept: number;
  readonly woken: number;
}

export interface PhaseProgressMetricsV1 {
  readonly started: number;
  readonly completed: number;
  readonly lastCompleted: Readonly<{
    frame: number;
    phase: number;
    tick: number;
  }> | null;
}

export interface WorkMetricsV1 {
  readonly cellEvaluations: number;
  readonly schedulerTransitions: number;
  readonly total: number;
}

export interface DeterministicMetricsSnapshotV1 {
  readonly version: typeof METRICS_SCHEMA_VERSION;
  readonly provenance: EvidenceProvenanceV1;
  readonly cells: CellMetricsV1;
  readonly chunks: ChunkMetricsV1;
  readonly phases: PhaseProgressMetricsV1;
  readonly work: WorkMetricsV1;
}

export interface DeterministicMetricsCollectorV1 {
  reset(provenance: EvidenceProvenanceV1): void;
  consume(record: TraceRecordV1): void;
  getSnapshot(): DeterministicMetricsSnapshotV1;
}

export class TraceDerivedMetricsCollectorV1 implements DeterministicMetricsCollectorV1 {
  private provenance: EvidenceProvenanceV1;
  private cellsExamined = 0;
  private cellsMoved = 0;
  private cellsSkipped = 0;
  private cellsBlocked = 0;
  private chunksActivated = 0;
  private chunksSlept = 0;
  private chunksWoken = 0;
  private phaseStarts = 0;
  private phaseCompletions = 0;
  private lastCompleted: PhaseProgressMetricsV1['lastCompleted'] = null;
  private readonly chunkStates = new Map<string, 'active' | 'sleeping'>();

  public constructor(provenance: EvidenceProvenanceV1) {
    this.provenance = provenance;
  }

  public reset(provenance: EvidenceProvenanceV1): void {
    this.provenance = provenance;
    this.cellsExamined = 0;
    this.cellsMoved = 0;
    this.cellsSkipped = 0;
    this.cellsBlocked = 0;
    this.chunksActivated = 0;
    this.chunksSlept = 0;
    this.chunksWoken = 0;
    this.phaseStarts = 0;
    this.phaseCompletions = 0;
    this.lastCompleted = null;
    this.chunkStates.clear();
  }

  public consume(record: TraceRecordV1): void {
    switch (record.type) {
      case 'cell-examined':
        this.cellsExamined += 1;
        break;
      case 'cell-moved':
        this.cellsMoved += 1;
        break;
      case 'cell-skipped':
        this.cellsSkipped += 1;
        break;
      case 'cell-blocked':
        this.cellsBlocked += 1;
        break;
      case 'chunk-activated':
        this.chunksActivated += 1;
        this.chunkStates.set(record.chunk.id, 'active');
        break;
      case 'chunk-slept':
        this.chunksSlept += 1;
        this.chunkStates.set(record.chunk.id, 'sleeping');
        break;
      case 'chunk-woken':
        this.chunksWoken += 1;
        this.chunkStates.set(record.chunk.id, 'active');
        break;
      case 'phase-started':
        this.phaseStarts += 1;
        break;
      case 'phase-completed':
        this.phaseCompletions += 1;
        this.lastCompleted = Object.freeze({
          frame: record.frame,
          phase: record.phase,
          tick: record.tick,
        });
        break;
    }
  }

  public getSnapshot(): DeterministicMetricsSnapshotV1 {
    let active = 0;
    let sleeping = 0;
    for (const state of this.chunkStates.values()) {
      if (state === 'active') {
        active += 1;
      } else {
        sleeping += 1;
      }
    }

    const schedulerTransitions = this.chunksActivated + this.chunksSlept + this.chunksWoken;
    const work = Object.freeze({
      cellEvaluations: this.cellsExamined,
      schedulerTransitions,
      total: this.cellsExamined + schedulerTransitions,
    });

    return Object.freeze({
      version: METRICS_SCHEMA_VERSION,
      provenance: this.provenance,
      cells: Object.freeze({
        examined: this.cellsExamined,
        moved: this.cellsMoved,
        skipped: this.cellsSkipped,
        blocked: this.cellsBlocked,
      }),
      chunks: Object.freeze({
        active,
        sleeping,
        activated: this.chunksActivated,
        slept: this.chunksSlept,
        woken: this.chunksWoken,
      }),
      phases: Object.freeze({
        started: this.phaseStarts,
        completed: this.phaseCompletions,
        lastCompleted: this.lastCompleted,
      }),
      work,
    });
  }
}
