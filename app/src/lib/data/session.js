/**
 * The one real database connection the application opens today.
 *
 * STOPGAP, and this file exists mainly to say so in one place. Nothing yet
 * reads a library's `game_db_path` out of `config.db` — Libraries,
 * subscriptions and engines are a later phase, not this one — so there is
 * exactly one file this can point at until library switching is real:
 * `GAMES_DB_PATH` below, which has to be edited per checkout because a
 * repo-relative sample path is not something `tauri-plugin-sql` has been
 * proven to resolve from a running app (only an absolute path has been
 * tested — see the manual verification this was built against). Replacing
 * this file's job with a real per-library path is Phase 2's, not this one.
 *
 * Mirrors `stores/appCommands.js`'s isTauri()/dynamic-import split: a plain
 * browser/PWA visit or a test never imports `backends/tauri.js` and never
 * fetches `@tauri-apps/plugin-sql` — `gamesConnection()` resolves `null`
 * instead, and callers decide what "no database yet" means for them.
 */

/**
 * EDIT THIS. The absolute path to a game database on this machine — the
 * sample shipped in `samples/master-games.db` until a real library path
 * exists to use instead.
 */
export const GAMES_DB_PATH =
  '/path/to/plyvio/samples/master-games.db';

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

let connectionPromise = null;

/**
 * The application's one real connection, opened once and reused.
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
