import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import AppShell from '../src/lib/components/AppShell.svelte';
import {
  isFullscreen, quitBlocked, quit, dismissQuitNotice,
  toggleFullscreen, fullscreenSupported, watchFullscreen
} from '../src/lib/stores/appCommands.js';
import { stripTabs, activeId, workspaceState } from '../src/lib/stores/tabs.js';
import { locale } from '../src/lib/stores/i18n.js';

beforeEach(() => {
  stripTabs.set([]);
  activeId.set('library');
  workspaceState.set({ library: { scratch: '' } });
  locale.set('en');
  quitBlocked.set(false);
  isFullscreen.set(false);
});
afterEach(cleanup);

const openMenu = async (container) => {
  await fireEvent.click(container.querySelector('[aria-label="Application menu"]'));
};
const menuItems = (container) =>
  [...container.querySelectorAll('.pop button.mi .txt')].map((e) => e.textContent.trim());

describe('Application Menu — new commands', () => {
  it('lists Full Screen and Quit alongside the specified items', async () => {
    const { container } = render(AppShell);
    await openMenu(container);
    expect(menuItems(container)).toEqual([
      'Language', 'Theme', 'Full Screen', 'Settings', 'About', 'Quit'
    ]);
  });

  it('Quit is last, separated from navigation items', async () => {
    const { container } = render(AppShell);
    await openMenu(container);
    const items = menuItems(container);
    expect(items[items.length - 1]).toBe('Quit');
  });

  it('localizes both commands', async () => {
    const { container } = render(AppShell);
    locale.set('de');
    await openMenu(container);
    const items = menuItems(container);
    expect(items).toContain('Vollbild');
    expect(items).toContain('Beenden');
  });
});

describe('Full Screen', () => {
  it('reports support from the document', () => {
    expect(fullscreenSupported({ fullscreenEnabled: true, documentElement: {} })).toBe(true);
    expect(fullscreenSupported({ documentElement: {} })).toBe(false);
  });

  it('requests fullscreen when inactive', async () => {
    const req = vi.fn(() => Promise.resolve());
    const doc = { documentElement: { requestFullscreen: req }, fullscreenElement: null };
    await toggleFullscreen(doc);
    expect(req).toHaveBeenCalled();
  });

  it('exits fullscreen when active', async () => {
    const exit = vi.fn(() => Promise.resolve());
    const doc = {
      documentElement: {},
      fullscreenElement: {},
      exitFullscreen: exit
    };
    await toggleFullscreen(doc);
    expect(exit).toHaveBeenCalled();
  });

  it('survives a rejected request without throwing', async () => {
    const doc = {
      documentElement: { requestFullscreen: () => Promise.reject(new Error('no gesture')) },
      fullscreenElement: null
    };
    await expect(toggleFullscreen(doc)).resolves.toBeDefined();
  });

  it('tracks state changes the app did not initiate (Esc, F11)', () => {
    const handlers = {};
    const doc = {
      fullscreenElement: null,
      addEventListener: (t, fn) => { handlers[t] = fn; },
      removeEventListener: (t) => { delete handlers[t]; }
    };
    const stop = watchFullscreen(doc);
    expect(get(isFullscreen)).toBe(false);

    doc.fullscreenElement = {};
    handlers.fullscreenchange();
    expect(get(isFullscreen)).toBe(true);

    doc.fullscreenElement = null;
    handlers.fullscreenchange();
    expect(get(isFullscreen)).toBe(false);

    stop();
    expect(handlers.fullscreenchange).toBeUndefined();
  });

  it('menu label reflects the current state', async () => {
    const { container } = render(AppShell);
    await openMenu(container);
    let row = [...container.querySelectorAll('.pop button.mi')]
      .find((b) => b.textContent.includes('Full Screen'));
    expect(row.textContent).toContain('Enter');

    isFullscreen.set(true);
    await new Promise((r) => setTimeout(r, 0));
    row = [...container.querySelectorAll('.pop button.mi')]
      .find((b) => b.textContent.includes('Full Screen'));
    expect(row.textContent).toContain('Exit');
  });
});

describe('Quit', () => {
  const fakeWin = (closed) => ({
    close: vi.fn(),
    setTimeout: (fn) => fn(),
    get closed() { return closed; }
  });

  it('attempts to close the window', () => {
    const win = fakeWin(true);
    quit(win);
    expect(win.close).toHaveBeenCalled();
    expect(get(quitBlocked)).toBe(false);
  });

  it('raises the blocked flag when the window is still open afterwards', () => {
    const win = fakeWin(false);
    quit(win);
    expect(get(quitBlocked)).toBe(true);
  });

  it('raises the blocked flag when close() throws', () => {
    const win = { close: () => { throw new Error('denied'); }, setTimeout: (fn) => fn(), closed: false };
    quit(win);
    expect(get(quitBlocked)).toBe(true);
  });

  it('does not fail silently — the notice appears', async () => {
    const { container } = render(AppShell);
    expect(container.querySelector('.notice')).toBeNull();
    quitBlocked.set(true);
    await new Promise((r) => setTimeout(r, 0));
    const notice = container.querySelector('.notice');
    expect(notice).toBeTruthy();
    expect(notice.textContent).toContain('Can’t close the window');
  });

  it('the notice is dismissible', async () => {
    const { container } = render(AppShell);
    quitBlocked.set(true);
    await new Promise((r) => setTimeout(r, 0));
    await fireEvent.click(container.querySelector('.notice button'));
    expect(get(quitBlocked)).toBe(false);
    expect(container.querySelector('.notice')).toBeNull();
  });

  it('the notice is announced politely rather than trapping focus', async () => {
    const { container } = render(AppShell);
    quitBlocked.set(true);
    await new Promise((r) => setTimeout(r, 0));
    const wrap = container.querySelector('[role="status"]');
    expect(wrap.getAttribute('aria-live')).toBe('polite');
  });

  it('a fresh Quit attempt clears a stale notice first', () => {
    quitBlocked.set(true);
    quit(fakeWin(true));
    expect(get(quitBlocked)).toBe(false);
  });
});
