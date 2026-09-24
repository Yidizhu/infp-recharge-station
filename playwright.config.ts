import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './tests/e2e/results',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4187', trace: 'retain-on-failure',
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium'),
  },
  projects: [{ name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }],
  globalSetup: './tests/e2e/preview-lifecycle.setup.ts',
});
