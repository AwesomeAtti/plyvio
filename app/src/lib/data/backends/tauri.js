/**
 * A connection to a database file on disk, opened through Tauri.
 *
 * This is the backend the application uses when it runs as the desktop app —
 * the counterpart to `memory.js`, which the tests use. Nothing above the seam
 * (`connection.js`, `config.js`, `games.js`, `identify.js`) changes for this to
 * exist: they already speak the `Connection` contract, and this file is the one
 * new thing `connection.js`'s own header comment says the move to Tauri would
 * need.
 *
 * It is built on `@tauri-apps/plugin-sql` rather than a bespoke Rust command per
 * query, on purpose: the plugin's `select`/`execute` take a SQL string and bound
 * parameters over IPC and let sqlx do the driving on the Rust side, so the SQL
 * stays exactly where `connection.js` says it belongs — in `config.js` and
 * `games.js` — and this file stays a thin shape-adapter, not a second place that
 * knows queries.
 *
 * `@tauri-apps/plugin-sql` and the matching Rust crate (`tauri-plugin-sql`,
 * `sql:default` in `capabilities/default.json`) are both new as of this change
 * and have not been built or run yet — the sandbox this was written in has no
 * Rust toolchain. `npm run tauri dev` (or `cargo check` from `src-tauri/`) is
 * the first real compile, and is the thing to run before trusting this file.
 */

import Database from '@tauri-apps/plugin-sql';
import { assertConnection, DataError } from '../connection.js';

/**
 * `Database.load()` takes a connection string, not a bare path. sqlx's SQLite
 * driver accepts an absolute filesystem path after the `sqlite:` scheme, which
 * is what every caller of this module has — a `libraries.game_db_path` value or
 * `config.db`'s own location — never a name meant to resolve against the app's
 * data directory the way a relative `"sqlite:app.db"` would.
 */
const connectionStringFor = (path) => `sqlite:${path}`;

/**
 * Open a database file by its path.
 *
 * @param {string} path absolute path to a `.db` file — a library's
 *   `game_db_path` (§5.1) or the application's `config.db`.
 * @returns {Promise<import('../connection.js').Connection>}
 */
export const openFileDatabase = async (path) => {
  if (!path) throw new DataError('openFileDatabase requires a path');

  let db;
  try {
    db = await Database.load(connectionStringFor(path));
  } catch (cause) {
    // Whatever the plugin/sqlx reports — file missing, locked, not a database —
    // arrives as a plain Error from IPC. Wrapping it keeps `DataError` the one
    // thing callers above this seam need to recognise, per `connection.js`.
    throw new DataError(`could not open ${path}: ${cause?.message ?? cause}`);
  }

  const all = async (sql, params) => db.select(sql, params ?? []);

  const connection = {
    all,
    get: async (sql, params) => (await all(sql, params))[0] ?? null,
    value: async (sql, params) => {
      const rows = await all(sql, params);
      if (!rows.length) return null;
      const first = Object.values(rows[0]);
      return first.length ? first[0] : null;
    },
    run: async (sql, params) => {
      await db.execute(sql, params ?? []);
    },
    close: async () => {
      await db.close();
    }
  };

  return assertConnection(connection, 'tauri connection');
};

/**
 * Create a directory (and any missing parents) on disk, via a small custom
 * Rust command — `ensure_dir_exists` in `src-tauri/src/lib.rs`.
 *
 * `@tauri-apps/plugin-sql` has no filesystem access of its own: opening a
 * `.db` file whose directory doesn't exist yet still fails (sqlite creates
 * the *file*, never a missing parent directory), and there is no `fs` plugin
 * in this project (`working/tauri/PROGRESS.md`, 20 Sep — no new dependency
 * for this). Rather than add one, this is `std::fs::create_dir_all` behind
 * one command, used only by `stores/settings.js`'s `createDatabase()` before
 * the first `openFileDatabase()` call for a brand-new Library, in the
 * application's default Libraries directory (`session.js`'s
 * `defaultLibrariesDir()`), which may not exist yet on a fresh install.
 *
 * @param {string} path absolute directory path
 */
export const ensureDirectory = async (path) => {
  if (!path) throw new DataError('ensureDirectory requires a path');
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('ensure_dir_exists', { path });
  } catch (cause) {
    throw new DataError(`could not create directory ${path}: ${cause?.message ?? cause}`);
  }
};

/**
 * The names of the entries directly inside a directory — DB‑05's Filename
 * collision check against "the actual directory listing on disk", not just
 * `config.db`'s `libraries` rows (a stray or manually-copied `.db` file with
 * no Library row would otherwise go unnoticed). Same `ensure_dir_exists`
 * reasoning: no `fs` plugin, so this is a second small custom command
 * (`list_dir_entries`, `std::fs::read_dir`) rather than a new dependency.
 * Missing directory (a fresh install, before the first database is ever
 * created) is not an error here — it has no entries, same as an empty one.
 *
 * @param {string} path absolute directory path
 * @returns {Promise<string[]>} entry names, not full paths
 */
export const listDirectoryNames = async (path) => {
  if (!path) throw new DataError('listDirectoryNames requires a path');
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('list_dir_entries', { path });
  } catch (cause) {
    throw new DataError(`could not list ${path}: ${cause?.message ?? cause}`);
  }
};
