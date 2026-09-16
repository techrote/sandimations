export const PRESENTATION_PERFORMANCE_SAMPLE_LIMIT = 120;

export type PresentationTimingCategory = 'world-canvas' | 'playback-ui';

export interface PresentationTimingSample {
  readonly durationMs: number;
  readonly workItems: number;
}

export interface PresentationTimingSnapshot {
  readonly category: PresentationTimingCategory;
  readonly sampleCount: number;
  readonly lastMs: number;
  readonly meanMs: number;
  readonly p95Ms: number;
  readonly maxMs: number;
  readonly lastWorkItems: number;
}

export interface SandimationsPerformanceDiagnostics {
  readonly note: string;
  read: () => readonly PresentationTimingSnapshot[];
  reset: () => void;
}

const CATEGORIES: readonly PresentationTimingCategory[] = Object.freeze([
  'world-canvas',
  'playback-ui',
]);

const samples = new Map<PresentationTimingCategory, PresentationTimingSample[]>(
  CATEGORIES.map((category) => [category, []]),
);

function finiteNonNegative(value: number, fallback = 0): number {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function recordPresentationTiming(
  category: PresentationTimingCategory,
  durationMs: number,
  workItems = 0,
): void {
  const bucket = samples.get(category);
  if (bucket === undefined) return;

  bucket.push(
    Object.freeze({
      durationMs: finiteNonNegative(durationMs),
      workItems: Math.floor(finiteNonNegative(workItems)),
    }),
  );
  if (bucket.length > PRESENTATION_PERFORMANCE_SAMPLE_LIMIT) {
    bucket.splice(0, bucket.length - PRESENTATION_PERFORMANCE_SAMPLE_LIMIT);
  }
}

function percentile95(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.min(
    ordered.length - 1,
    Math.ceil(ordered.length * 0.95) - 1,
  );
  return ordered[index] ?? 0;
}

export function readPresentationTimings(): readonly PresentationTimingSnapshot[] {
  return Object.freeze(
    CATEGORIES.map((category) => {
      const bucket = samples.get(category) ?? [];
      const durations = bucket.map((sample) => sample.durationMs);
      const last = bucket[bucket.length - 1];
      const total = durations.reduce((sum, value) => sum + value, 0);
      return Object.freeze({
        category,
        sampleCount: bucket.length,
        lastMs: last?.durationMs ?? 0,
        meanMs: bucket.length === 0 ? 0 : total / bucket.length,
        p95Ms: percentile95(durations),
        maxMs: durations.length === 0 ? 0 : Math.max(...durations),
        lastWorkItems: last?.workItems ?? 0,
      });
    }),
  );
}

export function resetPresentationTimings(): void {
  for (const bucket of samples.values()) bucket.length = 0;
}

export function createPerformanceDiagnostics(): SandimationsPerformanceDiagnostics {
  return Object.freeze({
    note:
      'Wall-clock presentation timings only. They are browser diagnostics and never deterministic simulation evidence.',
    read: readPresentationTimings,
    reset: resetPresentationTimings,
  });
}

declare global {
  interface Window {
    __sandimationsPerformance?: SandimationsPerformanceDiagnostics;
  }
}

export function installPerformanceDiagnostics(target: Window = window): void {
  Object.defineProperty(target, '__sandimationsPerformance', {
    configurable: true,
    enumerable: false,
    writable: false,
    value: createPerformanceDiagnostics(),
  });
}
