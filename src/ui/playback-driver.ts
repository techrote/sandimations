import { recordPresentationTiming } from '../presentation/performance-monitor';
import type { SimulationController } from '../presentation/simulation-controller';

const BASE_FRAMES_PER_SECOND = 12;
const MAX_PHASES_PER_RENDER = 128;
const MAX_ELAPSED_SECONDS = 0.25;

export function startPlaybackDriver(
  controller: SimulationController,
  onAdvance: () => void,
): () => void {
  let animationFrame = 0;
  let previousTime: number | undefined;
  let accumulator = 0;

  const loop = (time: number): void => {
    if (previousTime === undefined) {
      previousTime = time;
    }

    const elapsedSeconds = Math.min((time - previousTime) / 1000, MAX_ELAPSED_SECONDS);
    previousTime = time;
    const view = controller.getViewModel();

    if (view.playing) {
      const phasesPerSecond = BASE_FRAMES_PER_SECOND * view.playbackRate * view.phaseCount;
      accumulator += elapsedSeconds * phasesPerSecond;
      const phases = Math.min(Math.floor(accumulator), MAX_PHASES_PER_RENDER);
      if (phases > 0) {
        accumulator -= phases;
        for (let index = 0; index < phases; index += 1) {
          controller.advancePlaybackPhase();
        }
        const startedAt = performance.now();
        onAdvance();
        recordPresentationTiming('playback-ui', performance.now() - startedAt, phases);
      }
    } else {
      accumulator = 0;
    }

    animationFrame = requestAnimationFrame(loop);
  };

  animationFrame = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(animationFrame);
}
