import { TeachingModelEvidenceBackendV1 } from '../adapters/evidence-backend';
import { DeterministicComparison } from '../core/comparison/comparison';
import type { ParameterValue } from '../core/parameters/definitions';
import type { ParameterRegistry } from '../core/parameters/registry';
import { SimulationRunner } from '../core/runner/runner';
import { normalizeScenario, type CoreScenario } from '../core/scenario/scenario';
import { ComparisonController } from '../presentation/comparison-controller';
import {
  DEFAULT_PRESENTATION_SCRIPT,
  executePresentationBeat,
  type PresentationCommandTarget,
} from '../presentation/demo-script';
import { PresentationEvidenceAdapterV1 } from '../presentation/evidence-adapter';
import {
  canonicalShareQuery,
  decodeShareState,
  DEFAULT_TIMELINE_HISTORY_LIMIT,
  MAX_SHARE_REPLAY_TICKS,
  SHARE_STATE_VERSION,
  TIMELINE_HISTORY_LIMITS,
  type ShareStateV1,
} from '../presentation/share-state';
import { SimulationController } from '../presentation/simulation-controller';
import { buildTimelinePhaseEntries, describeTimelineEntry } from '../presentation/timeline';
import {
  DEFAULT_SCENARIO_LIBRARY_ID,
  getScenarioLibraryEntry,
  hasScenarioLibraryEntry,
  listScenarioLibrary,
} from '../scenarios/library';
import { mountApp } from './app';
import { mountComparisonApp } from './comparison-app';

interface SessionRuntime {
  readonly controller: SimulationController;
  readonly evidenceRunner: SimulationRunner;
  readonly cleanupApp: () => void;
  readonly baseScenario: CoreScenario;
  readonly comparison: boolean;
}

interface SessionMountResult {
  readonly cleanup: () => void;
}

function createScenarioWithOverrides(
  base: CoreScenario,
  overrides: Readonly<Record<string, ParameterValue>>,
): CoreScenario {
  return normalizeScenario({
    ...base,
    parameters: { ...base.parameters, ...overrides },
  });
}

function createRuntime(
  appHost: HTMLElement,
  state: ShareStateV1,
  registry: ParameterRegistry,
): SessionRuntime {
  const entry = getScenarioLibraryEntry(state.scenarioId);
  const baseScenario = entry.createScenario();
  const scenario = createScenarioWithOverrides(baseScenario, state.parameters);

  if (entry.mode === 'comparison') {
    const comparison = new DeterministicComparison(scenario, registry);
    const controller = new ComparisonController(comparison);
    if (state.speedPosition !== null) controller.setSpeedPosition(state.speedPosition);
    for (let tick = 0; tick < state.tick; tick += 1) controller.stepPhase();
    if (!state.paused) comparison.play();

    const baselineEvidence = new PresentationEvidenceAdapterV1(
      new TeachingModelEvidenceBackendV1(comparison.getBaselineRunner()),
    );
    const optimizedEvidence = new PresentationEvidenceAdapterV1(
      new TeachingModelEvidenceBackendV1(comparison.getOptimizedRunner()),
    );
    const cleanupApp = mountComparisonApp(
      appHost,
      controller,
      baselineEvidence,
      optimizedEvidence,
      registry,
    );
    return Object.freeze({
      controller,
      evidenceRunner: comparison.getOptimizedRunner(),
      cleanupApp,
      baseScenario,
      comparison: true,
    });
  }

  const runner = new SimulationRunner(scenario, registry);
  runner.setPlaybackRate(scenario.presentation.defaultPlaybackRate);
  const controller = new SimulationController(runner);
  if (state.speedPosition !== null) controller.setSpeedPosition(state.speedPosition);
  for (let tick = 0; tick < state.tick; tick += 1) controller.stepPhase();
  if (!state.paused) runner.play();
  const evidence = new PresentationEvidenceAdapterV1(new TeachingModelEvidenceBackendV1(runner));
  const cleanupApp = mountApp(appHost, controller, evidence, registry);
  return Object.freeze({
    controller,
    evidenceRunner: runner,
    cleanupApp,
    baseScenario,
    comparison: false,
  });
}

function currentUrlForState(state: ShareStateV1): string {
  const url = new URL(window.location.href);
  url.search = canonicalShareQuery(state);
  return url.toString();
}

function baseParameterValue(
  scenario: CoreScenario,
  registry: ParameterRegistry,
  id: string,
): ParameterValue {
  const value = scenario.parameters[id];
  return value ?? registry.get(id).defaultValue;
}

