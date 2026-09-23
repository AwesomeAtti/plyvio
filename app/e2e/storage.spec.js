/**
 * The PWA's storage in a real browser: OPFS, the storage worker, and the
 * production build that carries them (ADR 0005,
 * `docs/decisions/0005-pwa-storage-on-opfs-sahpool.md`). Vitest covers
 * everything else in-process; these are the checks only a real browser and a
 * real build can answer.
 */
import { readdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, watch, clearOrigin } from './fixtures.js';

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));
/** Test 5's own server, so it can be stopped; the config's stays on 4173. */
const OFFLINE_PORT = 4174;

/** The sidebar's count beside `label`, or '' when it shows none. */
const sidebarCount = (page, label) =>
  page.evaluate((text) => {
    const body = document.body.innerText.split('\n').map((s) => s.trim());
    const i = body.indexOf(text);
    return i >= 0 && /^\d+$/.test(body[i + 1] ?? '') ? body[i + 1] : '';
  }, label);

const openFirstGame = async (page) => {
  await page.getByRole('row').nth(1).dblclick();
  await expect(page.getByRole('button', { name: /favourite/i })).toBeVisible();
};

/**
 * Favourite the first game, then return to the Library, where the sidebar's
 * Favorites count shows it (the sidebar isn't drawn while a game is open).
 *
 * The favourite write is fire-and-forget by design (`stores/game.js`,
 * `persistFavourite()`), so the UI has no signal for "committed". The short
 * settle below covers the one worker round trip before a test reloads; a
 * write that was lost fails the test after the reload rather than passing it.
 */
const favouriteFirstGame = async (page) => {
  await openFirstGame(page);
  await page.getByRole('button', { name: 'Mark as favourite' }).click();
  await expect(page.getByRole('button', { name: 'Remove from favourites' })).toBeVisible();
  await page.getByRole('tab', { name: 'Library' }).click();
  await expect.poll(() => sidebarCount(page, 'Favorites')).toBe('1');
  await page.waitForTimeout(250);
};

/** Names at the top of this origin's OPFS. */
const opfsRoot = (page) => page.evaluate(async () => {
  const names = [];
  for await (const [name] of (await navigator.storage.getDirectory()).entries()) names.push(name);
  return names;
});

test('1. first load: Sample Games is seeded into OPFS, with real Explorer figures', async ({ page }) => {
  await page.goto('./');
  await expect.poll(() => sidebarCount(page, 'All Games')).toBe('40');
  expect(await opfsRoot(page)).toContain('.plyvio');

  // The starting position's §6 figures, from the seeded `positions` table:
  // d4 17, e4 17, c4 5, Nf3 1 of 40 games (verified 22 Sep against
  // samples/build_positions.py).
  await openFirstGame(page);
  const explorer = page.locator('body');
  for (const [move, share] of [['1. d4', '43%'], ['1. e4', '43%'], ['1. c4', '13%'], ['1. Nf3', '3%']]) {
    await expect(explorer).toContainText(`${move}\n${share}`);
  }
});

test('2. persistence: a write is still there after a reload', async ({ page }) => {
  await page.goto('./');
  await expect.poll(() => sidebarCount(page, 'All Games')).toBe('40');
  expect(await sidebarCount(page, 'Favorites')).toBe('');

  await favouriteFirstGame(page);

  await page.reload();
  await expect.poll(() => sidebarCount(page, 'All Games')).toBe('40');
  expect(await sidebarCount(page, 'Favorites')).toBe('1');
});

