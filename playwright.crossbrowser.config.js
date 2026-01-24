import { defineConfig, devices } from '@playwright/test';

/**
 * Cross-Browser Smoke Suite
 * Runs a curated subset of tests (HUD & Canvas) on WebKit and Firefox.
 * Usage: npx playwright test -c playwright.crossbrowser.config.js
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'firefox-smoke',
      use: { ...devices['Desktop Firefox'] },
      // Focus on critical path: System Integrity (Canvas) and HUD
      testMatch: ['**/smoke.spec.js', '**/FormulaHUD.spec.js'],
    },
    {
      name: 'webkit-smoke',
      use: { ...devices['Desktop Safari'] },
      // Focus on critical path: System Integrity (Canvas) and HUD
      testMatch: ['**/smoke.spec.js', '**/FormulaHUD.spec.js'],
    },
  ],
});