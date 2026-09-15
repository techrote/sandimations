import type { ParameterDefinition, ParameterValue } from '../core/parameters/definitions';
import type { ParameterRegistry } from '../core/parameters/registry';
import {
  buildAppPresentationViewModel,
  type AppPresentationViewModel,
  type OverlayKind,
  type ParameterControlViewModel,
} from '../presentation/app-view-model';
import type { PresentationEvidenceAdapterV1 } from '../presentation/evidence-adapter';
import {
  MAX_SPEED_POSITION,
  MIN_SPEED_POSITION,
  NORMAL_SPEED_POSITION,
} from '../presentation/speed-control';
import type { SimulationController } from '../presentation/simulation-controller';
import { startPlaybackDriver } from './playback-driver';
import { renderWorld } from './world-canvas';

interface CounterBinding {
  readonly container: HTMLDivElement;
  readonly value: HTMLOutputElement;
}

interface ParameterBinding {
  readonly input: HTMLInputElement | HTMLSelectElement;
  readonly current: HTMLOutputElement;
  readonly pending: HTMLSpanElement;
  readonly timing: HTMLSpanElement;
}

const ALL_OVERLAYS: readonly OverlayKind[] = Object.freeze([
  'evaluated-now',
  'active-not-selected',
  'sleeping',
  'newly-woken',
  'blocked-rejected',
]);

function createButton(label: string, testId: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.dataset.testid = testId;
  button.addEventListener('click', onClick);
  return button;
}

function createPanel(
  title: string,
  className: string,
): { section: HTMLElement; body: HTMLDivElement } {
  const section = document.createElement('section');
  section.className = `panel ${className}`;
  const heading = document.createElement('h2');
  heading.textContent = title;
  const body = document.createElement('div');
  body.className = 'panel-body';
  section.append(heading, body);
  return { section, body };
}

function createCounter(label: string, testId: string): CounterBinding {
  const container = document.createElement('div');
  container.className = 'counter';
  const name = document.createElement('span');
  name.textContent = label;
  const value = document.createElement('output');
  value.dataset.testid = testId;
  container.append(name, value);
  return { container, value };
}

function formatParameterValue(value: ParameterValue): string {
  if (typeof value === 'boolean') {
    return value ? 'On' : 'Off';
  }
  return String(value);
}

function displayedParameterValue(parameter: ParameterControlViewModel): ParameterValue {
  return parameter.pendingValue ?? parameter.currentValue;
}

function setInputValue(
  input: HTMLInputElement | HTMLSelectElement,
  definition: ParameterDefinition,
  value: ParameterValue,
): void {
  if (definition.kind === 'boolean') {
    (input as HTMLInputElement).checked = Boolean(value);
  } else {
    input.value = String(value);
  }
}

function readInputValue(
  input: HTMLInputElement | HTMLSelectElement,
  definition: ParameterDefinition,
): ParameterValue {
  if (definition.kind === 'boolean') {
    return (input as HTMLInputElement).checked;
  }
  if (definition.kind === 'number' || definition.kind === 'integer') {
    return Number(input.value);
  }
  return input.value;
}

function createParameterInput(
  definition: ParameterDefinition,
): HTMLInputElement | HTMLSelectElement {
  if (definition.kind === 'enum') {
    const select = document.createElement('select');
    for (const option of definition.options) {
      const element = document.createElement('option');
      element.value = option.value;
      element.textContent = option.label;
      select.append(element);
    }
    return select;
  }

  const input = document.createElement('input');
  if (definition.kind === 'boolean') {
    input.type = 'checkbox';
  } else {
    input.type = 'number';
    input.min = String(definition.min);
    input.max = String(definition.max);
    input.step = String(definition.step ?? (definition.kind === 'integer' ? 1 : 'any'));
  }
  return input;
}

function isEditingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLButtonElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function latestOverlayCount(view: AppPresentationViewModel, kind: OverlayKind): number {
  return view.world.overlays.filter((marker) => marker.kind === kind).length;
}

