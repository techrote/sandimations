import { describe, expect, it } from 'vitest';
import { SimulationRunner } from '../../src/core/runner/runner';
import { createDefaultScenario } from '../../src/core/scenario/scenario';
import { SimulationController } from '../../src/presentation/simulation-controller';
import {
  rateToSpeedPosition,
  speedPositionToRate,
} from '../../src/presentation/speed-control';

describe('speed control mapping', () => {
  it('reserves substantial slider travel for slow motion while preserving 1×', () => {
    expect(speedPositionToRate(0)).toBeCloseTo(1 / 32);
    expect(speedPositionToRate(20)).toBeCloseTo(0.125);
    expect(speedPositionToRate(50)).toBe(1);
    expect(speedPositionToRate(75)).toBeCloseTo(4);
    expect(speedPositionToRate(100)).toBeCloseTo(16);
    expect(rateToSpeedPosition(1)).toBe(50);
    expect(rateToSpeedPosition(0.125)).toBeCloseTo(20);
    expect(rateToSpeedPosition(4)).toBeCloseTo(75);
  });

  it('feeds explicit playback-rate values into the real runner', () => {
    const runner = new SimulationRunner(createDefaultScenario());
    const controller = new SimulationController(runner);
    const stateHash = runner.getStateHash();

    controller.setSpeedPosition(20);
    expect(runner.getPlaybackRate()).toBeCloseTo(0.125);
    expect(controller.getViewModel().playbackRateLabel).toBe('0.125×');
    expect(runner.getStateHash()).toBe(stateHash);

    controller.setNormalSpeed();
    expect(runner.getPlaybackRate()).toBe(1);
    expect(controller.getViewModel().playbackRateLabel).toBe('1×');
  });
});
