import { describe, expect, it } from 'vitest';
import { TeachingModelEvidenceBackendV1 } from '../../src/adapters/evidence-backend';
import { CoreParameterId } from '../../src/core/parameters/definitions';
import { createCoreParameterRegistry } from '../../src/core/parameters/registry';
import { SimulationRunner } from '../../src/core/runner/runner';
import {
  createDefaultScenario,
  createPhasedSamplingFixtureScenario,
} from '../../src/core/scenario/scenario';
import { buildAppPresentationViewModel } from '../../src/presentation/app-view-model';
import { PresentationEvidenceAdapterV1 } from '../../src/presentation/evidence-adapter';
import { SimulationController } from '../../src/presentation/simulation-controller';

function createHarness() {
  const registry = createCoreParameterRegistry();
  const runner = new SimulationRunner(createDefaultScenario(0x2468ace0), registry);
  const controller = new SimulationController(runner);
  const evidence = new PresentationEvidenceAdapterV1(new TeachingModelEvidenceBackendV1(runner));
  const read = () =>
    buildAppPresentationViewModel(controller.getViewModel(), evidence.read(), registry);
  return { registry, runner, controller, evidence, read };
}

describe('app presentation view model', () => {
  it('builds trace-backed evaluated and blocked overlays from the latest evidence tick', () => {
    const harness = createHarness();
    harness.controller.stepFrame();

    const view = harness.read();
    const latestTick = view.world.latestEvidenceTick;
    expect(latestTick).toBe(0);
    expect(view.world.overlays.some((marker) => marker.kind === 'evaluated-now')).toBe(true);
    expect(view.world.overlays.every((marker) => marker.x >= 0 && marker.y >= 0)).toBe(true);
    expect(view.metrics.cells.examined).toBeGreaterThan(0);
    expect(view.legend.map((item) => item.kind)).toEqual([
      'evaluated-now',
      'active-not-selected',
      'sleeping',
      'newly-woken',
      'blocked-rejected',
    ]);
  });

  it('maps the real phased selected set to evaluated-now markers', () => {
    const registry = createCoreParameterRegistry();
    const runner = new SimulationRunner(createPhasedSamplingFixtureScenario(), registry);
    const controller = new SimulationController(runner);
    const adapter = new PresentationEvidenceAdapterV1(new TeachingModelEvidenceBackendV1(runner));

    controller.stepPhase();
    const evidence = adapter.read();
    const sampling = evidence.scheduler.sampling;
    expect(sampling).not.toBeNull();
    if (sampling == null) {
      throw new Error('Expected phased sampling evidence.');
    }

    const examined = evidence.traceRecords.filter(
      (record) => record.tick === sampling.lastExecutedTick && record.type === 'cell-examined',
    );
    expect(examined).toHaveLength(sampling.selectedCellCount);

    const view = buildAppPresentationViewModel(controller.getViewModel(), evidence, registry);
    const evaluated = view.world.overlays.filter((marker) => marker.kind === 'evaluated-now');
    const deferred = view.world.overlays.filter((marker) => marker.kind === 'active-not-selected');
    expect(evaluated).toHaveLength(sampling.selectedCellCount);
    expect(deferred).toHaveLength(sampling.activeCellCount - sampling.selectedCellCount);
    expect(view.world.latestEvidenceTick).toBe(sampling.lastExecutedTick);
  });

  it('derives current and pending parameter state from registry metadata and evidence', () => {
    const harness = createHarness();

    harness.controller.requestParameterMutation(CoreParameterId.sandTieBreak, 'left-first');
    harness.controller.requestParameterMutation(CoreParameterId.seedVariant, 42);
    let view = harness.read();

    const tieBreak = view.parameters.find(
      (parameter) => parameter.definition.id === CoreParameterId.sandTieBreak,
    );
    const seedVariant = view.parameters.find(
      (parameter) => parameter.definition.id === CoreParameterId.seedVariant,
    );
    expect(tieBreak).toMatchObject({
      currentValue: 'seeded-random',
      pendingValue: 'left-first',
      pending: true,
      timingLabel: 'Next phase',
    });
    expect(seedVariant).toMatchObject({
      currentValue: 0,
      pendingValue: 42,
      pending: true,
      timingLabel: 'Reset required',
    });

    harness.controller.stepPhase();
    view = harness.read();
    expect(
      view.parameters.find((parameter) => parameter.definition.id === CoreParameterId.sandTieBreak),
    ).toMatchObject({ currentValue: 'left-first', pendingValue: null, pending: false });
    expect(
      view.parameters.find((parameter) => parameter.definition.id === CoreParameterId.seedVariant),
    ).toMatchObject({ currentValue: 0, pendingValue: 42, pending: true });

    harness.controller.reset();
    view = harness.read();
    expect(
      view.parameters.find((parameter) => parameter.definition.id === CoreParameterId.seedVariant),
    ).toMatchObject({ currentValue: 42, pendingValue: null, pending: false });
  });

  it('keeps presentation reads side-effect free while exposing recent evidence summaries', () => {
    const harness = createHarness();
    harness.runner.stepFrames(2);
    const before = harness.runner.getStateHash();

    const first = harness.read();
    const second = harness.read();

    expect(harness.runner.getStateHash()).toBe(before);
    expect(second).toEqual(first);
    expect(first.recentEvents.length).toBeGreaterThan(0);
    expect(first.traceRetention.retainedRecords).toBeGreaterThan(0);
  });
});
