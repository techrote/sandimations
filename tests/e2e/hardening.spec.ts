import { expect, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

test('scenario, sharing, and timeline interactions are keyboard operable with accessible names', async ({
  page,
}) => {
  await page.goto('/?scenario=phased-slow');

  const scenario = page.getByRole('combobox', { name: 'Scenario' });
  await expect(scenario).toBeVisible();
  await scenario.focus();
  await expect(scenario).toBeFocused();

  await page.getByTestId('play-pause').click();
  await page.getByTestId('reset').click();
  await page.getByTestId('step-phase').click();

  const timelineEntry = page.getByTestId('timeline-list').getByRole('button').last();
  await timelineEntry.focus();
  await expect(timelineEntry).toBeFocused();
  await timelineEntry.press('Enter');
  await expect(timelineEntry).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('timeline-detail')).toContainText('examined');

  await expect(page.getByRole('textbox', { name: 'Shareable state' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Presentation mode' })).toBeVisible();
});

for (const width of [360, 768, 1440]) {
  test(`single-world layout remains usable without document overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?scenario=phased-slow');

    await expect(page.getByTestId('scenario-picker')).toBeVisible();
    await expect(page.getByTestId('world-canvas')).toBeVisible();
    await expect(page.getByTestId('speed-slider')).toBeVisible();
    await expect(page.getByTestId('timeline-history-limit')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test(`comparison layout remains usable without document overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?scenario=compare-phased');

    await expect(page.getByTestId('comparison-baseline-canvas')).toBeVisible();
    await expect(page.getByTestId('comparison-optimized-canvas')).toBeVisible();
    await expect(page.getByTestId('comparison-speed-slider')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}

test('critical overlay legend exposes non-color cues in text', async ({ page }) => {
  await page.goto('/?scenario=chunk-sleep-wake');

  for (const id of [
    'evaluated-now',
    'active-not-selected',
    'sleeping',
    'newly-woken',
    'blocked-rejected',
  ]) {
    const toggle = page.getByTestId(`overlay-${id}`);
    await expect(toggle).toBeVisible();
    const row = toggle.locator('..');
    await expect(row.locator('small')).not.toHaveText('');
  }
});
