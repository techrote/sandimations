import { describe, expect, it } from 'vitest';
import { CoreParameterId, type ParameterDefinition } from '../../src/core/parameters/definitions';
import {
  createCoreParameterRegistry,
  ParameterRegistry,
  ParameterValidationError,
} from '../../src/core/parameters/registry';

describe('ParameterRegistry', () => {
  it('exposes stable metadata for the core illustrative parameters', () => {
    const registry = createCoreParameterRegistry();
    expect(registry.list().map((definition) => definition.id)).toEqual([
      CoreParameterId.chunkActivityThreshold,
      CoreParameterId.chunkSize,
      CoreParameterId.chunkSleepDelay,
      CoreParameterId.chunkWakeRadius,
      CoreParameterId.phasedPattern,
      CoreParameterId.phasedPhaseCount,
      CoreParameterId.sandEnabled,
      CoreParameterId.sandTieBreak,
      CoreParameterId.seedVariant,
    ]);
    expect(registry.get(CoreParameterId.sandEnabled)).toMatchObject({
      kind: 'boolean',
      mutation: 'live',
      serialization: 'always',
    });
    expect(registry.get(CoreParameterId.sandTieBreak)).toMatchObject({
      kind: 'enum',
      mutation: 'next-step',
    });
    expect(registry.get(CoreParameterId.seedVariant)).toMatchObject({
      kind: 'integer',
      mutation: 'reset-required',
    });
    expect(registry.get(CoreParameterId.chunkSize)).toMatchObject({
      kind: 'integer',
      defaultValue: 8,
      mutation: 'reset-required',
    });
    expect(registry.get(CoreParameterId.chunkSleepDelay)).toMatchObject({
      kind: 'integer',
      defaultValue: 3,
      mutation: 'next-step',
    });
    expect(registry.get(CoreParameterId.chunkActivityThreshold)).toMatchObject({
      kind: 'integer',
      defaultValue: 0,
      mutation: 'next-step',
    });
    expect(registry.get(CoreParameterId.chunkWakeRadius)).toMatchObject({
      kind: 'integer',
      defaultValue: 1,
      mutation: 'next-step',
    });
    expect(registry.get(CoreParameterId.phasedPhaseCount)).toMatchObject({
      kind: 'integer',
      defaultValue: 4,
      mutation: 'reset-required',
    });
    expect(registry.get(CoreParameterId.phasedPattern)).toMatchObject({
      kind: 'enum',
      defaultValue: 'diagonal-lattice',
      mutation: 'reset-required',
    });
  });

  it('rejects invalid values predictably', () => {
    const registry = createCoreParameterRegistry();
    expect(() => registry.validate(CoreParameterId.sandEnabled, 1)).toThrow(
      ParameterValidationError,
    );
    expect(() => registry.validate(CoreParameterId.sandTieBreak, 'zigzag')).toThrow(
      ParameterValidationError,
    );
    expect(() => registry.validate(CoreParameterId.seedVariant, -1)).toThrow(
      ParameterValidationError,
    );
    expect(() => registry.validate(CoreParameterId.seedVariant, 1.25)).toThrow(
      ParameterValidationError,
    );
    expect(() => registry.validate(CoreParameterId.chunkSize, 3)).toThrow(ParameterValidationError);
    expect(() => registry.validate(CoreParameterId.chunkWakeRadius, 3)).toThrow(
      ParameterValidationError,
    );
    expect(() => registry.validate(CoreParameterId.phasedPhaseCount, 1)).toThrow(
      ParameterValidationError,
    );
    expect(() => registry.validate(CoreParameterId.phasedPattern, 'random')).toThrow(
      ParameterValidationError,
    );
  });

  it('rejects duplicate and malformed definitions', () => {
    const duplicate: ParameterDefinition = {
      id: 'demo.value',
      label: 'Demo',
      help: 'A test value.',
      kind: 'boolean',
      defaultValue: false,
      mutation: 'live',
      serialization: 'always',
    };
    expect(() => new ParameterRegistry([duplicate, duplicate])).toThrow(ParameterValidationError);
    expect(
      () =>
        new ParameterRegistry([
          {
            ...duplicate,
            id: 'Demo Value',
          },
        ]),
    ).toThrow(ParameterValidationError);
  });
});
