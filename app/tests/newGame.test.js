/**
 * `stores/newGame.js` — the New Tab Button's "New Game" and the board's
 * paste target, `analysis-board-plan.md`'s Stage 3. Plain store functions
 * against the real `tabs.js`/`game.js` stores, no database — same spirit
 * as `closeGuard.test.js`; a real save is `game-saveTab.test.js`'s own
 * concern (it needs a real connection to mean anything).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { stripTabs, activeId, workspaceState, openGame, openSettings } from '../src/lib/stores/tabs.js';
import { ensureGameState, resetGameState, setPlyShapes, isDirty } from '../src/lib/stores/game.js';
import { games as libraryGames } from '../src/lib/stores/library.js';
import {
  openNewGame, pendingPaste, handlePaste, confirmPasteNewTab, confirmPasteReplace, cancelPaste
} from '../src/lib/stores/newGame.js';

const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

beforeEach(() => {
  stripTabs.set([]);
  activeId.set('library');
  workspaceState.set({ library: { scratch: '' } });
  resetGameState();
  libraryGames.set([]);
  pendingPaste.set(null);
});

describe('openNewGame', () => {
  it('opens and activates a new tab holding a blank draft', () => {
    const id = openNewGame();
    const tab = get(stripTabs).find((t) => t.id === id);
    expect(tab.kind).toBe('game');
    expect(tab.gameId).toMatch(/^draft:/);
    expect(get(activeId)).toBe(id);
  });

  it('two New Games are two independent, separately-dirty drafts', () => {
    const a = openNewGame();
    const b = openNewGame();
    expect(a).not.toBe(b);
    const tabA = get(stripTabs).find((t) => t.id === a);
    const tabB = get(stripTabs).find((t) => t.id === b);
    expect(tabA.gameId).not.toBe(tabB.gameId);
  });
});

describe('handlePaste', () => {
  it('is a no-op outside a Game Workspace tab (e.g. the Library tab active)', () => {
    handlePaste(STANDARD_FEN);
    expect(get(pendingPaste)).toBeNull();
  });

  it('is a no-op for text that is neither a FEN nor a single-game PGN', () => {
    openNewGame();
    handlePaste('just some notes');
    expect(get(pendingPaste)).toBeNull();
  });

  it('loads straight in, no confirmation, when the active tab is a pristine draft', () => {
    const id = openNewGame();
    // `GameWorkspace.svelte`'s own mount effect is what normally calls this
    // for a newly opened tab (`WorkspaceArea.svelte`) -- done explicitly
    // here since no component is rendered in this store-level test.
    ensureGameState(id, get(stripTabs).find((t) => t.id === id).gameId);

    handlePaste(STANDARD_FEN);
    expect(get(pendingPaste)).toBeNull();
    expect(get(activeId)).toBe(id); // still the same tab -- replaced in place
  });

  it('stages a confirmation instead of loading into a tab that would lose something', () => {
    const id = openGame('Some Game');
    ensureGameState(id, 'g1');
    setPlyShapes(id, [], [{ orig: 'e4', brush: 'green' }]); // no longer pristine

    handlePaste(STANDARD_FEN);
    const pending = get(pendingPaste);
    expect(pending).not.toBeNull();
    expect(pending.tabId).toBe(id);
    expect(pending.kind).toBe('fen');
  });

  it('stages a confirmation for an already-dirty draft too, not just a real game', () => {
    const id = openNewGame();
    ensureGameState(id, get(stripTabs).find((t) => t.id === id).gameId);
    setPlyShapes(id, [], [{ orig: 'e4', brush: 'green' }]); // touched -- not pristine

    handlePaste(STANDARD_FEN);
    expect(get(pendingPaste)).not.toBeNull();
  });
});

describe('confirmPasteNewTab / confirmPasteReplace / cancelPaste', () => {
  function stagePaste() {
    const id = openGame('Some Game');
    ensureGameState(id, 'g1');
    setPlyShapes(id, [], [{ orig: 'e4', brush: 'green' }]);
    handlePaste(STANDARD_FEN);
    return id;
  }

  it('"Open in New Tab" opens a separate draft tab and clears the pending paste', () => {
    const originalId = stagePaste();
    const before = get(stripTabs).length;

    confirmPasteNewTab();

    expect(get(pendingPaste)).toBeNull();
    expect(get(stripTabs).length).toBe(before + 1);
    expect(get(activeId)).not.toBe(originalId);
    const newTab = get(stripTabs).find((t) => t.id === get(activeId));
    expect(newTab.gameId).toMatch(/^draft:/);
    // the tab that was open before is untouched
    expect(isDirty(originalId)).toBe(true); // its own earlier shape edit, unrelated to the paste
  });

  it('"Replace This Game" detaches the SAME tab into a new draft', () => {
    const id = stagePaste();

    confirmPasteReplace();

    expect(get(pendingPaste)).toBeNull();
    expect(get(activeId)).toBe(id);
    const tab = get(stripTabs).find((t) => t.id === id);
    // the tab object's own `gameId` is a one-time seed (see WorkspaceArea.svelte) --
    // what actually changed is the tab's live game state, read back via isDirty.
    expect(tab.id).toBe(id);
    expect(isDirty(id)).toBe(true);
  });

  it('cancel leaves everything exactly as it was', () => {
    const id = stagePaste();
    const before = get(stripTabs).length;

    cancelPaste();

    expect(get(pendingPaste)).toBeNull();
    expect(get(stripTabs).length).toBe(before);
    expect(get(activeId)).toBe(id);
  });

  it('confirming with nothing pending is a harmless no-op', () => {
    const before = get(stripTabs).length;
    confirmPasteNewTab();
    confirmPasteReplace();
    expect(get(stripTabs).length).toBe(before);
  });
});
