import { describe, expect, it } from 'vitest';
import { DeterministicComparison } from '../../src/core/comparison/comparison';
import { Material } from '../../src/core/model/material';
import { createPhasedSamplingFixtureScenario } from '../../src/core/scenario/scenario';

describe('SD-008 comparison isolation', () => {
  it('does not share mutable world state between baseline and optimized runners', () => {
    const comparison = new DeterministicComparison(createPhasedSamplingFixtureScenario());
    const baseline = comparison.getBaselineRunner();
    const optimized = comparison.getOptimizedRunner();
    const before = optimized.getSnapshot().world;

    baseline.applyInput({ type: 'set-cell', x: 2, y: 2, material: Material.Sand });

    expect(baseline.getSnapshot().world.cells[2 * before.width + 2]).toBe(Material.Sand);
    expect(optimized.getSnapshot().world).toEqual(before);
  });

  it('mirrors direct parameter requests before the same subsequent comparison tick', () => {
    const comparison = new DeterministicComparison(createPhasedSamplingFixtureScenario());
    comparison.requestParameterMutation('simulation.sand.tie-break', 'left-first');

    expect(comparison.getBaselineRunner().getParameterValue('simulation.sand.tie-break')).toBe(
      'seeded-random',
    );
    expect(comparison.getOptimizedRunner().getParameterValue('simulation.sand.tie-break')).toBe(
      'seeded-random',
    );

    comparison.stepPhase();

    expect(comparison.getBaselineRunner().getParameterValue('simulation.sand.tie-break')).toBe(
      'left-first',
    );
    expect(comparison.getOptimizedRunner().getParameterValue('simulation.sand.tie-break')).toBe(
      'left-first',
    );
  });
});
