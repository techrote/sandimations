import { describe, expect, it } from 'vitest';
import { Material } from '../../src/core/model/material';
import { CoreParameterId } from '../../src/core/parameters/definitions';
import {
  createDefaultScenario,
  createPhasedSamplingFixtureScenario,
  createSleepWakeFixtureScenario,
  deserializeScenario,
  normalizeScenario,
  serializeScenario,
} from '../../src/core/scenario/scenario';
import { ScenarioValidationError } from '../../src/core/scenario/schema';

function plainDefault(): Record<string, unknown> {
  return JSON.parse(serializeScenario(createDefaultScenario())) as Record<string, unknown>;
}

describe('versioned scenario schema', () => {
  it('canonicalizes equivalent scenario data and round-trips without semantic change', () => {
    const source = plainDefault();
    source.events = [
      {
        type: 'input',
        tick: 3,
        order: 1,
        input: { type: 'set-cell', x: 2, y: 2, material: Material.Sand },
      },
      {
        type: 'parameter',
        tick: 1,
        order: 0,
        parameterId: CoreParameterId.sandTieBreak,
        value: 'left-first',
      },
    ];

    const normalized = normalizeScenario(source);
    const serialized = serializeScenario(normalized);
    const reparsed = deserializeScenario(serialized);

    expect(reparsed).toEqual(normalized);
    expect(serializeScenario(reparsed)).toBe(serialized);
    expect(reparsed.events.map((event) => [event.tick, event.order])).toEqual([
      [1, 0],
      [3, 1],
    ]);
  });

  it('fills registered parameter defaults into normalized scenario data', () => {
    const source = plainDefault();
    source.parameters = {};
    const scenario = normalizeScenario(source);

    expect(scenario.parameters).toEqual({
      [CoreParameterId.seedVariant]: 0,
      [CoreParameterId.sandEnabled]: true,
      [CoreParameterId.sandTieBreak]: 'seeded-random',
    });
  });

  it('rejects unsupported versions, unknown parameters, and invalid values', () => {
    const wrongVersion = plainDefault();
    wrongVersion.version = 2;
    expect(() => normalizeScenario(wrongVersion)).toThrow(ScenarioValidationError);

    const unknownParameter = plainDefault();
    unknownParameter.parameters = {
      ...(unknownParameter.parameters as Record<string, unknown>),
      'unknown.parameter': 1,
    };
    expect(() => normalizeScenario(unknownParameter)).toThrow(/unknown parameter/i);

    const invalidParameter = plainDefault();
    invalidParameter.parameters = {
      ...(invalidParameter.parameters as Record<string, unknown>),
      [CoreParameterId.seedVariant]: -1,
    };
    expect(() => normalizeScenario(invalidParameter)).toThrow(/seed-variant/i);
  });

  it('rejects ambiguous event ordering and scripted reset-required mutations', () => {
    const duplicate = plainDefault();
    duplicate.events = [
      {
        type: 'input',
        tick: 2,
        order: 0,
        input: { type: 'set-cell', x: 2, y: 2, material: Material.Sand },
      },
      {
        type: 'parameter',
        tick: 2,
        order: 0,
        parameterId: CoreParameterId.sandEnabled,
        value: false,
      },
    ];
    expect(() => normalizeScenario(duplicate)).toThrow(/duplicate schedule position/i);

    const resetRequired = plainDefault();
    resetRequired.events = [
      {
        type: 'parameter',
        tick: 0,
        order: 0,
        parameterId: CoreParameterId.seedVariant,
        value: 9,
      },
    ];
    expect(() => normalizeScenario(resetRequired)).toThrow(/reset-required/i);
  });

  it('ships deterministic fixtures prepared for later sleep/wake and phased work', () => {
    const sleepWake = createSleepWakeFixtureScenario();
    const phased = createPhasedSamplingFixtureScenario();

    expect(sleepWake.id).toBe('fixture-localized-disturbance');
    expect(sleepWake.events).toHaveLength(1);
    expect(phased.id).toBe('fixture-phased-sampling');
    expect(phased.scheduler.phaseCount).toBe(4);
    expect(phased.presentation.notes).toMatch(/does not select sparse/i);
  });
});
