/**
 * The Explorer Section's real position statistics — database-schema.md §6,
 * read through `data/games.js`'s `readPositionStats` and `data/session.js`'s
 * `explorerConnection`. See `stores/game.js`'s `loadExplorerStats`/
 * `refreshExplorerStats`/`explorerStats`.
 *
 * Mocks `$lib/data/session.js` and `$lib/data/games.js` the same way
 * `game-realData.test.js` does for a game's movetext — a real connection is
 * never available under Vitest, so the fetch has to be faked to exercise
 * anything past "no connection".
 *
 * These tabs are opened with no library row (`libraryGameId: null`), on
 * purpose: the Explorer's library selection is independent of which game is
 * open (`stores/game.js`'s own comment on `explorerLibraryId` says so), and
 * leaving the game mock keeps this file from also needing to fake a game's
 * movetext fetch to exercise the Explorer's.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

const STATS_DB1 = [
  { move: 'e4', games: 361, white: 172, draws: 29, black: 160 },
  { move: 'd4', games: 314, white: 133, draws: 36, black: 145 }
];
const STATS_DB2 = [
  { move: 'Nf3', games: 12, white: 5, draws: 3, black: 4 }
];

vi.mock('$lib/data/session.js', () => ({
  libraryConnection: vi.fn(async () => null),
  explorerConnection: vi.fn(),
  isTauri: () => false
}));
vi.mock('$lib/data/games.js', async (importOriginal) => ({
  ...(await importOriginal()),
  readPositionStats: vi.fn()
}));

const {
  gameStates, activeGame, ensureGameState, resetGameState, goToPly, setExplorerLibrary
} = await import('../src/lib/stores/game.js');
const { activeId } = await import('../src/lib/stores/tabs.js');
const { explorerConnection } = await import('$lib/data/session.js');
const { readPositionStats } = await import('$lib/data/games.js');
const { positionKey } = await import('../src/lib/game/explorer.js');
const { positionStats } = await import('../src/lib/game/explorerMock.js');

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  resetGameState();
  activeId.set('library');
  explorerConnection.mockReset();
  readPositionStats.mockReset();
  explorerConnection.mockImplementation(async (id) => (id ? { id } : null));
  readPositionStats.mockImplementation(async (connection) =>
    connection?.id === 'db-2' ? STATS_DB2 : STATS_DB1
  );
});

describe('the Explorer Section’s real position statistics', () => {
  it('fetches for the default library the moment a tab opens', async () => {
    ensureGameState('t1', null);
    activeId.set('t1');
    await flush();

    expect(explorerConnection).toHaveBeenCalledWith('db-1');
    const g = get(activeGame);
    expect(g.explorer.rows.map((r) => r.move)).toEqual(['e4', 'd4']);
    expect(g.explorer.total).toBe(361 + 314);
  });

  it('shows nothing while the fetch is in flight', () => {
    explorerConnection.mockReturnValue(new Promise(() => {})); // never resolves
    ensureGameState('t1', null);
    activeId.set('t1');

    const g = get(activeGame);
    expect(g.explorer.rows).toEqual([]);
  });

  it('refetches for the position at the new ply on navigation', async () => {
    ensureGameState('t1', null);
    activeId.set('t1');
    await flush();

    const st = get(gameStates).t1;
    const startFen = get(activeGame).plies[0].f;

    goToPly('t1', 1);
    await flush();

    const afterFen = get(activeGame).plies[get(gameStates).t1.ply].f;
    expect(afterFen).not.toBe(startFen);
    expect(readPositionStats).toHaveBeenLastCalledWith(
      expect.anything(),
      positionKey(afterFen)
    );
    void st;
  });

  it('respects the Explorer’s own library selection, independent of the game', async () => {
    ensureGameState('t1', null);
    activeId.set('t1');
    await flush();

    setExplorerLibrary('t1', 'db-2');
    await flush();

    expect(explorerConnection).toHaveBeenCalledWith('db-2');
    const g = get(activeGame);
    expect(g.explorer.library.id).toBe('db-2');
    expect(g.explorer.rows.map((r) => r.move)).toEqual(['Nf3']);
  });

  /*
    THE STOPGAP. No connection means there was nothing to ask — the PWA, which
    has no database to open — which is not the same fact as a table answering
    "nothing played from here". The Section falls back to `explorerMock.js`
    rather than drawing its empty state, and the two tests below hold the
    distinction the fallback rests on.
  */
  it('falls back to the mock, not empty rows, with no connection for the library', async () => {
    explorerConnection.mockResolvedValue(null);
    ensureGameState('t1', null);
    activeId.set('t1');
    await flush();

    expect(readPositionStats).not.toHaveBeenCalled();
    const g = get(activeGame);
    expect(g.explorer.rows.length).toBeGreaterThan(0);
    // Deterministic, and the same call `activeGame` makes — not merely "some rows".
    const fen = g.plies[g.ply].f;
    const played = g.plies[g.ply + 1]?.s ?? null;
    expect(g.explorer.rows.map((r) => r.move))
      .toEqual(positionStats(fen, g.ply, g.explorer.library, played).map((r) => r.move));
  });

  it('draws the empty state — not the mock — when a table answers with no rows', async () => {
    readPositionStats.mockResolvedValue([]);      // the table exists and holds nothing
    ensureGameState('t1', null);
    activeId.set('t1');
    await flush();

    expect(readPositionStats).toHaveBeenCalled();
    expect(get(activeGame).explorer.rows).toEqual([]);
  });

  it('does not flash mock rows while a real read is still in flight', async () => {
    readPositionStats.mockImplementation(() => new Promise(() => {}));   // never resolves
    ensureGameState('t1', null);
    activeId.set('t1');
    await flush();

    expect(get(activeGame).explorer.rows).toEqual([]);
  });

  it('drops a stale response instead of clobbering a newer one', async () => {
    let resolveFirst;
    readPositionStats
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockImplementationOnce(async () => STATS_DB2);

    ensureGameState('t1', null);
    activeId.set('t1');
    await flush(); // fetch for ply 0 is now in flight, unresolved

    goToPly('t1', 1); // supersedes it before it answers
    await flush(); // fetch for the new ply resolves (STATS_DB2)

    resolveFirst(STATS_DB1); // the stale ply-0 answer finally arrives
    await flush();

    expect(get(activeGame).explorer.rows.map((r) => r.move)).toEqual(['Nf3']);
  });

  it('keeps two tabs’ Explorer state independent (§2.3)', async () => {
    ensureGameState('t1', null);
    ensureGameState('t2', null);
    await flush();

    setExplorerLibrary('t1', 'db-2');
    await flush();

    activeId.set('t1');
    expect(get(activeGame).explorer.library.id).toBe('db-2');
    activeId.set('t2');
    expect(get(activeGame).explorer.library.id).toBe('db-1');
  });
});
