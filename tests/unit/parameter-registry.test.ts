import { describe, expect, it } from 'vitest';
import {
  CoreParameterId,
  type ParameterDefinition,
} from '../../src/core/parameters/definitions';
import {
  createCoreParameterRegistry,
  ParameterRegistry,
  ParameterValidationError,
} from '../../src/core/parameters/registry';

describe('ParameterRegistry', () => {
  it('exposes stable metadata for the core illustrative parameters', () => {
    const registry = createCoreParameterRegistry();
    expect(registry.list().map((definition) => definition.id)).toEqual([
      CoreParameterId.seedVariant,
      CoreParameterId.sandEnabled,
      CoreParameterId.sandTieBreak,
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
