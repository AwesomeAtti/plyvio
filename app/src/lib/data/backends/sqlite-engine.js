/**
 * The one place that touches `@sqlite.org/sqlite-wasm` directly.
 *
 * `memory.js` (opens bytes already in memory, used by tests) and `pwa.js` (opens a
 * database backed by an IndexedDB snapshot, used by the browser/PWA build) both need
 * the same three things: load the WASM module once, open a database from bytes (or
 * fresh), and wrap the result in the five-method `Connection` shape `connection.js`
 * defines. This file is that shared core so neither backend duplicates it.
 *
 * Nothing here knows where the bytes came from or where they're going — that's each
 * caller's own job (a file on disk for `memory.js`'s tests, an IndexedDB record for
 * `pwa.js`). This file only knows SQLite-WASM.
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
 * Wrap an open oo1 `DB` in the `Connection` shape, plus `export()` for a caller that
 * needs the current bytes back out (every caller of this module does, one way or
 * another — a test proving a round trip, or `pwa.js` snapshotting to IndexedDB).
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
    /** The current bytes of the database, for writing it back to wherever it came from. */
    export: async () => sqlite3.capi.sqlite3_js_db_export(db.pointer)
  };

  return assertConnection(connection, who);
};
