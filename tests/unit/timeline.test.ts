import { describe, expect, it } from 'vitest';
import { SimulationRunner } from '../../src/core/runner/runner';
import { createPhasedSamplingFixtureScenario } from '../../src/core/scenario/scenario';
import { buildTimelinePhaseEntries, describeTimelineEntry } from '../../src/presentation/timeline';

describe('SD-009 timeline projection', () => {
  it('keeps logical frame, scheduler phase and tick distinct from trace evidence', () => {
    const runner = new SimulationRunner(createPhasedSamplingFixtureScenario());
    runner.stepPhase();
    runner.stepPhase();

    const entries = buildTimelinePhaseEntries(runner.getTraceSnapshot().records, 16_384);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ frame: 0, phase: 0, tick: 0, phaseCount: 4 });
    expect(entries[1]).toMatchObject({ frame: 0, phase: 1, tick: 1, phaseCount: 4 });
    expect(entries[0]?.recordCount).toBeGreaterThan(0);
    expect(describeTimelineEntry(entries[1]!)).toContain('frame 0 · phase 2/4 · tick 1');
  });

  it('reads only the configured recent trace-record bound', () => {
    const runner = new SimulationRunner(createPhasedSamplingFixtureScenario());
    runner.stepFrames(3);
    const records = runner.getTraceSnapshot().records;

    const bounded = buildTimelinePhaseEntries(records, 1);
    expect(bounded).toHaveLength(1);
    expect(bounded[0]?.recordCount).toBe(1);
    expect(() => buildTimelinePhaseEntries(records, 0)).toThrow(/positive safe integer/);
  });
});
