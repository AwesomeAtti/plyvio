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
 *                           main view. Backend-aware, same as
 *                           `libraryConnection()` (22 Sep 2026) — no longer
 *                           Tauri-only; see `openLibraryById()` below, the
 *                           body the two share.
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
 * `backends/pwa.js` everywhere else (SQLite files in the browser's origin-
 * private file system, OPFS, reached through a storage worker — see that
 * file's own header). A plain browser/PWA visit gets a real, persistent
 * database, just a different one than the desktop app opens — `null` is no
 * longer "not Tauri," it's storage genuinely being unavailable (no OPFS, as in
 * Safari private browsing; another tab of the app already holding it; a test
 * environment with no Worker), which degrades the same way every other
 * missing capability in this seam does rather than throwing.
 *
 * `explorerConnection()` used to be the one exception, Tauri-only, because
 * `libraries` had no real PWA rows to resolve. As of 22 Sep 2026 it shares
 * `libraryConnection()`'s own backend-aware lookup (`openLibraryById()`,
 * further down) — see that function's own comment for what changed.
 */

import { readLibraries, readUiState, writeUiState } from './config.js';

// Set in `app/.env` (gitignored, per-developer) as VITE_SAMPLES_DIR — see `.env.example`.
//
// DEVELOPMENT ONLY. Vite copies every `import.meta.env.VITE_*` value into the
// built JavaScript as a literal, so a value that's gitignored in source still
// ships in a production build. This one is a path on the developer's machine,
// and it did ship (the v0.1.1 deploy, 22 Sep 2026). `import.meta.env.DEV` is
// `false` in a production build, so this becomes `undefined` there and the
// minifier drops the path entirely. `scripts/assemble-site.mjs` also refuses
// to finish a build that contains the builder's home directory.
const SAMPLES_DIR = import.meta.env.DEV ? import.meta.env.VITE_SAMPLES_DIR : undefined;

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

let backendChoice = null;

/**
 * The sole place `isTauri()` is evaluated to choose which adapter backs a
 * connection (ADR 0004, 22 Sep 2026) — `'tauri'` or `'pwa'`. Memoized: the
 * running environment doesn't change mid-session, so this is computed once.
 * `configConnection()`, `libraryConnection()`, `explorerConnection()` below,
 * and `stores/settings.js`'s `createDatabase()`/`loadLibraries()`/
 * `loadEngines()` all read this instead of calling `isTauri()` a second,
 * independent time. `isTauri()` itself stays exported and in direct use
 * elsewhere (`appCommands.js`, display-only branches) for checks that aren't
 * about connection acquisition — this doesn't replace it, it consolidates
 * the one decision that was being made four separate times.
 *
 * @returns {'tauri'|'pwa'}
 */
export const getBackend = () => (backendChoice ??= isTauri() ? 'tauri' : 'pwa');

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
 * Where a downloaded engine's files live on desktop — engine Stage 2
 * (26 Sep 2026, `engine-stage2-plan.md`). Unlike `defaultLibrariesDir()`,
 * this deliberately IS `appDataDir()`: an engine binary is app-managed
 * capability data, never shown to or chosen by the user the way a Library's
 * path is (§6.6), so the bundle identifier landing in the path here is not
 * the problem it would be there. Matches `tauri.conf.json`'s asset-protocol
 * scope, `$APPDATA/engines/**` — the two must stay in step by hand, same as
 * `schema.js`'s DDL and its Python mirror.
 *
 * `@tauri-apps/api/path` is imported dynamically, the same lazy-chunk
 * pattern this file's other Tauri-only helpers already use. Tauri only;
 * callers guard with `isTauri()`/`getBackend()` first (`engine/storage.js` does).
 */
export const defaultEnginesDir = async () => {
  const { appDataDir, join } = await import('@tauri-apps/api/path');
  return join(await appDataDir(), 'engines');
};

