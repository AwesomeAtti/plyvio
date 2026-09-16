import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { get } from 'svelte/store';
import AppShell from '../src/lib/components/AppShell.svelte';
import { stripTabs, activeId, workspaceState, openGame, openSettings } from '../src/lib/stores/tabs.js';
import { locale } from '../src/lib/stores/i18n.js';
import { gameStates, resetGameState } from '../src/lib/stores/game.js';
import { theme } from '../src/lib/stores/theme.js';

/** jsdom reports 0 for every measured width, so we drive the bar width by hand. */
function setBarWidth(container, barPx, pinnedPx = 132) {
  const bar = container.querySelector('.tabbar');
  const pinned = container.querySelector('.pinned-slot');
  Object.defineProperty(bar, 'clientWidth', { value: barPx, configurable: true });
  Object.defineProperty(pinned, 'clientWidth', { value: pinnedPx, configurable: true });
  globalThis.__RO__.flush();
  return new Promise((r) => setTimeout(r, 0));
}

/** Find a menu item by its visible label. Index-based selection breaks
    whenever an item is added; label-based selection does not. */
function byLabel(container, label) {
  const el = [...container.querySelectorAll('.pop button.mi')]
    .find((b) => b.querySelector('.txt')?.textContent.trim() === label);
  if (!el) throw new Error(`no menu item labelled "${label}"`);
  return el;
}

beforeEach(() => {
  stripTabs.set([]);
  activeId.set('library');
  workspaceState.set({ library: { scratch: '' } });
  locale.set('en');
  resetGameState();
  theme.set('light');
});
afterEach(cleanup);

describe('§2 shell structure', () => {
  it('renders exactly two shell regions: tab bar and workspace area', () => {
    const { container } = render(AppShell);
    expect(container.querySelectorAll('.tabbar').length).toBe(1);
    expect(container.querySelectorAll('#workspace-area').length).toBe(1);
  });

  it('the Library tab is present, pinned, and has no close control', () => {
    const { container } = render(AppShell);
    const pinned = container.querySelector('.pinned-slot .tab');
    expect(pinned).toBeTruthy();
    expect(pinned.classList.contains('pinned')).toBe(true);
    expect(pinned.querySelector('.close')).toBeNull();
  });

  it('the pinned tab sits outside the scrolling strip', () => {
    const { container } = render(AppShell);
    expect(container.querySelector('.strip .tab.pinned')).toBeNull();
  });

  it('the application menu button is the last control in every state', async () => {
    const { container } = render(AppShell);
    await setBarWidth(container, 1400);
    let btns = [...container.querySelectorAll('.controls .ctl')];
    expect(btns[btns.length - 1].classList.contains('menu')).toBe(true);

    for (let i = 0; i < 6; i++) openGame('Game 1');
    await setBarWidth(container, 900);
    btns = [...container.querySelectorAll('.controls .ctl')];
    expect(btns[btns.length - 1].classList.contains('menu')).toBe(true);
  });
});

/*
  The New Tab Button is HIDDEN (features.js, 4 Sep). The button, its two
  positions and the geometry that reserves space for it are all intact — these
  tests assert the hidden behaviour, and layout.test.js still exercises both
  branches of the geometry, so restoring it does not mean rebuilding it.
*/
describe('the New Tab Button is hidden', () => {
  it('renders in neither position, at any width or tab count', async () => {
    const { container } = render(AppShell);
    for (const n of [0, 1, 3, 6, 10]) {
      while (get(stripTabs).length < n) openGame('Game 2');
      for (const w of [1600, 1100, 900, 800]) {
        await setBarWidth(container, w);
        expect(container.querySelectorAll('[aria-label="New tab"]').length).toBe(0);
        expect(container.querySelector('.strip .newtab-inline')).toBeNull();
      }
    }
  });

  it('leaves only the application menu in the normal state', async () => {
    const { container } = render(AppShell);
    openGame('Game 3');
    await setBarWidth(container, 1400);
    expect(container.querySelectorAll('.controls .ctl').length).toBe(1);
  });

  it('control order on overflow is [left] [right] [list] [menu]', async () => {
    const { container } = render(AppShell);
    for (let i = 0; i < 6; i++) openGame('Game 4');
    await setBarWidth(container, 900);
    const labels = [...container.querySelectorAll('.controls .ctl')].map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Scroll tabs left', 'Scroll tabs right', 'Show all tabs', 'Application menu']);
  });

  it('requirement 5 still holds where it is reachable — openGame creates and activates', () => {
    render(AppShell);
    const id = openGame('Game 5');
    expect(get(stripTabs).length).toBe(1);
    expect(get(stripTabs)[0].kind).toBe('game');
    expect(get(activeId)).toBe(id);
  });
});

