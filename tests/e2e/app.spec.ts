import { expect, test } from '@playwright/test';

test('preserves functional speed and deterministic stepping controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'Sandimations' })).toBeVisible();
  await expect(page.getByTestId('world-canvas')).toBeVisible();

  const playPause = page.getByTestId('play-pause');
  await expect(playPause).toHaveText('Pause');
  await playPause.click();
  await expect(playPause).toHaveText('Play');

  await page.getByTestId('reset').click();
  await expect(page.getByTestId('frame-count')).toHaveText('0');
  await expect(page.getByTestId('tick-count')).toHaveText('0');
  await expect(page.getByTestId('phase-count')).toHaveText('1/1');
  const initialHash = await page.getByTestId('state-hash').textContent();

  const slider = page.getByTestId('speed-slider');
  await slider.fill('20');
  await expect(page.getByTestId('speed-value')).toHaveText('0.125×');
  await slider.fill('75');
  await expect(page.getByTestId('speed-value')).toHaveText('4×');
  await page.getByTestId('speed-normal').click();
  await expect(page.getByTestId('speed-value')).toHaveText('1×');

  await page.getByTestId('step-phase').click();
  await expect(page.getByTestId('frame-count')).toHaveText('1');
  await expect(page.getByTestId('tick-count')).toHaveText('1');
  await expect(playPause).toHaveText('Play');
  await expect(page.getByTestId('metrics-examined')).not.toHaveText('0');
  await expect(page.getByTestId('overlay-count-evaluated-now')).not.toHaveText('0');

  await page.getByTestId('reset').click();
  await page.getByTestId('step-frame').click();
  await expect(page.getByTestId('frame-count')).toHaveText('1');
  await expect(page.getByTestId('tick-count')).toHaveText('1');

  await page.getByTestId('reset').click();
  await page.getByTestId('step-count').fill('3');
  await page.getByTestId('step-frames').click();
  await expect(page.getByTestId('frame-count')).toHaveText('3');
  await expect(page.getByTestId('tick-count')).toHaveText('3');

  await page.getByTestId('reset').click();
  await expect(page.getByTestId('frame-count')).toHaveText('0');
  await expect(page.getByTestId('state-hash')).toHaveText(initialHash ?? '');

  await playPause.click();
  await expect(playPause).toHaveText('Pause');
  await expect
    .poll(async () => Number(await page.getByTestId('frame-count').textContent()))
    .toBeGreaterThan(0);

  await page.getByTestId('step-frame').click();
  await expect(playPause).toHaveText('Play');
});

test('binds parameter controls to registry mutation semantics', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('play-pause').click();
  await page.getByTestId('reset').click();

  const sandEnabled = page.getByTestId('parameter-input-simulation.sand.enabled');
  await expect(page.getByTestId('parameter-current-simulation.sand.enabled')).toHaveText('On');
  await sandEnabled.uncheck();
  await expect(page.getByTestId('parameter-current-simulation.sand.enabled')).toHaveText('Off');

  const tieBreak = page.getByTestId('parameter-input-simulation.sand.tie-break');
  await tieBreak.selectOption('left-first');
  await expect(page.getByTestId('parameter-current-simulation.sand.tie-break')).toHaveText(
    'seeded-random',
  );
  await expect(page.getByTestId('parameter-pending-simulation.sand.tie-break')).toContainText(
    'Pending: left-first',
  );
  await page.getByTestId('step-phase').click();
  await expect(page.getByTestId('parameter-current-simulation.sand.tie-break')).toHaveText(
    'left-first',
  );
  await expect(page.getByTestId('parameter-pending-simulation.sand.tie-break')).not.toContainText(
    'Pending:',
  );

  const seedVariant = page.getByTestId('parameter-input-simulation.seed-variant');
  await seedVariant.fill('42');
  await seedVariant.press('Tab');
  await expect(page.getByTestId('parameter-current-simulation.seed-variant')).toHaveText('0');
  await expect(page.getByTestId('parameter-pending-simulation.seed-variant')).toContainText(
    'Pending: 42',
  );
  await page.getByTestId('reset').click();
  await expect(page.getByTestId('parameter-current-simulation.seed-variant')).toHaveText('42');
  await expect(page.getByTestId('parameter-pending-simulation.seed-variant')).not.toContainText(
    'Pending:',
  );

  const sleepDelay = page.getByTestId('parameter-input-scheduler.chunk.sleep-delay');
  await sleepDelay.fill('5');
  await sleepDelay.press('Tab');
  await expect(page.getByTestId('parameter-pending-scheduler.chunk.sleep-delay')).toContainText(
    'Pending: 5',
  );
  await page.getByTestId('step-phase').click();
  await expect(page.getByTestId('parameter-current-scheduler.chunk.sleep-delay')).toHaveText('5');
});

test('shows chunks sleep, wake from a local disturbance, and return toward sleep', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('play-pause').click();
  await page.getByTestId('reset').click();

  await page.getByTestId('step-count').fill('3');
  await page.getByTestId('step-frames').click();
  await expect
    .poll(async () => Number(await page.getByTestId('overlay-count-sleeping').textContent()))
    .toBeGreaterThan(0);
  await expect(page.getByTestId('overlay-count-newly-woken')).toHaveText('0');

  await page.getByTestId('step-count').fill('16');
  await page.getByTestId('step-frames').click();
  await expect
    .poll(async () => Number(await page.getByTestId('overlay-count-newly-woken').textContent()))
    .toBeGreaterThan(0);
  await expect(page.getByTestId('recent-events')).toContainText('Woke chunk');

  await page.getByTestId('step-count').fill('28');
  await page.getByTestId('step-frames').click();
  await expect(page.getByTestId('overlay-count-newly-woken')).toHaveText('0');
  await expect
    .poll(async () => Number(await page.getByTestId('overlay-count-sleeping').textContent()))
    .toBeGreaterThan(0);
});

test('supports keyboard operation and narrow responsive layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.getByTestId('play-pause').click();
  await page.getByTestId('reset').click();
  await page.getByRole('heading', { level: 1 }).click();

  await page.keyboard.press('.');
  await expect(page.getByTestId('frame-count')).toHaveText('1');
  await page.keyboard.press('f');
  await expect(page.getByTestId('frame-count')).toHaveText('2');
  await page.keyboard.press('r');
  await expect(page.getByTestId('frame-count')).toHaveText('0');
  await page.keyboard.press('Space');
  await expect(page.getByTestId('play-pause')).toHaveText('Pause');

  await expect(page.getByTestId('overlay-evaluated-now')).toBeVisible();
  await expect(page.getByTestId('overlay-active-not-selected')).toBeVisible();
  await expect(page.getByTestId('overlay-sleeping')).toBeVisible();
  await expect(page.getByTestId('overlay-newly-woken')).toBeVisible();
  await expect(page.getByTestId('overlay-blocked-rejected')).toBeVisible();

  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.viewport);
});

test('honors reduced motion for nonessential presentation animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const animation = await page.locator('.legend-swatch-newly-woken').evaluate((element) => {
    const style = getComputedStyle(element);
    return { name: style.animationName, iterations: style.animationIterationCount };
  });
  expect(animation.name).toBe('none');
  expect(animation.iterations).toBe('1');
});
