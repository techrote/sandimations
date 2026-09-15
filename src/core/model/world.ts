import { isMaterial, Material, type Material as MaterialValue } from './material';
import type { SeededPrng } from '../random/prng';

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

  public stepSand(prng: SeededPrng): number {
    let moves = 0;

    for (let y = this.height - 2; y >= 0; y -= 1) {
      for (let x = 1; x < this.width - 1; x += 1) {
        if (this.get(x, y) !== Material.Sand) {
          continue;
        }

        if (this.get(x, y + 1) === Material.Empty) {
          this.moveSand(x, y, x, y + 1);
          moves += 1;
          continue;
        }

        const leftOpen = this.get(x - 1, y + 1) === Material.Empty;
        const rightOpen = this.get(x + 1, y + 1) === Material.Empty;

        if (leftOpen && rightOpen) {
          const targetX = prng.nextBoolean() ? x + 1 : x - 1;
          this.moveSand(x, y, targetX, y + 1);
          moves += 1;
        } else if (leftOpen) {
          this.moveSand(x, y, x - 1, y + 1);
          moves += 1;
        } else if (rightOpen) {
          this.moveSand(x, y, x + 1, y + 1);
          moves += 1;
        }
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
