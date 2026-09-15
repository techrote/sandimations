import { isMaterial, type Material } from '../model/material';
import { LogicalWorld, type WorldSnapshot } from '../model/world';
import type { ParameterValue } from '../parameters/definitions';
import { createCoreParameterRegistry, ParameterRegistry } from '../parameters/registry';
import type { RunnerInput } from '../runner/input';
import { canonicalJsonStringify } from './canonical-json';

export const SCENARIO_SCHEMA_VERSION = 1 as const;

export interface ScenarioSimulationV1 {
  readonly model: 'falling-sand-v1';
}

export interface ScenarioSchedulerV1 {
  readonly strategy: 'phase-clock-v1';
  readonly phaseCount: number;
}

export interface ScenarioPresentationV1 {
  readonly defaultPlaybackRate: number;
  readonly showGrid: boolean;
  readonly notes?: string;
}

interface ScenarioEventBase {
  readonly tick: number;
  readonly order: number;
}

export interface ScenarioParameterEventV1 extends ScenarioEventBase {
  readonly type: 'parameter';
  readonly parameterId: string;
  readonly value: ParameterValue;
}

export interface ScenarioInputEventV1 extends ScenarioEventBase {
  readonly type: 'input';
  readonly input: RunnerInput;
}

export type ScenarioEventV1 = ScenarioParameterEventV1 | ScenarioInputEventV1;

export interface CoreScenario {
  readonly version: typeof SCENARIO_SCHEMA_VERSION;
  readonly id: string;
  readonly title: string;
  readonly seed: number;
  readonly simulation: ScenarioSimulationV1;
  readonly scheduler: ScenarioSchedulerV1;
  readonly world: WorldSnapshot;
  readonly parameters: Readonly<Record<string, ParameterValue>>;
  readonly events: readonly ScenarioEventV1[];
  readonly presentation: ScenarioPresentationV1;
}

