/**
 * The real database connections the application opens today.
 *
 * STOPGAP, and this file exists mainly to say so in one place. Nothing yet
 * reads a library's `game_db_path` out of `config.db` — Libraries,
 * subscriptions and engines are a later phase, not this one — so the paths
 * below are edited by hand until `libraries` is real and this reads from
 * there instead.
 *
 * Mirrors `stores/appCommands.js`'s isTauri()/dynamic-import split: a plain
 * browser/PWA visit or a test never imports `backends/tauri.js` and never
 * fetches `@tauri-apps/plugin-sql` — every export below resolves `null`
 * instead, and callers decide what "no database yet" means for them.
 */

const SAMPLES_DIR = '/path/to/plyvio/samples';

/**
 * EDIT THIS. The absolute path to a game database on this machine — the
 * sample shipped in `samples/master-games.db` until a real library path
 * exists to use instead. This is the connection the Game Workspace itself
 * uses (a tab's own game, the Library Content Table, favorites/tags/…).
 */
export const GAMES_DB_PATH = `${SAMPLES_DIR}/master-games.db`;

/**
 * EDIT THIS TOO, alongside `GAMES_DB_PATH`, until `libraries` is real.
 *
 * The Explorer Section's library picker (`explorerLibraryId`, `stores/
 * game.js`) predates this migration and offers ids from `objects.databases`
 * (`stores/settings.js`) — mock Settings rows with no file behind them.
 * This is the minimal way to make the picker's two "indexed" rows real
 * without pulling in `libraries`/`config.db`: an id → path map, by hand,
 * covering only `db-1` and `db-2`. Every other row in that mock list (an
 * unconfigured slot, an Available-for-download catalogue entry) has no file
 * to point at and is deliberately left out — `libraryConnection` resolves
 * `null` for anything not listed here, and a caller treats that the same
 * way it treats "outside Tauri": no connection, no stats.
 */
const LIBRARY_DB_PATHS = {
  'db-1': GAMES_DB_PATH,
  'db-2': `${SAMPLES_DIR}/my-games.db`
};

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

let connectionPromise = null;

/**
 * The application's one real connection to its own game — opened once and
 * reused, everywhere except the Explorer.
 *
 * @returns {Promise<import('./connection.js').Connection|null>} `null`
 *   outside Tauri — a browser/PWA visit or a test — where there is nothing
 *   to open.
 */
export const gamesConnection = () => {
  if (!isTauri()) return Promise.resolve(null);
  return (connectionPromise ??= import('./backends/tauri.js').then((mod) =>
    mod.openFileDatabase(GAMES_DB_PATH)
  ));
};

const libraryConnectionPromises = new Map();

/**
 * A connection to a specific library's database, by the id `objects.
 * databases` (`stores/settings.js`) uses — what the Explorer's library
 * picker selects among. One connection per id, opened once and reused, the
 * same shape as `gamesConnection` above but keyed rather than singular.
 *
 * @returns {Promise<import('./connection.js').Connection|null>} `null`
 *   outside Tauri, or for an id `LIBRARY_DB_PATHS` has no path for.
 */
export const libraryConnection = (libraryId) => {
  if (!isTauri()) return Promise.resolve(null);
  const path = LIBRARY_DB_PATHS[libraryId];
  if (!path) return Promise.resolve(null);
  if (!libraryConnectionPromises.has(libraryId)) {
    libraryConnectionPromises.set(
      libraryId,
      import('./backends/tauri.js').then((mod) => mod.openFileDatabase(path))
    );
  }
  return libraryConnectionPromises.get(libraryId);
};
