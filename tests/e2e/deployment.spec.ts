import { expect, test } from '@playwright/test';

test('production assets load from the real GitHub Pages repository base path', async ({ page }) => {
  const failedRequests: string[] = [];
  const badResponses: string[] = [];
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('./?scenario=phased-slow');

  await expect(page.getByRole('heading', { level: 1, name: 'Sandimations' })).toBeVisible();
  await expect(page.getByTestId('world-canvas')).toBeVisible();
  await expect(page.getByTestId('scenario-picker')).toHaveValue('phased-slow');
  expect(new URL(page.url()).pathname).toBe('/sandimations/');
  expect(failedRequests).toEqual([]);
  expect(badResponses).toEqual([]);
});
