import { isMaterial, Material, type Material as MaterialValue } from './material';
import type { SeededPrng } from '../random/prng';

export type SandTieBreakMode = 'seeded-random' | 'left-first' | 'right-first';
export type SandMoveReason =
  'fall' | 'slide-left' | 'slide-right' | 'tie-break-left' | 'tie-break-right';
export type SandSkipReason = 'material-not-sand';
export type SandBlockedReason = 'no-open-downward-target';

export interface SandStepObserver {
  examined(x: number, y: number, material: MaterialValue): void;
  skipped(x: number, y: number, material: MaterialValue, reason: SandSkipReason): void;
  blocked(x: number, y: number, material: MaterialValue, reason: SandBlockedReason): void;
  moved(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    material: MaterialValue,
    reason: SandMoveReason,
  ): void;
}

export interface WorldRegion {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface WorldCellRef {
  readonly x: number;
  readonly y: number;
}

export interface WorldSnapshot {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly MaterialValue[];
}

function assertDimension(name: string, value: number, minimum: number): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${name} must be an integer >= ${minimum}.`);
  }
}

export class LogicalWorld {
  public readonly width: number;
  public readonly height: number;
  private readonly cells: Uint8Array;

  public constructor(snapshot: WorldSnapshot) {
    assertDimension('width', snapshot.width, 3);
    assertDimension('height', snapshot.height, 2);
    if (snapshot.cells.length !== snapshot.width * snapshot.height) {
      throw new RangeError('World cell count does not match width × height.');
    }
    for (const value of snapshot.cells) {
      if (!isMaterial(value)) {
        throw new RangeError(`Unknown material value: ${value}.`);
      }
    }

    this.width = snapshot.width;
    this.height = snapshot.height;
    this.cells = Uint8Array.from(snapshot.cells);
  }

  public get(x: number, y: number): MaterialValue {
    this.assertCoordinate(x, y);
    const value = this.cells[this.indexOf(x, y)];
    if (value === undefined || !isMaterial(value)) {
      throw new Error('World contains an invalid material value.');
    }
    return value;
  }

  public set(x: number, y: number, material: MaterialValue): void {
    this.assertCoordinate(x, y);
    this.cells[this.indexOf(x, y)] = material;
  }

  public stepSand(
    prng: SeededPrng,
    tieBreak: SandTieBreakMode = 'seeded-random',
    observer?: SandStepObserver,
  ): number {
    return this.stepSandRegion(
      prng,
      tieBreak,
      { x: 0, y: 0, width: this.width, height: this.height },
      observer,
    );
  }

  public stepSandCells(
    prng: SeededPrng,
    tieBreak: SandTieBreakMode,
    cells: readonly WorldCellRef[],
    observer?: SandStepObserver,
  ): number {
    let moves = 0;
    for (const cell of cells) {
      const { x, y } = cell;
      if (
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        x < 1 ||
        x >= this.width - 1 ||
        y < 0 ||
        y >= this.height - 1
      ) {
        throw new RangeError(`Selected sand cell (${x}, ${y}) is outside the evaluable interior.`);
      }
      moves += this.stepSandCell(prng, tieBreak, x, y, observer);
    }
    return moves;
  }

  public stepSandRegion(
    prng: SeededPrng,
    tieBreak: SandTieBreakMode,
    region: WorldRegion,
    observer?: SandStepObserver,
  ): number {
    if (
      !Number.isInteger(region.x) ||
      !Number.isInteger(region.y) ||
      !Number.isInteger(region.width) ||
      !Number.isInteger(region.height) ||
      region.width < 1 ||
      region.height < 1
    ) {
      throw new RangeError('World region must use integer coordinates and positive dimensions.');
    }

    const xStart = Math.max(1, region.x);
    const xEnd = Math.min(this.width - 2, region.x + region.width - 1);
    const yStart = Math.max(0, region.y);
    const yEnd = Math.min(this.height - 2, region.y + region.height - 1);
    let moves = 0;

    for (let y = yEnd; y >= yStart; y -= 1) {
      for (let x = xStart; x <= xEnd; x += 1) {
        moves += this.stepSandCell(prng, tieBreak, x, y, observer);
      }
    }

    return moves;
  }

  public toSnapshot(): WorldSnapshot {
    const cells = Array.from(this.cells, (value): MaterialValue => {
      if (!isMaterial(value)) {
        throw new Error('World contains an invalid material value.');
      }
      return value;
    });

    return Object.freeze({
      width: this.width,
      height: this.height,
      cells: Object.freeze(cells),
    });
  }

  private stepSandCell(
    prng: SeededPrng,
    tieBreak: SandTieBreakMode,
    x: number,
    y: number,
    observer?: SandStepObserver,
  ): number {
    const material = this.get(x, y);
    observer?.examined(x, y, material);

    if (material !== Material.Sand) {
      observer?.skipped(x, y, material, 'material-not-sand');
      return 0;
    }

    if (this.get(x, y + 1) === Material.Empty) {
      this.moveSand(x, y, x, y + 1);
      observer?.moved(x, y, x, y + 1, material, 'fall');
      return 1;
    }

    const leftOpen = this.get(x - 1, y + 1) === Material.Empty;
    const rightOpen = this.get(x + 1, y + 1) === Material.Empty;

    if (leftOpen && rightOpen) {
      const targetX = this.chooseTieBreakTarget(x, tieBreak, prng);
      this.moveSand(x, y, targetX, y + 1);
      observer?.moved(
        x,
        y,
        targetX,
        y + 1,
        material,
        targetX < x ? 'tie-break-left' : 'tie-break-right',
      );
      return 1;
    }
    if (leftOpen) {
      this.moveSand(x, y, x - 1, y + 1);
      observer?.moved(x, y, x - 1, y + 1, material, 'slide-left');
      return 1;
    }
    if (rightOpen) {
      this.moveSand(x, y, x + 1, y + 1);
      observer?.moved(x, y, x + 1, y + 1, material, 'slide-right');
      return 1;
    }

    observer?.blocked(x, y, material, 'no-open-downward-target');
    return 0;
  }

  private chooseTieBreakTarget(x: number, tieBreak: SandTieBreakMode, prng: SeededPrng): number {
    if (tieBreak === 'left-first') {
      return x - 1;
    }
    if (tieBreak === 'right-first') {
      return x + 1;
    }
    return prng.nextBoolean() ? x + 1 : x - 1;
  }

  private moveSand(fromX: number, fromY: number, toX: number, toY: number): void {
    this.cells[this.indexOf(fromX, fromY)] = Material.Empty;
    this.cells[this.indexOf(toX, toY)] = Material.Sand;
  }

  private indexOf(x: number, y: number): number {
    return y * this.width + x;
  }

  private assertCoordinate(x: number, y: number): void {
    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      x < 0 ||
      y < 0 ||
      x >= this.width ||
      y >= this.height
    ) {
      throw new RangeError(`Coordinate (${x}, ${y}) is outside the world.`);
    }
  }
}
