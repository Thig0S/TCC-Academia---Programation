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
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-1366x768', use: { viewport: { width: 1366, height: 768 } } },
    { name: 'chromium-390x844', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'npm.cmd run start:paginacao-fixture',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
