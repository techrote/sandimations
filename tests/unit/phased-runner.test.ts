import { describe, expect, it } from 'vitest';
import { CoreParameterId } from '../../src/core/parameters/definitions';
import { SimulationRunner } from '../../src/core/runner/runner';
import { createPhasedSamplingFixtureScenario } from '../../src/core/scenario/scenario';
import { phaseForCell } from '../../src/core/scheduler/phased-sampling';

describe('SimulationRunner phased sampling', () => {
  it('examines only the cells selected for the current phase', () => {
    const runner = new SimulationRunner(createPhasedSamplingFixtureScenario());
    runner.stepPhase();

    const trace = runner.getTraceSnapshot().records;
    const examined = trace.filter((record) => record.type === 'cell-examined');
    const selection = trace.find((record) => record.type === 'phase-selection');
    expect(selection?.type).toBe('phase-selection');
    if (selection?.type !== 'phase-selection') {
      throw new Error('Expected phase-selection trace record.');
    }

    expect(examined).toHaveLength(selection.selectedCount);
    expect(selection.selectedCount).toBeLessThan(selection.activeCount);
    for (const record of examined) {
      if (record.type !== 'cell-examined') {
        continue;
      }
      expect(phaseForCell('diagonal-lattice', record.cell.x, record.cell.y, 4, 0x0f45ed5a)).toBe(0);
    }
    expect(runner.getSnapshot()).toMatchObject({ frame: 0, phase: 1, tick: 1, phaseCount: 4 });
  });

  it('composes exactly one complete phase cycle into a logical frame', () => {
    const runner = new SimulationRunner(createPhasedSamplingFixtureScenario());
    runner.stepFrame();
    expect(runner.getSnapshot()).toMatchObject({ frame: 1, phase: 0, tick: 4, phaseCount: 4 });

    const selections = runner
      .getTraceSnapshot()
      .records.filter((record) => record.type === 'phase-selection');
    expect(selections.map((record) => record.phase)).toEqual([0, 1, 2, 3]);

    const examinedByPhase = selections.map(
      (selection) =>
        runner
          .getTraceSnapshot()
          .records.filter(
            (record) => record.type === 'cell-examined' && record.tick === selection.tick,
          ).length,
    );
    expect(examinedByPhase).toEqual(
      selections.map((selection) =>
        selection.type === 'phase-selection' ? selection.selectedCount : 0,
      ),
    );
  });

  it('replays identical selected-cell and trace sequences', () => {
    const scenario = createPhasedSamplingFixtureScenario(0x11223344);
    const left = new SimulationRunner(scenario);
    const right = new SimulationRunner(scenario);

    for (let index = 0; index < 11; index += 1) {
      left.stepPhase();
      right.stepPhase();
      expect(left.getPhasedSamplingSnapshot()).toEqual(right.getPhasedSamplingSnapshot());
    }
    expect(left.getTraceSnapshot()).toEqual(right.getTraceSnapshot());
    expect(left.getMetricsSnapshot()).toEqual(right.getMetricsSnapshot());
    expect(left.getStateHash()).toBe(right.getStateHash());
  });

  it('applies phase-count and pattern changes only after reset', () => {
    const runner = new SimulationRunner(createPhasedSamplingFixtureScenario());
    runner.requestParameterMutation(CoreParameterId.phasedPhaseCount, 6);
    runner.requestParameterMutation(CoreParameterId.phasedPattern, 'vertical-stripes');
    runner.stepPhase();

    expect(runner.getSnapshot().phaseCount).toBe(4);
    expect(runner.getPhasedSamplingSnapshot()?.pattern).toBe('diagonal-lattice');
    expect(runner.getSnapshot().parameters.pendingReset).toHaveLength(2);

    runner.reset();
    expect(runner.getSnapshot().phaseCount).toBe(6);
    expect(runner.getPhasedSamplingSnapshot()?.pattern).toBe('vertical-stripes');
    expect(runner.getSnapshot()).toMatchObject({ frame: 0, phase: 0, tick: 0 });
  });
});
