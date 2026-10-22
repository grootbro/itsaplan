import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [
    ['list'],
    [
      'html',
      { outputFolder: process.env.MOBILE_UI_REPORT ?? '/tmp/mobile-ui-report', open: 'never' },
    ],
  ],
  outputDir: process.env.MOBILE_UI_RESULTS ?? '/tmp/mobile-ui-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'bun apps/mobile/qa/serve.ts',
    cwd: resolve(import.meta.dir, '../../..'),
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
