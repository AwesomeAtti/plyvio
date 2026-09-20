/**
 * `loadGames()` — the Library Content Table's read path onto the real game
 * database (Phases 1-2 of the SQLite migration: games, then favorites/
 * trash/tags/collections; see stores/library.js and data/session.js for
 * what this deliberately does not yet do).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

const rows = [
  { id: 1, date: '2026.01.01', white: 'Alpha', whiteElo: 2400, black: 'Beta',
    blackElo: 2380, event: 'Test Open', result: '1-0', plyCount: null },
  { id: 2, date: '2026.01.02', white: 'Gamma', whiteElo: 2200, black: 'Delta',
    blackElo: 2210, event: 'Test Open', result: '0-1', plyCount: null }
];

const tagRows = [{ id: 10, name: 'Blunder' }];
const collectionRows = [{ id: 20, name: 'Opening Prep', smart: false, criteria: null }];

vi.mock('$lib/data/session.js', () => ({
  libraryConnection: vi.fn()
}));
vi.mock('$lib/data/games.js', () => ({
  readGames: vi.fn(async () => rows),
  readFavoriteIds: vi.fn(async () => [1]),
  readTrashedIds: vi.fn(async () => []),
  readTags: vi.fn(async () => tagRows),
  readCollections: vi.fn(async () => collectionRows),
  readTagIdsByGame: vi.fn(async () => ({ 1: [10] })),
  // Game 2 belongs to two Collections at once, same as tags can be many.
  readCollectionIdsByGame: vi.fn(async () => ({ 2: [20, 21] }))
}));

const { games, tags, collections, loadGames } = await import('../src/lib/stores/library.js');
const { libraryConnection } = await import('$lib/data/session.js');
const { objects } = await import('../src/lib/stores/settings.js');
const { activeLibraryId } = await import('../src/lib/stores/libraries.js');
const dataGames = await import('$lib/data/games.js');

beforeEach(() => {
  games.set([]);
  tags.set([]);
  collections.set([]);
  libraryConnection.mockReset();
  for (const fn of Object.values(dataGames)) fn.mockClear?.();
  // A real, selected library — `loadGames()` (via `activeLibraryConnection()`)
  // now checks this before calling `libraryConnection()` at all. A row with
  // no `location` key (a still-mock/seeded one) is skipped entirely — see
  // the dedicated tests for that below.
  objects.update((o) => ({
    ...o,
    databases: [{ id: 42, name: 'Test Library', location: '/tmp/test.db', enabled: true, status: 'indexed' }]
  }));
  activeLibraryId.set(42);
});

describe('loadGames', () => {
  it('is a no-op when the active library has no real connection (libraryConnection() resolves null)', async () => {
    libraryConnection.mockResolvedValue(null);
    games.set([{ id: 'placeholder' }]);
    await loadGames();
    expect(get(games)).toEqual([{ id: 'placeholder' }]);
    expect(dataGames.readGames).not.toHaveBeenCalled();
  });

  it('is a no-op when no library is selected', async () => {
    activeLibraryId.set(null);
    // `activeLibraryId` also drives a module-level subscribe in
    // `stores/library.js` that fires its own fire-and-forget `loadGames()`
    // on every set (that's the switcher wiring itself) — let that settle
    // before resetting the mock, so it doesn't leak a stray call into this
    // test's own assertion below.
    await Promise.resolve();
    libraryConnection.mockReset();
    games.set([{ id: 'placeholder' }]);
    await loadGames();
    expect(get(games)).toEqual([{ id: 'placeholder' }]);
    expect(dataGames.readGames).not.toHaveBeenCalled();
    expect(libraryConnection).not.toHaveBeenCalled();
  });

  it('is a no-op for a still-mock/seeded row with no real database behind it', async () => {
    objects.update((o) => ({
      ...o,
      databases: [{ id: 'db-1', name: 'Master Games', enabled: true, status: 'indexed' }]
    }));
    activeLibraryId.set('db-1');
    await Promise.resolve(); // see the comment above
    libraryConnection.mockReset();
    games.set([{ id: 'placeholder' }]);
    await loadGames();
    expect(get(games)).toEqual([{ id: 'placeholder' }]);
    expect(dataGames.readGames).not.toHaveBeenCalled();
    expect(libraryConnection).not.toHaveBeenCalled();
  });

  it('replaces games with rows read through the seam', async () => {
    const connection = {};
    libraryConnection.mockResolvedValue(connection);
    await loadGames();
    expect(dataGames.readGames).toHaveBeenCalledWith(connection, { limit: 5000 });
    expect(get(games)).toHaveLength(2);
    expect(get(games)[0].white).toBe('Alpha');
  });

  it('passes a caller-supplied limit through to readGames', async () => {
    libraryConnection.mockResolvedValue({});
    await loadGames({ limit: 50 });
    expect(dataGames.readGames).toHaveBeenCalledWith(expect.anything(), { limit: 50 });
  });

  it('marks favorites and trash from the real presence tables', async () => {
    libraryConnection.mockResolvedValue({});
    await loadGames();
    const [g1, g2] = get(games);
    expect(g1.favorite).toBe(true);
    expect(g1.trashed).toBe(false);
    expect(g2.favorite).toBe(false);
  });

  it('attaches each game’s real tag ids', async () => {
    libraryConnection.mockResolvedValue({});
    await loadGames();
    const [g1, g2] = get(games);
    expect(g1.tags).toEqual([10]);
    expect(g2.tags).toEqual([]);
  });

  it('carries every Collection a game belongs to, not just the first', async () => {
    libraryConnection.mockResolvedValue({});
    await loadGames();
    const [g1, g2] = get(games);
    expect(g1.collections).toEqual([]);
    expect(g2.collections).toEqual([20, 21]);
  });

  it('leaves subscription null, which has no read path yet, and passes created_at through as-is', async () => {
    libraryConnection.mockResolvedValue({});
    await loadGames();
    const [game] = get(games);
    expect(game.subscription).toBeNull();
    // This fixture's rows carry no `created_at` -- a database populated
    // outside the application's import process may legitimately have none
    // (`data/games.js`) -- and `loadGames()` derives nothing from its
    // absence; `recentlyAdded()` (library.js) is what treats a falsy
    // `createdAt` as ineligible.
    expect(game.createdAt).toBeUndefined();
  });

  it('populates the tags and collections stores from the real database', async () => {
    libraryConnection.mockResolvedValue({});
    await loadGames();
    expect(get(tags)).toEqual(tagRows);
    expect(get(collections)).toEqual(collectionRows);
  });
});
