import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';

// Separate evidence output; shares the root lifecycle/4187 port. Run serially.
export default defineConfig({
  ...base,
  testDir: '.',
  outputDir: './results-c-independent',
  // Resolve relative to this config rather than the repository root config.
  globalSetup: './preview-lifecycle.setup.ts',
});
