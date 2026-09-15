from pathlib import Path

path = Path('src/ui/app.ts')
text = path.read_text()

old = """  const workCounter = createCounter('Work units', 'metrics-work');
  const activeChunksCounter = createCounter('Awake chunks', 'metrics-chunks-active');
"""
new = """  const workCounter = createCounter('Work units', 'metrics-work');
  const samplingSelectedCounter = createCounter('Selected now', 'sampling-selected');
  const samplingDeferredCounter = createCounter('Active deferred', 'sampling-deferred');
  const samplingCoverageCounter = createCounter('Cycle coverage', 'sampling-coverage');
  const samplingPatternCounter = createCounter('Sampling pattern', 'sampling-pattern');
  const activeChunksCounter = createCounter('Awake chunks', 'metrics-chunks-active');
"""
if old not in text:
    raise SystemExit('sampling counter insertion target missing')
text = text.replace(old, new, 1)

old = """    workCounter.container,
    activeChunksCounter.container,
"""
new = """    workCounter.container,
    samplingSelectedCounter.container,
    samplingDeferredCounter.container,
    samplingCoverageCounter.container,
    samplingPatternCounter.container,
    activeChunksCounter.container,
"""
if old not in text:
    raise SystemExit('metric append target missing')
text = text.replace(old, new, 1)

old = """    evidenceState.textContent =
      view.world.latestEvidenceTick === null
        ? 'No phase evidence yet'
        : `Latest evidence tick ${view.world.latestEvidenceTick}`;

    examinedCounter.value.value = String(view.metrics.cells.examined);
"""
new = """    const sampling = view.world.sampling;
    evidenceState.textContent =
      sampling?.lastExecutedPhase !== null && sampling !== null
        ? `Phase ${sampling.lastExecutedPhase + 1}/${sampling.phaseCount} sampled ${sampling.selectedCellCount}/${sampling.activeCellCount} active cells`
        : view.world.latestEvidenceTick === null
          ? 'No phase evidence yet'
          : `Latest evidence tick ${view.world.latestEvidenceTick}`;

    examinedCounter.value.value = String(view.metrics.cells.examined);
"""
if old not in text:
    raise SystemExit('evidence state target missing')
text = text.replace(old, new, 1)

old = """    workCounter.value.value = String(view.metrics.work.total);
    activeChunksCounter.value.value = String(view.metrics.chunks.active);
"""
new = """    workCounter.value.value = String(view.metrics.work.total);
    samplingSelectedCounter.value.value = String(sampling?.selectedCellCount ?? 0);
    samplingDeferredCounter.value.value = String(
      sampling?.lastExecutedPhase === null || sampling === null
        ? 0
        : sampling.activeCellCount - sampling.selectedCellCount,
    );
    samplingCoverageCounter.value.value =
      sampling === null
        ? '—'
        : `${sampling.cells.filter((cell) => cell.lastSelectedTick !== null).length}/${sampling.activeCellCount}`;
    samplingPatternCounter.value.value = sampling?.pattern ?? '—';
    activeChunksCounter.value.value = String(view.metrics.chunks.active);
"""
if old not in text:
    raise SystemExit('sampling metric render target missing')
text = text.replace(old, new, 1)

old = """    const evaluated = latestOverlayCount(view, 'evaluated-now');
    const blocked = latestOverlayCount(view, 'blocked-rejected');
    canvas.setAttribute(
      'aria-label',
      `Deterministic sand world at frame ${view.simulation.frame}. Latest evidence has ${evaluated} evaluated and ${blocked} blocked cell markers.`,
    );
"""
new = """    const evaluated = latestOverlayCount(view, 'evaluated-now');
    const deferred = latestOverlayCount(view, 'active-not-selected');
    const blocked = latestOverlayCount(view, 'blocked-rejected');
    canvas.setAttribute(
      'aria-label',
      `Deterministic sand world at frame ${view.simulation.frame}. Latest evidence has ${evaluated} evaluated, ${deferred} active in another phase, and ${blocked} blocked cell markers.`,
    );
"""
if old not in text:
    raise SystemExit('canvas aria target missing')
text = text.replace(old, new, 1)

path.write_text(text)
