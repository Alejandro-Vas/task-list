import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  testMatch: /\.spec\.ts$/,
  fullyParallel: true,
  retries: isCI ? 1 : 0,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  forbidOnly: isCI,
  // Один воркер: тесты логинятся одним демо-пользователем, параллельные
  // сессии ротируют один refresh-токен и ловят THROTTLE_AUTH_LIMIT.
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 5_000,
    navigationTimeout: 30_000,
  },

  webServer: {
    command: isCI ? 'yarn start' : 'yarn dev',
    url: BASE_URL,
    reuseExistingServer: !isCI,
    cwd: __dirname,
    timeout: 120_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
