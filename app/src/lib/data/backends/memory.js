/**
 * A connection to a database held in memory, opened from its bytes, in this
 * process.
 *
 * This is the backend the tests use, and the simplest of the three: the desktop
 * app opens `backends/tauri.js`, the browser/PWA build opens `backends/pwa.js`
 * (an IndexedDB snapshot around the same engine this file uses), and this one
 * opens bytes already in memory with nothing behind them. It proves the schema
 * and the queries against the real files in `samples/`, which is what a schema
 * needs proving against.
 *
 * It is imported by tests and tooling, never by the application. That is not
 * tidiness: `@sqlite.org/sqlite-wasm` is a genuine runtime dependency now that
 * `backends/pwa.js` ships it to the browser, but this particular file — opening
 * a whole database from bytes handed to it, with no persistence of its own — is
 * still a test fixture, not something the app has a use for.
 *
 * The actual WASM loading, deserialising and `Connection` wrapping live in
 * `sqlite-engine.js`, shared with `pwa.js` so neither backend duplicates it.
 */

import { sqlite3Module, openDb, connectionFor } from './sqlite-engine.js';

/**
 * Open a database from its bytes.
 *
 * @param {Uint8Array|ArrayBuffer|null} bytes the file, or null for an empty database
 * @returns {Promise<import('../connection.js').Connection & { export: () => Promise<Uint8Array> }>}
 */
export const openMemoryDatabase = async (bytes = null) => {
  const sqlite3 = await sqlite3Module();
  const db = openDb(sqlite3, bytes);
  return connectionFor(db, sqlite3, 'memory connection');
};
