import { expect, test } from '@playwright/test';

test.describe('SD-009 scenario experience', () => {
  test('selects a fresh curated scenario without leaking previous evidence state', async ({ page }) => {
    await page.goto('/?v=1&scenario=phased-slow&tick=3&paused=1&speed=50&view=inspect&history=128');
    await expect(page.getByTestId('scenario-picker')).toHaveValue('phased-slow');
    await expect(page.getByTestId('tick-count')).toHaveText('3');
    await expect(page.getByTestId('timeline-list')).toContainText('tick 2');

    await page.getByTestId('scenario-picker').selectOption('chunk-sleep-wake');

    await expect(page.getByTestId('scenario-picker')).toHaveValue('chunk-sleep-wake');
    await expect(page.getByTestId('provenance-scenario')).toHaveText('sd-006-chunk-sleep-wake');
    await expect(page).toHaveURL(/scenario=chunk-sleep-wake/);
    await expect(page.getByTestId('timeline-list')).not.toContainText('tick 2');
  });

  test('reopens a copied canonical URL at materially equivalent deterministic state', async ({ page }) => {
    await page.goto(
      '/?v=1&scenario=phased-slow&tick=5&paused=1&speed=30&view=presentation&history=64&p.simulation.sand.enabled=0',
    );

    const initialHash = await page.getByTestId('state-hash').textContent();
    const shareLink = await page.getByTestId('share-link').inputValue();
    expect(shareLink).toContain('v=1');
    expect(shareLink).toContain('scenario=phased-slow');
    expect(shareLink).toContain('tick=5');
    expect(shareLink).toContain('view=presentation');
    expect(shareLink).toContain('p.simulation.sand.enabled=0');

    await page.goto(shareLink);

    await expect(page.getByTestId('tick-count')).toHaveText('5');
    await expect(page.getByTestId('presentation-mode')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('parameter-current-simulation.sand.enabled')).toHaveText('Off');
    await expect(page.getByTestId('state-hash')).toHaveText(initialHash ?? '');
  });

  test('shows frame and scheduler phase from trace evidence without pretending to rewind', async ({ page }) => {
    await page.goto('/?v=1&scenario=phased-slow&tick=0&paused=1&speed=50&view=inspect&history=64');
    await expect(page.getByTestId('timeline-detail')).toHaveValue('No trace-backed phase evidence yet.');

    await page.getByTestId('step-phase').click();
    await expect(page.getByTestId('timeline-tick-0')).toContainText('frame 0 · phase 1/4 · tick 0');
    await page.getByTestId('timeline-tick-0').click();
    await expect(page.getByTestId('timeline-detail')).toHaveValue(/frame 0 · phase 1\/4 · tick 0/);

    await page.getByTestId('step-phase').click();
    await expect(page.getByTestId('timeline-tick-1')).toContainText('frame 0 · phase 2/4 · tick 1');
    await expect(page.getByTestId('timeline-retention')).toContainText('this inspector read');
  });

  test('presentation beats use the normal controls and scenario navigation remains keyboard viable', async ({ page }) => {
    await page.goto('/?v=1&scenario=phased-slow&tick=0&paused=1&speed=50&view=inspect&history=128');

    await page.getByTestId('scenario-picker').focus();
    await expect(page.getByTestId('scenario-picker')).toBeFocused();

    await page.getByTestId('presentation-next').click();
    await expect(page.getByTestId('presentation-mode')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('tick-count')).toHaveText('0');

    await page.getByTestId('presentation-next').click();
    await expect(page.getByTestId('tick-count')).toHaveText('1');
    await expect(page.getByTestId('presentation-caption')).toHaveValue(/public step command/);
  });

  test('rejects unsupported share versions without corrupting application state', async ({ page }) => {
    await page.goto('/?v=999&scenario=chunk-sleep-wake&tick=40&view=presentation');

    await expect(page.getByTestId('scenario-picker')).toHaveValue('phased-slow');
    await expect(page.getByTestId('tick-count')).toHaveText('0');
    await expect(page.getByTestId('share-warning')).toContainText('Unsupported share-state version 999');
  });
});
