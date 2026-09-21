/**
 * A real library game's board, move list, engine banner, and Info card
 * `site`/`round` — the async half of the SQLite migration `game.test.js`'s
 * Info-card fix left open. See `stores/game.js`'s
 * `loadRealGame`/`isRealGameId`/`realGames`.
 *
 * Mocks `$lib/data/session.js` and `$lib/data/games.js` the same way
 * `library-loadGames.test.js` does for `loadGames()` — a real connection is
 * never available under Vitest (`libraryConnection()` only resolves non-null
 * inside Tauri), so the fetch itself has to be faked to exercise anything
 * past "no connection".
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

const REAL_MOVETEXT = '1. e4 e5 2. Nf3 Nc6 3. Bb5 *';
const REAL_RECORD = { site: 'Vienna Chess Arena', round: '3' };

/*
 * `explorerConnection` isn't exercised here — it's the Explorer's own seam
 * (see `game-explorerStats.test.js`) — but `ensureGameState` and `goToPly`
 * both call it via `refreshExplorerStats` regardless of which game a tab
 * holds, so it needs a harmless stub or every test here logs a spurious
 * "failed to load Explorer stats" it isn't testing for.
 */
vi.mock('$lib/data/session.js', () => ({
  libraryConnection: vi.fn(),
  explorerConnection: vi.fn(async () => null),
  isTauri: () => false
}));
/*
 * A partial mock: `movetextFromRow` is real, because the MOCK game path
 * (`game/plies.js`'s `pliesFor`) uses it too, and the last test below
 * exercises exactly that path — a tab with no library row must still work.
 */
vi.mock('$lib/data/games.js', async (importOriginal) => ({
  ...(await importOriginal()),
  readMovetextFor: vi.fn(async () => ({ movetext: REAL_MOVETEXT, source: 'pgn' })),
  readRecordFields: vi.fn(async () => REAL_RECORD)
}));

const {
  gameStates, activeGame, ensureGameState, resetGameState, goToPly, atLastPly
} = await import('../src/lib/stores/game.js');
const { activeId } = await import('../src/lib/stores/tabs.js');
const { libraryConnection } = await import('$lib/data/session.js');
const { objects } = await import('../src/lib/stores/settings.js');
const { activeLibraryId } = await import('../src/lib/stores/libraries.js');
const { readMovetextFor, readRecordFields } = await import('$lib/data/games.js');
const { readGame } = await import('../src/lib/game/plies.js');

/** One microtask/macrotask turn — enough for the fire-and-forget fetch's
 *  `await`s and the derived store's recompute to settle. */
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  resetGameState();
  activeId.set('library');
  libraryConnection.mockReset();
  readMovetextFor.mockReset();
  readMovetextFor.mockResolvedValue({ movetext: REAL_MOVETEXT, source: 'pgn' });
  readRecordFields.mockReset();
  readRecordFields.mockResolvedValue(REAL_RECORD);
  // A real, selected library — `loadRealGame()` (via `activeLibraryConnection()`)
  // now checks this before calling `libraryConnection()` at all.
  objects.update((o) => ({
    ...o,
    databases: [{ id: 99, name: 'Test Library', location: '/tmp/test.db', enabled: true, status: 'indexed' }]
  }));
  activeLibraryId.set(99);
});

describe('a real game’s movetext, fetched for the board/moves/engine', () => {
  it('fetches once by the numeric library id, shared across tabs on the same game', async () => {
    libraryConnection.mockResolvedValue({});
    ensureGameState('t1', 42);
    ensureGameState('t2', 42);
    await flush();
    expect(readMovetextFor).toHaveBeenCalledTimes(1);
    expect(readMovetextFor).toHaveBeenCalledWith({}, 42);
  });

  it('shows the starting position while the fetch is in flight, then the real moves', async () => {
    let resolveFetch;
    libraryConnection.mockResolvedValue({});
    readMovetextFor.mockReturnValue(new Promise((r) => { resolveFetch = r; }));

    ensureGameState('t1', 42);
    activeId.set('t1');

    const before = get(activeGame);
    expect(before.loading).toBe(true);
    expect(before.plies).toHaveLength(1);
    expect(before.position.s).toBeNull();

    resolveFetch({ movetext: REAL_MOVETEXT, source: 'pgn' });
    await flush();

    const after = get(activeGame);
    expect(after.loading).toBe(false);
    expect(after.plies).toEqual(readGame(REAL_MOVETEXT).plies);
    expect(after.engine).toEqual(readGame(REAL_MOVETEXT).engine);
  });

  it('falls back to the starting position, not a wrong game, with no connection', async () => {
    libraryConnection.mockResolvedValue(null);
    ensureGameState('t1', 42);
    activeId.set('t1');
    await flush();

    const g = get(activeGame);
    expect(g.loading).toBe(true);
    expect(g.plies).toHaveLength(1);
    expect(g.plies[0].f).toBe(readGame('').plies[0].f);
  });

  it('falls back the same way, and logs, when the read itself throws', async () => {
    libraryConnection.mockResolvedValue({});
    readMovetextFor.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    ensureGameState('t1', 42);
    activeId.set('t1');
    await flush();

    const g = get(activeGame);
    expect(g.loading).toBe(true);
    expect(g.plies).toHaveLength(1);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('clamps ply navigation to the real game’s length once it has loaded', async () => {
    libraryConnection.mockResolvedValue({});
    ensureGameState('t1', 42);
    activeId.set('t1');
    await flush();

    goToPly('t1', 99999);
    expect(atLastPly('t1')).toBe(true);
    expect(get(gameStates).t1.ply).toBe(readGame(REAL_MOVETEXT).plies.length - 1);
  });

  it('leaves a tab with no library row on the mock table, untouched', () => {
    ensureGameState('t1', null);
    activeId.set('t1');
    const g = get(activeGame);
    expect(g.loading).toBe(false);
    expect(readMovetextFor).not.toHaveBeenCalled();
  });
});

describe('a real game’s Info card `site`/`round`', () => {
  it('reads the real values, not the mock row’s', async () => {
    libraryConnection.mockResolvedValue({});
    ensureGameState('t1', 42);
    activeId.set('t1');
    await flush();

    const info = get(activeGame).info;
    expect(info.site).toBe(REAL_RECORD.site);
    expect(info.round).toBe(REAL_RECORD.round);
  });

  it('shows null for a game that genuinely has none, not a fallback value', async () => {
    readRecordFields.mockResolvedValue({ site: null, round: null });
    libraryConnection.mockResolvedValue({});
    ensureGameState('t1', 42);
    activeId.set('t1');
    await flush();

    const info = get(activeGame).info;
    expect(info.site).toBeNull();
    expect(info.round).toBeNull();
  });

  it('does not take the movetext down with it when only the record-fields read fails', async () => {
    libraryConnection.mockResolvedValue({});
    readRecordFields.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    ensureGameState('t1', 42);
    activeId.set('t1');
    await flush();

    const g = get(activeGame);
    expect(g.loading).toBe(false);
    expect(g.plies).toEqual(readGame(REAL_MOVETEXT).plies);
    expect(g.info.site).toBeNull();
    expect(g.info.round).toBeNull();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
