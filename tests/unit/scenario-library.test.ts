import { describe, expect, it } from 'vitest';
import { SimulationRunner } from '../../src/core/runner/runner';
import { serializeScenario } from '../../src/core/scenario/scenario';
import { listScenarioLibrary } from '../../src/scenarios/library';

describe('SD-009 scenario library', () => {
  it('contains the required teaching and comparison experiences with unique stable ids', () => {
    const entries = listScenarioLibrary();
    const ids = entries.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        'falling-sand',
        'chunk-sleep-wake',
        'phased-slow',
        'compare-sleep-wake',
        'compare-phased',
      ]),
    );
  });

  it('builds canonical repository data deterministically', () => {
    for (const entry of listScenarioLibrary()) {
      expect(serializeScenario(entry.createScenario())).toBe(
        serializeScenario(entry.createScenario()),
      );
    }
  });

  it('replays single-runner scenarios to identical deterministic state', () => {
    for (const entry of listScenarioLibrary().filter((candidate) => candidate.mode === 'single')) {
      const first = new SimulationRunner(entry.createScenario());
      const second = new SimulationRunner(entry.createScenario());
      first.stepFrames(8);
      second.stepFrames(8);
      expect(second.getStateHash(), entry.id).toBe(first.getStateHash());
      expect(second.getTraceSnapshot(), entry.id).toEqual(first.getTraceSnapshot());
    }
  });
});
