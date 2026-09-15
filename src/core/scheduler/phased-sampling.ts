export type PhasedSamplingPattern = 'diagonal-lattice' | 'vertical-stripes' | 'seeded-hash';

export interface PhasedCellRef {
  readonly x: number;
  readonly y: number;
}

export interface PhasedCellSnapshot extends PhasedCellRef {
  readonly assignedPhase: number;
  readonly lastSelectedTick: number | null;
}

export interface PhasedSamplingSnapshot {
  readonly phaseCount: number;
  readonly pattern: PhasedSamplingPattern;
  readonly seed: number;
  readonly activeCellCount: number;
  readonly selectedCellCount: number;
  readonly lastExecutedPhase: number | null;
  readonly lastExecutedTick: number | null;
  readonly cells: readonly PhasedCellSnapshot[];
}

interface MutablePhasedCell {
  readonly x: number;
  readonly y: number;
  readonly assignedPhase: number;
  lastSelectedTick: number | null;
}

function assertInteger(name: string, value: number, minimum: number): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${name} must be an integer >= ${minimum}.`);
  }
}

function mix32(value: number): number {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d) >>> 0;
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b) >>> 0;
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

export function phaseForCell(
  pattern: PhasedSamplingPattern,
  x: number,
  y: number,
  phaseCount: number,
  seed: number,
): number {
  assertInteger('phaseCount', phaseCount, 2);
  if (pattern === 'vertical-stripes') {
    return (x - 1) % phaseCount;
  }
  if (pattern === 'seeded-hash') {
    const spatial = (Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b) ^ seed) >>> 0;
    return mix32(spatial) % phaseCount;
  }
  return (x + y) % phaseCount;
}

export class PhasedSamplingScheduler {
  private readonly cells: readonly MutablePhasedCell[];
  private readonly buckets: readonly (readonly MutablePhasedCell[])[];
  private lastExecutedPhase: number | null = null;
  private lastExecutedTick: number | null = null;
  private selectedCellCount = 0;

  public constructor(
    public readonly width: number,
    public readonly height: number,
    public readonly phaseCount: number,
    public readonly pattern: PhasedSamplingPattern,
    public readonly seed: number,
  ) {
    assertInteger('width', width, 3);
    assertInteger('height', height, 2);
    assertInteger('phaseCount', phaseCount, 2);

    const cells: MutablePhasedCell[] = [];
    const buckets: MutablePhasedCell[][] = Array.from({ length: phaseCount }, () => []);

    for (let y = 0; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const assignedPhase = phaseForCell(pattern, x, y, phaseCount, seed >>> 0);
        const cell: MutablePhasedCell = { x, y, assignedPhase, lastSelectedTick: null };
        cells.push(cell);
        buckets[assignedPhase]?.push(cell);
      }
    }

    for (const bucket of buckets) {
      bucket.sort((left, right) => right.y - left.y || left.x - right.x);
    }

    this.cells = cells;
    this.buckets = buckets;
  }

  public beginPhase(phase: number, tick: number): readonly PhasedCellRef[] {
    if (!Number.isInteger(phase) || phase < 0 || phase >= this.phaseCount) {
      throw new RangeError(`phase must be between 0 and ${this.phaseCount - 1}.`);
    }
    assertInteger('tick', tick, 0);

    const bucket = this.buckets[phase] ?? [];
    for (const cell of bucket) {
      cell.lastSelectedTick = tick;
    }
    this.lastExecutedPhase = phase;
    this.lastExecutedTick = tick;
    this.selectedCellCount = bucket.length;

    return Object.freeze(bucket.map((cell) => Object.freeze({ x: cell.x, y: cell.y })));
  }

  public getSnapshot(): PhasedSamplingSnapshot {
    return Object.freeze({
      phaseCount: this.phaseCount,
      pattern: this.pattern,
      seed: this.seed >>> 0,
      activeCellCount: this.cells.length,
      selectedCellCount: this.selectedCellCount,
      lastExecutedPhase: this.lastExecutedPhase,
      lastExecutedTick: this.lastExecutedTick,
      cells: Object.freeze(
        this.cells.map((cell) =>
          Object.freeze({
            x: cell.x,
            y: cell.y,
            assignedPhase: cell.assignedPhase,
            lastSelectedTick: cell.lastSelectedTick,
          }),
        ),
      ),
    });
  }
}
