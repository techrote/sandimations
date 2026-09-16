import type { ComparisonSnapshotV1, DeterministicComparison } from '../core/comparison/comparison';
import {
  NORMAL_SPEED_POSITION,
  speedPositionToRate,
} from './speed-control';
import { SimulationController, type SimulationViewModel } from './simulation-controller';

export class ComparisonController extends SimulationController {
  private readonly baselineReader: SimulationController;

  public constructor(private readonly comparison: DeterministicComparison) {
    super(comparison.getOptimizedRunner());
    this.baselineReader = new SimulationController(comparison.getBaselineRunner());
  }

  public getBaselineViewModel(): SimulationViewModel {
    return this.baselineReader.getViewModel();
  }

  public getOptimizedViewModel(): SimulationViewModel {
    return super.getViewModel();
  }

  public getComparisonSnapshot(): ComparisonSnapshotV1 {
    return this.comparison.getSnapshot();
  }

  public override togglePlay(): void {
    if (this.comparison.isPlaying()) this.comparison.pause();
    else this.comparison.play();
  }

  public override pause(): void {
    this.comparison.pause();
  }

  public override setSpeedPosition(position: number): void {
    this.comparison.setPlaybackRate(speedPositionToRate(position));
  }

  public override setNormalSpeed(): void {
    this.setSpeedPosition(NORMAL_SPEED_POSITION);
  }

  public override stepPhase(): void {
    this.comparison.stepPhase();
  }

  public override stepFrame(): void {
    this.comparison.stepFrame();
  }

  public override stepFrames(count: number): void {
    this.comparison.stepFrames(count);
  }

  public override requestParameterMutation(id: string, value: unknown): void {
    this.comparison.requestParameterMutation(id, value);
  }

  public override reset(): void {
    this.comparison.reset();
  }

  public override advancePlaybackPhase(): boolean {
    return this.comparison.advancePlaybackPhase();
  }
}
