/**
 * The real database connections the application opens today.
 *
 * Three independent connections, one per concern:
 *
 *   `configConnection()`    `config.db` itself — preferences, UI state, and the
 *                           `libraries`/`engines`/`subscriptions` rows Settings
 *                           reads and writes. One connection, opened once.
 *
 *   `libraryConnection()`   Whatever database backs the games currently on
 *                           screen — the Library workspace's Content Table
 *                           and the Game Workspace's own tab content both use
 *                           this one. One connection, opened once.
 *
 *   `explorerConnection(id)` The Explorer section's own, independently-selected
 *                           library — resolved through `config.db`'s
 *                           `libraries` table by id, not tied to whatever
 *                           `libraryConnection()` is open to. One connection
 *                           per id, opened the first time that id is asked
 *                           for and reused after that.
 *
 * `libraryConnection` and `explorerConnection` were named `gamesConnection`
 * and `libraryConnection` respectively until this migration. The old names
 * suggested a bigger difference than exists — both open the same kind of
 * file, the same game-database schema — when the real difference is *which*
 * library each is pointed at and how many of them a caller can have open at
 * once.
 *
 * Mirrors `stores/appCommands.js`'s isTauri()/dynamic-import split: a plain
 * browser/PWA visit or a test never imports `backends/tauri.js` and never
 * fetches `@tauri-apps/plugin-sql` — every export below resolves `null`
 * instead, and callers decide what "no database yet" means for them.
 */

import { readLibraries } from './config.js';

const SAMPLES_DIR = '/path/to/plyvio/samples';

/**
 * EDIT THIS. The absolute path to `config.db` on this machine — the sample
 * shipped in `samples/config.db` until the application knows its own data
 * directory and opens a real one there instead. Everything Settings reads or
 * writes (`libraries`, `engines`, `subscriptions`, `preferences`, `ui_state`)
 * goes through the one connection this path opens.
 */
export const CONFIG_DB_PATH = `${SAMPLES_DIR}/config.db`;

/**
 * EDIT THIS TOO. The absolute path to a game database on this machine — the
 * sample shipped in `samples/master-games.db` until the Library workspace's
 * library switcher does more than change a name in the header (it is
 * presentational only today — see `stores/libraries.js`) and there is a real
 * "currently open library" to read this from instead. This is the connection
 * the Library workspace's Content Table and the Game Workspace's own tab
 * content both use.
 */
export const GAMES_DB_PATH = `${SAMPLES_DIR}/master-games.db`;

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * `samples/config.db`'s own `libraries.game_db_path` values are bare
 * filenames (`'my-games.db'`) rather than absolute paths — §5.1 documents the
 * column as "the filesystem path to the game database" but says nothing
 * about relative paths, and the sample data doesn't follow its own engines
 * table's convention (`binary_path` is absolute there). Until that's settled
 * one way or the other, a path that isn't already absolute is resolved
 * against `SAMPLES_DIR`, the same place every other stopgap path in this
 * file points.
 */
const resolveGameDbPath = (path) => (path.startsWith('/') ? path : `${SAMPLES_DIR}/${path}`);

let configConnectionPromise = null;

/**
 * The application's one connection to `config.db` — opened once and reused
 * by everything under `data/config.js`.
 *
 * @returns {Promise<import('./connection.js').Connection|null>} `null`
 *   outside Tauri — a browser/PWA visit or a test — where there is nothing
 *   to open.
 */
export const configConnection = () => {
  if (!isTauri()) return Promise.resolve(null);
  return (configConnectionPromise ??= import('./backends/tauri.js').then((mod) =>
    mod.openFileDatabase(CONFIG_DB_PATH)
  ));
};

let libraryConnectionPromise = null;

/**
 * The application's one real connection to its own games — opened once and
 * reused, everywhere except the Explorer.
 *
 * @returns {Promise<import('./connection.js').Connection|null>} `null`
 *   outside Tauri — a browser/PWA visit or a test — where there is nothing
 *   to open.
 */
export const libraryConnection = () => {
  if (!isTauri()) return Promise.resolve(null);
  return (libraryConnectionPromise ??= import('./backends/tauri.js').then((mod) =>
    mod.openFileDatabase(GAMES_DB_PATH)
  ));
};

const explorerConnectionPromises = new Map();

/**
 * A connection to a specific library's database, by the `libraries.id` the
 * Explorer's own picker selects among (`explorerLibraryId`, `stores/
 * game.js`). One connection per id, opened once and reused, resolved through
 * `config.db`'s `libraries` table rather than a hand-written map.
 *
 * Until whatever calls this passes a real `libraries.id` (an integer) rather
 * than a mock Settings row id (`'db-1'`, `'db-2'`), no id will resolve and
 * this returns `null` for all of them — the same "no connection" a caller
 * already has to handle for "outside Tauri". That catches up once the
 * Libraries migration replaces `objects.databases` with real rows.
 *
 * @returns {Promise<import('./connection.js').Connection|null>} `null`
 *   outside Tauri, for an id no library in `config.db` has, or when
 *   `config.db` itself has no connection.
 */
export const explorerConnection = (libraryId) => {
  if (!isTauri()) return Promise.resolve(null);
  if (!explorerConnectionPromises.has(libraryId)) {
    explorerConnectionPromises.set(
      libraryId,
      (async () => {
        const config = await configConnection();
        if (!config) return null;
        const libraries = await readLibraries(config);
        const library = libraries.find((l) => l.id === libraryId);
        if (!library) return null;
        const mod = await import('./backends/tauri.js');
        return mod.openFileDatabase(resolveGameDbPath(library.path));
      })()
    );
  }
  return explorerConnectionPromises.get(libraryId);
};
