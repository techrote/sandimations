import { describe, expect, it } from 'vitest';
import {
  ChunkSleepWakeScheduler,
  type ChunkTransitionObserver,
} from '../../src/core/scheduler/chunk-sleep-wake';

describe('chunk sleep/wake teaching scheduler', () => {
  it('progresses active chunks through pending sleep into sleeping deterministically', () => {
    const activated: string[] = [];
    const slept: string[] = [];
    const observer: ChunkTransitionObserver = {
      activated: (chunk) => activated.push(chunk.id),
      slept: (chunk) => slept.push(chunk.id),
      woken: () => undefined,
    };
    const scheduler = new ChunkSleepWakeScheduler(16, 16, 8, observer);

    expect(activated).toEqual(['0:0', '1:0', '0:1', '1:1']);

    scheduler.beginFrame();
    scheduler.completeFrame(2, 0);
    expect(scheduler.getSnapshot().chunks.map((chunk) => chunk.state)).toEqual([
      'pending-sleep',
      'pending-sleep',
      'pending-sleep',
      'pending-sleep',
    ]);

    scheduler.beginFrame();
    scheduler.completeFrame(2, 0);
    expect(scheduler.getSnapshot().chunks.every((chunk) => chunk.state === 'sleeping')).toBe(true);
    expect(slept).toEqual(['0:0', '1:0', '0:1', '1:1']);
  });

  it('wakes only the configured neighborhood and records cross-chunk causes', () => {
    const wakes: Array<{ id: string; reason: string; cause: string | null }> = [];
    const scheduler = new ChunkSleepWakeScheduler(24, 16, 8, {
      activated: () => undefined,
      slept: () => undefined,
      woken: (chunk, reason, causeChunk) => {
        wakes.push({ id: chunk.id, reason, cause: causeChunk?.id ?? null });
      },
    });

    scheduler.beginFrame();
    scheduler.completeFrame(1, 0);
    expect(scheduler.getSnapshot().chunks.every((chunk) => chunk.state === 'sleeping')).toBe(true);

    scheduler.wakeAtCell(2, 2, 0);
    expect(wakes).toEqual([{ id: '0:0', reason: 'input-disturbance', cause: null }]);
    expect(
      scheduler.getSnapshot().chunks.filter((chunk) => chunk.state === 'newly-woken').map((chunk) => chunk.id),
    ).toEqual(['0:0']);

    scheduler.beginFrame();
    scheduler.noteMovement(7, 7, 8, 8, 0);
    expect(wakes.at(-1)).toEqual({
      id: '1:1',
      reason: 'cross-chunk-activity',
      cause: '0:0',
    });
  });
});
