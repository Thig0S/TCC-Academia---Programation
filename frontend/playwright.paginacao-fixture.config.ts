import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4301';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'paginacao-fixture.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 1366, height: 768 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm.cmd run start:paginacao-fixture',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
