import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import AppShell from '../src/lib/components/AppShell.svelte';
import { stripTabs, activeId, workspaceState } from '../src/lib/stores/tabs.js';
import { locale } from '../src/lib/stores/i18n.js';
import { readFileSync } from 'node:fs';

/**
 * vitest does not inject Svelte's scoped CSS into jsdom — document.styleSheets
 * is empty — so getComputedStyle returns initial values and any style
 * assertion built on it is vacuous. These invariants are asserted against the
 * source instead: it proves the rule is written, not that a browser applies it.
 */
const readSrc = (rel) => readFileSync(new URL('../src/' + rel, import.meta.url), 'utf8');

/** jsdom lets innerWidth/innerHeight be assigned directly. */
async function setViewport(w, h) {
  window.innerWidth = w;
  window.innerHeight = h;
  await fireEvent(window, new Event('resize'));
  await new Promise((r) => setTimeout(r, 0));
}

beforeEach(() => {
  stripTabs.set([]);
  activeId.set('library');
  workspaceState.set({ library: { scratch: '' } });
  locale.set('en');
  window.innerWidth = 1200;
  window.innerHeight = 800;
});
afterEach(cleanup);

describe('§2.4 the window floor gate', () => {
  it('is absent at a legal window size', async () => {
    const { container } = render(AppShell);
    await setViewport(1200, 800);
    expect(container.querySelector('.gate')).toBeNull();
  });

  it('is absent at exactly the minimum', async () => {
    const { container } = render(AppShell);
    await setViewport(800, 600);
    expect(container.querySelector('.gate')).toBeNull();
  });

  it('appears when the window is too narrow', async () => {
    const { container } = render(AppShell);
    await setViewport(799, 800);
    expect(container.querySelector('.gate')).toBeTruthy();
  });

  it('appears when the window is too short', async () => {
    const { container } = render(AppShell);
    await setViewport(1200, 599);
    expect(container.querySelector('.gate')).toBeTruthy();
  });

  it('names the required minimum', async () => {
    const { container } = render(AppShell);
    await setViewport(640, 480);
    expect(container.querySelector('.gate').textContent).toContain('800');
    expect(container.querySelector('.gate').textContent).toContain('600');
  });

  it('reports the current size and flags only the offending axis', async () => {
    const { container } = render(AppShell);
    await setViewport(640, 800);
    const bad = [...container.querySelectorAll('.gate .bad')].map((e) => e.textContent.trim());
    expect(bad).toEqual(['640']);          // width only — height is legal
  });

  it('flags both axes when both are short', async () => {
    const { container } = render(AppShell);
    await setViewport(640, 480);
    const bad = [...container.querySelectorAll('.gate .bad')].map((e) => e.textContent.trim());
    expect(bad).toEqual(['640', '480']);
  });

  it('withdraws again when the window is enlarged', async () => {
    const { container } = render(AppShell);
    await setViewport(500, 400);
    expect(container.querySelector('.gate')).toBeTruthy();
    await setViewport(1000, 700);
    expect(container.querySelector('.gate')).toBeNull();
  });

  it('is announced as a modal alert', async () => {
    const { container } = render(AppShell);
    await setViewport(500, 400);
    const gate = container.querySelector('.gate');
    expect(gate.getAttribute('role')).toBe('alertdialog');
    expect(gate.getAttribute('aria-modal')).toBe('true');
  });

  it('is localized like the rest of the shell', async () => {
    const { container } = render(AppShell);
    await setViewport(500, 400);
    expect(container.querySelector('#gate-title').textContent.trim()).toBe('Window too small');
    locale.set('fr');
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('#gate-title').textContent.trim()).toBe('Fenêtre trop petite');
  });

  it('leaves the shell mounted underneath, so no state is lost', async () => {
    const { container } = render(AppShell);
    await setViewport(500, 400);
    expect(container.querySelector('.gate')).toBeTruthy();
    expect(container.querySelector('.tabbar')).toBeTruthy();      // still there
    expect(container.querySelector('#workspace-area')).toBeTruthy();
  });
});

describe('§2 the shell never scrolls', () => {
  it('body and #app-root are both overflow:hidden', () => {
    const css = readSrc('lib/styles/app.css');
    const body = css.slice(css.indexOf('body {'), css.indexOf('/*\n  §2.4'));
    expect(body).toMatch(/overflow:\s*hidden/);
    const root = css.slice(css.indexOf('#app-root {'), css.indexOf(':where(button)'));
    expect(root).toMatch(/overflow:\s*hidden/);
  });

  it('#app-root carries NO min-width — that would force shell scrollbars', () => {
    const css = readSrc('lib/styles/app.css');
    const root = css.slice(css.indexOf('#app-root {'), css.indexOf(':where(button)'));
    // Below 800px a minimum here would overflow the document. The window-floor
    // gate covers that case instead, so the shell never needs scrollbars.
    expect(root).not.toMatch(/min-width/);
    expect(root).not.toMatch(/min-height/);
  });

  it('the tab strip is the only scrollable region the shell itself owns', () => {
    const bar = readSrc('lib/components/TabBar.svelte');
    const styles = bar.slice(bar.indexOf('<style>'));
    // .strip.overflowing is the one rule in the shell that turns on scrolling.
    const scrollRules = [...styles.matchAll(/([^{}]+)\{[^{}]*overflow-x:\s*(auto|scroll)/g)]
      .map((m) => m[1].trim());
    expect(scrollRules).toEqual(['.strip.overflowing']);
  });

  it('the tab bar and controls never scroll', () => {
    const bar = readSrc('lib/components/TabBar.svelte');
    const styles = bar.slice(bar.indexOf('<style>'));
    const tabbar = styles.slice(styles.indexOf('.tabbar {'), styles.indexOf('.pinned-slot'));
    expect(tabbar).not.toMatch(/overflow-[xy]:\s*(auto|scroll)/);
  });
});
