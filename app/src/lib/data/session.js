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
 * TWO REAL BACKENDS NOW, NOT ONE. `configConnection()` and `libraryConnection()`
 * open `backends/tauri.js` inside Tauri (a file on disk, over IPC) and
 * `backends/pwa.js` everywhere else (an in-memory SQLite database snapshotted to
 * IndexedDB — see that file's own header). A plain browser/PWA visit gets a
 * real, persistent database now, just a different one than the desktop app
 * opens — `null` is no longer "not Tauri," it's IndexedDB genuinely being
 * unavailable (Safari private browsing, some locked-down embedded browsers, a
 * test environment with no IndexedDB polyfill), which degrades the same way
 * every other missing capability in this seam does rather than throwing.
 *
 * `explorerConnection()` is the one exception, still Tauri-only: it resolves a
 * library by id through `config.db`'s `libraries` table, and `libraries` has no
 * real rows in the PWA yet (see this file's own comment on that, further down) —
 * there's nothing for it to resolve there today.
 */

import { readLibraries } from './config.js';

// Set in `app/.env` (gitignored, per-developer) as VITE_SAMPLES_DIR — see `.env.example`.
const SAMPLES_DIR = import.meta.env.VITE_SAMPLES_DIR;

/**
 * The absolute path to `config.db` on this machine — the sample shipped in
 * `samples/config.db` until the application knows its own data directory and
 * opens a real one there instead. Set `VITE_SAMPLES_DIR` in `app/.env` to point
 * this somewhere (see `.env.example`). Everything Settings reads or writes
 * (`libraries`, `engines`, `subscriptions`, `preferences`, `ui_state`) goes
 * through the one connection this path opens. Tauri only — the browser/PWA
 * build never reads this constant; see `backends/pwa.js`.
 */
export const CONFIG_DB_PATH = `${SAMPLES_DIR}/config.db`;

/**
 * The absolute path to a game database on this machine — the sample shipped in
 * `samples/master-games.db` until the Library workspace's library switcher does
 * more than change a name in the header (it is presentational only today — see
 * `stores/libraries.js`) and there is a real "currently open library" to read
 * this from instead. Also set via `VITE_SAMPLES_DIR` (see `CONFIG_DB_PATH`'s own
 * comment). This is the connection the Library workspace's Content Table and
 * the Game Workspace's own tab content both use. Tauri only; see `backends/
 * pwa.js` for the browser/PWA equivalent.
 */
export const GAMES_DB_PATH = `${SAMPLES_DIR}/master-games.db`;

/**
 * Whether this is the desktop app. Exported because `stores/settings.js` needs
 * it directly — `loadLibraries()`/`loadEngines()` stay off `configConnection()`
 * even though that connection is real in the PWA now; see their own comments.
 */
export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * The application's own default directory for Library (`.db`) files —
 * Settings → Databases → Add's "create new" path only (`stores/settings.js`'s
 * `createDatabase()`). Deliberately NOT used by `CONFIG_DB_PATH`/
 * `GAMES_DB_PATH` above, which stay pointed at the developer sample directory
 * (`VITE_SAMPLES_DIR`) — a separate, pre-existing stopgap this feature
 * doesn't touch.
 *
 * `dataDir()` + the literal product name `"Plyvio"`, not `appDataDir()`
 * (which would insert the bundle identifier, `com.plyvio.app`, into a path
 * §6.6 shows the user — General → Storage's Library location). Decided and
 * recorded in `working/tauri/PROGRESS.md`, 20 Sep 2026:
 *
 *   macOS:   ~/Library/Application Support/Plyvio/Libraries/
 *   Windows: %APPDATA%\Plyvio\Libraries\
 *   Linux:   ~/.local/share/Plyvio/Libraries/
 *
 * `@tauri-apps/api/path` is imported dynamically, the same lazy-chunk
 * pattern `appCommands.js` already uses for `@tauri-apps/api` — so a plain
 * browser/PWA load never fetches it. Tauri only; callers guard with
 * `isTauri()` first (`createDatabase()` does).
 */
export const defaultLibrariesDir = async () => {
  const { dataDir, join } = await import('@tauri-apps/api/path');
  return join(await dataDir(), 'Plyvio', 'Libraries');
};

/** `defaultLibrariesDir()` joined with a filename — the path a new Library's file is created at. */
export const defaultLibraryPath = async (filename) => {
  const { join } = await import('@tauri-apps/api/path');
  return join(await defaultLibrariesDir(), filename);
};

/**
 * `defaultLibrariesDir()`, but with the user's home directory collapsed to
 * `~` and a trailing separator — what DB‑04's Location field actually shows
 * while a database is a draft (`~/Library/Application Support/Plyvio/
 * Libraries/`, not the raw absolute path `dataDir()` resolves to). Display
 * only; `createDatabase()` uses `defaultLibrariesDir()`/`defaultLibraryPath()`
 * for the real path, never this string.
 */
export const defaultLibrariesDirDisplay = async () => {
  const { dataDir, homeDir, join } = await import('@tauri-apps/api/path');
  const [base, home] = await Promise.all([dataDir(), homeDir()]);
  const dir = await join(base, 'Plyvio', 'Libraries');
  const withSep = /[/\\]$/.test(dir) ? dir : `${dir}/`;
  const homeClean = home ? home.replace(/[/\\]+$/, '') : '';
  if (homeClean && withSep.startsWith(homeClean)) {
    return `~${withSep.slice(homeClean.length)}`;
  }
  return withSep;
};

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

/**
 * Open a PWA-backed connection, degrading to `null` if it can't — same
 * contract every caller under `data/` already handles for "outside Tauri"
 * before this migration, now covering a genuinely missing capability rather
 * than a deliberately unimplemented one. IndexedDB can be absent or refuse
 * to open (Safari private browsing disables it outright; some locked-down
 * or embedded browser contexts have no implementation at all), and a test
 * environment with no IndexedDB polyfill is exactly this same case, not a
 * special one — `pwa.js` isn't mocked away for ordinary UI tests, it's
 * reached and degrades the same way a real unsupported browser would.
 */
const openPwaConnection = async (open, label) => {
  try {
    const mod = await import('./backends/pwa.js');
    return await open(mod);
  } catch (err) {
    console.error(`Plyvio: could not open the ${label} database`, err);
    return null;
  }
};

let configConnectionPromise = null;

/**
 * The application's one connection to `config.db` (Tauri) or its PWA
 * counterpart (browser) — opened once and reused by everything under
 * `data/config.js`.
 *
 * @returns {Promise<import('./connection.js').Connection>}
 */
export const configConnection = () => {
  if (isTauri()) {
    return (configConnectionPromise ??= import('./backends/tauri.js').then((mod) =>
      mod.openFileDatabase(CONFIG_DB_PATH)
    ));
  }
  return (configConnectionPromise ??= openPwaConnection(
    (mod) => mod.openConfigDatabase(), 'config'
  ));
};

let libraryConnectionPromise = null;

/**
 * The application's one real connection to its own games (Tauri) or its PWA
 * counterpart (browser) — opened once and reused, everywhere except the
 * Explorer.
 *
 * @returns {Promise<import('./connection.js').Connection>}
 */
export const libraryConnection = () => {
  if (isTauri()) {
    return (libraryConnectionPromise ??= import('./backends/tauri.js').then((mod) =>
      mod.openFileDatabase(GAMES_DB_PATH)
    ));
  }
  return (libraryConnectionPromise ??= openPwaConnection(
    (mod) => mod.openGameDatabase(), 'games'
  ));
};

const explorerConnectionPromises = new Map();

/**
 * A connection to a specific library's database, by the `libraries.id` the
 * Explorer's own picker selects among (`explorerLibraryId`, `stores/
 * game.js`). One connection per id, opened once and reused, resolved through
 * `config.db`'s `libraries` table rather than a hand-written map.
 *
 * Still Tauri-only. `configConnection()` no longer resolves `null` in the
 * PWA, but `libraries` has no real rows there (`schema.js`'s own comment on
 * why) — every id would fail to resolve anyway, so this stays gated the same
 * way it always was rather than doing a real lookup against an always-empty
 * table.
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
