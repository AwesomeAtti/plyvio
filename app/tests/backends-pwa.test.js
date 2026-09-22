/**
 * The PWA backend (`data/backends/pwa.js`): what it creates on first open,
 * and that what it writes is still there when the file is opened again.
 *
 * Runs through the real client, host and SQLite in-process
 * (`tests/helpers/pwa-in-process.js`); only OPFS is replaced, by an in-memory
 * pool. OPFS itself is covered by the Playwright suite (`app/e2e/`).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openConfigDatabase, openLibraryDatabase } from '../src/lib/data/backends/pwa.js';
import { readGames, countGames } from '../src/lib/data/games.js';
import { readPreferences, readSubscriptions } from '../src/lib/data/config.js';
import { identify, GAME_TABLES, CONFIG_TABLES } from '../src/lib/data/identify.js';
import { SCHEMA_USER_VERSION } from '../src/lib/data/backends/schema.js';
import { GAMES } from '../src/lib/mock-data/sample-games.js';
import { resetPool, poolFileNames } from './helpers/pwa-in-process.js';

vi.mock('../src/lib/data/backends/sqlite-worker-port.js', async () =>
  (await import('./helpers/pwa-in-process.js')).workerPortMock());

// Each test uses its own library id: the host keeps a file open across tests
// in this file (nothing here resets modules), so fresh ids keep them apart.
let nextId = 1000;
const freshId = () => nextId++;

beforeEach(() => {
  resetPool();
});

describe('openLibraryDatabase — a fresh, seeded database', () => {
  it('is seeded with every sample game, and identifies as a games database', async () => {
    const connection = await openLibraryDatabase(freshId(), { seed: true });
    expect(await countGames(connection)).toBe(GAMES.length);
    const identity = await identify(connection);
    expect(identity.kind).toBe('games');
    expect(GAME_TABLES.every((t) => identity.tables.includes(t))).toBe(true);
  });

  it('seeds every Seven Tag Roster field, and the positions table', async () => {
    const connection = await openLibraryDatabase(freshId(), { seed: true });
    const row = await connection.get('select * from games where id = ?', [GAMES[0].id]);
    for (const field of ['event', 'site', 'date', 'round', 'white', 'black', 'result']) {
      expect(row[field]).toBe(GAMES[0][field]);
    }
    expect(row.created_at).toBeTypeOf('string');
    expect(row.movetext).toBeNull();
    expect(await connection.value('select count(*) from positions')).toBeGreaterThan(0);
  });

  it('sets user_version, and lives in its own named file', async () => {
    const id = freshId();
    const connection = await openLibraryDatabase(id, { seed: true });
    expect(await connection.value('pragma user_version')).toBe(SCHEMA_USER_VERSION);
    expect(poolFileNames()).toContain(`/library-${id}.db`);
  });

  it('reads back through the same repository functions the desktop backend uses', async () => {
    const connection = await openLibraryDatabase(freshId(), { seed: true });
    const page = await readGames(connection, { limit: 5 });
    expect(page).toHaveLength(5);
    expect(page[0].white).toBeTypeOf('string');
  });
});

describe('openLibraryDatabase — unseeded', () => {
  it('creates the schema and nothing else', async () => {
    const connection = await openLibraryDatabase(freshId());
    expect(await countGames(connection)).toBe(0);
    expect((await identify(connection)).kind).toBe('games');
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

describe('persistence — no save step', () => {
  it('a write is readable after closing and reopening, with nothing flushed in between', async () => {
    const id = freshId();
    const first = await openLibraryDatabase(id, { seed: true });
    await first.run('update games set white = ? where id = ?', ['Renamed', GAMES[0].id]);
    await first.close();

    const second = await openLibraryDatabase(id, { seed: true });
    expect(await second.value('select white from games where id = ?', [GAMES[0].id])).toBe('Renamed');
  });

  it('reopening an existing file does not reseed it', async () => {
    const id = freshId();
    const first = await openLibraryDatabase(id, { seed: true });
    await first.run('delete from games where id = ?', [GAMES[0].id]);
    await first.close();

    const second = await openLibraryDatabase(id, { seed: true });
    expect(await countGames(second)).toBe(GAMES.length - 1);
  });

  it('export() returns the current bytes of the database', async () => {
    const connection = await openLibraryDatabase(freshId());
    const bytes = await connection.export();
    // Checked by name: the in-process port's structuredClone builds it in
    // Node's realm, not jsdom's, so `instanceof Uint8Array` would fail here
    // for a reason no browser shares.
    expect(Object.prototype.toString.call(bytes)).toBe('[object Uint8Array]');
    expect(new TextDecoder().decode(bytes.slice(0, 15))).toBe('SQLite format 3');
  });
});