export function mountApp(
  root: HTMLElement,
  controller: SimulationController,
  evidenceAdapter: PresentationEvidenceAdapterV1,
  registry: ParameterRegistry,
): () => void {
  const enabledOverlays = new Set<OverlayKind>(ALL_OVERLAYS);
  let showGrid = true;

  const main = document.createElement('main');
  main.className = 'app-shell simulation-shell';

  const header = document.createElement('header');
  header.className = 'app-header';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Evidence-driven scheduler visualisation';
  const heading = document.createElement('h1');
  heading.textContent = 'Sandimations';
  const summary = document.createElement('p');
  summary.className = 'summary';
  summary.textContent =
    'Slow, step and inspect deterministic sand work. Visual overlays are driven by structured model evidence, never reconstructed from pixels.';
  header.append(eyebrow, heading, summary);

  const workspace = document.createElement('div');
  workspace.className = 'workspace-grid';

  const viewportPanel = createPanel('Simulation', 'viewport-panel');
  const viewportMeta = document.createElement('div');
  viewportMeta.className = 'viewport-meta';
  const viewportState = document.createElement('span');
  viewportState.dataset.testid = 'viewport-state';
  const evidenceState = document.createElement('span');
  evidenceState.dataset.testid = 'latest-evidence-tick';
  viewportMeta.append(viewportState, evidenceState);

  const canvasFrame = document.createElement('div');
  canvasFrame.className = 'canvas-frame';
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  canvas.setAttribute('role', 'img');
  canvas.tabIndex = 0;
  canvas.dataset.testid = 'world-canvas';
  canvasFrame.append(canvas);
  viewportPanel.body.append(viewportMeta, canvasFrame);

  const inspectorStack = document.createElement('div');
  inspectorStack.className = 'inspector-stack';

  const statePanel = createPanel('State', 'state-panel');
  const counters = document.createElement('div');
  counters.className = 'counters';
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
  statePanel.body.append(counters);

  const metricsPanel = createPanel('Work metrics', 'metrics-panel');
  const metricGrid = document.createElement('div');
  metricGrid.className = 'metric-grid';
  const examinedCounter = createCounter('Examined', 'metrics-examined');
  const movedCounter = createCounter('Moved', 'metrics-moved');
  const skippedCounter = createCounter('Skipped', 'metrics-skipped');
  const blockedCounter = createCounter('Blocked', 'metrics-blocked');
  const workCounter = createCounter('Work units', 'metrics-work');
  const traceCounter = createCounter('Trace retained', 'trace-retained');
  metricGrid.append(
    examinedCounter.container,
    movedCounter.container,
    skippedCounter.container,
    blockedCounter.container,
    workCounter.container,
    traceCounter.container,
  );
  const traceNote = document.createElement('p');
  traceNote.className = 'microcopy';
  traceNote.dataset.testid = 'trace-retention-note';
  metricsPanel.body.append(metricGrid, traceNote);

  const provenancePanel = createPanel('Evidence source', 'provenance-panel');
  const provenance = document.createElement('dl');
  provenance.className = 'definition-list';
  const provenanceBackend = document.createElement('dd');
  provenanceBackend.dataset.testid = 'provenance-backend';
  const provenanceStrategy = document.createElement('dd');
  provenanceStrategy.dataset.testid = 'provenance-strategy';
  const provenanceScenario = document.createElement('dd');
  provenanceScenario.dataset.testid = 'provenance-scenario';
  for (const [label, output] of [
    ['Backend', provenanceBackend],
    ['Strategy', provenanceStrategy],
    ['Scenario', provenanceScenario],
  ] as const) {
    const term = document.createElement('dt');
    term.textContent = label;
    provenance.append(term, output);
  }
  provenancePanel.body.append(provenance);

  inspectorStack.append(statePanel.section, metricsPanel.section, provenancePanel.section);
  workspace.append(viewportPanel.section, inspectorStack);

  const timePanel = createPanel('Time controls', 'time-panel');
  timePanel.section.setAttribute('aria-label', 'Simulation time controls');
  const playButton = createButton('Pause', 'play-pause', () => {
    controller.togglePlay();
    render();
  });
  playButton.className = 'primary-control';

  const speedBlock = document.createElement('div');
  speedBlock.className = 'speed-control';
  const speedLabel = document.createElement('label');
  speedLabel.htmlFor = 'speed-slider';
  speedLabel.textContent = 'Playback speed';
  const speedSlider = document.createElement('input');
  speedSlider.id = 'speed-slider';
  speedSlider.type = 'range';
  speedSlider.min = String(MIN_SPEED_POSITION);
  speedSlider.max = String(MAX_SPEED_POSITION);
  speedSlider.step = '1';
  speedSlider.value = String(NORMAL_SPEED_POSITION);
  speedSlider.dataset.testid = 'speed-slider';
  const speedScale = document.createElement('div');
  speedScale.className = 'speed-scale';
  speedScale.setAttribute('aria-hidden', 'true');
  speedScale.innerHTML = '<span>1/32×</span><span>1×</span><span>16×</span>';
  const speedOutput = document.createElement('output');
  speedOutput.dataset.testid = 'speed-value';
  const normalSpeedButton = createButton('Return to 1×', 'speed-normal', () => {
    controller.setNormalSpeed();
    render();
  });
  normalSpeedButton.className = 'compact-button';
  speedBlock.append(speedLabel, speedOutput, speedSlider, speedScale, normalSpeedButton);
  speedSlider.addEventListener('input', () => {
    controller.setSpeedPosition(Number(speedSlider.value));
    render();
  });

  const stepPhaseButton = createButton('Step phase', 'step-phase', () => {
    controller.stepPhase();
    render();
  });
  const stepFrameButton = createButton('Step frame', 'step-frame', () => {
    controller.stepFrame();
    render();
  });

  const multiStep = document.createElement('div');
  multiStep.className = 'multi-step';
  const stepCountLabel = document.createElement('label');
  stepCountLabel.htmlFor = 'step-count';
  stepCountLabel.textContent = 'Frames';
  const stepCount = document.createElement('input');
  stepCount.id = 'step-count';
  stepCount.type = 'number';
  stepCount.min = '1';
  stepCount.max = '999';
  stepCount.step = '1';
  stepCount.value = '10';
  stepCount.inputMode = 'numeric';
  stepCount.dataset.testid = 'step-count';
  const stepFramesButton = createButton('+10 frames', 'step-frames', () => {
    const count = Number(stepCount.value);
    if (Number.isSafeInteger(count) && count >= 1 && count <= 999) {
      controller.stepFrames(count);
      render();
    }
  });
  stepCount.addEventListener('input', () => {
    const value = Number(stepCount.value);
    stepFramesButton.textContent =
      Number.isSafeInteger(value) && value > 0 ? `+${value} frames` : 'Step frames';
  });
  multiStep.append(stepCountLabel, stepCount, stepFramesButton);

  const resetButton = createButton('Reset', 'reset', () => {
    controller.reset();
    render();
  });
  resetButton.className = 'danger-control';

  const buttonRow = document.createElement('div');
  buttonRow.className = 'button-row';
  buttonRow.append(playButton, stepPhaseButton, stepFrameButton, multiStep, resetButton);

  const shortcutHelp = document.createElement('p');
  shortcutHelp.className = 'microcopy shortcut-help';
  shortcutHelp.textContent = 'Keyboard: Space play/pause · . step phase · F step frame · R reset';
  timePanel.body.append(speedBlock, buttonRow, shortcutHelp);

  const lowerGrid = document.createElement('div');
  lowerGrid.className = 'lower-grid';

  const parameterPanel = createPanel('Parameters', 'parameter-panel');
  const parameterIntro = document.createElement('p');
  parameterIntro.className = 'panel-intro';
  parameterIntro.textContent =
    'Controls are generated from the core parameter registry. Timing badges describe when each deterministic change takes effect.';
  const parameterList = document.createElement('div');
  parameterList.className = 'parameter-list';
  parameterPanel.body.append(parameterIntro, parameterList);

  const overlayPanel = createPanel('Overlay legend', 'overlay-panel');
  const overlayIntro = document.createElement('p');
  overlayIntro.className = 'panel-intro';
  overlayIntro.textContent =
    'The visual language is generic. A state appears on the world only when the evidence stream actually supplies it.';
  const legendList = document.createElement('div');
  legendList.className = 'legend-list';
  const gridToggleLabel = document.createElement('label');
  gridToggleLabel.className = 'toggle-row grid-toggle';
  const gridToggle = document.createElement('input');
  gridToggle.type = 'checkbox';
  gridToggle.checked = true;
  gridToggle.dataset.testid = 'grid-toggle';
  const gridToggleText = document.createElement('span');
  gridToggleText.textContent = 'Cell grid';
  gridToggleLabel.append(gridToggle, gridToggleText);
  gridToggle.addEventListener('change', () => {
    showGrid = gridToggle.checked;
    render();
  });
  overlayPanel.body.append(overlayIntro, legendList, gridToggleLabel);

  const eventPanel = createPanel('Recent evidence', 'event-panel');
  const eventList = document.createElement('ol');
  eventList.className = 'event-list';
  eventList.dataset.testid = 'recent-events';
  eventPanel.body.append(eventList);

  lowerGrid.append(parameterPanel.section, overlayPanel.section, eventPanel.section);
  main.append(header, workspace, timePanel.section, lowerGrid);
  root.replaceChildren(main);

  const initialSimulation = controller.getViewModel();
  const initialEvidence = evidenceAdapter.read();
  const initialView = buildAppPresentationViewModel(initialSimulation, initialEvidence, registry);

  const parameterBindings = new Map<string, ParameterBinding>();
  for (const parameter of initialView.parameters) {
    const row = document.createElement('div');
    row.className = 'parameter-row';
    row.dataset.parameterId = parameter.definition.id;

    const label = document.createElement('label');
    label.className = 'parameter-label';
    const inputId = `parameter-${parameter.definition.id.replaceAll('.', '-')}`;
    label.htmlFor = inputId;
    label.textContent = parameter.definition.label;

    const timing = document.createElement('span');
    timing.className = `timing-badge timing-${parameter.definition.mutation}`;
    timing.textContent = parameter.timingLabel;
    timing.title = parameter.timingDescription;

    const help = document.createElement('p');
    help.className = 'parameter-help';
    help.textContent = parameter.definition.help;

    const input = createParameterInput(parameter.definition);
    input.id = inputId;
    input.dataset.testid = `parameter-input-${parameter.definition.id}`;
    input.setAttribute('aria-describedby', `${inputId}-help ${inputId}-pending`);
    help.id = `${inputId}-help`;

    const status = document.createElement('div');
    status.className = 'parameter-status';
    const currentLabel = document.createElement('span');
    currentLabel.textContent = 'Current: ';
    const current = document.createElement('output');
    current.dataset.testid = `parameter-current-${parameter.definition.id}`;
    currentLabel.append(current);
    const pending = document.createElement('span');
    pending.id = `${inputId}-pending`;
    pending.dataset.testid = `parameter-pending-${parameter.definition.id}`;
    status.append(currentLabel, pending);

    const mutate = (): void => {
      controller.requestParameterMutation(
        parameter.definition.id,
        readInputValue(input, parameter.definition),
      );
      render();
    };
    input.addEventListener('change', mutate);

    const titleRow = document.createElement('div');
    titleRow.className = 'parameter-title-row';
    titleRow.append(label, timing);
    row.append(titleRow, help, input, status);
    parameterList.append(row);
    parameterBindings.set(parameter.definition.id, { input, current, pending, timing });
  }

  for (const item of initialView.legend) {
    const row = document.createElement('label');
    row.className = 'legend-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.dataset.testid = `overlay-${item.kind}`;
    const swatch = document.createElement('span');
    swatch.className = `legend-swatch legend-swatch-${item.kind}`;
    swatch.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('span');
    copy.className = 'legend-copy';
    const title = document.createElement('strong');
    title.textContent = item.label;
    const cue = document.createElement('small');
    cue.textContent = `${item.nonColorCue}. ${item.description}`;
    const count = document.createElement('output');
    count.className = 'legend-count';
    count.dataset.testid = `overlay-count-${item.kind}`;
    copy.append(title, cue);
    row.append(checkbox, swatch, copy, count);
    legendList.append(row);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        enabledOverlays.add(item.kind);
      } else {
        enabledOverlays.delete(item.kind);
      }
      render();
    });
  }

  function render(): void {
    const simulation = controller.getViewModel();
    const evidence = evidenceAdapter.read();
    const view = buildAppPresentationViewModel(simulation, evidence, registry);

    playButton.textContent = view.simulation.playing ? 'Pause' : 'Play';
    playButton.setAttribute('aria-pressed', String(view.simulation.playing));
    speedSlider.value = String(Math.round(view.simulation.speedPosition));
    speedSlider.setAttribute('aria-valuetext', view.simulation.playbackRateLabel);
    speedOutput.textContent = view.simulation.playbackRateLabel;

    frameCounter.value.value = String(view.simulation.frame);
    phaseCounter.value.value = `${view.simulation.phase + 1}/${view.simulation.phaseCount}`;
    tickCounter.value.value = String(view.simulation.tick);
    hashCounter.value.value = view.simulation.stateHash;
    viewportState.textContent = `Frame ${view.simulation.frame} · next phase ${view.simulation.phase + 1}/${view.simulation.phaseCount}`;
    evidenceState.textContent =
      view.world.latestEvidenceTick === null
        ? 'No phase evidence yet'
        : `Latest evidence tick ${view.world.latestEvidenceTick}`;

    examinedCounter.value.value = String(view.metrics.cells.examined);
    movedCounter.value.value = String(view.metrics.cells.moved);
    skippedCounter.value.value = String(view.metrics.cells.skipped);
    blockedCounter.value.value = String(view.metrics.cells.blocked);
    workCounter.value.value = String(view.metrics.work.total);
    traceCounter.value.value = String(view.traceRetention.retainedRecords);
    traceNote.textContent =
      view.traceRetention.droppedRecords === 0
        ? `Showing recent evidence from ${view.traceRetention.retainedRecords} retained records.`
        : `${view.traceRetention.droppedRecords} old records evicted from bounded history; cumulative metrics remain exact.`;

    provenanceBackend.textContent = `${view.provenance.backendId} (${view.provenance.backendKind})`;
    provenanceStrategy.textContent = view.provenance.strategyId;
    provenanceScenario.textContent = view.provenance.scenarioId;

    for (const parameter of view.parameters) {
      const binding = parameterBindings.get(parameter.definition.id);
      if (binding === undefined) {
        continue;
      }
      if (document.activeElement !== binding.input) {
        setInputValue(binding.input, parameter.definition, displayedParameterValue(parameter));
      }
      binding.current.value = formatParameterValue(parameter.currentValue);
      binding.timing.textContent = parameter.timingLabel;
      binding.pending.textContent = parameter.pending
        ? `Pending: ${formatParameterValue(parameter.pendingValue as ParameterValue)}`
        : parameter.timingDescription;
      binding.pending.classList.toggle('is-pending', parameter.pending);
    }

    for (const item of view.legend) {
      const count = legendList.querySelector<HTMLOutputElement>(
        `[data-testid="overlay-count-${item.kind}"]`,
      );
      if (count !== null) {
        count.value = String(latestOverlayCount(view, item.kind));
      }
    }

    eventList.replaceChildren(
      ...view.recentEvents.map((event) => {
        const item = document.createElement('li');
        const sequence = document.createElement('span');
        sequence.className = 'event-sequence';
        sequence.textContent = `#${event.sequence}`;
        const copy = document.createElement('span');
        copy.textContent = event.summary;
        const context = document.createElement('small');
        context.textContent = `frame ${event.frame} · phase ${event.phase + 1} · tick ${event.tick}`;
        item.append(sequence, copy, context);
        return item;
      }),
    );

    const evaluated = latestOverlayCount(view, 'evaluated-now');
    const blocked = latestOverlayCount(view, 'blocked-rejected');
    canvas.setAttribute(
      'aria-label',
      `Deterministic sand world at frame ${view.simulation.frame}. Latest evidence has ${evaluated} evaluated and ${blocked} blocked cell markers.`,
    );
    renderWorld(canvas, view.world, { enabledOverlays, showGrid });
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey || isEditingTarget(event.target)) {
      return;
    }

    if (event.key === ' ') {
      event.preventDefault();
      controller.togglePlay();
      render();
    } else if (event.key === '.') {
      event.preventDefault();
      controller.stepPhase();
      render();
    } else if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      controller.stepFrame();
      render();
    } else if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      controller.reset();
      render();
    }
  };

  window.addEventListener('keydown', onKeyDown);
  render();
  const stopPlayback = startPlaybackDriver(controller, render);
  return () => {
    stopPlayback();
    window.removeEventListener('keydown', onKeyDown);
  };
}
