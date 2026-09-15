import { Material, type Material as MaterialValue } from '../core/model/material';
import type { SimulationRunner } from '../core/runner/runner';
import {
  formatPlaybackRate,
  NORMAL_SPEED_POSITION,
  rateToSpeedPosition,
  speedPositionToRate,
} from './speed-control';

export type CellVisual = 'empty' | 'wall' | 'sand';

export interface SimulationViewModel {
  readonly scenarioId: string;
  readonly width: number;
  readonly height: number;
  readonly cells: readonly CellVisual[];
  readonly frame: number;
  readonly phase: number;
  readonly phaseCount: number;
  readonly tick: number;
  readonly playing: boolean;
  readonly playbackRate: number;
  readonly playbackRateLabel: string;
  readonly speedPosition: number;
  readonly stateHash: string;
}

function materialToVisual(material: MaterialValue): CellVisual {
  switch (material) {
    case Material.Empty:
      return 'empty';
    case Material.Wall:
      return 'wall';
    case Material.Sand:
      return 'sand';
  }
}

export class SimulationController {
  public constructor(private readonly runner: SimulationRunner) {}

  public getViewModel(): SimulationViewModel {
    const snapshot = this.runner.getSnapshot();
    return Object.freeze({
      scenarioId: snapshot.scenarioId,
      width: snapshot.world.width,
      height: snapshot.world.height,
      cells: Object.freeze(snapshot.world.cells.map(materialToVisual)),
      frame: snapshot.frame,
      phase: snapshot.phase,
      phaseCount: snapshot.phaseCount,
      tick: snapshot.tick,
      playing: snapshot.playing,
      playbackRate: snapshot.playbackRate,
      playbackRateLabel: formatPlaybackRate(snapshot.playbackRate),
      speedPosition: rateToSpeedPosition(snapshot.playbackRate),
      stateHash: this.runner.getStateHash(),
    });
  }

  public togglePlay(): void {
    if (this.runner.isPlaying()) {
      this.runner.pause();
    } else {
      this.runner.play();
    }
  }

  public pause(): void {
    this.runner.pause();
  }

  public setSpeedPosition(position: number): void {
    this.runner.setPlaybackRate(speedPositionToRate(position));
  }

  public setNormalSpeed(): void {
    this.setSpeedPosition(NORMAL_SPEED_POSITION);
  }

  public stepPhase(): void {
    this.runner.stepPhase();
  }

  public stepFrame(): void {
    this.runner.stepFrame();
  }

  public stepFrames(count: number): void {
    this.runner.stepFrames(count);
  }

  public requestParameterMutation(id: string, value: unknown): void {
    this.runner.requestParameterMutation(id, value);
  }

  public reset(): void {
    this.runner.reset();
  }

  public advancePlaybackFrame(): boolean {
    return this.runner.advancePlaybackFrame();
  }
}
