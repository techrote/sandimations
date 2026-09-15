import { describe, expect, it } from 'vitest';
import { Material } from '../../src/core/model/material';
import { CoreParameterId } from '../../src/core/parameters/definitions';
import { SimulationRunner } from '../../src/core/runner/runner';
import {
  createDefaultScenario,
  deserializeScenario,
  normalizeScenario,
  serializeScenario,
} from '../../src/core/scenario/scenario';

describe('scenario replay and runner parameter integration', () => {
  it('replays ordered parameter/input events identically after serialization and reset', () => {
    const base = createDefaultScenario(0x1234abcd);
    const scenario = normalizeScenario({
      ...base,
      id: 'event-replay-fixture',
      events: [
        {
          type: 'input',
          tick: 0,
          order: 1,
          input: { type: 'set-cell', x: 2, y: 2, material: Material.Sand },
        },
        {
          type: 'parameter',
          tick: 1,
          order: 0,
          parameterId: CoreParameterId.sandEnabled,
          value: false,
        },
        {
          type: 'parameter',
          tick: 0,
          order: 0,
          parameterId: CoreParameterId.sandTieBreak,
          value: 'left-first',
        },
      ],
    });
    const roundTrip = deserializeScenario(serializeScenario(scenario));
    const first = new SimulationRunner(scenario);
    const second = new SimulationRunner(roundTrip);

    for (let frame = 0; frame < 8; frame += 1) {
      first.stepFrame();
      second.stepFrame();
      expect(second.getStateHash()).toBe(first.getStateHash());
      expect(second.getSnapshot()).toEqual(first.getSnapshot());
    }

    const completedHash = first.getStateHash();
    expect(first.getParameterValue(CoreParameterId.sandTieBreak)).toBe('left-first');
    expect(first.getParameterValue(CoreParameterId.sandEnabled)).toBe(false);

    first.reset();
    expect(first.getParameterValue(CoreParameterId.sandTieBreak)).toBe('seeded-random');
    expect(first.getParameterValue(CoreParameterId.sandEnabled)).toBe(true);
    first.stepFrames(8);
    expect(first.getStateHash()).toBe(completedHash);
  });

  it('applies live, next-step, and reset-required mutations at their declared boundaries', () => {
    const scenario = createDefaultScenario(0x01020304);
    const runner = new SimulationRunner(scenario);
    const initialWorld = runner.getSnapshot().world;

    runner.requestParameterMutation(CoreParameterId.sandEnabled, false);
    expect(runner.getParameterValue(CoreParameterId.sandEnabled)).toBe(false);
    runner.stepFrame();
    expect(runner.getSnapshot().world).toEqual(initialWorld);

    runner.requestParameterMutation(CoreParameterId.sandTieBreak, 'right-first');
    expect(runner.getParameterValue(CoreParameterId.sandTieBreak)).toBe('seeded-random');
    expect(runner.getSnapshot().parameters.pendingNextStep).toHaveLength(1);
    runner.stepPhase();
    expect(runner.getParameterValue(CoreParameterId.sandTieBreak)).toBe('right-first');
    expect(runner.getSnapshot().parameters.pendingNextStep).toHaveLength(0);

    runner.requestParameterMutation(CoreParameterId.seedVariant, 0x55aa);
    expect(runner.getParameterValue(CoreParameterId.seedVariant)).toBe(0);
    expect(runner.getSnapshot().parameters.pendingReset).toHaveLength(1);
    runner.reset();
    expect(runner.getParameterValue(CoreParameterId.seedVariant)).toBe(0x55aa);
    expect(runner.getParameterValue(CoreParameterId.sandEnabled)).toBe(true);
    expect(runner.getParameterValue(CoreParameterId.sandTieBreak)).toBe('seeded-random');
    expect(runner.getSnapshot().prngState).toBe((scenario.seed ^ 0x55aa) >>> 0);

    runner.stepFrame();
    runner.reset();
    expect(runner.getParameterValue(CoreParameterId.seedVariant)).toBe(0x55aa);
    expect(runner.getSnapshot().prngState).toBe((scenario.seed ^ 0x55aa) >>> 0);
  });

  it('includes non-default and pending deterministic parameter state in the state hash', () => {
    const runner = new SimulationRunner(createDefaultScenario());
    const initial = runner.getStateHash();

    runner.requestParameterMutation(CoreParameterId.sandTieBreak, 'left-first');
    const pending = runner.getStateHash();
    expect(pending).not.toBe(initial);

    runner.stepPhase();
    const applied = runner.getStateHash();
    expect(applied).not.toBe(initial);
    expect(applied).not.toBe(pending);
  });
});
