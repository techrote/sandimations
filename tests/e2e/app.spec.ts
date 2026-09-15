import { expect, test } from '@playwright/test';

test('exposes functional speed and deterministic stepping controls', async ({ page }) => {
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

  await page.getByTestId('reset').click();
  await page.getByTestId('step-frame').click();
  await expect(page.getByTestId('frame-count')).toHaveText('1');
  await expect(page.getByTestId('tick-count')).toHaveText('1');

  await page.getByTestId('step-frames').click();
  await expect(page.getByTestId('frame-count')).toHaveText('11');
  await expect(page.getByTestId('tick-count')).toHaveText('11');

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
