import { defineConfig } from '@playwright/test';

const basePath = '/sandimations/';
const port = 4174;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'deployment.spec.ts',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}${basePath}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-pages',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --base=${basePath}`,
    url: `http://127.0.0.1:${port}${basePath}`,
    reuseExistingServer: !process.env.CI,
  },
});
