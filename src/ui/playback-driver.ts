import type { SimulationController } from '../presentation/simulation-controller';

const BASE_FRAMES_PER_SECOND = 12;
const MAX_FRAMES_PER_RENDER = 64;
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
      accumulator += elapsedSeconds * BASE_FRAMES_PER_SECOND * view.playbackRate;
      const frames = Math.min(Math.floor(accumulator), MAX_FRAMES_PER_RENDER);
      if (frames > 0) {
        accumulator -= frames;
        for (let index = 0; index < frames; index += 1) {
          controller.advancePlaybackFrame();
        }
        onAdvance();
      }
    } else {
      accumulator = 0;
    }

    animationFrame = requestAnimationFrame(loop);
  };

  animationFrame = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(animationFrame);
}
