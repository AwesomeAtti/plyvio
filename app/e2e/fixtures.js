/**
 * Every test gets a fresh, persistent browser profile of its own, rather than
 * Playwright's default throwaway context. Safari's private windows have no
 * OPFS, and WebKit's default contexts are ephemeral in the same way, so a
 * throwaway context could fail for a reason no real user would meet.
 *
 * `page` also collects what the page reported, for the tests that assert
 * nothing went wrong: console errors, uncaught exceptions, failed responses,
 * and every URL it requested.
 */
import { test as base, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const test = base.extend({
  context: async ({ playwright, browserName, launchOptions, baseURL, viewport }, use) => {
    const dir = await mkdtemp(path.join(tmpdir(), 'plyvio-e2e-'));
    const context = await playwright[browserName].launchPersistentContext(dir, {
      ...launchOptions,
      baseURL,
      viewport
    });
    await use(context);
    await context.close();
    await rm(dir, { recursive: true, force: true });
  },
  page: async ({ context }, use) => {
    const page = context.pages()[0] ?? await context.newPage();
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