describe('§2.1.3 tabs never render below the 220px floor', () => {
  it('applies an explicit width at or above 220px', async () => {
    const { container } = render(AppShell);
    for (let i = 0; i < 8; i++) openGame('Game 6');
    for (const w of [800, 900, 1200, 1600, 2000]) {
      await setBarWidth(container, w);
      const widths = [...container.querySelectorAll('.strip .tab')]
        .map((el) => parseInt(el.style.width, 10));
      for (const px of widths) {
        expect(px).toBeGreaterThanOrEqual(220);
        expect(px).toBeLessThanOrEqual(300);
      }
    }
  });

  it('every tab keeps its close control at the floor width', async () => {
    const { container } = render(AppShell);
    for (let i = 0; i < 8; i++) openGame('Game 7');
    await setBarWidth(container, 800);
    const tabs = [...container.querySelectorAll('.strip .tab')];
    expect(tabs.length).toBe(8);
    for (const t of tabs) expect(t.querySelector('.close')).toBeTruthy();
  });
});

describe('§2.1.4 scroll controls', () => {
  it('the left control is disabled at the scroll origin', async () => {
    const { container } = render(AppShell);
    for (let i = 0; i < 6; i++) openGame('Game 8');
    await setBarWidth(container, 900);
    const left = container.querySelector('[aria-label="Scroll tabs left"]');
    expect(left.disabled).toBe(true);
  });

  it('scroll controls are absent in the normal state', async () => {
    const { container } = render(AppShell);
    openGame('Game 9');
    await setBarWidth(container, 1400);
    expect(container.querySelector('[aria-label="Scroll tabs left"]')).toBeNull();
  });
});

describe('WF-06b tab-list dropdown', () => {
  it('is absent in the normal state', async () => {
    const { container } = render(AppShell);
    openGame('Game 10');
    await setBarWidth(container, 1400);
    expect(container.querySelector('[aria-label="Show all tabs"]')).toBeNull();
  });

  /*
    Revised 4 Sep — the dropdown lists the STRIP, not every tab. The pinned
    Library tab sits outside the scrolling strip and is visible in every state
    the dropdown can appear in, so listing it named something the user could
    already see and could not lose.
  */
  it('lists the strip only — never the pinned Library tab', async () => {
    const { container } = render(AppShell);
    for (let i = 0; i < 6; i++) openGame('Game 11');
    openSettings();
    await setBarWidth(container, 900);
    await fireEvent.click(container.querySelector('[aria-label="Show all tabs"]'));
    const rows = [...container.querySelectorAll('.pop .row .txt')].map((e) => e.textContent.trim());
    expect(rows).not.toContain('Library');
    expect(rows.length).toBe(7);                 // 6 games + settings
    expect(rows[rows.length - 1]).toBe('Settings');
  });

  it('shows the tab name and nothing beside it', async () => {
    const { container } = render(AppShell);
    for (let i = 0; i < 6; i++) openGame(`Game ${i + 1}`);
    await setBarWidth(container, 900);
    await fireEvent.click(container.querySelector('[aria-label="Show all tabs"]'));
    // no off-screen or pinned labels remain
    expect(container.querySelector('.pop .row .off')).toBeNull();
    expect(container.querySelector('.pop .row .glyph')).toBeNull();
    const row = container.querySelector('.pop .row');
    expect(row.querySelector('.txt').textContent.trim()).toMatch(/^Game \d+$/);
  });

  it('truncates a long name rather than widening the row', () => {
    // cwd is the app root under vitest; import.meta.url is not a file: URL here
    const src = readFileSync('src/lib/components/TabListMenu.svelte', 'utf8');
    expect(src).toMatch(/\.txt\s*\{[^}]*text-overflow:\s*ellipsis/s);
    expect(src).toMatch(/\.txt\s*\{[^}]*white-space:\s*nowrap/s);
    expect(src).toMatch(/\.txt\s*\{[^}]*min-width:\s*0/s);
    // the full name stays reachable
    expect(src).toMatch(/title=\{title\(row\.tab\)\}/);
  });

  it('selecting a row activates that workspace and closes the dropdown', async () => {
    const { container } = render(AppShell);
    for (let i = 0; i < 6; i++) openGame('Game 13');
    await setBarWidth(container, 900);
    const targetId = get(stripTabs)[4].id;
    await fireEvent.click(container.querySelector('[aria-label="Show all tabs"]'));
    const rows = [...container.querySelectorAll('.pop .row .pick')];
    await fireEvent.click(rows[4]);              // the strip only — no Library row
    expect(get(activeId)).toBe(targetId);
    expect(container.querySelector('.pop')).toBeNull();
  });

  it('every listed tab is closable, because the strip holds no pinned tab', async () => {
    const { container } = render(AppShell);
    for (let i = 0; i < 6; i++) openGame('Game 14');
    await setBarWidth(container, 900);
    await fireEvent.click(container.querySelector('[aria-label="Show all tabs"]'));
    const rows = [...container.querySelectorAll('.pop .row')];
    expect(rows.length).toBe(6);
    for (const r of rows) expect(r.querySelector('.x')).toBeTruthy();
  });

  it('closing a row keeps the dropdown open', async () => {
    const { container } = render(AppShell);
    for (let i = 0; i < 6; i++) openGame('Game 15');
    await setBarWidth(container, 900);
    await fireEvent.click(container.querySelector('[aria-label="Show all tabs"]'));
    const before = get(stripTabs).length;
    await fireEvent.click(container.querySelector('.pop .row .x'));
    expect(get(stripTabs).length).toBe(before - 1);
    expect(container.querySelector('.pop')).toBeTruthy();
  });
});