export class ScenarioValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ScenarioValidationError';
  }
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ScenarioValidationError(`${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ScenarioValidationError(`${path} must be a non-empty string.`);
  }
  return value;
}

function requireInteger(value: unknown, path: string, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new ScenarioValidationError(
      `${path} must be an integer between ${minimum} and ${maximum}.`,
    );
  }
  return value as number;
}

function normalizeWorld(value: unknown): WorldSnapshot {
  const source = asRecord(value, '$.world');
  const width = requireInteger(source.width, '$.world.width', 3, 4096);
  const height = requireInteger(source.height, '$.world.height', 2, 4096);
  if (!Array.isArray(source.cells)) {
    throw new ScenarioValidationError('$.world.cells must be an array.');
  }

  const cells: Material[] = source.cells.map((entry, index) => {
    if (typeof entry !== 'number' || !isMaterial(entry)) {
      throw new ScenarioValidationError(`$.world.cells[${index}] is not a known material.`);
    }
    return entry;
  });

  try {
    return new LogicalWorld({ width, height, cells }).toSnapshot();
  } catch (error) {
    throw new ScenarioValidationError(
      `$.world is invalid: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function normalizeParameters(
  value: unknown,
  registry: ParameterRegistry,
): Readonly<Record<string, ParameterValue>> {
  const source = value === undefined ? {} : asRecord(value, '$.parameters');

  for (const id of Object.keys(source)) {
    if (!registry.has(id)) {
      throw new ScenarioValidationError(`$.parameters contains unknown parameter ${id}.`);
    }
  }

  const output: Record<string, ParameterValue> = {};
  for (const definition of registry.list()) {
    const candidate = Object.hasOwn(source, definition.id)
      ? source[definition.id]
      : definition.defaultValue;
    try {
      const validated = registry.validate(definition.id, candidate);
      if (definition.serialization === 'omit-default' && validated === definition.defaultValue) {
        continue;
      }
      output[definition.id] = validated;
    } catch (error) {
      throw new ScenarioValidationError(
        `$.parameters.${definition.id} is invalid: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return Object.freeze(output);
}

function normalizeRunnerInput(value: unknown, world: WorldSnapshot, path: string): RunnerInput {
  const source = asRecord(value, path);
  if (source.type !== 'set-cell') {
    throw new ScenarioValidationError(`${path}.type must be "set-cell".`);
  }
  const x = requireInteger(source.x, `${path}.x`, 0, world.width - 1);
  const y = requireInteger(source.y, `${path}.y`, 0, world.height - 1);
  if (typeof source.material !== 'number' || !isMaterial(source.material)) {
    throw new ScenarioValidationError(`${path}.material is not a known material.`);
  }
  return Object.freeze({ type: 'set-cell', x, y, material: source.material });
}

function normalizeEvents(
  value: unknown,
  registry: ParameterRegistry,
  world: WorldSnapshot,
): readonly ScenarioEventV1[] {
  if (value === undefined) {
    return Object.freeze([]);
  }
  if (!Array.isArray(value)) {
    throw new ScenarioValidationError('$.events must be an array.');
  }

  const events = value.map((entry, index): ScenarioEventV1 => {
    const path = `$.events[${index}]`;
    const source = asRecord(entry, path);
    const tick = requireInteger(source.tick, `${path}.tick`, 0, Number.MAX_SAFE_INTEGER);
    const order = requireInteger(source.order, `${path}.order`, 0, Number.MAX_SAFE_INTEGER);

    if (source.type === 'parameter') {
      const parameterId = requireString(source.parameterId, `${path}.parameterId`);
      if (!registry.has(parameterId)) {
        throw new ScenarioValidationError(`${path} references unknown parameter ${parameterId}.`);
      }
      const definition = registry.get(parameterId);
      if (definition.mutation === 'reset-required') {
        throw new ScenarioValidationError(
          `${path} targets reset-required parameter ${parameterId}; encode its initial value instead.`,
        );
      }
      let validated: ParameterValue;
      try {
        validated = registry.validate(parameterId, source.value);
      } catch (error) {
        throw new ScenarioValidationError(
          `${path}.value is invalid: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      return Object.freeze({ type: 'parameter', tick, order, parameterId, value: validated });
    }

    if (source.type === 'input') {
      return Object.freeze({
        type: 'input',
        tick,
        order,
        input: normalizeRunnerInput(source.input, world, `${path}.input`),
      });
    }

    throw new ScenarioValidationError(`${path}.type must be "parameter" or "input".`);
  });

  events.sort((left, right) => left.tick - right.tick || left.order - right.order);
  for (let index = 1; index < events.length; index += 1) {
    const previous = events[index - 1];
    const current = events[index];
    if (previous?.tick === current?.tick && previous.order === current.order) {
      throw new ScenarioValidationError(
        `$.events contains duplicate schedule position tick=${current.tick}, order=${current.order}.`,
      );
    }
  }

  return Object.freeze(events);
}

function normalizePresentation(value: unknown): ScenarioPresentationV1 {
  if (value === undefined) {
    return Object.freeze({ defaultPlaybackRate: 1, showGrid: true });
  }
  const source = asRecord(value, '$.presentation');
  const defaultPlaybackRate = source.defaultPlaybackRate ?? 1;
  if (
    typeof defaultPlaybackRate !== 'number' ||
    !Number.isFinite(defaultPlaybackRate) ||
    defaultPlaybackRate <= 0
  ) {
    throw new ScenarioValidationError('$.presentation.defaultPlaybackRate must be positive.');
  }
  const showGrid = source.showGrid ?? true;
  if (typeof showGrid !== 'boolean') {
    throw new ScenarioValidationError('$.presentation.showGrid must be boolean.');
  }
  if (source.notes !== undefined && typeof source.notes !== 'string') {
    throw new ScenarioValidationError('$.presentation.notes must be a string.');
  }

  return Object.freeze({
    defaultPlaybackRate,
    showGrid,
    ...(source.notes === undefined ? {} : { notes: source.notes }),
  });
}

export function normalizeScenario(
  value: unknown,
  registry: ParameterRegistry = createCoreParameterRegistry(),
): CoreScenario {
  const source = asRecord(value, '$');
  if (source.version !== SCENARIO_SCHEMA_VERSION) {
    throw new ScenarioValidationError(
      `Unsupported scenario version ${String(source.version)}; expected ${SCENARIO_SCHEMA_VERSION}.`,
    );
  }

  const id = requireString(source.id, '$.id');
  const title = requireString(source.title, '$.title');
  const seed = requireInteger(source.seed, '$.seed', 0, 0xffffffff) >>> 0;

  const simulation = asRecord(source.simulation, '$.simulation');
  if (simulation.model !== 'falling-sand-v1') {
    throw new ScenarioValidationError('$.simulation.model must be "falling-sand-v1".');
  }

  const scheduler = asRecord(source.scheduler, '$.scheduler');
  if (scheduler.strategy !== 'phase-clock-v1') {
    throw new ScenarioValidationError('$.scheduler.strategy must be "phase-clock-v1".');
  }
  const phaseCount = requireInteger(scheduler.phaseCount, '$.scheduler.phaseCount', 1, 64);
  const world = normalizeWorld(source.world);
  const parameters = normalizeParameters(source.parameters, registry);
  const events = normalizeEvents(source.events, registry, world);
  const presentation = normalizePresentation(source.presentation);

  return Object.freeze({
    version: SCENARIO_SCHEMA_VERSION,
    id,
    title,
    seed,
    simulation: Object.freeze({ model: 'falling-sand-v1' }),
    scheduler: Object.freeze({ strategy: 'phase-clock-v1', phaseCount }),
    world,
    parameters,
    events,
    presentation,
  });
}

export function serializeScenario(
  scenario: CoreScenario,
  registry: ParameterRegistry = createCoreParameterRegistry(),
): string {
  return canonicalJsonStringify(normalizeScenario(scenario, registry));
}

export function deserializeScenario(
  serialized: string,
  registry: ParameterRegistry = createCoreParameterRegistry(),
): CoreScenario {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new ScenarioValidationError(
      `Scenario JSON is invalid: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return normalizeScenario(parsed, registry);
}
