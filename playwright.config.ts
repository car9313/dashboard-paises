import { existsSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

/**
 * E2E contra el dev server en modo `mock` (ADR-016): no depende de la red
 * corporativa ni de credenciales reales.
 *
 * @remarks
 * En esta máquina el CDN de Playwright responde 403 por región, así que se usa
 * el navegador ya instalado (`msedge`). En CI, `pnpm exec playwright install`
 * provee el Chromium propio y este canal no se activa; `PW_CHANNEL=chromium`
 * o `PW_CHANNEL=msedge` permiten forzar uno u otro.
 */
const INSTALLED_BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'
];

const installed = INSTALLED_BROWSERS.find((path) => existsSync(path));
const channel = process.env['PW_CHANNEL'] ?? (installed === undefined ? undefined : 'msedge');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] === undefined ? 0 : 1,
  reporter: process.env['CI'] === undefined ? 'list' : 'github',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...(channel === undefined ? {} : { channel }) }
    }
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: process.env['CI'] === undefined,
    env: { VITE_API_MODE: 'mock' },
    timeout: 120_000
  }
});
