import { Material, type Material as MaterialValue } from '../model/material';
import type { WorldSnapshot } from '../model/world';

export interface CoreScenario {
  readonly id: string;
  readonly seed: number;
  readonly phaseCount: number;
  readonly world: WorldSnapshot;
}

function freezeWorld(width: number, height: number, cells: MaterialValue[]): WorldSnapshot {
  return Object.freeze({
    width,
    height,
    cells: Object.freeze([...cells]),
  });
}

export function createDefaultScenario(seed = 0x5a17d00d): CoreScenario {
  const width = 32;
  const height = 20;
  const cells: MaterialValue[] = Array.from({ length: width * height }, () => Material.Empty);
  const set = (x: number, y: number, material: MaterialValue): void => {
    cells[y * width + x] = material;
  };

  for (let y = 0; y < height; y += 1) {
    set(0, y, Material.Wall);
    set(width - 1, y, Material.Wall);
  }
  for (let x = 0; x < width; x += 1) {
    set(x, height - 1, Material.Wall);
  }

  for (let x = 4; x <= 11; x += 1) {
    set(x, 13, Material.Wall);
  }
  for (let x = 20; x <= 27; x += 1) {
    set(x, 13, Material.Wall);
  }

  for (let y = 1; y <= 5; y += 1) {
    for (let x = 11; x <= 20; x += 1) {
      if ((x + y) % 3 !== 0) {
        set(x, y, Material.Sand);
      }
    }
  }

  return Object.freeze({
    id: 'sd-002-falling-sand',
    seed: seed >>> 0,
    phaseCount: 1,
    world: freezeWorld(width, height, cells),
  });
}
