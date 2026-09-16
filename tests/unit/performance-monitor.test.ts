import { beforeEach, describe, expect, it } from 'vitest';
import {
  PRESENTATION_PERFORMANCE_SAMPLE_LIMIT,
  readPresentationTimings,
  recordPresentationTiming,
  resetPresentationTimings,
} from '../../src/presentation/performance-monitor';

beforeEach(() => resetPresentationTimings());

describe('presentation performance monitor', () => {
  it('keeps wall-clock samples bounded and summarizes the retained window', () => {
    for (let index = 0; index < PRESENTATION_PERFORMANCE_SAMPLE_LIMIT + 30; index += 1) {
      recordPresentationTiming('world-canvas', index / 10, index);
    }

    const canvas = readPresentationTimings().find((entry) => entry.category === 'world-canvas');
    expect(canvas).toBeDefined();
    expect(canvas?.sampleCount).toBe(PRESENTATION_PERFORMANCE_SAMPLE_LIMIT);
    expect(canvas?.lastMs).toBeCloseTo(14.9);
    expect(canvas?.lastWorkItems).toBe(149);
    expect(canvas?.maxMs).toBeCloseTo(14.9);
    expect(canvas?.p95Ms).toBeGreaterThan(canvas?.meanMs ?? 0);
  });

  it('keeps presentation timings separate by category and sanitizes invalid values', () => {
    recordPresentationTiming('world-canvas', Number.NaN, -4);
    recordPresentationTiming('playback-ui', 2.5, 4);

    const snapshots = readPresentationTimings();
    const canvas = snapshots.find((entry) => entry.category === 'world-canvas');
    const playback = snapshots.find((entry) => entry.category === 'playback-ui');

    expect(canvas).toMatchObject({ sampleCount: 1, lastMs: 0, lastWorkItems: 0 });
    expect(playback).toMatchObject({ sampleCount: 1, lastMs: 2.5, lastWorkItems: 4 });
  });
});
