/**
 * The Tauri backend, against a mocked `@tauri-apps/plugin-sql`.
 *
 * This is NOT a proof that Tauri IPC works — that needs the real plugin behind
 * a real Rust build, which nothing in this sandbox can run (no Rust toolchain,
 * no window to host the webview). What it proves is narrower and still worth
 * having on its own: that `backends/tauri.js` implements the `Connection`
 * contract correctly on top of whatever `Database.load()` gives it — the
 * `all`/`get`/`value` shaping, and that a failure to open surfaces as a
 * `DataError` the way `memory.js`'s callers already expect.
 *
 * Running the real thing is a `npm run tauri dev` (or `cargo check` from
 * `src-tauri/`) away, on a machine with the Rust toolchain this sandbox
 * doesn't have — see `docs/architecture` notes on this backend for the manual
 * check to run once it builds.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { rows: [], loadError: null, closed: false, calls: [] };

vi.mock('@tauri-apps/plugin-sql', () => {
  const fakeDb = {
    select: vi.fn(async (sql, params) => {
      state.calls.push(['select', sql, params]);
      return state.rows;
    }),
    execute: vi.fn(async (sql, params) => {
      state.calls.push(['execute', sql, params]);
      return { rowsAffected: 1, lastInsertId: 1 };
    }),
    close: vi.fn(async () => {
      state.closed = true;
    })
  };
  return {
    default: {
      load: vi.fn(async (connectionString) => {
        state.calls.push(['load', connectionString]);
        if (state.loadError) throw state.loadError;
        return fakeDb;
      })
    }
  };
});

const { openFileDatabase } = await import('../src/lib/data/backends/tauri.js');
const { isConnection } = await import('../src/lib/data/connection.js');

beforeEach(() => {
  state.rows = [];
  state.loadError = null;
  state.closed = false;
  state.calls = [];
});

describe('openFileDatabase', () => {
  it('rejects a missing path before touching the plugin', async () => {
    await expect(openFileDatabase('')).rejects.toThrow(/requires a path/);
    expect(state.calls).toHaveLength(0);
  });

  it('opens the path as a sqlite: connection string', async () => {
    await openFileDatabase('/Users/someone/Library/Plyvio/master-games.db');
    expect(state.calls[0]).toEqual([
      'load',
      'sqlite:/Users/someone/Library/Plyvio/master-games.db'
    ]);
  });

  it('satisfies the connection contract', async () => {
    const connection = await openFileDatabase('/tmp/games.db');
    expect(isConnection(connection)).toBe(true);
  });

  it('all() returns every row from select()', async () => {
    state.rows = [{ id: 1 }, { id: 2 }];
    const connection = await openFileDatabase('/tmp/games.db');
    expect(await connection.all('select * from games')).toEqual(state.rows);
  });

  it('get() returns the first row, or null when select() found none', async () => {
    const connection = await openFileDatabase('/tmp/games.db');
    expect(await connection.get('select * from games where id = ?', [1])).toBeNull();

    state.rows = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
    expect(await connection.get('select * from games')).toEqual({ id: 1, name: 'a' });
  });

  it('value() returns the first column of the first row, or null', async () => {
    const connection = await openFileDatabase('/tmp/games.db');
    expect(await connection.value('select count(*) from games')).toBeNull();

    state.rows = [{ 'count(*)': 42 }];
    expect(await connection.value('select count(*) from games')).toBe(42);
  });

  it('run() calls execute() and returns nothing, per the Connection contract', async () => {
    const connection = await openFileDatabase('/tmp/games.db');
    await expect(connection.run('delete from games where id = ?', [1])).resolves.toBeUndefined();
    expect(state.calls).toContainEqual([
      'execute',
      'delete from games where id = ?',
      [1]
    ]);
  });

  it('close() closes the underlying database', async () => {
    const connection = await openFileDatabase('/tmp/games.db');
    await connection.close();
    expect(state.closed).toBe(true);
  });

  it('wraps a failure to open as a DataError, not the raw IPC error', async () => {
    const { DataError } = await import('../src/lib/data/connection.js');
    state.loadError = new Error('unable to open database file');
    await expect(openFileDatabase('/tmp/missing.db')).rejects.toThrow(DataError);
    await expect(openFileDatabase('/tmp/missing.db')).rejects.toThrow(
      /could not open \/tmp\/missing\.db/
    );
  });
});
