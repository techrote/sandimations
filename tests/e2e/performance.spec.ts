import { expect, test } from '@playwright/test';

async function captureProfile(page: import('@playwright/test').Page, scenario: string) {
  await page.goto(`/?scenario=${scenario}`);
  await page.evaluate(() => window.__sandimationsPerformance?.reset());

  await expect
    .poll(async () => {
      const snapshots = await page.evaluate(() => window.__sandimationsPerformance?.read() ?? []);
      return snapshots.find((entry) => entry.category === 'playback-ui')?.sampleCount ?? 0;
    })
    .toBeGreaterThanOrEqual(8);

  const snapshots = await page.evaluate(() => window.__sandimationsPerformance?.read() ?? []);
  const note = await page.evaluate(() => window.__sandimationsPerformance?.note ?? '');
  console.log(`[performance-profile] ${scenario} ${JSON.stringify(snapshots)}`);

  expect(note).toContain('Wall-clock presentation timings only');
  for (const snapshot of snapshots) {
    expect(snapshot.sampleCount).toBeGreaterThan(0);
    expect(snapshot.meanMs).toBeGreaterThanOrEqual(0);
    expect(snapshot.p95Ms).toBeGreaterThanOrEqual(snapshot.meanMs);
    expect(snapshot.maxMs).toBeGreaterThanOrEqual(snapshot.p95Ms);
  }
  return snapshots;
}

test('records bounded presentation timings for phased sampling without treating them as simulation evidence', async ({
  page,
}) => {
  const snapshots = await captureProfile(page, 'phased-normal');
  expect(snapshots.find((entry) => entry.category === 'world-canvas')?.lastWorkItems).toBeGreaterThan(
    0,
  );
});

test('records presentation timings for the comparison view', async ({ page }) => {
  const snapshots = await captureProfile(page, 'compare-phased');
  expect(snapshots.find((entry) => entry.category === 'world-canvas')?.sampleCount).toBeGreaterThanOrEqual(
    8,
  );
});
