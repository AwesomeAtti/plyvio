/**
 * The real database connections the application opens today.
 *
 * Three independent connections, one per concern:
 *
 *   `configConnection()`    `config.db` itself — preferences, UI state, and the
 *                           `libraries`/`engines`/`subscriptions` rows Settings
 *                           reads and writes. One connection, opened once.
 *
 *   `libraryConnection(id)`  Whatever database backs the games currently on
 *                           screen — the Library workspace's Content Table
 *                           and the Game Workspace's own tab content both use
 *                           this one, always for the same id:
 *                           `stores/libraries.js`'s `activeLibraryId`, the
 *                           switcher's current selection. One connection per
 *                           id, opened the first time that id is asked for
 *                           and reused after that (20 Sep 2026 — wired to the
 *                           switcher; see `stores/library.js`'s
 *                           `activeLibraryConnection()`, its one caller).
 *
 *   `explorerConnection(id)` The Explorer section's own, independently-selected
 *                           library — resolved through `config.db`'s
 *                           `libraries` table by id, not tied to whatever
 *                           `libraryConnection()` is open to. Its own,
 *                           separate per-id cache, so the Explorer can have a
 *                           different library open at the same time as the
 *                           main view.
 *
 * `libraryConnection` and `explorerConnection` were named `gamesConnection`
 * and `libraryConnection` respectively until an earlier migration. The old
 * names suggested a bigger difference than exists — both open the same kind
 * of file, the same game-database schema — when the real difference is
 * *which* library each is pointed at and how many of them a caller can have
 * open at once.
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
 * Whether this is the desktop app. Exported because `stores/settings.js` needs
 * it directly — `loadLibraries()`/`loadEngines()` stay off `configConnection()`
 * even though that connection is real in the PWA now; see their own comments.
 */
export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * The application's own default directory for Library (`.db`) files —
 * Settings → Databases → Add's "create new" path only (`stores/settings.js`'s
 * `createDatabase()`). Deliberately NOT used by `CONFIG_DB_PATH` above, which
 * stays pointed at the developer sample directory (`VITE_SAMPLES_DIR`) — a
 * separate, pre-existing stopgap this feature doesn't touch.
 *
 * `documentDir()` + the literal product name `"Plyvio"` — CORRECTED 20 Sep
 * 2026, replacing the `dataDir()` (Application Support) choice recorded
 * earlier that same day in `working/tauri/PROGRESS.md`. A Library is a
 * database the user names and fills with their own games — content they
 * create and own, not data that merely supports the app running (a cache, a
 * search index, `config.db`'s preferences/UI state, which correctly stay in
 * Application Support and are untouched by this). Apple's own convention
 * draws exactly this line, and Photos.app (`~/Pictures`) and Music.app
 * (`~/Music`) are the precedent for "app-managed file, but it's fundamentally
 * the user's content": both keep their libraries out of `~/Library`, which is
 * hidden from Finder by default and not where a user expects to find, back
 * up, or move their own files. Instructed directly; not `appDataDir()`
 * either, for the same reason as before — that would insert the bundle
 * identifier, `com.plyvio.app`, into a path §6.6 shows the user.
 *
 *   macOS:   ~/Documents/Plyvio/Libraries/
 *   Windows: %USERPROFILE%\Documents\Plyvio\Libraries\
 *   Linux:   ~/Documents/Plyvio/Libraries/ (XDG_DOCUMENTS_DIR when set)
 *
 * `@tauri-apps/api/path` is imported dynamically, the same lazy-chunk
 * pattern `appCommands.js` already uses for `@tauri-apps/api` — so a plain
 * browser/PWA load never fetches it. Tauri only; callers guard with
 * `isTauri()` first (`createDatabase()` does).
 */
export const defaultLibrariesDir = async () => {
  const { documentDir, join } = await import('@tauri-apps/api/path');
  return join(await documentDir(), 'Plyvio', 'Libraries');
};

/** `defaultLibrariesDir()` joined with a filename — the path a new Library's file is created at. */
export const defaultLibraryPath = async (filename) => {
  const { join } = await import('@tauri-apps/api/path');
  return join(await defaultLibrariesDir(), filename);
};

/**
 * `defaultLibrariesDir()`, but with the user's home directory collapsed to
 * `~` and a trailing separator — what DB‑04's Location field actually shows
 * while a database is a draft (`~/Documents/Plyvio/Libraries/`, not the raw
 * absolute path `documentDir()` resolves to). Display only; `createDatabase()`
 * uses `defaultLibrariesDir()`/`defaultLibraryPath()` for the real path,
 * never this string.
 */
export const defaultLibrariesDirDisplay = async () => {
  const { documentDir, homeDir, join } = await import('@tauri-apps/api/path');
  const [base, home] = await Promise.all([documentDir(), homeDir()]);
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
 * filenames (`'sample-games.db'`) rather than absolute paths — §5.1 documents the
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

const libraryConnectionPromises = new Map();

/**
 * A connection to a specific library's game database, by the id
 * `stores/libraries.js`'s `activeLibraryId` holds — the switcher's current
 * selection. One connection per id, opened once and reused, the same
 * per-id caching `explorerConnection()` (below) already uses, kept as its
 * own separate cache because the Explorer can have a different library open
 * at the same time as this one.
 *
 * This is the connection the Library workspace's Content Table and the Game
 * Workspace's own tab content both use. Resolving WHICH id to ask for, and
 * whether the currently active row even has a real database behind it (a
 * still-mock/seeded row does not — `stores/library.js`'s
 * `activeLibraryConnection()` is where that's decided), is the caller's
 * job, not this function's — it just opens whatever id it's given.
 *
 * @returns {Promise<import('./connection.js').Connection|null>} `null` for
 *   a nullish id, an id no library in `config.db` has (Tauri), or when the
 *   underlying config/PWA connection itself is unavailable.
 */
export const libraryConnection = (libraryId) => {
  if (libraryId == null) return Promise.resolve(null);
  if (!libraryConnectionPromises.has(libraryId)) {
    libraryConnectionPromises.set(libraryId, (async () => {
      if (isTauri()) {
        const config = await configConnection();
        if (!config) return null;
        const libs = await readLibraries(config);
        const library = libs.find((l) => l.id === libraryId);
        if (!library) return null;
        const mod = await import('./backends/tauri.js');
        return mod.openFileDatabase(resolveGameDbPath(library.path));
      }
      return openPwaConnection(
        (mod) => mod.openLibraryDatabase(libraryId), `library-${libraryId}`
      );
    })());
  }
  return libraryConnectionPromises.get(libraryId);
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
