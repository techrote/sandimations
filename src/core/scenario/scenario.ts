import { Material, type Material as MaterialValue } from '../model/material';
import type { WorldSnapshot } from '../model/world';
import { createCoreParameterRegistry } from '../parameters/registry';
import {
  SCENARIO_SCHEMA_VERSION,
  deserializeScenario,
  normalizeScenario,
  serializeScenario,
  type CoreScenario,
} from './schema';

export type { CoreScenario, ScenarioEventV1 } from './schema';
export { SCENARIO_SCHEMA_VERSION, deserializeScenario, normalizeScenario, serializeScenario };

function freezeWorld(width: number, height: number, cells: MaterialValue[]): WorldSnapshot {
  return Object.freeze({
    width,
    height,
    cells: Object.freeze([...cells]),
  });
}

function emptyBoundedWorld(width: number, height: number): MaterialValue[] {
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
  return cells;
}

function coreDefaults(): Readonly<Record<string, boolean | number | string>> {
  return createCoreParameterRegistry().defaults();
}

export function createDefaultScenario(seed = 0x5a17d00d): CoreScenario {
  const width = 32;
  const height = 20;
  const cells = emptyBoundedWorld(width, height);
  const set = (x: number, y: number, material: MaterialValue): void => {
    cells[y * width + x] = material;
  };

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

  return normalizeScenario({
    version: SCENARIO_SCHEMA_VERSION,
    id: 'sd-002-falling-sand',
    title: 'Falling sand',
    seed: seed >>> 0,
    simulation: { model: 'falling-sand-v1' },
    scheduler: { strategy: 'phase-clock-v1', phaseCount: 1 },
    world: freezeWorld(width, height, cells),
    parameters: coreDefaults(),
    events: [],
    presentation: {
      defaultPlaybackRate: 1,
      showGrid: true,
      notes: 'Baseline deterministic teaching world.',
    },
  });
}

export function createSleepWakeFixtureScenario(seed = 0x51ee91a5): CoreScenario {
  const width = 32;
  const height = 20;
  const cells = emptyBoundedWorld(width, height);
  const set = (x: number, y: number, material: MaterialValue): void => {
    cells[y * width + x] = material;
  };

  for (let y = 15; y <= 18; y += 1) {
    for (let x = 4; x <= 14; x += 1) {
      if (y >= 19 - Math.floor((x - 4) / 3)) {
        set(x, y, Material.Sand);
      }
    }
  }
  for (let x = 18; x <= 27; x += 1) {
    set(x, 15, Material.Wall);
  }

  return normalizeScenario({
    version: SCENARIO_SCHEMA_VERSION,
    id: 'fixture-localized-disturbance',
    title: 'Localized disturbance fixture',
    seed: seed >>> 0,
    simulation: { model: 'falling-sand-v1' },
    scheduler: { strategy: 'phase-clock-v1', phaseCount: 1 },
    world: freezeWorld(width, height, cells),
    parameters: coreDefaults(),
    events: [
      {
        type: 'input',
        tick: 12,
        order: 0,
        input: { type: 'set-cell', x: 24, y: 3, material: Material.Sand },
      },
    ],
    presentation: {
      defaultPlaybackRate: 0.5,
      showGrid: true,
      notes: 'Prepared for SD-006 sleep/wake work; no chunk sleeping exists yet.',
    },
  });
}

export function createPhasedSamplingFixtureScenario(seed = 0x0f45ed5a): CoreScenario {
  const width = 36;
  const height = 22;
  const cells = emptyBoundedWorld(width, height);
  const set = (x: number, y: number, material: MaterialValue): void => {
    cells[y * width + x] = material;
  };

  for (let x = 4; x < width - 4; x += 4) {
    set(x, 16, Material.Wall);
    set(x + 1, 16, Material.Wall);
  }
  for (let y = 2; y <= 7; y += 1) {
    for (let x = 5; x < width - 5; x += 1) {
      if ((x * 3 + y) % 5 < 3) {
        set(x, y, Material.Sand);
      }
    }
  }

  return normalizeScenario({
    version: SCENARIO_SCHEMA_VERSION,
    id: 'fixture-phased-sampling',
    title: 'Phased sampling fixture',
    seed: seed >>> 0,
    simulation: { model: 'falling-sand-v1' },
    scheduler: { strategy: 'phase-clock-v1', phaseCount: 4 },
    world: freezeWorld(width, height, cells),
    parameters: coreDefaults(),
    events: [],
    presentation: {
      defaultPlaybackRate: 0.25,
      showGrid: true,
      notes:
        'Four-phase clock fixture for SD-007. It does not select sparse cell subsets until that issue.',
    },
  });
}

export const SCENARIO_FIXTURE_FACTORIES = Object.freeze({
  default: createDefaultScenario,
  localizedDisturbance: createSleepWakeFixtureScenario,
  phasedSampling: createPhasedSamplingFixtureScenario,
});
