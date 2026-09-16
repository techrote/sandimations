import { expect, test, type Page } from '@playwright/test';

async function pauseAndReset(page: Page): Promise<void> {
  const playPause = page.getByTestId('comparison-play-pause');
  if ((await playPause.textContent()) === 'Pause') await playPause.click();
  await page.getByTestId('comparison-reset').click();
  await expect(playPause).toHaveText('Play');
  await expect(page.getByTestId('comparison-clock')).toContainText('tick 0');
}

test('phased comparison steps and resets deterministically with provenance-backed metrics', async ({
  page,
}) => {
  await page.goto('/?scenario=compare-phased');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sandimations comparison' }),
  ).toBeVisible();
  await expect(page.getByTestId('comparison-baseline-provenance')).toContainText('phase-clock-v1');
  await expect(page.getByTestId('comparison-optimized-provenance')).toContainText(
    'phased-sampling-v1',
  );
  await expect(page.getByTestId('comparison-metrics-provenance')).toContainText('phase-clock-v1');
  await expect(page.getByTestId('comparison-metrics-provenance')).toContainText(
    'phased-sampling-v1',
  );
  await expect(page.getByTestId('comparison-caveat')).toContainText(
    'deterministic operation counts only',
  );

  await pauseAndReset(page);
  await expect(page.getByTestId('comparison-divergence')).toHaveText('0.0%');
  await expect(page.getByTestId('comparison-work-ratio')).toHaveText('—');

  await page.getByTestId('comparison-step-frame').click();
  await expect(page.getByTestId('comparison-clock')).toContainText('Comparison frame 1');
  await expect(page.getByTestId('comparison-clock')).toContainText('tick 4');
  await expect(page.getByTestId('compare-baseline-phase-count')).toHaveText('1');
  await expect(page.getByTestId('compare-optimized-phase-count')).toHaveText('4');
  await expect(page.getByTestId('compare-baseline-native-frames')).toHaveText('4');
  await expect(page.getByTestId('compare-optimized-native-frames')).toHaveText('1');
  await expect(page.getByTestId('compare-baseline-phases')).toHaveText('4');
  await expect(page.getByTestId('compare-optimized-phases')).toHaveText('4');
  await expect(page.getByTestId('comparison-work-ratio')).toHaveText('25.0%');
  await expect(page.getByTestId('comparison-work-reduction')).toContainText('75.0% fewer');
  await expect(page.getByTestId('comparison-divergence-metric')).toHaveText(
    'cell-material-hamming-v1',
  );

  const baselineWork = Number(await page.getByTestId('compare-baseline-work').textContent());
  const optimizedWork = Number(await page.getByTestId('compare-optimized-work').textContent());
  expect(baselineWork).toBeGreaterThan(optimizedWork);

  const firstDivergence = await page.getByTestId('comparison-divergence-cells').textContent();
  await page.getByTestId('comparison-reset').click();
  await expect(page.getByTestId('comparison-divergence')).toHaveText('0.0%');
  await page.getByTestId('comparison-step-frame').click();
  await expect(page.getByTestId('comparison-divergence-cells')).toHaveText(firstDivergence ?? '');
  await expect(page.getByTestId('compare-baseline-work')).toHaveText(String(baselineWork));
  await expect(page.getByTestId('compare-optimized-work')).toHaveText(String(optimizedWork));

  await page.getByTestId('comparison-view-mode').selectOption('overlay');
  await expect(page.locator('.comparison-worlds')).toHaveAttribute('data-view-mode', 'overlay');
  await expect(page.getByTestId('comparison-baseline-canvas')).toBeVisible();
  await expect(page.getByTestId('comparison-optimized-canvas')).toBeVisible();
});

test('chunk sleep comparison shows real baseline-relative avoided work', async ({ page }) => {
  await page.goto('/?scenario=compare-sleep-wake');
  await pauseAndReset(page);

  await expect(page.getByTestId('comparison-baseline-provenance')).toContainText('phase-clock-v1');
  await expect(page.getByTestId('comparison-optimized-provenance')).toContainText(
    'chunk-sleep-wake-v1',
  );
  await expect(page.getByTestId('comparison-metrics-provenance')).toContainText('phase-clock-v1');
  await expect(page.getByTestId('comparison-metrics-provenance')).toContainText(
    'chunk-sleep-wake-v1',
  );

  await page.getByTestId('comparison-step-count').fill('8');
  await page.getByTestId('comparison-step-frames').click();
  await expect(page.getByTestId('comparison-clock')).toContainText('Comparison frame 8');
  await expect
    .poll(async () =>
      Number(await page.getByTestId('compare-optimized-sleeping-chunks').textContent()),
    )
    .toBeGreaterThan(0);

  const baselineExamined = Number(
    await page.getByTestId('compare-baseline-examined').textContent(),
  );
  const optimizedExamined = Number(
    await page.getByTestId('compare-optimized-examined').textContent(),
  );
  expect(baselineExamined).toBeGreaterThan(optimizedExamined);

  const ratioText = await page.getByTestId('comparison-work-ratio').textContent();
  expect(Number.parseFloat(ratioText ?? 'NaN')).toBeLessThan(100);
  await expect(page.getByTestId('comparison-divergence-cells')).not.toHaveText('0/640');
});
