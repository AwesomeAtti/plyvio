/**
 * Playwright: the PWA's real-browser checks (`e2e/`). Development only —
 * `@playwright/test` is a devDependency, nothing under `src/` imports it, and
 * `e2e/storage.spec.js` checks the build contains none of it.
 *
 * Runs against the production build, served the way GitHub Pages serves it
 * (`scripts/serve-site.mjs`), because what these check — the storage worker's
 * bundling, `sqlite3.wasm`, the service worker — only exists in that build.
 *
 * First time on a machine:   npx playwright install chromium firefox webkit
 * Then:                      npm run test:e2e
 *
 * PLYVIO_CHROMIUM_PATH, if set, points the chromium project at an already
 * installed Chromium instead of Playwright's own download (for environments
 * where that download is blocked).
 *
 * FIREFOX IS OPT-IN: PLYVIO_E2E_FIREFOX=1 npm run test:e2e. Playwright's
 * Firefox build (v1543, Firefox 155.0) wouldn't start on the macOS machine
 * this suite was written on, "Could not find profile folder", even from a bare
 * `firefox.launch()` with no Plyvio code (22 Sep 2026). Left on, every run
 * reported five failures unrelated to Plyvio, and a suite that is always red
 * hides the failure that matters. Retry after a Playwright update (ACTIONS.md).
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}/app/` },
  webServer: {
    command: `npm run build && node scripts/serve-site.mjs ${PORT}`,
    url: `http://localhost:${PORT}/app/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: process.env.PLYVIO_CHROMIUM_PATH
          ? { executablePath: process.env.PLYVIO_CHROMIUM_PATH }
          : {}
      }
    },
    ...(process.env.PLYVIO_E2E_FIREFOX
      ? [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }]
      : []),
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
});
