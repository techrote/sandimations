import { describe, expect, it } from 'vitest';
import { SimulationRunner } from '../../src/core/runner/runner';
import { createDefaultScenario } from '../../src/core/scenario/scenario';

describe('deterministic core boundary', () => {
  it('runs the real SD-002 runner in Node without DOM globals', () => {
    expect(typeof globalThis.document).toBe('undefined');
    expect(typeof globalThis.requestAnimationFrame).toBe('undefined');

    const runner = new SimulationRunner(createDefaultScenario());
    runner.stepFrames(3);

    expect(runner.getSnapshot()).toMatchObject({ frame: 3, tick: 3, phase: 0 });
  });
});
