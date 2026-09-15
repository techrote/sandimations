export type ChunkLifecycleState = 'active' | 'pending-sleep' | 'sleeping' | 'newly-woken';
export type ChunkWakeReason = 'input-disturbance' | 'cross-chunk-activity';

export interface ChunkBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ChunkRef {
  readonly id: string;
  readonly column: number;
  readonly row: number;
}

export interface ChunkStateSnapshot extends ChunkRef, ChunkBounds {
  readonly state: ChunkLifecycleState;
  readonly quietFrames: number;
  readonly reason: string | null;
}

export interface ChunkSchedulerSnapshot {
  readonly chunkSize: number;
  readonly columns: number;
  readonly rows: number;
  readonly chunks: readonly ChunkStateSnapshot[];
}

export interface ChunkTransitionObserver {
  activated(chunk: ChunkStateSnapshot, reason: string): void;
  slept(chunk: ChunkStateSnapshot, reason: string): void;
  woken(
    chunk: ChunkStateSnapshot,
    reason: ChunkWakeReason,
    causeChunk: ChunkRef | null,
    causeCell: Readonly<{ x: number; y: number }> | null,
  ): void;
}

interface MutableChunk extends ChunkRef, ChunkBounds {
  state: ChunkLifecycleState;
  quietFrames: number;
  reason: string | null;
  activity: number;
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${label} must be a positive safe integer.`);
  }
}

function snapshotChunk(chunk: MutableChunk): ChunkStateSnapshot {
  return Object.freeze({
    id: chunk.id,
    column: chunk.column,
    row: chunk.row,
    x: chunk.x,
    y: chunk.y,
    width: chunk.width,
    height: chunk.height,
    state: chunk.state,
    quietFrames: chunk.quietFrames,
    reason: chunk.reason,
  });
}

export class ChunkSleepWakeScheduler {
  private readonly columns: number;
  private readonly rows: number;
  private readonly chunks: MutableChunk[];

  public constructor(
    private readonly worldWidth: number,
    private readonly worldHeight: number,
    private readonly chunkSize: number,
    private readonly observer?: ChunkTransitionObserver,
  ) {
    assertPositiveInteger(worldWidth, 'World width');
    assertPositiveInteger(worldHeight, 'World height');
    assertPositiveInteger(chunkSize, 'Chunk size');
    this.columns = Math.ceil(worldWidth / chunkSize);
    this.rows = Math.ceil(worldHeight / chunkSize);
    this.chunks = [];

    for (let row = 0; row < this.rows; row += 1) {
      for (let column = 0; column < this.columns; column += 1) {
        const x = column * chunkSize;
        const y = row * chunkSize;
        const chunk: MutableChunk = {
          id: `${column}:${row}`,
          column,
          row,
          x,
          y,
          width: Math.min(chunkSize, worldWidth - x),
          height: Math.min(chunkSize, worldHeight - y),
          state: 'active',
          quietFrames: 0,
          reason: 'scenario-initialization',
          activity: 0,
        };
        this.chunks.push(chunk);
        this.observer?.activated(snapshotChunk(chunk), 'scenario-initialization');
      }
    }
  }

  public beginFrame(): void {
    for (const chunk of this.chunks) {
      chunk.activity = 0;
      if (chunk.state === 'newly-woken') {
        chunk.state = 'active';
        chunk.reason = 'wake-visible-frame-complete';
      }
    }
  }

  public getEvaluableChunks(): readonly ChunkStateSnapshot[] {
    return Object.freeze(
      this.chunks
        .filter((chunk) => chunk.state !== 'sleeping')
        .sort((left, right) => right.row - left.row || left.column - right.column)
        .map(snapshotChunk),
    );
  }

  public noteMovement(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    wakeRadius: number,
  ): void {
    const from = this.chunkAtCell(fromX, fromY);
    const to = this.chunkAtCell(toX, toY);
    from.activity += 1;
    if (to.id !== from.id) {
      to.activity += 1;
      this.wakeNeighborhood(
        to.column,
        to.row,
        wakeRadius,
        'cross-chunk-activity',
        from,
        Object.freeze({ x: toX, y: toY }),
      );
    }
  }

  public wakeAtCell(x: number, y: number, wakeRadius: number): void {
    const source = this.chunkAtCell(x, y);
    this.wakeNeighborhood(
      source.column,
      source.row,
      wakeRadius,
      'input-disturbance',
      null,
      Object.freeze({ x, y }),
    );
  }

  public completeFrame(sleepDelay: number, activityThreshold: number): void {
    assertPositiveInteger(sleepDelay, 'Sleep delay');
    if (!Number.isSafeInteger(activityThreshold) || activityThreshold < 0) {
      throw new RangeError('Activity threshold must be a non-negative safe integer.');
    }

    for (const chunk of this.chunks) {
      if (chunk.state === 'sleeping') {
        continue;
      }
      if (chunk.state === 'newly-woken') {
        chunk.quietFrames = 0;
        continue;
      }
      if (chunk.activity > activityThreshold) {
        chunk.state = 'active';
        chunk.quietFrames = 0;
        chunk.reason = 'activity-observed';
        continue;
      }

      chunk.quietFrames += 1;
      if (chunk.quietFrames >= sleepDelay) {
        chunk.state = 'sleeping';
        chunk.reason = 'quiet-delay-reached';
        this.observer?.slept(snapshotChunk(chunk), 'quiet-delay-reached');
      } else {
        chunk.state = 'pending-sleep';
        chunk.reason = 'quiet-countdown';
      }
    }
  }

  public getSnapshot(): ChunkSchedulerSnapshot {
    return Object.freeze({
      chunkSize: this.chunkSize,
      columns: this.columns,
      rows: this.rows,
      chunks: Object.freeze(this.chunks.map(snapshotChunk)),
    });
  }

  private chunkAtCell(x: number, y: number): MutableChunk {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= this.worldWidth || y >= this.worldHeight) {
      throw new RangeError(`Cell (${x}, ${y}) is outside the chunk scheduler world.`);
    }
    const column = Math.floor(x / this.chunkSize);
    const row = Math.floor(y / this.chunkSize);
    const chunk = this.chunks[row * this.columns + column];
    if (chunk === undefined) {
      throw new Error(`Missing chunk at ${column}:${row}.`);
    }
    return chunk;
  }

  private wakeNeighborhood(
    centerColumn: number,
    centerRow: number,
    wakeRadius: number,
    reason: ChunkWakeReason,
    causeChunk: MutableChunk | null,
    causeCell: Readonly<{ x: number; y: number }> | null,
  ): void {
    if (!Number.isSafeInteger(wakeRadius) || wakeRadius < 0) {
      throw new RangeError('Wake radius must be a non-negative safe integer.');
    }

    for (let row = Math.max(0, centerRow - wakeRadius); row <= Math.min(this.rows - 1, centerRow + wakeRadius); row += 1) {
      for (let column = Math.max(0, centerColumn - wakeRadius); column <= Math.min(this.columns - 1, centerColumn + wakeRadius); column += 1) {
        const chunk = this.chunks[row * this.columns + column];
        if (chunk === undefined) {
          continue;
        }
        if (chunk.state === 'sleeping') {
          chunk.state = 'newly-woken';
          chunk.quietFrames = 0;
          chunk.reason = reason;
          this.observer?.woken(
            snapshotChunk(chunk),
            reason,
            causeChunk === null
              ? null
              : Object.freeze({ id: causeChunk.id, column: causeChunk.column, row: causeChunk.row }),
            causeCell,
          );
        } else if (chunk.state === 'pending-sleep') {
          chunk.state = 'active';
          chunk.quietFrames = 0;
          chunk.reason = reason;
        }
      }
    }
  }
}
