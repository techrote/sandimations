import { expect, test } from '@playwright/test';

test('loads the production bootstrap shell with core status', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'Sandimations' })).toBeVisible();
  await expect(page.getByTestId('core-status')).toHaveText('Deterministic core boundary active');
  await expect(page.getByRole('heading', { level: 2, name: 'Architecture boundaries' })).toBeVisible();
  await expect(page.getByText('Simulation core', { exact: true })).toBeVisible();
  await expect(page.getByText('Browser UI and rendering', { exact: true })).toBeVisible();
});
