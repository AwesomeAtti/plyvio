/**
 * Shared set-up for the storage checks.
 *
 * CLEAN STORAGE, EVERY TEST. Before a test starts, this origin's OPFS files,
 * service workers and caches are removed, so no test depends on what an
 * earlier one wrote. It's done from the site's landing page (`/`), which is
 * the same origin but never starts the app, so nothing holds the storage lock
 * while it's cleared. Needed in its own right: WebKit's persistent profiles
 * didn't isolate storage from each other (a favourite from one test showed up
 * in the next, found 22 Sep).
 *
 * WEBKIT GETS A PERSISTENT PROFILE; the others use Playwright's normal
 * contexts. Safari's private windows have no OPFS, and WebKit's default
 * contexts are ephemeral in the same way. Chromium and Firefox contexts are
 * not, and Firefox refuses to start with a persistent profile in a temporary
 * folder ("Could not find profile folder", found 22 Sep).
 *
 * `page.report` collects what the page reported, for the tests that assert
 * nothing went wrong: console errors, uncaught exceptions, failed responses,
 * and every URL it requested.
 */
import { test as base, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** Remove this origin's OPFS files, service workers and caches, from `url`. */
export const clearOrigin = async (page, url) => {
  await page.goto(url);
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    for await (const [name] of root.entries()) await root.removeEntry(name, { recursive: true });
    for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
};

export const test = base.extend({
  context: async ({ browser, playwright, browserName, launchOptions, baseURL, viewport }, use) => {
    if (browserName !== 'webkit') {
      const context = await browser.newContext({ baseURL, viewport });
      await use(context);
      await context.close();
      return;
    }
    const dir = await mkdtemp(path.join(tmpdir(), 'plyvio-e2e-'));
    const context = await playwright.webkit.launchPersistentContext(dir, {
      ...launchOptions, baseURL, viewport
    });
    await use(context);
    await context.close();
    await rm(dir, { recursive: true, force: true });
  },
  page: async ({ context, baseURL }, use) => {
    const page = context.pages()[0] ?? await context.newPage();
    await clearOrigin(page, new URL('/', baseURL).href);
    await use(watch(page));
  }
});

/** Attach a `report` of what `page` logged and requested. */
export const watch = (page) => {
  const report = { errors: [], failed: [], requests: [] };
  page.on('console', (m) => { if (m.type() === 'error') report.errors.push(m.text()); });
  page.on('pageerror', (e) => report.errors.push(e.message));
  page.on('request', (r) => report.requests.push(r.url()));
  page.on('response', (r) => { if (r.status() >= 400) report.failed.push(`${r.status()} ${r.url()}`); });
  page.report = report;
  return page;
};

export { expect };
