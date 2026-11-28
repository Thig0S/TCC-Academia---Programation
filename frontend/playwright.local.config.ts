import { randomBytes } from 'node:crypto';
import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4200';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/modo-local.spec.ts',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-local-1366x768', use: { viewport: { width: 1366, height: 768 } } },
    { name: 'chromium-local-390x844', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'npm.cmd run start:local',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      Backend__SegredoLocal: randomBytes(32).toString('base64'),
      Backend__Porta: '5070',
    },
  },
});
