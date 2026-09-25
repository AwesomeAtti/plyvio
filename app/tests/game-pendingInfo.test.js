/**
 * Stage 1 (`analysis-board-plan.md`, revised 24 Sep) — the unified dirty
 * flag and the tab-scoped Game Info overlay that replaced `gameEdits`.
 *
 * Uses the same mock-path harness `game.test.js` already establishes for
 * this file: a string `libraryGameId` never touches the real database
 * (`isRealGameId` is a `typeof` check), and a numeric one exercises the
 * library-row path while still resolving deterministically without a
 * connection — see "Game Info reads the real library row when one is
 * open" in `game.test.js`, which this borrows its `libraryGames.set([...])`
 * shape from.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
  activeGame, ensureGameState, resetGameState, saveGameInfo, setPlyShapes, isDirty
} from '../src/lib/stores/game.js';
import { activeId } from '../src/lib/stores/tabs.js';
import { games as libraryGames } from '../src/lib/stores/library.js';

beforeEach(() => {
  resetGameState();
  libraryGames.set([]);
});
afterEach(() => {
  libraryGames.set([]);
});

/** Every field the Edit dialog's `onsave` always sends, defaults for the
 *  ones a given test doesn't care about. */
const infoFields = (overrides = {}) => ({
  white: '', white_elo: null, black: '', black_elo: null, result: '*',
  event: '', site: '', date: '', round: '',
  favorite: false, tags: [], collections: [],
  ...overrides
});

describe('isDirty — board annotations', () => {
  it('is false for a freshly opened tab', () => {
    ensureGameState('t1', 'g1');
    expect(isDirty('t1')).toBe(false);
  });

  it('becomes true once a shape is drawn on any ply', () => {
    ensureGameState('t1', 'g1');
    setPlyShapes('t1', [0, 0, 0], [{ orig: 'e2', dest: 'e4', brush: 'green' }]);
    expect(isDirty('t1')).toBe(true);
  });

  it('an empty shapes array for a ply is not itself dirty', () => {
    ensureGameState('t1', 'g1');
    setPlyShapes('t1', [0, 0, 0], []);
    expect(isDirty('t1')).toBe(false);
  });

  it('does not leak into an unrelated tab', () => {
    ensureGameState('t1', 'g1');
    ensureGameState('t2', 'g1');
    setPlyShapes('t1', [], [{ orig: 'e2', dest: 'e4', brush: 'green' }]);
    expect(isDirty('t1')).toBe(true);
    expect(isDirty('t2')).toBe(false);
  });
});

describe('isDirty — Game Info fields', () => {
  it('saving the record back unchanged does not mark the tab dirty', () => {
    ensureGameState('t1', 'g1');
    activeId.set('t1');
    const r = get(activeGame).record;

    saveGameInfo('t1', infoFields({
      white: r.white ?? '', white_elo: r.white_elo ?? null,
      black: r.black ?? '', black_elo: r.black_elo ?? null,
      result: r.result ?? '*', event: r.event ?? '', date: r.date ?? '',
      site: r.site ?? '', round: r.round ?? ''
    }));

    expect(isDirty('t1')).toBe(false);
  });

  it('changing a field marks the tab dirty and the change reads back', () => {
    ensureGameState('t1', 'g1');
    activeId.set('t1');

    saveGameInfo('t1', infoFields({ white: 'A Whole New Name' }));

    expect(isDirty('t1')).toBe(true);
    expect(get(activeGame).record.white).toBe('A Whole New Name');
  });
});

describe('Game Info edits are TAB-scoped, not game-scoped (replaces gameEdits)', () => {
  it('an edit in one tab does not appear in, or dirty, a second tab on the same game', () => {
    ensureGameState('t1', 'g1');
    ensureGameState('t2', 'g1'); // same libraryId hashes to the same mock game

    activeId.set('t1');
    saveGameInfo('t1', infoFields({ white: 'Only In Tab One' }));
    expect(isDirty('t1')).toBe(true);
    expect(isDirty('t2')).toBe(false);

    activeId.set('t2');
    expect(get(activeGame).record.white).not.toBe('Only In Tab One');
  });

  it('closing and reopening a tab on the same game starts with no pending edit', () => {
    ensureGameState('t1', 'g1');
    activeId.set('t1');
    saveGameInfo('t1', infoFields({ white: 'Temporary Edit' }));
    expect(get(activeGame).record.white).toBe('Temporary Edit');

    resetGameState(); // stands in for closing the tab: nothing survives it
    ensureGameState('t1', 'g1');
    activeId.set('t1');
    expect(get(activeGame).record.white).not.toBe('Temporary Edit');
    expect(isDirty('t1')).toBe(false);
  });
});

describe('pendingInfo overlays the real library row, not just the mock game', () => {
  it('a staged edit is visible on the Info card even when a library row exists', () => {
    libraryGames.set([{
      id: 42,
      white: 'Carlsen, Magnus',
      black: 'Caruana, Fabiano',
      whiteElo: 2839,
      blackElo: 2822,
      result: '1/2-1/2',
      date: '2024.04.12',
      event: 'Candidates',
      favorite: false,
      tags: [],
      collections: []
    }]);
    ensureGameState('real-1', 42);
    activeId.set('real-1');

    // Confirms the fix, not just the new field: before it, `record` was
    // `row ?? game` with no overlay at all, so this write was invisible
    // here whenever a library row existed (`saveGameInfo`'s doc comment).
    saveGameInfo('real-1', infoFields({
      white: 'Carlsen, Magnus', white_elo: 2839,
      black: 'Caruana, Fabiano', black_elo: 2822,
      result: '1/2-1/2', date: '2024.04.12',
      event: 'Toronto Candidates 2024'
    }));

    const info = get(activeGame).info;
    expect(info.event).toBe('Toronto Candidates 2024');
    // Session-only, same as the mock path: the library row itself is untouched.
    expect(get(libraryGames)[0].event).toBe('Candidates');
  });
});
