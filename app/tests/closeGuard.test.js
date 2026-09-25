/**
 * `stores/closeGuard.js` — the one guarded entry point for closing a tab,
 * `analysis-board-plan.md`'s Stage 1 close-time confirmation.
 *
 * Plain store functions, no component render needed — same spirit as
 * `game-pendingInfo.test.js`. Uses the real `tabs.js` store (not mocked)
 * since `requestCloseTab`'s whole job is to sit between it and `game.js`.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
  stripTabs, activeId, workspaceState, openGame
} from '../src/lib/stores/tabs.js';
import {
  ensureGameState, resetGameState, setPlyShapes, isDirty
} from '../src/lib/stores/game.js';
import { games as libraryGames } from '../src/lib/stores/library.js';
import {
  pendingCloseId, pendingCloseTab, requestCloseTab, requestCloseActiveTab,
  cancelClose, discardAndClose
} from '../src/lib/stores/closeGuard.js';

beforeEach(() => {
  stripTabs.set([]);
  activeId.set('library');
  workspaceState.set({ library: { scratch: '' } });
  resetGameState();
  libraryGames.set([]);
  pendingCloseId.set(null);
});
afterEach(() => {
  libraryGames.set([]);
});

describe('requestCloseTab', () => {
  it('closes a clean tab immediately, asking nothing', () => {
    const id = openGame('Clean Game');
    ensureGameState(id, 'g1');

    requestCloseTab(id);

    expect(get(stripTabs).find((t) => t.id === id)).toBeUndefined();
    expect(get(pendingCloseId)).toBeNull();
  });

  it('holds a dirty tab open and stages it for confirmation instead of closing it', () => {
    const id = openGame('Dirty Game');
    ensureGameState(id, 'g1');
    setPlyShapes(id, [], [{ orig: 'e4', brush: 'green' }]);

    requestCloseTab(id);

    expect(get(stripTabs).find((t) => t.id === id)).toBeDefined();
    expect(get(pendingCloseId)).toBe(id);
    expect(get(pendingCloseTab)?.id).toBe(id);
  });

  it('the Library tab is never dirty and closing it is a no-op either way', () => {
    requestCloseTab('library');
    expect(get(pendingCloseId)).toBeNull();
  });
});

describe('requestCloseActiveTab', () => {
  it('guards whichever tab is currently active', () => {
    const id = openGame('Active Dirty Game');
    ensureGameState(id, 'g1');
    setPlyShapes(id, [], [{ orig: 'e4', brush: 'green' }]);
    activeId.set(id);

    requestCloseActiveTab();

    expect(get(pendingCloseId)).toBe(id);
  });
});

describe('cancelClose', () => {
  it('clears the pending id and leaves the tab open, still dirty', () => {
    const id = openGame('Dirty Game');
    ensureGameState(id, 'g1');
    setPlyShapes(id, [], [{ orig: 'e4', brush: 'green' }]);
    requestCloseTab(id);

    cancelClose();

    expect(get(pendingCloseId)).toBeNull();
    expect(get(stripTabs).find((t) => t.id === id)).toBeDefined();
    expect(isDirty(id)).toBe(true);
  });
});

describe('discardAndClose', () => {
  it('closes the pending tab without saving, dropping its dirty state with it', () => {
    const id = openGame('Dirty Game');
    ensureGameState(id, 'g1');
    setPlyShapes(id, [], [{ orig: 'e4', brush: 'green' }]);
    requestCloseTab(id);

    discardAndClose();

    expect(get(pendingCloseId)).toBeNull();
    expect(get(stripTabs).find((t) => t.id === id)).toBeUndefined();
  });

  it('does nothing if nothing is pending', () => {
    discardAndClose();
    expect(get(pendingCloseId)).toBeNull();
  });
});

/*
 * `saveAndClose` reaches into `saveTab`, which needs a real library
 * connection to do anything meaningful (see `game-saveTab.test.js`) — a
 * mock-path tab has no `libraryGameId`, so `saveTab` resolves `false` and
 * `saveAndClose` still closes the tab, since a mock game has nothing real to
 * fail to save. The real-database round trip through `saveAndClose` itself
 * is covered by `game-saveTab.test.js`'s `saveTab` assertions plus this
 * file's coverage of everything around it; duplicating a second in-process
 * SQLite harness here would test the same write path twice for no new
 * confidence.
 */