function hasTransientParameterState(
  runtime: SessionRuntime,
  state: ShareStateV1,
  registry: ParameterRegistry,
): boolean {
  const snapshot = runtime.evidenceRunner.getSnapshot().parameters;
  if (snapshot.pendingNextStep.length > 0 || snapshot.pendingReset.length > 0) return true;

  for (const record of snapshot.values) {
    const sharedInitial = state.parameters[record.id];
    const expected =
      sharedInitial === undefined
        ? baseParameterValue(runtime.baseScenario, registry, record.id)
        : sharedInitial;
    if (record.value !== expected) return true;
  }
  return false;
}

function createCurrentShareState(
  runtime: SessionRuntime,
  source: ShareStateV1,
  presentationMode: boolean,
  historyLimit: number,
): ShareStateV1 | null {
  const simulation = runtime.controller.getViewModel();
  const tick = runtime.evidenceRunner.getSnapshot().tick;
  if (tick > MAX_SHARE_REPLAY_TICKS) return null;
  return Object.freeze({
    version: SHARE_STATE_VERSION,
    scenarioId: source.scenarioId,
    tick,
    paused: !simulation.playing,
    speedPosition: Math.round(simulation.speedPosition),
    presentationMode,
    historyLimit,
    parameters: source.parameters,
  });
}

function createButton(label: string, testId: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.dataset.testid = testId;
  return button;
}

function requiredControl<T extends HTMLElement>(host: HTMLElement, testId: string): T {
  const control = host.querySelector<T>(`[data-testid="${testId}"]`);
  if (control === null) {
    throw new Error(`Mounted scenario control ${testId} was not found.`);
  }
  return control;
}

function createPresentationCommandTarget(
  appHost: HTMLElement,
  runtime: SessionRuntime,
): PresentationCommandTarget {
  const prefix = runtime.comparison ? 'comparison-' : '';

  const click = (testId: string): void => {
    requiredControl<HTMLButtonElement>(appHost, testId).click();
  };

  return Object.freeze({
    pause: () => {
      if (runtime.controller.getViewModel().playing) click(`${prefix}play-pause`);
    },
    stepPhase: () => click(`${prefix}step-phase`),
    stepFrame: () => click(`${prefix}step-frame`),
    stepFrames: (count: number) => {
      const countId = runtime.comparison ? 'comparison-step-count' : 'step-count';
      const buttonId = runtime.comparison ? 'comparison-step-frames' : 'step-frames';
      const input = requiredControl<HTMLInputElement>(appHost, countId);
      input.value = String(count);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      click(buttonId);
    },
    setSpeedPosition: (position: number) => {
      const sliderId = runtime.comparison ? 'comparison-speed-slider' : 'speed-slider';
      const input = requiredControl<HTMLInputElement>(appHost, sliderId);
      input.value = String(position);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    },
  });
}

