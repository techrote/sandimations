import type { ParameterMutationMode, ParameterValue } from './definitions';
import { ParameterRegistry, ParameterValidationError } from './registry';

export interface ParameterMutationRecord {
  readonly sequence: number;
  readonly parameterId: string;
  readonly value: ParameterValue;
  readonly mode: ParameterMutationMode;
}

export interface ParameterValueRecord {
  readonly id: string;
  readonly value: ParameterValue;
}

export interface ParameterStoreSnapshot {
  readonly values: readonly ParameterValueRecord[];
  readonly nonDefaultValues: readonly ParameterValueRecord[];
  readonly pendingNextStep: readonly ParameterMutationRecord[];
  readonly pendingReset: readonly ParameterMutationRecord[];
}

function freezeMutation(record: ParameterMutationRecord): ParameterMutationRecord {
  return Object.freeze({ ...record });
}

function freezeValueRecord(record: ParameterValueRecord): ParameterValueRecord {
  return Object.freeze({ ...record });
}

export class ParameterStore {
  private readonly values = new Map<string, ParameterValue>();
  private readonly pendingNextStep: ParameterMutationRecord[] = [];
  private readonly pendingReset: ParameterMutationRecord[] = [];
  private sequence = 0;

  public constructor(
    private readonly registry: ParameterRegistry,
    initialValues: Readonly<Record<string, unknown>> = {},
  ) {
    for (const key of Object.keys(initialValues)) {
      if (!registry.has(key)) {
        throw new ParameterValidationError(`Unknown initial parameter id: ${key}.`);
      }
    }

    for (const definition of registry.list()) {
      const initial = Object.hasOwn(initialValues, definition.id)
        ? initialValues[definition.id]
        : definition.defaultValue;
      this.values.set(definition.id, registry.validate(definition.id, initial));
    }
  }

  public get(id: string): ParameterValue {
    this.registry.get(id);
    const value = this.values.get(id);
    if (value === undefined) {
      throw new Error(`Parameter store is missing registered parameter ${id}.`);
    }
    return value;
  }

  public getBoolean(id: string): boolean {
    const value = this.get(id);
    if (typeof value !== 'boolean') {
      throw new ParameterValidationError(`Parameter ${id} is not boolean.`);
    }
    return value;
  }

  public getNumber(id: string): number {
    const value = this.get(id);
    if (typeof value !== 'number') {
      throw new ParameterValidationError(`Parameter ${id} is not numeric.`);
    }
    return value;
  }

  public getString(id: string): string {
    const value = this.get(id);
    if (typeof value !== 'string') {
      throw new ParameterValidationError(`Parameter ${id} is not string-valued.`);
    }
    return value;
  }

  public requestMutation(id: string, value: unknown): ParameterMutationRecord {
    const definition = this.registry.get(id);
    const validated = this.registry.validate(id, value);
    const record = freezeMutation({
      sequence: this.sequence,
      parameterId: id,
      value: validated,
      mode: definition.mutation,
    });
    this.sequence += 1;

    if (definition.mutation === 'live') {
      this.values.set(id, validated);
    } else if (definition.mutation === 'next-step') {
      this.pendingNextStep.push(record);
    } else {
      this.pendingReset.push(record);
    }

    return record;
  }

  public applyNextStep(): readonly ParameterMutationRecord[] {
    return this.applyQueue(this.pendingNextStep);
  }

  public applyResetRequired(): readonly ParameterMutationRecord[] {
    return this.applyQueue(this.pendingReset);
  }

  public getSerializedValues(): Readonly<Record<string, ParameterValue>> {
    const output: Record<string, ParameterValue> = {};
    for (const definition of this.registry.list()) {
      const value = this.get(definition.id);
      if (definition.serialization === 'omit-default' && value === definition.defaultValue) {
        continue;
      }
      output[definition.id] = value;
    }
    return Object.freeze(output);
  }

  public getSnapshot(): ParameterStoreSnapshot {
    const values: ParameterValueRecord[] = [];
    const nonDefaultValues: ParameterValueRecord[] = [];

    for (const definition of this.registry.list()) {
      const record = freezeValueRecord({ id: definition.id, value: this.get(definition.id) });
      values.push(record);
      if (record.value !== definition.defaultValue) {
        nonDefaultValues.push(record);
      }
    }

    return Object.freeze({
      values: Object.freeze(values),
      nonDefaultValues: Object.freeze(nonDefaultValues),
      pendingNextStep: Object.freeze(this.pendingNextStep.map(freezeMutation)),
      pendingReset: Object.freeze(this.pendingReset.map(freezeMutation)),
    });
  }

  private applyQueue(queue: ParameterMutationRecord[]): readonly ParameterMutationRecord[] {
    const applied = queue.map(freezeMutation);
    for (const mutation of queue) {
      this.values.set(mutation.parameterId, mutation.value);
    }
    queue.length = 0;
    return Object.freeze(applied);
  }
}
