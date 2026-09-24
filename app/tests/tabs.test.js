import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  stripTabs, activeId, allTabs, workspaceState, libraryTab,
  openGame, openSettings, closeTab, activate,
  activateByOffset, activateIndex, activateLast, closeActive
} from '../src/lib/stores/tabs.js';
import { openNewGame } from '../src/lib/stores/newGame.js';

const ids = () => get(stripTabs).map((t) => t.id);
const kinds = () => get(stripTabs).map((t) => t.kind);

beforeEach(() => {
  stripTabs.set([]);
  activeId.set('library');
  workspaceState.set({ library: { scratch: '' } });
});

/* ============== §2.1.2 there is no empty Game Workspace ============== */

describe('§2.1.2 every Game Tab holds a game', () => {
  /*
    The empty Game Workspace was a testing holdover. It is removed; the New
    Tab Button that used to produce one is only HIDDEN, and stays built. A tab
    with nothing in it is now unbuildable rather than merely unreachable, so it
    cannot come back by accident.
  */
  it('refuses to open a Game Tab with no game', () => {
    expect(() => openGame()).toThrow(/no empty Game Workspace/);
    expect(() => openGame('')).toThrow();
    expect(() => openGame(null)).toThrow();
    expect(get(stripTabs).length).toBe(0);
  });

  it('carries the game name directly, with no placeholder to fall back on', () => {
    const id = openGame('Kasparov, Garry — Topalov, Veselin');
    const tab = get(stripTabs).find((t) => t.id === id);
    expect(tab.title).toBe('Kasparov, Garry — Topalov, Veselin');
    expect(tab.titleKey).toBeUndefined();
    expect(tab.titleSuffix).toBeUndefined();
  });

  /*
    24 Sep — the button's action is resolved: "New Game", a draft (below),
    never the removed empty workspace. `tab.newGame`'s old placeholder-title
    key stays gone (a draft carries a real, translated title of its own —
    `game.newGame` — not a fallback for an otherwise-nameless tab); the
    button's own label (`ctl.newTab`) stays, since the control itself didn't
    change, only what clicking it does.
  */
  it('leaves no placeholder title string behind', () => {
    const { readFileSync } = require('node:fs');
    const strings = readFileSync('src/lib/i18n/locales.js', 'utf8');
    expect(strings).not.toMatch(/tab\.newGame/);
    expect(strings).toMatch(/ctl\.newTab/);    // the button's own label stays
    expect(strings).toMatch(/game\.newGame/);  // the draft tab's own title
  });

  it('gives the New Tab Button (and Ctrl/Cmd+T) a real action: a blank draft, shown by default', () => {
    const { readFileSync } = require('node:fs');
    expect(readFileSync('src/lib/features.js', 'utf8')).toMatch(/NEW_TAB_BUTTON = true/);
    const bar = readFileSync('src/lib/components/TabBar.svelte', 'utf8');
    expect(bar).toMatch(/NEW_TAB_BUTTON/);
    expect(bar).not.toMatch(/New Tab Button action is unspecified/);
    expect(bar).toMatch(/openNewGame/);
    const shell = readFileSync('src/lib/components/AppShell.svelte', 'utf8');
    expect(shell).toMatch(/openNewGame/);
  });

  it('opening a new game seeds a draft — a blank board, unsaved until Save', () => {
    const id = openNewGame();
    const tab = get(stripTabs).find((t) => t.id === id);
    expect(tab.gameId).toMatch(/^draft:/);
    expect(get(activeId)).toBe(id);
  });
});

describe('§2.1.1 Library tab', () => {
  it('is pinned, not closable, and always first', () => {
    expect(libraryTab.pinned).toBe(true);
    expect(libraryTab.closable).toBe(false);
    openGame('Game 1'); openGame('Game 2');
    expect(get(allTabs)[0].id).toBe('library');
  });

  it('cannot be closed', () => {
    closeTab('library');
    expect(get(allTabs)[0].id).toBe('library');
    activate('library');
    closeActive();
    expect(get(allTabs)[0].id).toBe('library');
  });

  it('survives any number of other workspaces', () => {
    for (let i = 0; i < 12; i++) openGame('Game 3');
    expect(get(allTabs)[0].id).toBe('library');
    expect(get(allTabs).length).toBe(13);
  });
});

describe('§2.1.2 opening a game', () => {
  it('creates a Game workspace and activates it', () => {
    const id = openGame('Game 4');
    expect(kinds()).toEqual(['game']);
    expect(get(activeId)).toBe(id);
  });

  it('appends after the last Game tab', () => {
    const a = openGame('Game 5'), b = openGame('Game 6'), c = openGame('Game 7');
    expect(ids()).toEqual([a, b, c]);
  });

  it('gives each new game its own workspace state', () => {
    const a = openGame('Game 8'), b = openGame('Game 9');
    workspaceState.update((s) => ({ ...s, [a]: { scratch: 'alpha' } }));
    expect(get(workspaceState)[a].scratch).toBe('alpha');
    expect(get(workspaceState)[b].scratch).toBe('');
  });
});

