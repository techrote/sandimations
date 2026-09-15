import { describe, expect, it } from 'vitest';
import { Material } from '../../src/core/model/material';
import { SimulationRunner } from '../../src/core/runner/runner';
import { createDefaultScenario, type CoreScenario } from '../../src/core/scenario/scenario';

function scenarioWithPhases(phaseCount: number): CoreScenario {
  const base = createDefaultScenario();
  return Object.freeze({
    ...base,
    id: `phase-fixture-${phaseCount}`,
    scheduler: Object.freeze({ ...base.scheduler, phaseCount }),
  });
}

describe('SimulationRunner determinism', () => {
  it('matches fixed state-hash fixtures for the default seed', () => {
    const runner = new SimulationRunner(createDefaultScenario());
    expect(runner.getStateHash()).toBe('2310bf2d');

    runner.stepFrames(12);
    expect(runner.getSnapshot()).toMatchObject({ frame: 12, phase: 0, tick: 12 });
    expect(runner.getStateHash()).toBe('dbb8f26f');
  });

  it('matches a second-seed fixture independently', () => {
    const runner = new SimulationRunner(createDefaultScenario(1));
    runner.stepFrames(20);
    expect(runner.getStateHash()).toBe('2c9621ae');
  });

  it('keeps phase stepping distinct from logical frame stepping', () => {
    const runner = new SimulationRunner(scenarioWithPhases(3));
    runner.play();
    runner.stepPhase();

    expect(runner.getSnapshot()).toMatchObject({
      frame: 0,
      phase: 1,
      tick: 1,
      phaseCount: 3,
      playing: false,
    });

    runner.stepFrame();
    expect(runner.getSnapshot()).toMatchObject({ frame: 1, phase: 0, tick: 3 });

    runner.stepFrames(2);
    expect(runner.getSnapshot()).toMatchObject({ frame: 3, phase: 0, tick: 9 });
  });

  it('keeps playback control state outside the deterministic state hash', () => {
    const runner = new SimulationRunner(createDefaultScenario());
    const initialHash = runner.getStateHash();

    runner.setPlaybackRate(0.125);
    runner.play();
    expect(runner.getStateHash()).toBe(initialHash);

    runner.pause();
    runner.setPlaybackRate(16);
    expect(runner.getStateHash()).toBe(initialHash);
  });

  it('advances continuous playback only while playing', () => {
    const runner = new SimulationRunner(createDefaultScenario());
    expect(runner.advancePlaybackFrame()).toBe(false);
    expect(runner.getSnapshot().frame).toBe(0);

    runner.play();
    expect(runner.advancePlaybackFrame()).toBe(true);
    expect(runner.getSnapshot()).toMatchObject({ frame: 1, playing: true });
  });

  it('restores the seeded world and counters on reset', () => {
    const runner = new SimulationRunner(createDefaultScenario());
    const initialHash = runner.getStateHash();
    runner.setPlaybackRate(4);
    runner.applyInput({ type: 'set-cell', x: 2, y: 2, material: Material.Sand });
    runner.stepFrames(6);
    expect(runner.getStateHash()).not.toBe(initialHash);

    runner.reset();
    expect(runner.getStateHash()).toBe(initialHash);
    expect(runner.getSnapshot()).toMatchObject({
      frame: 0,
      phase: 0,
      tick: 0,
      playing: false,
      playbackRate: 4,
    });
  });

  it('is unaffected by extra snapshot/presentation reads between steps', () => {
    const sparseReads = new SimulationRunner(createDefaultScenario(0x12345678));
    const heavyReads = new SimulationRunner(createDefaultScenario(0x12345678));

    for (let frame = 0; frame < 18; frame += 1) {
      sparseReads.stepFrame();
      for (let read = 0; read < 11; read += 1) {
        heavyReads.getSnapshot();
        heavyReads.getStateHash();
      }
      heavyReads.stepFrame();
      expect(heavyReads.getStateHash()).toBe(sparseReads.getStateHash());
    }
  });
});
