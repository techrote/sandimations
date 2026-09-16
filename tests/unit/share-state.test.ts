import { describe, expect, it } from 'vitest';
import { CoreParameterId } from '../../src/core/parameters/definitions';
import { createCoreParameterRegistry } from '../../src/core/parameters/registry';
import {
  canonicalShareQuery,
  decodeShareState,
  SHARE_STATE_VERSION,
  type ShareStateV1,
} from '../../src/presentation/share-state';
import { hasScenarioLibraryEntry } from '../../src/scenarios/library';

const registry = createCoreParameterRegistry();

function decode(query: string) {
  return decodeShareState(
    new URLSearchParams(query),
    registry,
    'phased-slow',
    hasScenarioLibraryEntry,
  );
}

describe('SD-009 share state', () => {
  it('round-trips canonical supported scenario, parameter and presentation state', () => {
    const state: ShareStateV1 = Object.freeze({
      version: SHARE_STATE_VERSION,
      scenarioId: 'chunk-sleep-wake',
      tick: 27,
      paused: true,
      speedPosition: 31,
      presentationMode: true,
      historyLimit: 64,
      parameters: Object.freeze({
        [CoreParameterId.sandEnabled]: false,
        [CoreParameterId.sandTieBreak]: 'left-first',
        [CoreParameterId.seedVariant]: 19,
      }),
    });

    const query = canonicalShareQuery(state);
    const decoded = decode(query);

    expect(decoded.warnings).toEqual([]);
    expect(decoded.legacy).toBe(false);
    expect(decoded.state).toEqual(state);
    expect(canonicalShareQuery(decoded.state)).toBe(query);
  });

  it('fails safely to the default state for unsupported versions', () => {
    const decoded = decode('v=99&scenario=chunk-sleep-wake&tick=50&view=presentation');

    expect(decoded.state.scenarioId).toBe('phased-slow');
    expect(decoded.state.tick).toBe(0);
    expect(decoded.state.presentationMode).toBe(false);
    expect(decoded.warnings.join(' ')).toContain('Unsupported share-state version 99');
  });

  it('degrades invalid fields and parameters without interpreting component internals', () => {
    const decoded = decode(
      'v=1&scenario=missing&tick=99999&paused=maybe&speed=-8&history=999&p.simulation.sand.enabled=no&p.unknown=1',
    );

    expect(decoded.state.scenarioId).toBe('phased-slow');
    expect(decoded.state.tick).toBe(0);
    expect(decoded.state.parameters).toEqual({});
    expect(decoded.warnings.length).toBeGreaterThanOrEqual(6);
  });

  it('keeps legacy scenario-only links usable without treating old query state as authoritative', () => {
    const decoded = decode('scenario=compare-phased&tick=40&view=presentation');

    expect(decoded.legacy).toBe(true);
    expect(decoded.state.scenarioId).toBe('compare-phased');
    expect(decoded.state.tick).toBe(0);
    expect(decoded.state.presentationMode).toBe(false);
  });
});
