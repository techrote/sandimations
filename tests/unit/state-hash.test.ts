import { describe, expect, it } from 'vitest';
import { SimulationRunner } from '../../src/core/runner/runner';
import { hashDeterministicState } from '../../src/core/runner/state-hash';
import { createPhasedSamplingFixtureScenario } from '../../src/core/scenario/scenario';

describe('deterministic state hash', () => {
  it('changes when phased scheduler state changes independently of other runner fields', () => {
    const runner = new SimulationRunner(createPhasedSamplingFixtureScenario());
    const before = runner.getSnapshot();

    runner.stepPhase();
    const advancedSampling = runner.getSnapshot().phasedSampling;
    expect(advancedSampling).not.toBeNull();
    if (advancedSampling === null) {
      throw new Error('Expected phased sampling state.');
    }

    const withAdvancedSampling = {
      ...before,
      phasedSampling: advancedSampling,
    };

    expect(hashDeterministicState(withAdvancedSampling)).not.toBe(hashDeterministicState(before));
  });
});
