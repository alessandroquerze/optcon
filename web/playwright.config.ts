import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const chrome = process.env.OPTCON_BROWSER_PATH ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(path=>existsSync(path));

export default defineConfig({
  testDir: './tests', testMatch:'**/*.spec.ts', workers: 1, timeout: 45000,
  expect: { timeout: 12000 },
  reporter: [['list'], ['json', { outputFile: 'test-results/browser-report.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173', browserName: 'chromium',
    viewport: { width: 1440, height: 1000 },
    launchOptions: { executablePath: chrome, args: ['--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, timeout: 30000,
  },
});
