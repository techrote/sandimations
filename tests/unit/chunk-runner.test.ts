import { describe, expect, it } from 'vitest';
import { SimulationRunner } from '../../src/core/runner/runner';
import { createSleepWakeFixtureScenario } from '../../src/core/scenario/scenario';

function chunkStates(runner: SimulationRunner): readonly string[] {
  return runner.getChunkSchedulerSnapshot()?.chunks.map((chunk) => chunk.state) ?? [];
}

describe('chunk sleep/wake runner integration', () => {
  it('sleeps settled chunks, avoids cell work, wakes locally, then returns toward sleep', () => {
    const runner = new SimulationRunner(createSleepWakeFixtureScenario());

    expect(runner.getMetricsSnapshot().chunks.active).toBe(12);

    runner.stepFrames(3);
    expect(chunkStates(runner).every((state) => state === 'sleeping')).toBe(true);
    expect(runner.getMetricsSnapshot().chunks.sleeping).toBe(12);

    const examinedAtSleep = runner.getMetricsSnapshot().cells.examined;
    runner.stepFrames(15);
    expect(runner.getMetricsSnapshot().cells.examined).toBe(examinedAtSleep);

    runner.stepFrame();
    const afterDisturbance = runner.getChunkSchedulerSnapshot();
    expect(afterDisturbance).not.toBeNull();
    expect(afterDisturbance?.chunks.filter((chunk) => chunk.state === 'newly-woken')).toHaveLength(
      4,
    );
    expect(runner.getMetricsSnapshot().chunks.woken).toBe(4);
    expect(runner.getMetricsSnapshot().chunks.active).toBe(4);
    expect(runner.getMetricsSnapshot().chunks.sleeping).toBe(8);

    const wakeRecords = runner
      .getTraceSnapshot()
      .records.filter((record) => record.type === 'chunk-woken');
    expect(wakeRecords).toHaveLength(4);
    expect(wakeRecords.every((record) => record.reason === 'input-disturbance')).toBe(true);
    expect(
      wakeRecords.every((record) => record.causeCell?.x === 24 && record.causeCell?.y === 3),
    ).toBe(true);

    runner.stepFrames(28);
    expect(
      runner.getChunkSchedulerSnapshot()?.chunks.some((chunk) => chunk.state === 'sleeping'),
    ).toBe(true);
    expect(runner.getMetricsSnapshot().chunks.slept).toBeGreaterThan(12);
  });

  it('replays identical scheduler state, traces, metrics, and hashes', () => {
    const scenario = createSleepWakeFixtureScenario(0x1234abcd);
    const first = new SimulationRunner(scenario);
    const second = new SimulationRunner(scenario);

    first.stepFrames(40);
    second.stepFrames(40);

    expect(second.getStateHash()).toBe(first.getStateHash());
    expect(second.getChunkSchedulerSnapshot()).toEqual(first.getChunkSchedulerSnapshot());
    expect(second.getTraceSnapshot()).toEqual(first.getTraceSnapshot());
    expect(second.getMetricsSnapshot()).toEqual(first.getMetricsSnapshot());

    const firstHash = first.getStateHash();
    first.reset();
    first.stepFrames(40);
    expect(first.getStateHash()).toBe(firstHash);
  });
});