describe('§2.1.1 Settings tab', () => {
  it('is a singleton — reopening activates the existing tab', () => {
    const first = openSettings();
    activate('library');
    const second = openSettings();
    expect(second).toBe(first);
    expect(kinds().filter((k) => k === 'settings').length).toBe(1);
    expect(get(activeId)).toBe(first);
  });

  it('always occupies the rightmost position in the strip', () => {
    openGame('Game 10');
    openSettings();
    expect(kinds()).toEqual(['game', 'settings']);

    // A game opened afterwards must insert BEFORE Settings.
    openGame('Game 11');
    expect(kinds()).toEqual(['game', 'game', 'settings']);

    for (let i = 0; i < 5; i++) openGame('Game 12');
    expect(kinds()[kinds().length - 1]).toBe('settings');
  });

  it('is closable, and closing it does not disturb the games', () => {
    const a = openGame('Game 13');
    openSettings();
    const b = openGame('Game 14');
    closeTab('settings');
    expect(ids()).toEqual([a, b]);
  });

  it('opening Settings does not replace Library or any Game tab', () => {
    const a = openGame('Game 15');
    openSettings();
    expect(get(allTabs).map((t) => t.id)).toEqual(['library', a, 'settings']);
  });
});

describe('§2.1.1 close activates a neighbour', () => {
  it('activates the right neighbour when one exists', () => {
    const a = openGame('Game 16'), b = openGame('Game 17'), c = openGame('Game 18');
    activate(b);
    closeTab(b);
    expect(get(activeId)).toBe(c);
    expect(ids()).toEqual([a, c]);
  });

  it('falls back to the left neighbour at the end of the strip', () => {
    const a = openGame('Game 19'), b = openGame('Game 20');
    activate(b);
    closeTab(b);
    expect(get(activeId)).toBe(a);
  });

  it('falls back to Library when the strip empties', () => {
    const a = openGame('Game 21');
    activate(a);
    closeTab(a);
    expect(get(activeId)).toBe('library');
    expect(ids()).toEqual([]);
  });

  it('closing an inactive tab does not change the active tab', () => {
    const a = openGame('Game 22'), b = openGame('Game 23');
    activate(a);
    closeTab(b);
    expect(get(activeId)).toBe(a);
  });

  it('discards the closed workspace state', () => {
    const a = openGame('Game 24');
    workspaceState.update((s) => ({ ...s, [a]: { scratch: 'x' } }));
    closeTab(a);
    expect(get(workspaceState)[a]).toBeUndefined();
  });
});

describe('§2.3 workspace state survives navigation', () => {
  it('keeps each workspace’s state across switches', () => {
    const a = openGame('Game 25'), b = openGame('Game 26');
    workspaceState.update((s) => ({ ...s, [a]: { scratch: 'game A' }, [b]: { scratch: 'game B' } }));
    activate('library');
    workspaceState.update((s) => ({ ...s, library: { scratch: 'search query' } }));
    activate(a);
    activate(b);
    activate('library');
    const st = get(workspaceState);
    expect(st[a].scratch).toBe('game A');
    expect(st[b].scratch).toBe('game B');
    expect(st.library.scratch).toBe('search query');
  });
});

describe('WF-10 keyboard navigation', () => {
  it('Ctrl+Tab wraps forward through every tab including Library', () => {
    const a = openGame('Game 27'), b = openGame('Game 28');
    activate('library');
    activateByOffset(1); expect(get(activeId)).toBe(a);
    activateByOffset(1); expect(get(activeId)).toBe(b);
    activateByOffset(1); expect(get(activeId)).toBe('library');
  });

  it('Ctrl+Shift+Tab wraps backward', () => {
    const a = openGame('Game 29');
    activate('library');
    activateByOffset(-1); expect(get(activeId)).toBe(a);
    activateByOffset(-1); expect(get(activeId)).toBe('library');
  });

  it('Ctrl+1 is always Library', () => {
    openGame('Game 30'); openGame('Game 31');
    activateIndex(1);
    expect(get(activeId)).toBe('library');
  });

  it('Ctrl+n selects the nth tab, out-of-range is a no-op', () => {
    const a = openGame('Game 32');
    activateIndex(2); expect(get(activeId)).toBe(a);
    activateIndex(9); expect(get(activeId)).toBe(a);
  });

  it('Ctrl+9 selects the last tab', () => {
    openGame('Game 33'); openGame('Game 34');
    openSettings();
    activate('library');
    activateLast();
    expect(get(activeId)).toBe('settings');
  });

  it('activate ignores unknown ids', () => {
    activate('nope');
    expect(get(activeId)).toBe('library');
  });
});
