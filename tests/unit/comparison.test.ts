import { describe, expect, it } from 'vitest';
import {
  createFullScanReferenceScenario,
  DeterministicComparison,
  measureMaterialStateDivergence,
} from '../../src/core/comparison/comparison';
import { Material } from '../../src/core/model/material';
import type { WorldSnapshot } from '../../src/core/model/world';
import { CoreParameterId } from '../../src/core/parameters/definitions';
import { SimulationRunner } from '../../src/core/runner/runner';
import {
  createPhasedSamplingFixtureScenario,
  createSleepWakeFixtureScenario,
} from '../../src/core/scenario/scenario';
import { normalizeScenario } from '../../src/core/scenario/schema';

describe('SD-008 deterministic comparison', () => {
  it('uses independent runner state while matching standalone baseline and optimized execution', () => {
    const scenario = createPhasedSamplingFixtureScenario(0x13572468);
    const comparison = new DeterministicComparison(scenario);
    const expectedBaseline = new SimulationRunner(createFullScanReferenceScenario(scenario));
    const expectedOptimized = new SimulationRunner(scenario);

    comparison.stepPhase();
    expectedBaseline.stepFrame();
    expectedOptimized.stepPhase();

    expect(comparison.getBaselineRunner().getStateHash()).toBe(expectedBaseline.getStateHash());
    expect(comparison.getOptimizedRunner().getStateHash()).toBe(expectedOptimized.getStateHash());
    expect(comparison.getBaselineRunner().getSnapshot().world).toEqual(
      expectedBaseline.getSnapshot().world,
    );
    expect(comparison.getOptimizedRunner().getSnapshot().world).toEqual(
      expectedOptimized.getSnapshot().world,
    );
  });

  it('delivers ordered deterministic scenario events to both runners at the same comparison tick', () => {
    const source = createPhasedSamplingFixtureScenario();
    const scenario = normalizeScenario({
      ...source,
      id: 'sd-008-event-delivery',
      events: [
        {
          type: 'parameter',
          tick: 0,
          order: 0,
          parameterId: CoreParameterId.sandEnabled,
          value: false,
        },
        {
          type: 'input',
          tick: 0,
          order: 1,
          input: { type: 'set-cell', x: 2, y: 2, material: Material.Sand },
        },
      ],
    });
    const comparison = new DeterministicComparison(scenario);

    comparison.stepPhase();

    const baseline = comparison.getBaselineRunner().getSnapshot();
    const optimized = comparison.getOptimizedRunner().getSnapshot();
    expect(baseline.tick).toBe(1);
    expect(optimized.tick).toBe(1);
    expect(comparison.getBaselineRunner().getParameterValue(CoreParameterId.sandEnabled)).toBe(false);
    expect(comparison.getOptimizedRunner().getParameterValue(CoreParameterId.sandEnabled)).toBe(false);
    expect(baseline.world).toEqual(optimized.world);
    expect(baseline.world.cells[2 * baseline.world.width + 2]).toBe(Material.Sand);
  });

  it('reports provenance and a deterministic phased work ratio against one full scan per tick', () => {
    const left = new DeterministicComparison(createPhasedSamplingFixtureScenario());
    const right = new DeterministicComparison(createPhasedSamplingFixtureScenario());

    left.stepFrame();
    right.stepFrame();
    const leftSnapshot = left.getSnapshot();
    const rightSnapshot = right.getSnapshot();

    expect(leftSnapshot).toEqual(rightSnapshot);
    expect(leftSnapshot.baseline.provenance.strategyId).toBe('phase-clock-v1');
    expect(leftSnapshot.optimized.provenance.strategyId).toBe('phased-sampling-v1');
    expect(leftSnapshot.baseline.provenance.scenarioId).toBe(leftSnapshot.optimized.provenance.scenarioId);
    expect(leftSnapshot.baseline.metrics.phases.completed).toBe(4);
    expect(leftSnapshot.optimized.metrics.phases.completed).toBe(4);
    expect(leftSnapshot.workRatio.optimizedToBaseline).toBe(0.25);
    expect(leftSnapshot.workRatio.reductionFraction).toBe(0.75);
  });

  it('shows deterministic work reduction once chunk sleep avoids evaluation', () => {
    const comparison = new DeterministicComparison(createSleepWakeFixtureScenario());
    comparison.stepFrames(8);
    const snapshot = comparison.getSnapshot();

    expect(snapshot.optimized.metrics.chunks.sleeping).toBeGreaterThan(0);
    expect(snapshot.optimized.metrics.cells.examined).toBeLessThan(snapshot.baseline.metrics.cells.examined);
    expect(snapshot.workRatio.optimizedToBaseline).not.toBeNull();
    expect(snapshot.workRatio.optimizedToBaseline as number).toBeLessThan(1);
  });

  it('defines normalized material-state Hamming divergence with stable range and mismatch count', () => {
    const baseline: WorldSnapshot = {
      width: 3,
      height: 2,
      cells: [Material.Wall, Material.Empty, Material.Sand, Material.Wall, Material.Sand, Material.Wall],
    };
    const optimized: WorldSnapshot = {
      width: 3,
      height: 2,
      cells: [Material.Wall, Material.Sand, Material.Empty, Material.Wall, Material.Sand, Material.Wall],
    };

    expect(measureMaterialStateDivergence(baseline, baseline)).toMatchObject({
      mismatchedCells: 0,
      totalCells: 6,
      normalized: 0,
    });
    expect(measureMaterialStateDivergence(baseline, optimized)).toMatchObject({
      mismatchedCells: 2,
      totalCells: 6,
      normalized: 1 / 3,
    });
    expect(() =>
      measureMaterialStateDivergence(baseline, { width: 4, height: 2, cells: optimized.cells }),
    ).toThrow('identical dimensions');
  });

  it('replays reset and frame stepping reproducibly', () => {
    const comparison = new DeterministicComparison(createPhasedSamplingFixtureScenario(0x55667788));
    comparison.stepFrames(3);
    const first = comparison.getSnapshot();
    const firstBaselineHash = comparison.getBaselineRunner().getStateHash();
    const firstOptimizedHash = comparison.getOptimizedRunner().getStateHash();

    comparison.reset();
    comparison.stepFrames(3);

    expect(comparison.getSnapshot()).toEqual(first);
    expect(comparison.getBaselineRunner().getStateHash()).toBe(firstBaselineHash);
    expect(comparison.getOptimizedRunner().getStateHash()).toBe(firstOptimizedHash);
  });

  it('keeps reset-required phase-count changes synchronized at the comparison-clock level', () => {
    const comparison = new DeterministicComparison(createPhasedSamplingFixtureScenario());
    comparison.requestParameterMutation(CoreParameterId.phasedPhaseCount, 6);
    comparison.reset();

    expect(comparison.getSnapshot()).toMatchObject({
      baseline: { frame: 0, phase: 0, tick: 0, phaseCount: 6 },
      optimized: { frame: 0, phase: 0, tick: 0, phaseCount: 6 },
    });
    expect(comparison.getBaselineRunner().getSnapshot().phaseCount).toBe(1);
    expect(comparison.getOptimizedRunner().getSnapshot().phaseCount).toBe(6);

    comparison.stepFrame();
    expect(comparison.getSnapshot().optimized.tick).toBe(6);
    expect(comparison.getBaselineRunner().getSnapshot().tick).toBe(6);
  });
});