test('3. second tab: it gets no storage, shows the lock notice, and the first tab is unaffected', async ({ page, context }) => {
  await page.goto('./');
  await expect.poll(() => sidebarCount(page, 'All Games')).toBe('40');

  const second = watch(await context.newPage());
  await second.goto('./');
  await expect.poll(() => second.report.errors.join('\n'))
    .toContain('storage is in use by another tab or window');
  expect(await sidebarCount(second, 'All Games')).toBe('');

  // SecondWindowGate.svelte — the notice from ACTIONS.md's "PWA: a second
  // window can't open the board once OPFS lands", copy approved in
  // `working/wireframes/pwa-second-window-gate.html`.
  await expect(second.getByRole('heading', { name: 'One king to a board.' })).toBeVisible();
  await expect(second.getByText('Nothing’s been lost — just paused.')).toBeVisible();
  await expect(second.getByRole('button', { name: 'Try Again' })).toBeVisible();

  // The first tab still writes, and what it writes survives.
  await favouriteFirstGame(page);
  await second.close();
  await page.reload();
  await expect.poll(() => sidebarCount(page, 'Favorites')).toBe('1');
});

test('3b. second tab: Try Again recovers once the first tab closes', async ({ page, context }) => {
  await page.goto('./');
  await expect.poll(() => sidebarCount(page, 'All Games')).toBe('40');

  const second = watch(await context.newPage());
  await second.goto('./');
  await expect(second.getByRole('button', { name: 'Try Again' })).toBeVisible();

  // Closing the first tab's worker releases the Web Lock. There's no live
  // recovery (stores/pwaStorageLock.js) — Try Again is a plain reload, which
  // is enough here because it's now the only instance.
  await page.close();
  await second.getByRole('button', { name: 'Try Again' }).click();
  await expect.poll(() => sidebarCount(second, 'All Games')).toBe('40');
  await expect(second.getByRole('heading', { name: 'One king to a board.' })).not.toBeVisible();
});

test('4. bundle: the worker and sqlite3.wasm load cleanly; the dead workers are absent', async ({ page }) => {
  await page.goto('./');
  await expect.poll(() => sidebarCount(page, 'All Games')).toBe('40');
  await openFirstGame(page);

  const { errors, failed, requests } = page.report;
  expect(failed).toEqual([]);
  expect(errors).toEqual([]);
  expect(requests.some((u) => /\/_app\/immutable\/workers\/sqlite-worker-[^/]+\.js$/.test(u))).toBe(true);
  expect(requests.some((u) => /sqlite3-[^/]+\.wasm$/.test(u))).toBe(true);
  expect(requests.filter((u) => /opfs-async-proxy|worker1/.test(u))).toEqual([]);
});

/**
 * A real outage: this test serves the build from its own server on another
 * port, then stops it. Browsers' simulated offline modes aren't faithful
 * here: Chromium's `setOffline()` doesn't stop the service worker's own
 * fetches (it let this check pass with nothing cached), and aborting requests
 * with `context.route()` breaks WebKit's reload outright (both found 22 Sep).
 * One online visit only, on purpose: that's the case the precache fix covers.
 */
test('5. offline: after one visit, the app and its data come back with no network', async ({ page }) => {
  const origin = `http://localhost:${OFFLINE_PORT}`;
  const server = spawn(process.execPath, ['scripts/serve-site.mjs', String(OFFLINE_PORT)], {
    cwd: APP_ROOT, stdio: 'ignore'
  });
  try {
    await expect.poll(() => fetch(`${origin}/app/`).then((r) => r.ok, () => false)).toBe(true);
    await clearOrigin(page, `${origin}/`);
    await page.goto(`${origin}/app/`);
    await expect.poll(() => sidebarCount(page, 'All Games')).toBe('40');
    await page.evaluate(() => navigator.serviceWorker.ready);

    server.kill();
    await expect.poll(() => fetch(`${origin}/app/`).then(() => 'up', () => 'down')).toBe('down');
    await page.reload();
    await expect.poll(() => sidebarCount(page, 'All Games')).toBe('40');
  } finally {
    server.kill();
  }
});

test('the production build contains no Playwright code', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'a file check; once is enough');
  const root = fileURLToPath(new URL('../build/app', import.meta.url));
  const files = await readdir(root, { recursive: true });
  const hits = [];
  for (const f of files.filter((f) => /\.(js|html)$/.test(f))) {
    if (/playwright/i.test(await readFile(path.join(root, f), 'utf8'))) hits.push(f);
  }
  expect(hits).toEqual([]);
});
