import fs from 'node:fs';

function replaceOnce(path, before, after) {
  const text = fs.readFileSync(path, 'utf8');
  const count = text.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: expected one match, found ${count}`);
  fs.writeFileSync(path, text.replace(before, after));
}

replaceOnce(
  'src/presentation/app-view-model.ts',
  `  if (sampling?.lastExecutedTick !== null && sampling !== null) {\n    for (const cell of sampling.cells) {\n      if (cell.lastSelectedTick === sampling.lastExecutedTick) {\n        markCell(markers, cell.x, cell.y, 'evaluated-now');\n      }\n    }\n  }\n\n`,
  '',
);

replaceOnce(
  'tests/unit/app-view-model.test.ts',
  `  it('derives current and pending parameter state from registry metadata and evidence', () => {\n`,
  `  it('does not present scheduler selection as evaluation when material work is disabled', () => {\n    const registry = createCoreParameterRegistry();\n    const runner = new SimulationRunner(createPhasedSamplingFixtureScenario(), registry);\n    const controller = new SimulationController(runner);\n    const adapter = new PresentationEvidenceAdapterV1(new TeachingModelEvidenceBackendV1(runner));\n\n    controller.requestParameterMutation(CoreParameterId.sandEnabled, false);\n    controller.stepPhase();\n    const evidence = adapter.read();\n    const sampling = evidence.scheduler.sampling;\n    expect(sampling).not.toBeNull();\n    if (sampling == null) {\n      throw new Error('Expected phased sampling evidence.');\n    }\n\n    expect(sampling.selectedCellCount).toBeGreaterThan(0);\n    expect(\n      evidence.traceRecords.filter(\n        (record) => record.tick === sampling.lastExecutedTick && record.type === 'cell-examined',\n      ),\n    ).toHaveLength(0);\n\n    const view = buildAppPresentationViewModel(controller.getViewModel(), evidence, registry);\n    expect(view.world.overlays.filter((marker) => marker.kind === 'evaluated-now')).toHaveLength(0);\n    expect(view.metrics.cells.examined).toBe(0);\n  });\n\n  it('derives current and pending parameter state from registry metadata and evidence', () => {\n`,
);

replaceOnce(
  'tests/e2e/app.spec.ts',
  `test('phased sampling phase count and pattern apply on reset', async ({ page }) => {\n`,
  `test('does not label selected cells as evaluated when sand work is disabled', async ({ page }) => {\n  await page.goto('/');\n  await page.getByTestId('play-pause').click();\n  await page.getByTestId('reset').click();\n\n  const sandEnabled = page.getByTestId('parameter-input-simulation.sand.enabled');\n  await sandEnabled.uncheck();\n  await expect(page.getByTestId('parameter-current-simulation.sand.enabled')).toHaveText('Off');\n\n  await page.getByTestId('step-phase').click();\n  await expect(page.getByTestId('sampling-selected')).not.toHaveText('0');\n  await expect(page.getByTestId('metrics-examined')).toHaveText('0');\n  await expect(page.getByTestId('overlay-count-evaluated-now')).toHaveText('0');\n  await expect(page.getByTestId('overlay-count-active-not-selected')).not.toHaveText('0');\n});\n\ntest('phased sampling phase count and pattern apply on reset', async ({ page }) => {\n`,
);

replaceOnce(
  'docs/PHASED_SAMPLING.md',
  `The exact evaluated set is the set of \`cell-examined\` records at that tick. A test requires the examined-record count to equal the scheduler's selected count.\n`,
  `The exact evaluated set is the set of \`cell-examined\` records at that tick. When material work is enabled, tests require the examined-record count to equal the scheduler's selected count. Selection itself remains distinct evidence: if sand evaluation is disabled, phase selection and coverage still advance, but no cell is presented as evaluated unless a \`cell-examined\` record exists.\n`,
);
