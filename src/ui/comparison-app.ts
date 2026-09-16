import type { ParameterRegistry } from '../core/parameters/registry';
import {
  buildAppPresentationViewModel,
  type OverlayKind,
  type WorldPresentationViewModel,
} from '../presentation/app-view-model';
import type { ComparisonController } from '../presentation/comparison-controller';
import type { PresentationEvidenceAdapterV1 } from '../presentation/evidence-adapter';
import {
  MAX_SPEED_POSITION,
  MIN_SPEED_POSITION,
  NORMAL_SPEED_POSITION,
} from '../presentation/speed-control';
import { startPlaybackDriver } from './playback-driver';
import { renderWorld } from './world-canvas';

const OVERLAYS: ReadonlySet<OverlayKind> = new Set<OverlayKind>([
  'evaluated-now',
  'active-not-selected',
  'sleeping',
  'newly-woken',
  'blocked-rejected',
]);

function button(label: string, testId: string, onClick: () => void): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.dataset.testid = testId;
  element.addEventListener('click', onClick);
  return element;
}

function output(testId: string): HTMLOutputElement {
  const element = document.createElement('output');
  element.dataset.testid = testId;
  return element;
}

function metricRow(
  label: string,
  baselineTestId: string,
  optimizedTestId: string,
): { row: HTMLTableRowElement; baseline: HTMLOutputElement; optimized: HTMLOutputElement } {
  const row = document.createElement('tr');
  const name = document.createElement('th');
  name.scope = 'row';
  name.textContent = label;
  const baselineCell = document.createElement('td');
  const optimizedCell = document.createElement('td');
  const baseline = output(baselineTestId);
  const optimized = output(optimizedTestId);
  baselineCell.append(baseline);
  optimizedCell.append(optimized);
  row.append(name, baselineCell, optimizedCell);
  return { row, baseline, optimized };
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatWorkDifference(value: number): string {
  if (value > 0) return `${formatPercent(value)} fewer deterministic work units`;
  if (value < 0) return `${formatPercent(-value)} more deterministic work units`;
  return 'Same deterministic work units';
}

function setCanvasLabel(
  canvas: HTMLCanvasElement,
  role: string,
  world: WorldPresentationViewModel,
  frame: number,
  phase: number,
  phaseCount: number,
): void {
  const evaluated = world.overlays.filter((marker) => marker.kind === 'evaluated-now').length;
  const sleeping = world.overlays.filter((marker) => marker.kind === 'sleeping').length;
  canvas.setAttribute(
    'aria-label',
    `${role} deterministic sand world at comparison frame ${frame}, next phase ${phase + 1}/${phaseCount}; ${evaluated} cells evaluated in the latest tick and ${sleeping} sleeping markers.`,
  );
}

export function mountComparisonApp(
  root: HTMLElement,
  controller: ComparisonController,
  baselineEvidence: PresentationEvidenceAdapterV1,
  optimizedEvidence: PresentationEvidenceAdapterV1,
  registry: ParameterRegistry,
): () => void {
  const main = document.createElement('main');
  main.className = 'comparison-shell';

  const header = document.createElement('header');
  header.className = 'comparison-header';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Deterministic baseline vs optimized';
  const heading = document.createElement('h1');
  heading.textContent = 'Sandimations comparison';
  const explanation = document.createElement('p');
  explanation.className = 'summary';
  explanation.dataset.testid = 'comparison-explanation';
  explanation.textContent =
    'Both runners consume the same seed, world, ordered events and comparison ticks. Work units are deterministic operation counts, not wall-clock speed. Physical equivalence is not assumed; material-state divergence is measured explicitly.';
  header.append(eyebrow, heading, explanation);

  const toolbar = document.createElement('section');
  toolbar.className = 'comparison-toolbar panel';
  toolbar.setAttribute('aria-label', 'Comparison controls');

  const playPause = button('Play', 'comparison-play-pause', () => {
    controller.togglePlay();
    render();
  });
  const stepPhase = button('Step phase', 'comparison-step-phase', () => {
    controller.stepPhase();
    render();
  });
  const stepFrame = button('Step frame', 'comparison-step-frame', () => {
    controller.stepFrame();
    render();
  });
  const reset = button('Reset', 'comparison-reset', () => {
    controller.reset();
    render();
  });

  const stepCount = document.createElement('input');
  stepCount.type = 'number';
  stepCount.min = '1';
  stepCount.max = '999';
  stepCount.value = '10';
  stepCount.dataset.testid = 'comparison-step-count';
  stepCount.setAttribute('aria-label', 'Frames to step');
  const stepFrames = button('+10 frames', 'comparison-step-frames', () => {
    const count = Number(stepCount.value);
    if (Number.isSafeInteger(count) && count >= 1 && count <= 999) {
      controller.stepFrames(count);
      render();
    }
  });
  stepCount.addEventListener('input', () => {
    const count = Number(stepCount.value);
    stepFrames.textContent =
      Number.isSafeInteger(count) && count > 0 ? `+${count} frames` : 'Step frames';
  });

  const speedLabel = document.createElement('label');
  speedLabel.textContent = 'Playback speed';
  const speed = document.createElement('input');
  speed.type = 'range';
  speed.min = String(MIN_SPEED_POSITION);
  speed.max = String(MAX_SPEED_POSITION);
  speed.step = '1';
  speed.value = String(NORMAL_SPEED_POSITION);
  speed.dataset.testid = 'comparison-speed-slider';
  const speedValue = output('comparison-speed-value');
  speed.addEventListener('input', () => {
    controller.setSpeedPosition(Number(speed.value));
    render();
  });
  speedLabel.append(speed, speedValue);
  const normalSpeed = button('1×', 'comparison-speed-normal', () => {
    controller.setNormalSpeed();
    render();
  });

  const viewLabel = document.createElement('label');
  viewLabel.textContent = 'View';
  const viewMode = document.createElement('select');
  viewMode.dataset.testid = 'comparison-view-mode';
  for (const [value, label] of [
    ['split', 'Split'],
    ['overlay', 'Overlay'],
  ] as const) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    viewMode.append(option);
  }
  viewMode.addEventListener('change', () => {
    worlds.dataset.viewMode = viewMode.value;
  });
  viewLabel.append(viewMode);

  const controls = document.createElement('div');
  controls.className = 'comparison-control-row';
  controls.append(
    playPause,
    stepPhase,
    stepFrame,
    stepCount,
    stepFrames,
    reset,
    speedLabel,
    normalSpeed,
    viewLabel,
  );
  const sharedClock = document.createElement('p');
  sharedClock.className = 'comparison-clock';
  sharedClock.dataset.testid = 'comparison-clock';
  toolbar.append(controls, sharedClock);

  const worlds = document.createElement('section');
  worlds.className = 'comparison-worlds';
  worlds.dataset.viewMode = 'split';
  worlds.setAttribute('aria-label', 'Compared worlds');

  function worldCard(
    title: string,
    testId: string,
  ): {
    card: HTMLElement;
    canvas: HTMLCanvasElement;
    provenance: HTMLElement;
  } {
    const card = document.createElement('article');
    card.className = 'comparison-world-card';
    const titleElement = document.createElement('h2');
    titleElement.textContent = title;
    const provenance = document.createElement('p');
    provenance.className = 'comparison-provenance';
    provenance.dataset.testid = `${testId}-provenance`;
    const frame = document.createElement('div');
    frame.className = 'comparison-canvas-frame';
    const canvas = document.createElement('canvas');
    canvas.className = 'world-canvas comparison-canvas';
    canvas.dataset.testid = testId;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    frame.append(canvas);
    card.append(titleElement, provenance, frame);
    return { card, canvas, provenance };
  }

  const baselineWorld = worldCard('Baseline — full scan reference', 'comparison-baseline-canvas');
  baselineWorld.card.classList.add('baseline-world');
  const optimizedWorld = worldCard('Optimized teaching strategy', 'comparison-optimized-canvas');
  optimizedWorld.card.classList.add('optimized-world');
  worlds.append(baselineWorld.card, optimizedWorld.card);

  const metricsSection = document.createElement('section');
  metricsSection.className = 'comparison-metrics panel';
  const metricsHeading = document.createElement('h2');
  metricsHeading.textContent = 'Deterministic work comparison';
  const metricsProvenance = document.createElement('p');
  metricsProvenance.className = 'comparison-provenance';
  metricsProvenance.dataset.testid = 'comparison-metrics-provenance';
  const table = document.createElement('table');
  const caption = document.createElement('caption');
  caption.textContent = 'Each metric column is bound to the provenance identified above.';
  const head = document.createElement('thead');
  head.innerHTML = '<tr><th>Metric</th><th>Baseline</th><th>Optimized</th></tr>';
  const body = document.createElement('tbody');
  const examined = metricRow(
    'Cells examined',
    'compare-baseline-examined',
    'compare-optimized-examined',
  );
  const moved = metricRow('Cells moved', 'compare-baseline-moved', 'compare-optimized-moved');
  const skipped = metricRow(
    'Cells skipped',
    'compare-baseline-skipped',
    'compare-optimized-skipped',
  );
  const blocked = metricRow(
    'Cells blocked',
    'compare-baseline-blocked',
    'compare-optimized-blocked',
  );
  const activeChunks = metricRow(
    'Awake chunks',
    'compare-baseline-active-chunks',
    'compare-optimized-active-chunks',
  );
  const sleepingChunks = metricRow(
    'Sleeping chunks',
    'compare-baseline-sleeping-chunks',
    'compare-optimized-sleeping-chunks',
  );
  const wokenChunks = metricRow(
    'Chunks woken',
    'compare-baseline-woken-chunks',
    'compare-optimized-woken-chunks',
  );
  const phaseCount = metricRow(
    'Native phases / runner frame',
    'compare-baseline-phase-count',
    'compare-optimized-phase-count',
  );
  const nativeFrames = metricRow(
    'Native runner frames completed',
    'compare-baseline-native-frames',
    'compare-optimized-native-frames',
  );
  const phases = metricRow(
    'Scheduler ticks completed',
    'compare-baseline-phases',
    'compare-optimized-phases',
  );
  const work = metricRow(
    'Deterministic work units',
    'compare-baseline-work',
    'compare-optimized-work',
  );
  body.append(
    examined.row,
    moved.row,
    skipped.row,
    blocked.row,
    activeChunks.row,
    sleepingChunks.row,
    wokenChunks.row,
    phaseCount.row,
    nativeFrames.row,
    phases.row,
    work.row,
  );
  table.append(caption, head, body);

  const summaries = document.createElement('div');
  summaries.className = 'comparison-summary-grid';
  const workRatio = output('comparison-work-ratio');
  const workReduction = output('comparison-work-reduction');
  const divergence = output('comparison-divergence');
  const divergenceCells = output('comparison-divergence-cells');
  const metricId = document.createElement('code');
  metricId.dataset.testid = 'comparison-divergence-metric';
  summaries.innerHTML =
    '<div><strong>Optimized / baseline work</strong></div><div><strong>Work difference</strong></div><div><strong>Material divergence</strong></div><div><strong>Mismatched cells</strong></div>';
  const summarySlots = summaries.querySelectorAll('div');
  summarySlots[0]?.append(document.createElement('br'), workRatio);
  summarySlots[1]?.append(document.createElement('br'), workReduction);
  summarySlots[2]?.append(
    document.createElement('br'),
    divergence,
    document.createElement('br'),
    metricId,
  );
  summarySlots[3]?.append(document.createElement('br'), divergenceCells);

  const caveat = document.createElement('p');
  caveat.className = 'comparison-caveat';
  caveat.dataset.testid = 'comparison-caveat';
  caveat.textContent =
    'Work ratio compares deterministic operation counts only. The divergence metric is normalized cell-material Hamming distance: 0 means identical cell materials, 1 means every cell differs. It ignores displacement distance, includes unchanged boundary cells in its denominator, and does not establish physical correctness.';
  metricsSection.append(metricsHeading, metricsProvenance, table, summaries, caveat);

  main.append(header, toolbar, worlds, metricsSection);
  root.replaceChildren(main);

  function render(): void {
    const baselineSimulation = controller.getBaselineViewModel();
    const optimizedSimulation = controller.getOptimizedViewModel();
    const baseline = buildAppPresentationViewModel(
      baselineSimulation,
      baselineEvidence.read(),
      registry,
    );
    const optimized = buildAppPresentationViewModel(
      optimizedSimulation,
      optimizedEvidence.read(),
      registry,
    );
    const comparison = controller.getComparisonSnapshot();

    playPause.textContent = optimized.simulation.playing ? 'Pause' : 'Play';
    playPause.setAttribute('aria-pressed', String(optimized.simulation.playing));
    speed.value = String(Math.round(optimized.simulation.speedPosition));
    speedValue.value = optimized.simulation.playbackRateLabel;
    sharedClock.textContent = `Comparison frame ${comparison.optimized.frame} · next phase ${comparison.optimized.phase + 1}/${comparison.optimized.phaseCount} · tick ${comparison.optimized.tick}`;

    baselineWorld.provenance.textContent = `${comparison.baseline.provenance.backendId} · ${comparison.baseline.provenance.strategyId} · ${comparison.baseline.provenance.scenarioId}`;
    optimizedWorld.provenance.textContent = `${comparison.optimized.provenance.backendId} · ${comparison.optimized.provenance.strategyId} · ${comparison.optimized.provenance.scenarioId}`;
    metricsProvenance.textContent = `Baseline metrics: ${comparison.baseline.provenance.backendId} / ${comparison.baseline.provenance.strategyId}. Optimized metrics: ${comparison.optimized.provenance.backendId} / ${comparison.optimized.provenance.strategyId}. Ratios and divergence compare these exact provenance-bound streams.`;

    examined.baseline.value = String(comparison.baseline.metrics.cells.examined);
    examined.optimized.value = String(comparison.optimized.metrics.cells.examined);
    moved.baseline.value = String(comparison.baseline.metrics.cells.moved);
    moved.optimized.value = String(comparison.optimized.metrics.cells.moved);
    skipped.baseline.value = String(comparison.baseline.metrics.cells.skipped);
    skipped.optimized.value = String(comparison.optimized.metrics.cells.skipped);
    blocked.baseline.value = String(comparison.baseline.metrics.cells.blocked);
    blocked.optimized.value = String(comparison.optimized.metrics.cells.blocked);
    activeChunks.baseline.value = String(comparison.baseline.metrics.chunks.active);
    activeChunks.optimized.value = String(comparison.optimized.metrics.chunks.active);
    sleepingChunks.baseline.value = String(comparison.baseline.metrics.chunks.sleeping);
    sleepingChunks.optimized.value = String(comparison.optimized.metrics.chunks.sleeping);
    wokenChunks.baseline.value = String(comparison.baseline.metrics.chunks.woken);
    wokenChunks.optimized.value = String(comparison.optimized.metrics.chunks.woken);
    phaseCount.baseline.value = String(baselineSimulation.phaseCount);
    phaseCount.optimized.value = String(optimizedSimulation.phaseCount);
    nativeFrames.baseline.value = String(baselineSimulation.frame);
    nativeFrames.optimized.value = String(optimizedSimulation.frame);
    phases.baseline.value = String(comparison.baseline.metrics.phases.completed);
    phases.optimized.value = String(comparison.optimized.metrics.phases.completed);
    work.baseline.value = String(comparison.baseline.metrics.work.total);
    work.optimized.value = String(comparison.optimized.metrics.work.total);

    workRatio.value =
      comparison.workRatio.optimizedToBaseline === null
        ? '—'
        : formatPercent(comparison.workRatio.optimizedToBaseline);
    workReduction.value =
      comparison.workRatio.reductionFraction === null
        ? '—'
        : formatWorkDifference(comparison.workRatio.reductionFraction);
    divergence.value = formatPercent(comparison.divergence.normalized);
    divergenceCells.value = `${comparison.divergence.mismatchedCells}/${comparison.divergence.totalCells}`;
    metricId.textContent = comparison.divergence.metricId;

    setCanvasLabel(
      baselineWorld.canvas,
      'Baseline full-scan reference',
      baseline.world,
      comparison.baseline.frame,
      comparison.baseline.phase,
      comparison.baseline.phaseCount,
    );
    setCanvasLabel(
      optimizedWorld.canvas,
      'Optimized strategy',
      optimized.world,
      comparison.optimized.frame,
      comparison.optimized.phase,
      comparison.optimized.phaseCount,
    );
    renderWorld(baselineWorld.canvas, baseline.world, {
      enabledOverlays: OVERLAYS,
      showGrid: true,
    });
    renderWorld(optimizedWorld.canvas, optimized.world, {
      enabledOverlays: OVERLAYS,
      showGrid: true,
    });
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)
      return;
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
