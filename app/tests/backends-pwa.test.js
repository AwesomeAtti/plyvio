/**
 * The PWA backend — the browser/interim storage route. §1 of the schema, plus
 * the interim architecture's own two rules: the whole database is deserialized
 * on open and re-exported whole on save, and a fresh database is seeded from
 * the same curated sample games the app has always shipped.
 *
 * `fake-indexeddb` is imported here, in this file only — not in `tests/setup.js`
 * — the same way `backends-tauri.test.js` mocks `@tauri-apps/plugin-sql` only
 * for itself. Every other test file keeps seeing a real, unavailable
 * `indexedDB` and the graceful "no connection" degradation that gets, per
 * `data/session.js`'s own comment on why that's not a special case.
 */

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openGameDatabase, openConfigDatabase } from '../src/lib/data/backends/pwa.js';
import { readGames, countGames } from '../src/lib/data/games.js';
import { readPreferences, readSubscriptions } from '../src/lib/data/config.js';
import { identify, GAME_TABLES, CONFIG_TABLES } from '../src/lib/data/identify.js';
import { GAMES } from '../src/lib/mock-data/sample-games.js';

// eslint-disable-next-line no-undef -- fake-indexeddb/auto defines this globally
const resetIdb = () => { indexedDB = new IDBFactory(); };

beforeEach(() => {
  resetIdb();
});

describe('openGameDatabase — a fresh database', () => {
  it('is seeded with every mock-data game, and identifies as a games database', async () => {
    const connection = await openGameDatabase();
    expect(await countGames(connection)).toBe(GAMES.length);
    const identity = await identify(connection);
    expect(identity.kind).toBe('games');
    expect(GAME_TABLES.every((t) => identity.tables.includes(t))).toBe(true);
  });

  it('seeds every Seven Tag Roster field, not just the ones readGames lists', async () => {
    const connection = await openGameDatabase();
    const row = await connection.get('select * from games where id = ?', [GAMES[0].id]);
    for (const field of ['event', 'site', 'date', 'round', 'white', 'black', 'result']) {
      expect(row[field]).toBe(GAMES[0][field]);
    }
    expect(row.created_at).toBeTypeOf('string');
    expect(row.movetext).toBeNull();
  });

  it('reads back through the same repository functions the desktop backend uses', async () => {
    const connection = await openGameDatabase();
    const page = await readGames(connection, { limit: 5 });
    expect(page).toHaveLength(5);
    expect(page[0].white).toBeTypeOf('string');
  });
});

describe('openConfigDatabase — a fresh database', () => {
  it('has every config table, empty, and identifies as a config database', async () => {
    const connection = await openConfigDatabase();
    const identity = await identify(connection);
    expect(identity.kind).toBe('config');
    expect(CONFIG_TABLES.every((t) => identity.tables.includes(t))).toBe(true);
    expect(await readPreferences(connection)).toEqual({});
    expect(await readSubscriptions(connection)).toEqual([]);
  });
});

describe('persistence — the IndexedDB snapshot', () => {
  it('reopening before any write reads back the same seeded games, not a reseed', async () => {
    const first = await openGameDatabase();
    const idBefore = (await first.all('select id from games order by id')).map((r) => r.id);

    const second = await openGameDatabase();
    const idAfter = (await second.all('select id from games order by id')).map((r) => r.id);
    expect(idAfter).toEqual(idBefore);
  });

  it('a write is flushed on close (before the debounce would otherwise fire) and read back on the next open', async () => {
    const first = await openGameDatabase();
    await first.run('update games set white = ? where id = ?', ['Renamed', GAMES[0].id]);
    // close() cancels the pending debounce timer and saves immediately rather
    // than waiting the full SAVE_DEBOUNCE_MS out — this is what a closed or
    // backgrounded tab relies on, per pwa.js's own header.
    await first.close();

    const second = await openGameDatabase();
    const row = await second.get('select white from games where id = ?', [GAMES[0].id]);
    expect(row.white).toBe('Renamed');
  });
});
