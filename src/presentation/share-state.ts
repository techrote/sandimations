import type { ParameterDefinition, ParameterValue } from '../core/parameters/definitions';
import type { ParameterRegistry } from '../core/parameters/registry';
import { MAX_SPEED_POSITION, MIN_SPEED_POSITION, NORMAL_SPEED_POSITION } from './speed-control';

export const SHARE_STATE_VERSION = 1 as const;
export const MAX_SHARE_REPLAY_TICKS = 512;
export const DEFAULT_TIMELINE_HISTORY_LIMIT = 128;
export const TIMELINE_HISTORY_LIMITS = Object.freeze([64, 128, 256] as const);

export interface ShareStateV1 {
  readonly version: typeof SHARE_STATE_VERSION;
  readonly scenarioId: string;
  readonly tick: number;
  readonly paused: boolean;
  readonly speedPosition: number | null;
  readonly presentationMode: boolean;
  readonly historyLimit: number;
  readonly parameters: Readonly<Record<string, ParameterValue>>;
}

export interface DecodedShareState {
  readonly state: ShareStateV1;
  readonly warnings: readonly string[];
  readonly legacy: boolean;
}

function defaultState(scenarioId: string): ShareStateV1 {
  return Object.freeze({
    version: SHARE_STATE_VERSION,
    scenarioId,
    tick: 0,
    paused: false,
    speedPosition: null,
    presentationMode: false,
    historyLimit: DEFAULT_TIMELINE_HISTORY_LIMIT,
    parameters: Object.freeze({}),
  });
}

function parseSafeInteger(raw: string | null, minimum: number, maximum: number): number | null {
  if (raw === null || !/^-?\d+$/.test(raw)) return null;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) return null;
  return value;
}

function parseBoolean(raw: string | null): boolean | null {
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return null;
}

function decodeParameterValue(definition: ParameterDefinition, raw: string): unknown {
  if (definition.kind === 'boolean') return parseBoolean(raw);
  if (definition.kind === 'number' || definition.kind === 'integer') return Number(raw);
  return raw;
}

function encodeParameterValue(value: ParameterValue): string {
  if (typeof value === 'boolean') return value ? '1' : '0';
  return String(value);
}

function supportedHistoryLimit(value: number | null): number | null {
  if (value === null) return null;
  return TIMELINE_HISTORY_LIMITS.includes(value as (typeof TIMELINE_HISTORY_LIMITS)[number])
    ? value
    : null;
}

export function decodeShareState(
  search: URLSearchParams,
  registry: ParameterRegistry,
  defaultScenarioId: string,
  isSupportedScenarioId: (id: string) => boolean,
): DecodedShareState {
  const warnings: string[] = [];
  const version = search.get('v');
  const legacy = version === null;

  if (version !== null && version !== String(SHARE_STATE_VERSION)) {
    warnings.push(
      `Unsupported share-state version ${version}; opened the default scenario instead.`,
    );
    return Object.freeze({
      state: defaultState(defaultScenarioId),
      warnings: Object.freeze(warnings),
      legacy: false,
    });
  }

  const requestedScenario = search.get('scenario') ?? defaultScenarioId;
  const scenarioId = isSupportedScenarioId(requestedScenario)
    ? requestedScenario
    : defaultScenarioId;
  if (requestedScenario !== scenarioId) {
    warnings.push(`Unknown scenario ${requestedScenario}; opened ${defaultScenarioId} instead.`);
  }

  if (legacy) {
    return Object.freeze({
      state: Object.freeze({ ...defaultState(scenarioId), scenarioId }),
      warnings: Object.freeze(warnings),
      legacy: true,
    });
  }

  const tickRaw = search.get('tick');
  const tick = parseSafeInteger(tickRaw, 0, MAX_SHARE_REPLAY_TICKS);
  if (tickRaw !== null && tick === null) {
    warnings.push(
      `Invalid replay tick; share links support 0-${MAX_SHARE_REPLAY_TICKS} deterministic ticks.`,
    );
  }

  const pausedRaw = search.get('paused');
  const paused = pausedRaw === null ? false : parseBoolean(pausedRaw);
  if (pausedRaw !== null && paused === null)
    warnings.push('Invalid paused flag; playback is enabled.');

  const speedRaw = search.get('speed');
  const speedPosition = parseSafeInteger(speedRaw, MIN_SPEED_POSITION, MAX_SPEED_POSITION);
  if (speedRaw !== null && speedPosition === null) {
    warnings.push(`Invalid speed position; expected ${MIN_SPEED_POSITION}-${MAX_SPEED_POSITION}.`);
  }

  const viewRaw = search.get('view');
  const presentationMode = viewRaw === 'presentation';
  if (viewRaw !== null && viewRaw !== 'presentation' && viewRaw !== 'inspect') {
    warnings.push('Unknown view mode; opened inspect mode.');
  }

  const historyRaw = search.get('history');
  const historyLimit = supportedHistoryLimit(
    parseSafeInteger(historyRaw, 1, Number.MAX_SAFE_INTEGER),
  );
  if (historyRaw !== null && historyLimit === null) {
    warnings.push(
      `Invalid timeline history limit; supported values are ${TIMELINE_HISTORY_LIMITS.join(', ')}.`,
    );
  }

  const parameters: Record<string, ParameterValue> = {};
  for (const [key, rawValue] of search.entries()) {
    if (!key.startsWith('p.')) continue;
    const id = key.slice(2);
    if (!registry.has(id)) {
      warnings.push(`Ignored unknown share parameter ${id}.`);
      continue;
    }
    const definition = registry.get(id);
    try {
      const decoded = decodeParameterValue(definition, rawValue);
      parameters[id] = registry.validate(id, decoded);
    } catch {
      warnings.push(`Ignored invalid share value for ${id}.`);
    }
  }

  return Object.freeze({
    state: Object.freeze({
      version: SHARE_STATE_VERSION,
      scenarioId,
      tick: tick ?? 0,
      paused: paused ?? false,
      speedPosition,
      presentationMode,
      historyLimit: historyLimit ?? DEFAULT_TIMELINE_HISTORY_LIMIT,
      parameters: Object.freeze(parameters),
    }),
    warnings: Object.freeze(warnings),
    legacy: false,
  });
}

export function encodeShareState(state: ShareStateV1): URLSearchParams {
  const search = new URLSearchParams();
  search.set('v', String(SHARE_STATE_VERSION));
  search.set('scenario', state.scenarioId);
  search.set('tick', String(state.tick));
  search.set('paused', state.paused ? '1' : '0');
  search.set('speed', String(state.speedPosition ?? NORMAL_SPEED_POSITION));
  search.set('view', state.presentationMode ? 'presentation' : 'inspect');
  search.set('history', String(state.historyLimit));

  for (const id of Object.keys(state.parameters).sort()) {
    const value = state.parameters[id];
    if (value !== undefined) search.set(`p.${id}`, encodeParameterValue(value));
  }
  return search;
}

export function canonicalShareQuery(state: ShareStateV1): string {
  return encodeShareState(state).toString();
}
