import { describe, expect, it } from 'vitest';
import { CoreParameterId } from '../../src/core/parameters/definitions';
import { createCoreParameterRegistry } from '../../src/core/parameters/registry';
import { ParameterStore } from '../../src/core/parameters/store';

describe('ParameterStore mutation timing', () => {
  it('applies live mutations immediately', () => {
    const store = new ParameterStore(createCoreParameterRegistry());
    const mutation = store.requestMutation(CoreParameterId.sandEnabled, false);

    expect(mutation).toMatchObject({ mode: 'live', sequence: 0 });
    expect(store.getBoolean(CoreParameterId.sandEnabled)).toBe(false);
    expect(store.getSnapshot().pendingNextStep).toHaveLength(0);
    expect(store.getSnapshot().pendingReset).toHaveLength(0);
  });

  it('queues next-step mutations in deterministic request order', () => {
    const store = new ParameterStore(createCoreParameterRegistry());
    store.requestMutation(CoreParameterId.sandTieBreak, 'left-first');
    store.requestMutation(CoreParameterId.sandTieBreak, 'right-first');

    expect(store.getString(CoreParameterId.sandTieBreak)).toBe('seeded-random');
    expect(store.getSnapshot().pendingNextStep.map((entry) => entry.sequence)).toEqual([0, 1]);

    const applied = store.applyNextStep();
    expect(applied.map((entry) => entry.value)).toEqual(['left-first', 'right-first']);
    expect(store.getString(CoreParameterId.sandTieBreak)).toBe('right-first');
    expect(store.getSnapshot().pendingNextStep).toHaveLength(0);
  });

  it('holds reset-required mutations until an explicit reset boundary', () => {
    const store = new ParameterStore(createCoreParameterRegistry());
    store.requestMutation(CoreParameterId.seedVariant, 7);

    expect(store.getNumber(CoreParameterId.seedVariant)).toBe(0);
    expect(store.applyNextStep()).toHaveLength(0);
    expect(store.getNumber(CoreParameterId.seedVariant)).toBe(0);

    const applied = store.applyResetRequired();
    expect(applied).toHaveLength(1);
    expect(store.getNumber(CoreParameterId.seedVariant)).toBe(7);
    expect(store.getSnapshot().pendingReset).toHaveLength(0);
  });

  it('serializes registered values without leaking mutation queues', () => {
    const store = new ParameterStore(createCoreParameterRegistry());
    store.requestMutation(CoreParameterId.sandEnabled, false);
    store.requestMutation(CoreParameterId.sandTieBreak, 'left-first');

    expect(store.getSerializedValues()).toEqual({
      [CoreParameterId.seedVariant]: 0,
      [CoreParameterId.sandEnabled]: false,
      [CoreParameterId.sandTieBreak]: 'seeded-random',
    });
    expect(store.getSnapshot().pendingNextStep).toHaveLength(1);
  });
});
