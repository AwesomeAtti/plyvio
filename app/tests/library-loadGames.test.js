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
const dataGames = await import('$lib/data/games.js');

beforeEach(() => {
  games.set([]);
  tags.set([]);
  collections.set([]);
  libraryConnection.mockReset();
  for (const fn of Object.values(dataGames)) fn.mockClear?.();
});

describe('loadGames', () => {
  it('is a no-op outside Tauri, where libraryConnection() resolves null', async () => {
    libraryConnection.mockResolvedValue(null);
    games.set([{ id: 'placeholder' }]);
    await loadGames();
    expect(get(games)).toEqual([{ id: 'placeholder' }]);
    expect(dataGames.readGames).not.toHaveBeenCalled();
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

  it('leaves subscription null and addedDaysAgo unreachable, which have no read path yet', async () => {
    libraryConnection.mockResolvedValue({});
    await loadGames();
    const [game] = get(games);
    expect(game.subscription).toBeNull();
    expect(game.addedDaysAgo).toBe(Infinity);
  });

  it('populates the tags and collections stores from the real database', async () => {
    libraryConnection.mockResolvedValue({});
    await loadGames();
    expect(get(tags)).toEqual(tagRows);
    expect(get(collections)).toEqual(collectionRows);
  });
});
