import { describe, expect, it } from 'vitest';
import { createFullScanReferenceScenario } from '../../src/core/comparison/comparison';
import { createPhasedSamplingFixtureScenario } from '../../src/core/scenario/scenario';

describe('SD-008 canonical comparison inputs', () => {
  it('changes only scheduler configuration when deriving the full-scan reference scenario', () => {
    const source = createPhasedSamplingFixtureScenario(0x2468ace0);
    const baseline = createFullScanReferenceScenario(source);

    expect(baseline.id).toBe(source.id);
    expect(baseline.seed).toBe(source.seed);
    expect(baseline.simulation).toEqual(source.simulation);
    expect(baseline.world).toEqual(source.world);
    expect(baseline.parameters).toEqual(source.parameters);
    expect(baseline.events).toEqual(source.events);
    expect(baseline.scheduler).toEqual({ strategy: 'phase-clock-v1', phaseCount: 1 });
  });
});