function mountSession(
  root: HTMLElement,
  state: ShareStateV1,
  warnings: readonly string[],
  registry: ParameterRegistry,
  openState: (next: ShareStateV1) => void,
): SessionMountResult {
  let presentationMode = state.presentationMode;
  let historyLimit = state.historyLimit;
  let selectedTick: number | null = null;
  let scriptIndex = 0;

  const shell = document.createElement('div');
  shell.className = 'scenario-experience';
  shell.classList.toggle('is-presentation', presentationMode);

  const controls = document.createElement('section');
  controls.className = 'scenario-toolbar panel';
  controls.setAttribute('aria-label', 'Scenario and sharing controls');

  const scenarioLabel = document.createElement('label');
  scenarioLabel.htmlFor = 'scenario-library-select';
  scenarioLabel.textContent = 'Scenario';
  const scenarioSelect = document.createElement('select');
  scenarioSelect.id = 'scenario-library-select';
  scenarioSelect.dataset.testid = 'scenario-picker';
  for (const entry of listScenarioLibrary()) {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = entry.title;
    option.selected = entry.id === state.scenarioId;
    scenarioSelect.append(option);
  }
  const scenarioSummary = document.createElement('p');
  scenarioSummary.className = 'scenario-summary';
  scenarioSummary.dataset.testid = 'scenario-summary';
  scenarioSummary.textContent = getScenarioLibraryEntry(state.scenarioId).summary;

  const viewButton = createButton(
    presentationMode ? 'Exit presentation mode' : 'Presentation mode',
    'presentation-mode',
  );
  viewButton.setAttribute('aria-pressed', String(presentationMode));
  const demoButton = createButton('Next demo beat', 'presentation-next');
  const demoCaption = document.createElement('output');
  demoCaption.className = 'demo-caption';
  demoCaption.dataset.testid = 'presentation-caption';
  demoCaption.value = 'Presentation script is idle. It can only issue normal UI commands.';

  const shareRow = document.createElement('div');
  shareRow.className = 'share-row';
  const shareLabel = document.createElement('label');
  shareLabel.htmlFor = 'share-link';
  shareLabel.textContent = 'Shareable state';
  const shareInput = document.createElement('input');
  shareInput.id = 'share-link';
  shareInput.type = 'text';
  shareInput.readOnly = true;
  shareInput.dataset.testid = 'share-link';
  const copyButton = createButton('Copy link', 'copy-share-link');
  const shareStatus = document.createElement('span');
  shareStatus.className = 'share-status';
  shareStatus.dataset.testid = 'share-status';
  shareRow.append(shareLabel, shareInput, copyButton, shareStatus);

  const warningBox = document.createElement('div');
  warningBox.className = 'share-warning';
  warningBox.dataset.testid = 'share-warning';
  warningBox.setAttribute('role', 'status');
  warningBox.textContent = warnings.join(' ');
  warningBox.hidden = warnings.length === 0;

  const toolbarActions = document.createElement('div');
  toolbarActions.className = 'scenario-toolbar-actions';
  toolbarActions.append(viewButton, demoButton, demoCaption);
  controls.append(
    scenarioLabel,
    scenarioSelect,
    scenarioSummary,
    toolbarActions,
    shareRow,
    warningBox,
  );

  const appHost = document.createElement('div');
  appHost.className = 'scenario-app-host';
  appHost.dataset.testid = 'scenario-app-host';

  const timeline = document.createElement('section');
  timeline.className = 'scenario-timeline panel';
  timeline.setAttribute('aria-label', 'Trace-backed timeline inspector');
  const timelineHeader = document.createElement('div');
  timelineHeader.className = 'timeline-header';
  const timelineTitle = document.createElement('h2');
  timelineTitle.textContent = 'Timeline / phase inspector';
  const historyLabel = document.createElement('label');
  historyLabel.htmlFor = 'timeline-history';
  historyLabel.textContent = 'Recent trace records';
  const historySelect = document.createElement('select');
  historySelect.id = 'timeline-history';
  historySelect.dataset.testid = 'timeline-history-limit';
  for (const value of TIMELINE_HISTORY_LIMITS) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = String(value);
    option.selected = value === historyLimit;
    historySelect.append(option);
  }
  timelineHeader.append(timelineTitle, historyLabel, historySelect);
  const timelinePolicy = document.createElement('p');
  timelinePolicy.className = 'microcopy';
  timelinePolicy.textContent =
    'Inspection is read-only. Entries come from retained trace evidence; selecting one never rewinds physics. The core trace ring is bounded and this view reads only the configured recent window.';
  const timelineList = document.createElement('ol');
  timelineList.className = 'timeline-list';
  timelineList.dataset.testid = 'timeline-list';
  const timelineDetail = document.createElement('output');
  timelineDetail.className = 'timeline-detail';
  timelineDetail.dataset.testid = 'timeline-detail';
  const timelineRetention = document.createElement('p');
  timelineRetention.className = 'microcopy';
  timelineRetention.dataset.testid = 'timeline-retention';
  timeline.append(timelineHeader, timelinePolicy, timelineList, timelineDetail, timelineRetention);

  root.replaceChildren(shell);
  shell.append(controls, appHost, timeline);

  const runtime = createRuntime(appHost, state, registry);
  const presentationCommands = createPresentationCommandTarget(appHost, runtime);

  const setPresentationMode = (enabled: boolean): void => {
    presentationMode = enabled;
    shell.classList.toggle('is-presentation', presentationMode);
    viewButton.textContent = presentationMode ? 'Exit presentation mode' : 'Presentation mode';
    viewButton.setAttribute('aria-pressed', String(presentationMode));
  };

  scenarioSelect.addEventListener('change', () => {
    openState(
      Object.freeze({
        version: SHARE_STATE_VERSION,
        scenarioId: scenarioSelect.value,
        tick: 0,
        paused: true,
        speedPosition: null,
        presentationMode: false,
        historyLimit,
        parameters: Object.freeze({}),
      }),
    );
  });

  viewButton.addEventListener('click', () => setPresentationMode(!presentationMode));
  demoButton.addEventListener('click', () => {
    const beat = DEFAULT_PRESENTATION_SCRIPT[scriptIndex % DEFAULT_PRESENTATION_SCRIPT.length];
    if (beat === undefined) return;
    executePresentationBeat(presentationCommands, setPresentationMode, beat);
    demoCaption.value = beat.caption;
    scriptIndex += 1;
    renderTimeline();
  });

  historySelect.addEventListener('change', () => {
    historyLimit = Number(historySelect.value) || DEFAULT_TIMELINE_HISTORY_LIMIT;
    selectedTick = null;
    renderTimeline();
  });

  copyButton.addEventListener('click', () => {
    if (shareInput.value.length === 0) return;
    const copy = navigator.clipboard?.writeText(shareInput.value);
    if (copy !== undefined) {
      void copy.then(
        () => {
          shareStatus.textContent = 'Copied.';
        },
        () => {
          shareInput.select();
          shareStatus.textContent = 'Select the link and copy it manually.';
        },
      );
    } else {
      shareInput.select();
      shareStatus.textContent = 'Select the link and copy it manually.';
    }
  });

  function renderTimeline(): void {
    const windowSnapshot = runtime.evidenceRunner.getRecentTraceWindow(historyLimit);
    const entries = buildTimelinePhaseEntries(windowSnapshot.records, historyLimit);
    const visible = entries.slice(Math.max(0, entries.length - 16));
    timelineList.replaceChildren(
      ...visible.map((entry) => {
        const item = document.createElement('li');
        const button = createButton(describeTimelineEntry(entry), `timeline-tick-${entry.tick}`);
        button.className = 'timeline-entry';
        button.setAttribute('aria-pressed', String(selectedTick === entry.tick));
        button.addEventListener('click', () => {
          selectedTick = entry.tick;
          timelineDetail.value = `${describeTimelineEntry(entry)} · examined ${entry.examined} · moved ${entry.moved} · blocked ${entry.blocked} · skipped ${entry.skipped} · chunk transitions ${entry.chunkTransitions} · events ${entry.eventTypes.join(', ')}`;
          renderTimeline();
        });
        item.append(button);
        return item;
      }),
    );

    if (selectedTick === null && visible.length > 0) {
      const latest = visible[visible.length - 1];
      if (latest !== undefined) {
        timelineDetail.value = `Latest: ${describeTimelineEntry(latest)}.`;
      }
    }
    if (visible.length === 0) timelineDetail.value = 'No trace-backed phase evidence yet.';

    timelineRetention.textContent = `${windowSnapshot.retainedRecords} records retained by the core ring; this inspector read ${windowSnapshot.records.length}. ${windowSnapshot.droppedRecords} older records have been evicted.`;

    const shareState = createCurrentShareState(runtime, state, presentationMode, historyLimit);
    if (shareState === null) {
      shareInput.value = '';
      shareStatus.textContent = `Current tick exceeds the safe ${MAX_SHARE_REPLAY_TICKS}-tick direct-link replay bound.`;
      copyButton.disabled = true;
    } else {
      shareInput.value = currentUrlForState(shareState);
      copyButton.disabled = false;
      shareStatus.textContent = hasTransientParameterState(runtime, state, registry)
        ? 'Transient parameter edits are intentionally not serialized; reset/reload for exact replay.'
        : 'Canonical v1 link reproduces this scenario, deterministic tick, view and URL-backed parameters.';
    }
  }

  renderTimeline();
  const timelineTimer = window.setInterval(renderTimeline, 250);

  return Object.freeze({
    cleanup: () => {
      window.clearInterval(timelineTimer);
      runtime.cleanupApp();
    },
  });
}

export function mountScenarioExperience(
  root: HTMLElement,
  registry: ParameterRegistry,
): () => void {
  let activeCleanup = (): void => {};

  const openState = (state: ShareStateV1): void => {
    activeCleanup();
    const url = new URL(window.location.href);
    url.search = canonicalShareQuery(state);
    window.history.replaceState(null, '', url);
    activeCleanup = mountSession(root, state, [], registry, openState).cleanup;
  };

  const decoded = decodeShareState(
    new URLSearchParams(window.location.search),
    registry,
    DEFAULT_SCENARIO_LIBRARY_ID,
    hasScenarioLibraryEntry,
  );
  activeCleanup = mountSession(root, decoded.state, decoded.warnings, registry, openState).cleanup;

  return () => activeCleanup();
}
