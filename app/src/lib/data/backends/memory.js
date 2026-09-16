/**
 * A connection to a database held in memory, opened from its bytes, in this
 * process.
 *
 * This is the backend the tests use, and the only one there is: the prototype
 * runs on mock data and opens no database. It proves the schema and the queries
 * against the real files in `samples/`, which is what a schema needs proving
 * against; it says nothing about how a database is stored, because storing one is
 * the next backend's problem.
 *
 * It is imported by tests and tooling, never by the application. That is not
 * tidiness: `@sqlite.org/sqlite-wasm` is a devDependency, and the import below is
 * the only thing that would pull an engine into a bundle.
 */

import { assertConnection, DataError } from '../connection.js';

let modulePromise = null;

/** Load and initialise the SQLite WASM module once per process. */
const sqlite3Module = () => {
  if (!modulePromise) {
    modulePromise = import('@sqlite.org/sqlite-wasm').then((m) => m.default());
  }
  return modulePromise;
};

const normalise = (params) => (params === undefined ? undefined : params);

/**
 * Open a database from its bytes.
 *
 * @param {Uint8Array|ArrayBuffer|null} bytes the file, or null for an empty database
 * @returns {Promise<import('../connection.js').Connection & { export: () => Promise<Uint8Array> }>}
 */
export const openMemoryDatabase = async (bytes = null) => {
  const sqlite3 = await sqlite3Module();
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

  return assertConnection(connection, 'memory connection');
};