describe('§2.2 application menu', () => {
  it('keeps the four §2.2 items, in spec order', async () => {
    const { container } = render(AppShell);
    await fireEvent.click(container.querySelector('[aria-label="Application menu"]'));
    const items = [...container.querySelectorAll('.pop .mi .txt')].map((e) => e.textContent.trim());
    // §2.2's four items must all be present and keep their relative order.
    // Full Screen and Quit are sanctioned additions (see README deviations).
    const spec = ['Language', 'Theme', 'Settings', 'About'];
    expect(spec.every((i) => items.includes(i))).toBe(true);
    const positions = spec.map((i) => items.indexOf(i));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('adds only Full Screen and Quit beyond the specified items', async () => {
    const { container } = render(AppShell);
    await fireEvent.click(container.querySelector('[aria-label="Application menu"]'));
    const items = [...container.querySelectorAll('.pop .mi .txt')].map((e) => e.textContent.trim());
    const extra = items.filter((i) => !['Language', 'Theme', 'Settings', 'About'].includes(i));
    expect(extra).toEqual(['Full Screen', 'Quit']);
  });

  it('Theme toggles immediately without a submenu', async () => {
    const { container } = render(AppShell);
    expect(get(theme)).toBe('light');
    await fireEvent.click(container.querySelector('[aria-label="Application menu"]'));
    await fireEvent.click(byLabel(container, 'Theme'));
    expect(get(theme)).toBe('dark');
    expect(container.querySelector('.pop')).toBeNull();
  });

  it('Settings opens the Settings tab', async () => {
    const { container } = render(AppShell);
    await fireEvent.click(container.querySelector('[aria-label="Application menu"]'));
    await fireEvent.click(byLabel(container, 'Settings'));
    expect(get(stripTabs).map((t) => t.kind)).toEqual(['settings']);
  });

  it('Settings activates the existing tab rather than opening a second', async () => {
    const { container } = render(AppShell);
    openSettings();
    activeId.set('library');
    await fireEvent.click(container.querySelector('[aria-label="Application menu"]'));
    await fireEvent.click(byLabel(container, 'Settings'));
    expect(get(stripTabs).filter((t) => t.kind === 'settings').length).toBe(1);
    expect(get(activeId)).toBe('settings');
  });

  it('About opens Settings too', async () => {
    const { container } = render(AppShell);
    await fireEvent.click(container.querySelector('[aria-label="Application menu"]'));
    await fireEvent.click(byLabel(container, 'About'));
    expect(get(activeId)).toBe('settings');
  });

  it('closes on Escape', async () => {
    const { container } = render(AppShell);
    await fireEvent.click(container.querySelector('[aria-label="Application menu"]'));
    expect(container.querySelector('.pop')).toBeTruthy();
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(container.querySelector('.pop')).toBeNull();
  });
});

describe('requirement 4 — language toggle', () => {
  it('offers the bundled locales in a submenu', async () => {
    const { container } = render(AppShell);
    await fireEvent.click(container.querySelector('[aria-label="Application menu"]'));
    await fireEvent.click(byLabel(container, 'Language'));
    const langs = [...container.querySelectorAll('.pop button.mi .txt')].map((e) => e.textContent.trim());
    expect(langs).toContain('English');
    expect(langs).toContain('Deutsch');
    expect(langs).toContain('Français');
  });

  it('switching locale retranslates the shell', async () => {
    const { container } = render(AppShell);
    expect(container.querySelector('.pinned-slot .label').textContent.trim()).toBe('Library');

    await fireEvent.click(container.querySelector('[aria-label="Application menu"]'));
    await fireEvent.click(byLabel(container, 'Language'));
    const de = [...container.querySelectorAll('.pop button.mi')].find((b) => b.textContent.includes('Deutsch'));
    await fireEvent.click(de);

    expect(get(locale)).toBe('de');
    expect(container.querySelector('.pinned-slot .label').textContent.trim()).toBe('Bibliothek');
  });

  it('marks the active locale', async () => {
    const { container } = render(AppShell);
    locale.set('fr');
    await fireEvent.click(container.querySelector('[aria-label="Application menu"]'));
    await fireEvent.click(byLabel(container, 'Langue'));   // menu is already localized
    const fr = [...container.querySelectorAll('.pop button.mi')].find((b) => b.textContent.includes('Français'));
    expect(fr.querySelector('.tick')).toBeTruthy();
  });
});

describe('§2.3 workspace presentation', () => {
  it('the workspace area follows the active tab', async () => {
    const { container } = render(AppShell);
    // The Settings Workspace nests its own tablist/tabpanel pair (§3.4.3), so
    // query the shell's panel by id rather than by role, which is ambiguous.
    const panel = () => container.querySelector('#workspace-area').getAttribute('aria-label');

    expect(panel()).toBe('Library Workspace');
    openGame('Game 16');
    await new Promise((r) => setTimeout(r, 0));
    expect(panel()).toBe('Game Workspace');
    openSettings();
    await new Promise((r) => setTimeout(r, 0));
    expect(panel()).toBe('Settings Workspace');
  });

  it('nests the settings tabpanel inside the workspace panel, both labelled', async () => {
    const { container } = render(AppShell);
    openSettings();
    await new Promise((r) => setTimeout(r, 0));
    const outer = container.querySelector('#workspace-area');
    const inner = container.querySelector('#settings-content');
    expect(outer.contains(inner)).toBe(true);
    expect(outer.getAttribute('aria-label')).toBeTruthy();
    expect(inner.getAttribute('aria-label')).toBeTruthy();
  });

  /*
    §2.3 used to be proved through the game stub's scratch input. The Game
    Workspace is now implemented (§5), so the state that has to survive is the
    real thing: the current ply, per tab.
  */
  it('per-workspace state survives switching away and back', async () => {
    const { getByLabelText } = render(AppShell);
    const a = openGame('Game 17');
    await new Promise((r) => setTimeout(r, 0));

    await fireEvent.click(getByLabelText('Next move'));
    await fireEvent.click(getByLabelText('Next move'));
    await fireEvent.click(getByLabelText('Next move'));
    expect(get(gameStates)[a].ply).toBe(3);

    const b = openGame('Game 18');
    await new Promise((r) => setTimeout(r, 0));
    await fireEvent.click(getByLabelText('Next move'));
    expect(get(gameStates)[b].ply).toBe(1);
    expect(get(gameStates)[a].ply).toBe(3);      // untouched by the second tab

    activeId.set('library');
    await new Promise((r) => setTimeout(r, 0));
    activeId.set(a);
    await new Promise((r) => setTimeout(r, 0));
    expect(get(gameStates)[a].ply).toBe(3);      // and by the round trip
  });
});

describe('accessibility wiring', () => {
  it('exposes the strip as a tablist with tabs controlling the panel', () => {
    const { container } = render(AppShell);
    openGame('Game 19');
    expect(container.querySelector('[role="tablist"]')).toBeTruthy();
    const tab = container.querySelector('.pinned-slot [role="tab"]');
    expect(tab.getAttribute('aria-controls')).toBe('workspace-area');
  });

  it('marks exactly one tab as selected', async () => {
    const { container } = render(AppShell);
    openGame('Game 20'); openGame('Game 21');
    await new Promise((r) => setTimeout(r, 0));
    const selected = [...container.querySelectorAll('[role="tab"]')]
      .filter((t) => t.getAttribute('aria-selected') === 'true');
    expect(selected.length).toBe(1);
  });
});