/** `defaultEnginesDir()` joined with an engine's own id — its own subfolder. */
export const engineDir = async (id) => {
  const { join } = await import('@tauri-apps/api/path');
  return join(await defaultEnginesDir(), String(id));
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
 * than a deliberately unimplemented one. Storage can be unavailable (no
 * OPFS, as in Safari private browsing; another tab or window of the app
 * holding the storage lock), and a test environment with no Worker is
 * exactly this same case, not a special one — `pwa.js` isn't mocked away for
 * ordinary UI tests, it's reached and degrades the same way a real
 * unsupported browser would.
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
  if (getBackend() === 'tauri') {
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
 * Open a library's game database by id, backend-aware — the body
 * `libraryConnection()` and `explorerConnection()` below share. Tauri:
 * resolve the id through `config.db`'s `libraries` table, then open the
 * file at its (possibly relative) `game_db_path` — an id `config.db` has
 * no row for resolves `null`. PWA: open the library's own file directly by
 * id, via `backends/pwa.js`'s `openLibraryDatabase()` — which does NOT
 * check `config.db` first, so an id nothing has registered still opens
 * (creating, on first touch, an empty `/library-<id>.db`) rather than
 * resolving `null`. This asymmetry is pre-existing, not
 * introduced by extracting this helper: every caller today only ever
 * passes an id it already read out of `objects.databases`/`config.db`'s
 * own real rows, so the PWA branch's laxness has no live caller that
 * depends on it, but it is worth knowing before adding one that does.
 *
 * Not cached here — each caller keeps its own per-id cache (see this file's
 * header for why `libraryConnection` and `explorerConnection` are two
 * caches rather than one), so this only ever runs the open itself.
 *
 * @returns {Promise<import('./connection.js').Connection|null>} `null` for
 *   an id no library in `config.db` has (Tauri only), or when the
 *   underlying config/PWA connection itself is unavailable.
 */
const openLibraryById = async (libraryId, label) => {
  if (getBackend() === 'tauri') {
    const config = await configConnection();
    if (!config) return null;
    const libs = await readLibraries(config);
    const library = libs.find((l) => l.id === libraryId);
    if (!library) return null;
    const mod = await import('./backends/tauri.js');
    return mod.openFileDatabase(resolveGameDbPath(library.path));
  }
  return openPwaConnection((mod) => mod.openLibraryDatabase(libraryId), label);
};

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
    libraryConnectionPromises.set(libraryId, openLibraryById(libraryId, `library-${libraryId}`));
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
 * Backend-aware (22 Sep 2026) — no longer Tauri-only. It used to stop at
 * `if (!isTauri()) return null` on the reasoning that the PWA's `libraries`
 * table had no real rows to resolve anyway; that stopped being true once
 * `loadLibraries()`'s PWA merge and the Sample Games bootstrap (both closed
 * 22 Sep) gave the PWA real registrations. Shares `openLibraryById()` with
 * `libraryConnection()` above — same lookup, kept in this function's own
 * cache so the Explorer can have a different library open than the main
 * view at the same time (this file's own header explains why there are two
 * caches rather than one).
 *
 * @returns {Promise<import('./connection.js').Connection|null>} `null` for
 *   an id no library in `config.db` has, or when the underlying config/PWA
 *   connection itself is unavailable.
 */
export const explorerConnection = (libraryId) => {
  if (!explorerConnectionPromises.has(libraryId)) {
    explorerConnectionPromises.set(libraryId, openLibraryById(libraryId, `explorer-${libraryId}`));
  }
  return explorerConnectionPromises.get(libraryId);
};

/**
 * The names of the entries directly inside the application's default
 * Libraries directory — DB‑05's "actual directory listing on disk"
 * filename-collision check (`stores/settings.js`'s `createDatabase()`).
 * Tauri only; `[]` on PWA (there is no such directory) and on any listing
 * failure (most commonly the directory not existing yet), matching this
 * call's previous inline try/catch-and-degrade behavior before ADR 0004.
 *
 * @returns {Promise<string[]>}
 */
export const librariesDirectoryEntries = async () => {
  if (getBackend() !== 'tauri') return [];
  try {
    const { listDirectoryNames } = await import('./backends/tauri.js');
    return await listDirectoryNames(await defaultLibrariesDir());
  } catch (err) {
    console.error('Plyvio: failed to list the Libraries directory', err);
    return [];
  }
};

const PERSIST_REQUESTED_KEY = 'pwaPersistRequested';
let persistRequest = null;

/**
 * Ask the browser to keep this origin's storage rather than evict it under
 * disk pressure (`navigator.storage.persist()`). PWA only; on the desktop app
 * this does nothing.
 *
 * Called after a write the USER started has succeeded (saving the Edit
 * dialog, a favourite, creating a database, a real import), never at
 * startup. Chrome, Edge and Safari decide silently, but Firefox shows its own
 * permission prompt, and a prompt should follow something the user just did.
 *
 * Once per browser: skipped when storage is already persisted, and the attempt
 * is recorded in `config.db`'s `ui_state` so later sessions don't ask again,
 * whatever the answer was. Plyvio shows nothing and doesn't act on the result.
 * Never rejects; a failure is logged.
 *
 * @returns {Promise<void>}
 */
export const requestPersistentStorage = () => (persistRequest ??= (async () => {
  if (getBackend() !== 'pwa') return;
  const storage = globalThis.navigator?.storage;
  if (typeof storage?.persist !== 'function' || typeof storage?.persisted !== 'function') return;
  try {
    const config = await configConnection();
    if (!config) return;
    const { [PERSIST_REQUESTED_KEY]: requested } = await readUiState(config);
    if (requested) return;
    if (!(await storage.persisted())) await storage.persist();
    await writeUiState(config, PERSIST_REQUESTED_KEY, true);
  } catch (err) {
    console.error('Plyvio: could not request persistent storage', err);
  }
})());

/**
 * What a PWA Library's `libraries.game_db_path` holds. Only a marker: the
 * column is `NOT NULL`, and a PWA library is found by id, never by this value.
 * Nothing reads it back.
 */
export const PWA_LIBRARY_PATH = 'opfs';

/**
 * Open the physical database for a brand-new Library that isn't registered
 * in `config.db` yet — `createDatabase()`'s (`stores/settings.js`) own
 * connection-acquisition step, consolidated here per ADR 0004 so that file
 * is no longer the one place besides this one that imports `backends/
 * tauri.js`/`backends/pwa.js` directly.
 *
 * The two backends need opposite information because they identify a "new"
 * database differently. Tauri: a file's path doesn't depend on any id, so
 * `filename` is enough — the directory is created first if missing, DDL is
 * left to the caller (matching `openFileDatabase()`'s own contract), and
 * `path` in the return value is the real filesystem path to store in
 * `libraries.game_db_path`. PWA: `backends/pwa.js`'s `openLibraryDatabase()`
 * runs its own DDL as part of opening, but it opens by `id` — the id names
 * the file (`/library-<id>.db`), so it must already be known, which is why
 * `createDatabase()` registers the new row in `config.db` first to get a real
 * id before calling this. `path` in that case is `PWA_LIBRARY_PATH`, a
 * sentinel — `game_db_path` is
 * `NOT NULL` with no uniqueness constraint (`database-schema.md` §5.1), and
 * nothing reads a PWA library's `game_db_path` back for connection lookup;
 * `libraryConnection()`'s PWA branch already opens by id directly.
 *
 * `seed` (PWA only) fills the new file with the Sample Games seed —
 * `stores/settings.js`'s one-time bootstrap, `ensureSampleGamesLibrary()`.
 *
 * @param {{ id?: string|number, filename?: string, seed?: boolean }} args
 *   `filename` is used only on Tauri; `id` and `seed` only on PWA.
 * @returns {Promise<{ connection: import('./connection.js').Connection, path: string }>}
 */
export const openNewLibraryConnection = async ({ id, filename, seed = false }) => {
  if (getBackend() === 'tauri') {
    const { openFileDatabase, ensureDirectory } = await import('./backends/tauri.js');
    const dir = await defaultLibrariesDir();
    await ensureDirectory(dir);
    const path = await defaultLibraryPath(filename);
    return { connection: await openFileDatabase(path), path };
  }
  const { openLibraryDatabase } = await import('./backends/pwa.js');
  return { connection: await openLibraryDatabase(id, { seed }), path: PWA_LIBRARY_PATH };
};
