import { describe, expect, it } from 'vitest';
import { DeterministicComparison } from '../../src/core/comparison/comparison';
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

  it('replays comparison scenarios to identical paired state and evidence', () => {
    for (const entry of listScenarioLibrary().filter(
      (candidate) => candidate.mode === 'comparison',
    )) {
      const first = new DeterministicComparison(entry.createScenario());
      const second = new DeterministicComparison(entry.createScenario());
      first.stepFrames(8);
      second.stepFrames(8);

      expect(second.getSnapshot(), entry.id).toEqual(first.getSnapshot());
      expect(second.getBaselineRunner().getStateHash(), entry.id).toBe(
        first.getBaselineRunner().getStateHash(),
      );
      expect(second.getOptimizedRunner().getStateHash(), entry.id).toBe(
        first.getOptimizedRunner().getStateHash(),
      );
      expect(second.getBaselineRunner().getTraceSnapshot(), entry.id).toEqual(
        first.getBaselineRunner().getTraceSnapshot(),
      );
      expect(second.getOptimizedRunner().getTraceSnapshot(), entry.id).toEqual(
        first.getOptimizedRunner().getTraceSnapshot(),
      );
    }
  });
});
