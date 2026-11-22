import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: 'paginacao-fixture.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  projects: [
    { name: 'chromium-1366x768', use: { viewport: { width: 1366, height: 768 } } },
    { name: 'chromium-390x844', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'npx.cmd ng serve --host 127.0.0.1 --port 4303',
    url: 'http://127.0.0.1:4303',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4303',
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
});
