import {
  MAX_SPEED_POSITION,
  MIN_SPEED_POSITION,
  NORMAL_SPEED_POSITION,
} from '../presentation/speed-control';
import type { SimulationController } from '../presentation/simulation-controller';
import { startPlaybackDriver } from './playback-driver';
import { renderWorld } from './world-canvas';

function createButton(label: string, testId: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.dataset.testid = testId;
  button.addEventListener('click', onClick);
  return button;
}

function createCounter(label: string, testId: string): { container: HTMLDivElement; value: HTMLOutputElement } {
  const container = document.createElement('div');
  container.className = 'counter';
  const name = document.createElement('span');
  name.textContent = label;
  const value = document.createElement('output');
  value.dataset.testid = testId;
  container.append(name, value);
  return { container, value };
}

export function mountApp(root: HTMLElement, controller: SimulationController): () => void {
  const main = document.createElement('main');
  main.className = 'app-shell simulation-shell';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'SD-002 deterministic runner';

  const heading = document.createElement('h1');
  heading.textContent = 'Sandimations';

  const summary = document.createElement('p');
  summary.className = 'summary';
  summary.textContent =
    'A deterministic sand teaching model with direct control over simulation time.';

  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Deterministic falling sand teaching world');
  canvas.dataset.testid = 'world-canvas';

  const controlSection = document.createElement('section');
  controlSection.className = 'controls';
  controlSection.setAttribute('aria-label', 'Simulation time controls');

  const playButton = createButton('Pause', 'play-pause', () => {
    controller.togglePlay();
    render();
  });

  const speedBlock = document.createElement('div');
  speedBlock.className = 'speed-control';
  const speedLabel = document.createElement('label');
  speedLabel.htmlFor = 'speed-slider';
  speedLabel.textContent = 'Speed';
  const speedSlider = document.createElement('input');
  speedSlider.id = 'speed-slider';
  speedSlider.type = 'range';
  speedSlider.min = String(MIN_SPEED_POSITION);
  speedSlider.max = String(MAX_SPEED_POSITION);
  speedSlider.step = '1';
  speedSlider.value = String(NORMAL_SPEED_POSITION);
  speedSlider.dataset.testid = 'speed-slider';
  const speedOutput = document.createElement('output');
  speedOutput.dataset.testid = 'speed-value';
  const normalSpeedButton = createButton('1×', 'speed-normal', () => {
    controller.setNormalSpeed();
    render();
  });
  normalSpeedButton.className = 'compact-button';
  speedBlock.append(speedLabel, speedSlider, speedOutput, normalSpeedButton);

  speedSlider.addEventListener('input', () => {
    controller.setSpeedPosition(Number(speedSlider.value));
    render();
  });

  const stepPhaseButton = createButton('Step tick', 'step-phase', () => {
    controller.stepPhase();
    render();
  });
  const stepFrameButton = createButton('Step frame', 'step-frame', () => {
    controller.stepFrame();
    render();
  });
  const stepFramesButton = createButton('+10 frames', 'step-frames', () => {
    controller.stepFrames(10);
    render();
  });
  const resetButton = createButton('Reset', 'reset', () => {
    controller.reset();
    render();
  });

  const buttonRow = document.createElement('div');
  buttonRow.className = 'button-row';
  buttonRow.append(playButton, stepPhaseButton, stepFrameButton, stepFramesButton, resetButton);

  controlSection.append(speedBlock, buttonRow);

  const counters = document.createElement('section');
  counters.className = 'counters';
  counters.setAttribute('aria-label', 'Simulation counters');
  const frameCounter = createCounter('Frame', 'frame-count');
  const phaseCounter = createCounter('Next phase', 'phase-count');
  const tickCounter = createCounter('Ticks', 'tick-count');
  const hashCounter = createCounter('State hash', 'state-hash');
  counters.append(
    frameCounter.container,
    phaseCounter.container,
    tickCounter.container,
    hashCounter.container,
  );

  main.append(eyebrow, heading, summary, canvas, controlSection, counters);
  root.replaceChildren(main);

  function render(): void {
    const view = controller.getViewModel();
    playButton.textContent = view.playing ? 'Pause' : 'Play';
    speedSlider.value = String(Math.round(view.speedPosition));
    speedSlider.setAttribute('aria-valuetext', view.playbackRateLabel);
    speedOutput.textContent = view.playbackRateLabel;
    frameCounter.value.value = String(view.frame);
    phaseCounter.value.value = `${view.phase + 1}/${view.phaseCount}`;
    tickCounter.value.value = String(view.tick);
    hashCounter.value.value = view.stateHash;
    renderWorld(canvas, view);
  }

  render();
  return startPlaybackDriver(controller, render);
}
