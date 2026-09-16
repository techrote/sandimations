import { Material, type Material as MaterialValue } from '../model/material';
import type { WorldSnapshot } from '../model/world';
import { CoreParameterId } from '../parameters/definitions';
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

  for (let x = 4; x <= 13; x += 1) {
    set(x, 18, Material.Sand);
  }
  for (let x = 5; x <= 12; x += 1) {
    set(x, 17, Material.Sand);
  }
  for (let x = 19; x <= 28; x += 1) {
    set(x, 15, Material.Wall);
  }

  const parameters = {
    ...coreDefaults(),
    [CoreParameterId.chunkSize]: 8,
    [CoreParameterId.chunkSleepDelay]: 3,
    [CoreParameterId.chunkActivityThreshold]: 0,
    [CoreParameterId.chunkWakeRadius]: 1,
  };

  return normalizeScenario({
    version: SCENARIO_SCHEMA_VERSION,
    id: 'sd-006-chunk-sleep-wake',
    title: 'Chunk sleep / wake teaching model',
    seed: seed >>> 0,
    simulation: { model: 'falling-sand-v1' },
    scheduler: { strategy: 'chunk-sleep-wake-v1', phaseCount: 1 },
    world: freezeWorld(width, height, cells),
    parameters,
    events: [
      {
        type: 'input',
        tick: 18,
        order: 0,
        input: { type: 'set-cell', x: 24, y: 3, material: Material.Sand },
      },
    ],
    presentation: {
      defaultPlaybackRate: 0.5,
      showGrid: true,
      notes:
        'Teaching model: quiet chunks sleep after a deterministic delay; the scripted local disturbance wakes its configured chunk neighborhood and material crossing chunk boundaries propagates wake state.',
    },
  });
}

function createPhasedWorld(): WorldSnapshot {
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
  return freezeWorld(width, height, cells);
}

export function createPhasedSamplingFixtureScenario(seed = 0x0f45ed5a): CoreScenario {
  const parameters = {
    ...coreDefaults(),
    [CoreParameterId.phasedPhaseCount]: 4,
    [CoreParameterId.phasedPattern]: 'diagonal-lattice',
  };

  return normalizeScenario({
    version: SCENARIO_SCHEMA_VERSION,
    id: 'sd-007-phased-sampling-slow',
    title: 'Phased sampling — slow teaching view',
    seed: seed >>> 0,
    simulation: { model: 'falling-sand-v1' },
    scheduler: { strategy: 'phased-sampling-v1', phaseCount: 4 },
    world: createPhasedWorld(),
    parameters,
    events: [],
    presentation: {
      defaultPlaybackRate: 0.25,
      showGrid: true,
      notes:
        'Teaching model: each interior candidate belongs to exactly one diagonal phase bucket. Slow playback exposes the real sparse selection one phase at a time.',
    },
  });
}

export function createPhasedSamplingNormalScenario(seed = 0x0f45ed5a): CoreScenario {
  const slow = createPhasedSamplingFixtureScenario(seed);
  return normalizeScenario({
    ...slow,
    id: 'sd-007-phased-sampling-normal',
    title: 'Phased sampling — normal-speed view',
    presentation: {
      ...slow.presentation,
      defaultPlaybackRate: 1,
      notes:
        'Same deterministic phased teaching scheduler at normal speed, demonstrating coherent macroscopic motion while sparse subsets advance within each logical frame.',
    },
  });
}

export const SCENARIO_FIXTURE_FACTORIES = Object.freeze({
  default: createDefaultScenario,
  localizedDisturbance: createSleepWakeFixtureScenario,
  phasedSampling: createPhasedSamplingFixtureScenario,
  phasedSamplingNormal: createPhasedSamplingNormalScenario,
});
