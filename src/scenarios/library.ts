import type { CoreScenario } from '../core/scenario/scenario';
import {
  createDefaultScenario,
  createPhasedSamplingFixtureScenario,
  createPhasedSamplingNormalScenario,
  createSleepWakeFixtureScenario,
} from '../core/scenario/scenario';

export type ScenarioExperienceMode = 'single' | 'comparison';

export interface ScenarioLibraryEntry {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly mode: ScenarioExperienceMode;
  readonly createScenario: () => CoreScenario;
}

const ENTRIES: readonly ScenarioLibraryEntry[] = Object.freeze([
  Object.freeze({
    id: 'falling-sand',
    title: 'Settling sand',
    summary: 'Baseline deterministic falling sand with a full interior scan.',
    mode: 'single',
    createScenario: createDefaultScenario,
  }),
  Object.freeze({
    id: 'chunk-sleep-wake',
    title: 'Localized wake propagation',
    summary: 'Quiet chunks sleep; a scripted disturbance and material crossings propagate wake state.',
    mode: 'single',
    createScenario: createSleepWakeFixtureScenario,
  }),
  Object.freeze({
    id: 'phased-slow',
    title: 'Phased sampling — slow motion',
    summary: 'Inspect sparse deterministic phase buckets one scheduler phase at a time.',
    mode: 'single',
    createScenario: createPhasedSamplingFixtureScenario,
  }),
  Object.freeze({
    id: 'phased-normal',
    title: 'Phased sampling — normal speed',
    summary: 'The same phased scheduler with a normal-speed presentation default.',
    mode: 'single',
    createScenario: createPhasedSamplingNormalScenario,
  }),
  Object.freeze({
    id: 'compare-sleep-wake',
    title: 'Compare — chunk sleep / wake',
    summary: 'Independent full-scan baseline and chunk scheduler with deterministic work/divergence evidence.',
    mode: 'comparison',
    createScenario: createSleepWakeFixtureScenario,
  }),
  Object.freeze({
    id: 'compare-phased',
    title: 'Compare — phased sampling',
    summary: 'Independent full-scan baseline and phased scheduler synchronized by comparison tick.',
    mode: 'comparison',
    createScenario: createPhasedSamplingFixtureScenario,
  }),
]);

const BY_ID = new Map(ENTRIES.map((entry) => [entry.id, entry]));

export const DEFAULT_SCENARIO_LIBRARY_ID = 'phased-slow';

export function listScenarioLibrary(): readonly ScenarioLibraryEntry[] {
  return ENTRIES;
}

export function hasScenarioLibraryEntry(id: string): boolean {
  return BY_ID.has(id);
}

export function getScenarioLibraryEntry(id: string): ScenarioLibraryEntry {
  const entry = BY_ID.get(id);
  if (entry === undefined) {
    throw new RangeError(`Unknown Sandimations scenario library id: ${id}.`);
  }
  return entry;
}

export function resolveLegacyScenarioId(value: string | null): string {
  if (value === null || value.length === 0) return DEFAULT_SCENARIO_LIBRARY_ID;
  if (BY_ID.has(value)) return value;
  if (value === 'default') return 'falling-sand';
  if (value === 'localized-disturbance') return 'chunk-sleep-wake';
  if (value === 'phased-sampling') return 'phased-slow';
  if (value === 'phased-sampling-normal') return 'phased-normal';
  return DEFAULT_SCENARIO_LIBRARY_ID;
}
