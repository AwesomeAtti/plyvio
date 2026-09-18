/**
 * `loadGames()` — the Library Content Table's read path onto the real game
 * database (Phase 1 of the SQLite migration; see stores/library.js and
 * data/session.js for what this deliberately does not yet do).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

const rows = [
  { id: 1, date: '2026.01.01', white: 'Alpha', whiteElo: 2400, black: 'Beta',
    blackElo: 2380, event: 'Test Open', result: '1-0', plyCount: null }
];

vi.mock('$lib/data/session.js', () => ({
  gamesConnection: vi.fn()
}));
vi.mock('$lib/data/games.js', () => ({
  readGames: vi.fn(async () => rows)
}));

const { games, loadGames } = await import('../src/lib/stores/library.js');
const { gamesConnection } = await import('$lib/data/session.js');
const { readGames } = await import('$lib/data/games.js');

beforeEach(() => {
  games.set([]);
  gamesConnection.mockReset();
  readGames.mockClear();
});

describe('loadGames', () => {
  it('is a no-op outside Tauri, where gamesConnection() resolves null', async () => {
    gamesConnection.mockResolvedValue(null);
    games.set([{ id: 'placeholder' }]);
    await loadGames();
    expect(get(games)).toEqual([{ id: 'placeholder' }]);
    expect(readGames).not.toHaveBeenCalled();
  });

  it('replaces games with rows read through the seam', async () => {
    const connection = {};
    gamesConnection.mockResolvedValue(connection);
    await loadGames();
    expect(readGames).toHaveBeenCalledWith(connection, { limit: 5000 });
    expect(get(games)).toHaveLength(1);
    expect(get(games)[0].white).toBe('Alpha');
  });

  it('passes a caller-supplied limit through to readGames', async () => {
    gamesConnection.mockResolvedValue({});
    await loadGames({ limit: 50 });
    expect(readGames).toHaveBeenCalledWith(expect.anything(), { limit: 50 });
  });

  it('fills in the Phase 2 fields a real row does not carry yet, so the ' +
     'existing filters (counts, tag/collection selection) never see undefined', async () => {
    gamesConnection.mockResolvedValue({});
    await loadGames();
    const [game] = get(games);
    expect(game.trashed).toBe(false);
    expect(game.favorite).toBe(false);
    expect(game.tags).toEqual([]);
    expect(game.collection).toBeNull();
    expect(game.subscription).toBeNull();
    expect(game.addedDaysAgo).toBe(Infinity);
  });
});
