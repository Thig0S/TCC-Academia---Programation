import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4200';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/modo-local.spec.ts', '**/*.local.spec.ts'],
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/local',
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      env: (() => {
        const ambienteBrowser = { ...process.env };
        delete ambienteBrowser['Backend__SegredoLocal'];
        delete ambienteBrowser['PLAYWRIGHT_LOCAL_API_SECRET'];
        delete ambienteBrowser['PLAYWRIGHT_LOCAL_RUN_ID'];
        return ambienteBrowser;
      })(),
    },
  },
  projects: [
    { name: 'chromium-local-1366x768', use: { viewport: { width: 1366, height: 768 } } },
    { name: 'chromium-local-390x844', use: { viewport: { width: 390, height: 844 } } },
  ],
});
