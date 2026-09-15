from pathlib import Path

app = Path('src/ui/app.ts')
text = app.read_text()

old = """  const workCounter = createCounter('Work units', 'metrics-work');
  const traceCounter = createCounter('Trace retained', 'trace-retained');
  metricGrid.append(
    examinedCounter.container,
    movedCounter.container,
    skippedCounter.container,
    blockedCounter.container,
    workCounter.container,
    traceCounter.container,
  );
"""
new = """  const workCounter = createCounter('Work units', 'metrics-work');
  const activeChunksCounter = createCounter('Awake chunks', 'metrics-chunks-active');
  const sleepingChunksCounter = createCounter('Sleeping chunks', 'metrics-chunks-sleeping');
  const wokenChunksCounter = createCounter('Chunks woken', 'metrics-chunks-woken');
  const traceCounter = createCounter('Trace retained', 'trace-retained');
  metricGrid.append(
    examinedCounter.container,
    movedCounter.container,
    skippedCounter.container,
    blockedCounter.container,
    workCounter.container,
    activeChunksCounter.container,
    sleepingChunksCounter.container,
    wokenChunksCounter.container,
    traceCounter.container,
  );
"""
if old not in text:
    raise SystemExit('metrics construction target missing')
text = text.replace(old, new, 1)

old = """    workCounter.value.value = String(view.metrics.work.total);
    traceCounter.value.value = String(view.traceRetention.retainedRecords);
"""
new = """    workCounter.value.value = String(view.metrics.work.total);
    activeChunksCounter.value.value = String(view.metrics.chunks.active);
    sleepingChunksCounter.value.value = String(view.metrics.chunks.sleeping);
    wokenChunksCounter.value.value = String(view.metrics.chunks.woken);
    traceCounter.value.value = String(view.traceRetention.retainedRecords);
"""
if old not in text:
    raise SystemExit('metrics render target missing')
app.write_text(text.replace(old, new, 1))

test = Path('tests/e2e/app.spec.ts')
text = test.read_text()
old = """  await expect(page.getByTestId('recent-events')).toContainText('Woke chunk');
"""
new = """  await expect(page.getByTestId('metrics-chunks-woken')).toHaveText('4');
  await expect(page.getByTestId('metrics-chunks-active')).toHaveText('4');
  await expect(page.getByTestId('metrics-chunks-sleeping')).toHaveText('8');
"""
if old not in text:
    raise SystemExit('browser wake assertion target missing')
test.write_text(text.replace(old, new, 1))
