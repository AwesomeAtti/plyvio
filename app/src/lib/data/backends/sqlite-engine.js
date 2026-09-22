/**
 * The one place that touches `@sqlite.org/sqlite-wasm` directly.
 *
 * Two ways to open a database, one way to wrap it:
 *
 *  - `openDb()` opens a database from bytes (or an empty one) held in memory.
 *    `memory.js` uses it for the tests' fixtures, and so does the in-process
 *    test store in `tests/helpers/pwa-in-process.js`.
 *  - `openPoolDb()` opens a file by name on the `opfs-sahpool` VFS. The PWA's
 *    storage worker (`sqlite-worker.js`) uses it. Writes go to the file page by
 *    page, through the VFS, with nothing to serialise afterwards.
 *  - `connectionFor()` wraps either kind in the five-method `Connection` shape
 *    `connection.js` defines, plus `export()` for the current bytes.
 *
 * Nothing here knows where a database lives or how it's reached; that's each
 * caller's job. This file only knows SQLite-WASM.
 */

import { assertConnection, DataError } from '../connection.js';

let modulePromise = null;

/** Load and initialise the SQLite WASM module once per process. */
export const sqlite3Module = () => {
  if (!modulePromise) {
    modulePromise = import('@sqlite.org/sqlite-wasm').then((m) => m.default());
  }
  return modulePromise;
};

const normalise = (params) => (params === undefined ? undefined : params);

/**
 * Open a database from its bytes, or a fresh empty one when `bytes` is `null`.
 *
 * @param {import('@sqlite.org/sqlite-wasm').Sqlite3Static} sqlite3
 * @param {Uint8Array|ArrayBuffer|null} bytes
 * @returns {object} the oo1 `DB` instance
 */
export const openDb = (sqlite3, bytes = null) => {
  const db = new sqlite3.oo1.DB();

  if (bytes) {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const pointer = sqlite3.wasm.allocFromTypedArray(view);
    const rc = sqlite3.capi.sqlite3_deserialize(
      db.pointer,
      'main',
      pointer,
      view.length,
      view.length,
      sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
    );
    if (rc !== 0) {
      db.close();
      throw new DataError(`could not open the database: sqlite3_deserialize returned ${rc}`);
    }
  }

  return db;
};

/**
 * Open (creating if needed) the file `name` on an installed `opfs-sahpool` VFS.
 * `name` must be absolute (`/config.db`): this VFS doesn't resolve relative
 * paths (see "Peculiarities" in the package's `installOpfsSAHPoolVfs()` docs).
 *
 * @param {object} pool the utility object `installOpfsSAHPoolVfs()` resolves to
 * @param {string} name
 * @returns {object} the oo1 `DB` instance
 */
export const openPoolDb = (pool, name) => {
  if (!name.startsWith('/')) throw new DataError(`pool database names must be absolute: ${name}`);
  return new pool.OpfsSAHPoolDb(name);
};

/**
 * Wrap an open oo1 `DB` in the `Connection` shape, plus `export()` for a caller that
 * needs the current bytes back out: a test proving a round trip, or (later) the
 * PWA's manual export. Saving is not one of them; a pool database is already on
 * disk.
 *
 * @param {object} db the oo1 `DB` instance from `openDb`
 * @param {import('@sqlite.org/sqlite-wasm').Sqlite3Static} sqlite3
 * @param {string} who for `assertConnection`'s error message
 */
export const connectionFor = (db, sqlite3, who) => {
  const all = async (sql, params) =>
    db.exec({ sql, bind: normalise(params), rowMode: 'object', returnValue: 'resultRows' })
      // oo1 returns null-prototype objects; give callers ordinary ones.
      .map((row) => ({ ...row }));

  const connection = {
    all,
    get: async (sql, params) => (await all(sql, params))[0] ?? null,
    value: async (sql, params) => {
      const row = await all(sql, params);
      if (!row.length) return null;
      const first = Object.values(row[0]);
      return first.length ? first[0] : null;
    },
    run: async (sql, params) => {
      db.exec({ sql, bind: normalise(params) });
    },
    close: async () => {
      db.close();
    },
    /** The current bytes of the database. */
    export: async () => sqlite3.capi.sqlite3_js_db_export(db.pointer)
  };

  return assertConnection(connection, who);
};
