import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'cd frontend && npm run dev',
      port: 5173,
      reuseExistingServer: true,
    },
    {
      command: 'cd backend && python run.py',
      port: 5000,
      reuseExistingServer: true,
    },
  ],
});