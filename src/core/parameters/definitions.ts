export type ParameterMutationMode = 'live' | 'next-step' | 'reset-required';
export type ParameterSerialization = 'always' | 'omit-default';
export type ParameterValue = boolean | number | string;

interface ParameterDefinitionBase {
  readonly id: string;
  readonly label: string;
  readonly help: string;
  readonly mutation: ParameterMutationMode;
  readonly serialization: ParameterSerialization;
}

export interface BooleanParameterDefinition extends ParameterDefinitionBase {
  readonly kind: 'boolean';
  readonly defaultValue: boolean;
}

export interface NumericParameterDefinition extends ParameterDefinitionBase {
  readonly kind: 'number' | 'integer';
  readonly defaultValue: number;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
}

export interface EnumParameterOption {
  readonly value: string;
  readonly label: string;
}

export interface EnumParameterDefinition extends ParameterDefinitionBase {
  readonly kind: 'enum';
  readonly defaultValue: string;
  readonly options: readonly EnumParameterOption[];
}

export type ParameterDefinition =
  BooleanParameterDefinition | NumericParameterDefinition | EnumParameterDefinition;

export const CoreParameterId = Object.freeze({
  sandEnabled: 'simulation.sand.enabled',
  sandTieBreak: 'simulation.sand.tie-break',
  seedVariant: 'simulation.seed-variant',
  chunkSize: 'scheduler.chunk.size',
  chunkSleepDelay: 'scheduler.chunk.sleep-delay',
  chunkActivityThreshold: 'scheduler.chunk.activity-threshold',
  chunkWakeRadius: 'scheduler.chunk.wake-radius',
} as const);

export const CORE_PARAMETER_DEFINITIONS: readonly ParameterDefinition[] = Object.freeze([
  Object.freeze({
    id: CoreParameterId.sandEnabled,
    label: 'Sand motion',
    help: 'Enable or freeze falling-sand updates without stopping the simulation clock.',
    kind: 'boolean',
    defaultValue: true,
    mutation: 'live',
    serialization: 'always',
  }),
  Object.freeze({
    id: CoreParameterId.sandTieBreak,
    label: 'Diagonal tie-break',
    help: 'Choose how sand resolves a frame where both downward diagonals are open.',
    kind: 'enum',
    defaultValue: 'seeded-random',
    options: Object.freeze([
      Object.freeze({ value: 'seeded-random', label: 'Seeded random' }),
      Object.freeze({ value: 'left-first', label: 'Left first' }),
      Object.freeze({ value: 'right-first', label: 'Right first' }),
    ]),
    mutation: 'next-step',
    serialization: 'always',
  }),
  Object.freeze({
    id: CoreParameterId.seedVariant,
    label: 'Seed variant',
    help: 'XOR a deterministic variant into the scenario seed on the next explicit reset.',
    kind: 'integer',
    defaultValue: 0,
    min: 0,
    max: 0xffffffff,
    step: 1,
    mutation: 'reset-required',
    serialization: 'always',
  }),
  Object.freeze({
    id: CoreParameterId.chunkSize,
    label: 'Chunk size',
    help: 'Cell width/height of the fixed teaching chunks. Applies when Reset rebuilds the scheduler.',
    kind: 'integer',
    defaultValue: 8,
    min: 4,
    max: 16,
    step: 1,
    mutation: 'reset-required',
    serialization: 'always',
  }),
  Object.freeze({
    id: CoreParameterId.chunkSleepDelay,
    label: 'Sleep delay',
    help: 'Consecutive quiet frames required before an active chunk becomes computationally dormant.',
    kind: 'integer',
    defaultValue: 3,
    min: 1,
    max: 20,
    step: 1,
    mutation: 'next-step',
    serialization: 'always',
  }),
  Object.freeze({
    id: CoreParameterId.chunkActivityThreshold,
    label: 'Activity threshold',
    help: 'Maximum cell moves a chunk may observe in a frame while still counting that frame as quiet.',
    kind: 'integer',
    defaultValue: 0,
    min: 0,
    max: 64,
    step: 1,
    mutation: 'next-step',
    serialization: 'always',
  }),
  Object.freeze({
    id: CoreParameterId.chunkWakeRadius,
    label: 'Wake neighborhood',
    help: 'Chunk-radius awakened by an explicit disturbance or cross-chunk material activity.',
    kind: 'integer',
    defaultValue: 1,
    min: 0,
    max: 2,
    step: 1,
    mutation: 'next-step',
    serialization: 'always',
  }),
]);
