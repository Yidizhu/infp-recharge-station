import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'preview-lifecycle.probe.ts',
  outputDir: './results-lifecycle', workers: 1,
  globalSetup: './preview-lifecycle.setup.ts',
  timeout: 10_000, globalTimeout: 20_000,
});
