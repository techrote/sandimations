import {
  CORE_PARAMETER_DEFINITIONS,
  type EnumParameterDefinition,
  type NumericParameterDefinition,
  type ParameterDefinition,
  type ParameterValue,
} from './definitions';

const PARAMETER_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;

export class ParameterValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ParameterValidationError';
  }
}

function cloneDefinition(definition: ParameterDefinition): ParameterDefinition {
  if (definition.kind === 'enum') {
    return Object.freeze({
      ...definition,
      options: Object.freeze(
        definition.options.map((option) =>
          Object.freeze({ value: option.value, label: option.label }),
        ),
      ),
    });
  }
  return Object.freeze({ ...definition });
}

function assertCommonDefinition(definition: ParameterDefinition): void {
  if (!PARAMETER_ID_PATTERN.test(definition.id)) {
    throw new ParameterValidationError(`Invalid parameter id: ${definition.id}.`);
  }
  if (definition.label.trim().length === 0) {
    throw new ParameterValidationError(`Parameter ${definition.id} must have a label.`);
  }
  if (definition.help.trim().length === 0) {
    throw new ParameterValidationError(`Parameter ${definition.id} must have help text.`);
  }
}

function assertNumericDefinition(definition: NumericParameterDefinition): void {
  if (!Number.isFinite(definition.min) || !Number.isFinite(definition.max)) {
    throw new ParameterValidationError(`Parameter ${definition.id} must have finite bounds.`);
  }
  if (definition.min > definition.max) {
    throw new ParameterValidationError(`Parameter ${definition.id} has min > max.`);
  }
  if (
    definition.step !== undefined &&
    (!Number.isFinite(definition.step) || definition.step <= 0)
  ) {
    throw new ParameterValidationError(`Parameter ${definition.id} must have a positive step.`);
  }
  if (definition.kind === 'integer') {
    if (!Number.isInteger(definition.min) || !Number.isInteger(definition.max)) {
      throw new ParameterValidationError(
        `Integer parameter ${definition.id} requires integer bounds.`,
      );
    }
  }
}

function assertEnumDefinition(definition: EnumParameterDefinition): void {
  if (definition.options.length === 0) {
    throw new ParameterValidationError(`Enum parameter ${definition.id} requires options.`);
  }
  const values = new Set<string>();
  for (const option of definition.options) {
    if (option.value.length === 0 || option.label.trim().length === 0) {
      throw new ParameterValidationError(`Enum parameter ${definition.id} has an invalid option.`);
    }
    if (values.has(option.value)) {
      throw new ParameterValidationError(
        `Enum parameter ${definition.id} repeats option ${option.value}.`,
      );
    }
    values.add(option.value);
  }
}

export function validateParameterValue(
  definition: ParameterDefinition,
  value: unknown,
): ParameterValue {
  if (definition.kind === 'boolean') {
    if (typeof value !== 'boolean') {
      throw new ParameterValidationError(`Parameter ${definition.id} requires a boolean.`);
    }
    return value;
  }

  if (definition.kind === 'enum') {
    if (typeof value !== 'string' || !definition.options.some((option) => option.value === value)) {
      throw new ParameterValidationError(`Parameter ${definition.id} has an invalid enum value.`);
    }
    return value;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ParameterValidationError(`Parameter ${definition.id} requires a finite number.`);
  }
  if (definition.kind === 'integer' && !Number.isInteger(value)) {
    throw new ParameterValidationError(`Parameter ${definition.id} requires an integer.`);
  }
  if (value < definition.min || value > definition.max) {
    throw new ParameterValidationError(
      `Parameter ${definition.id} must be between ${definition.min} and ${definition.max}.`,
    );
  }
  return value;
}

export class ParameterRegistry {
  private readonly definitions: readonly ParameterDefinition[];
  private readonly byId: ReadonlyMap<string, ParameterDefinition>;

  public constructor(definitions: readonly ParameterDefinition[]) {
    const normalized = definitions.map((definition) => {
      assertCommonDefinition(definition);
      if (definition.kind === 'number' || definition.kind === 'integer') {
        assertNumericDefinition(definition);
      } else if (definition.kind === 'enum') {
        assertEnumDefinition(definition);
      }
      validateParameterValue(definition, definition.defaultValue);
      return cloneDefinition(definition);
    });

    normalized.sort((left, right) => left.id.localeCompare(right.id));
    for (let index = 1; index < normalized.length; index += 1) {
      if (normalized[index - 1]?.id === normalized[index]?.id) {
        throw new ParameterValidationError(`Duplicate parameter id: ${normalized[index]?.id}.`);
      }
    }

    this.definitions = Object.freeze(normalized);
    this.byId = new Map(normalized.map((definition) => [definition.id, definition]));
  }

  public list(): readonly ParameterDefinition[] {
    return this.definitions;
  }

  public has(id: string): boolean {
    return this.byId.has(id);
  }

  public get(id: string): ParameterDefinition {
    const definition = this.byId.get(id);
    if (definition === undefined) {
      throw new ParameterValidationError(`Unknown parameter id: ${id}.`);
    }
    return definition;
  }

  public validate(id: string, value: unknown): ParameterValue {
    return validateParameterValue(this.get(id), value);
  }

  public defaults(): Readonly<Record<string, ParameterValue>> {
    const values: Record<string, ParameterValue> = {};
    for (const definition of this.definitions) {
      values[definition.id] = definition.defaultValue;
    }
    return Object.freeze(values);
  }
}

export function createCoreParameterRegistry(): ParameterRegistry {
  return new ParameterRegistry(CORE_PARAMETER_DEFINITIONS);
}
