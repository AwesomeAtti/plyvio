/**
 * The browser/PWA backend — the interim storage route, until the library size makes
 * a page-level route (OPFS or an IndexedDB VFS) necessary. Deliberately not that:
 * no OPFS, no third-party VFS, no page-level access. The whole database is
 * deserialized into memory on open (`sqlite-engine.js`, shared with `memory.js`) and
 * re-exported as one serialized blob to one IndexedDB record on save
 * (`idb-blob-store.js`). The blob is the unit of work — there is no partial read or
 * partial write.
 *
 * Two databases, two IndexedDB records: `openGameDatabase()` opens the browser's one
 * game database (parallel to a desktop Library's `.db` file), seeded on first open
 * from the same curated sample games the app has always shipped for demonstration
 * (`mock-data/sample-games.js`) so a first-time PWA visit isn't a blank Library.
 * `openConfigDatabase()` opens the browser's `config.db` counterpart — fresh tables,
 * no seed rows; there's no mock preferences/subscriptions data to carry over.
 *
 * Saving is debounced rather than run on every write: a write marks the connection
 * dirty and schedules a flush a couple of seconds out, coalescing a burst of writes
 * (e.g. applying several tags) into one export+IndexedDB put. `visibilitychange`,
 * `pagehide` and `beforeunload` force an immediate flush, so a closed or backgrounded
 * tab doesn't lose a debounce window's worth of edits.
 */

import { sqlite3Module, openDb, connectionFor } from './sqlite-engine.js';
import { GAME_DB_DDL, CONFIG_DB_DDL, SCHEMA_USER_VERSION } from './schema.js';
import { readBlob, writeBlob } from './idb-blob-store.js';
import { GAMES } from '../../mock-data/sample-games.js';

/** How long a write waits, quiet, before it's flushed to IndexedDB. */
const SAVE_DEBOUNCE_MS = 2000;

/**
 * Every seeded row's columns, in `games` column order — matches the fields every
 * entry in `mock-data/sample-games.js` actually carries (see that file's own
 * header). `created_at` isn't one of them; the seed sets it to the moment the
 * database was created, the same as a real import would (§2.3's own definition:
 * "when this game row was added to this particular game database").
 */
const SEED_COLUMNS = [
  'id', 'pgn', 'event', 'site', 'date', 'round', 'white', 'black', 'result',
  'white_elo', 'black_elo', 'eco', 'ply_count', 'movetext', 'created_at'
];

const seedGames = (db, now) => {
  const insertSql =
    `insert into games (${SEED_COLUMNS.join(', ')}) values ` +
    `(${SEED_COLUMNS.map(() => '?').join(', ')})`;
  for (const g of GAMES) {
    const row = { ...g, created_at: now };
    db.exec({ sql: insertSql, bind: SEED_COLUMNS.map((c) => row[c] ?? null) });
  }
};

/**
 * Wrap a `Connection` so every `run()` marks it dirty and schedules a debounced
 * save; `flush()` cancels the timer and saves immediately if dirty. The rest of
 * the `Connection` shape passes through unchanged.
 */
const withAutosave = (connection, key) => {
  let dirty = false;
  let timer = null;

  const saveNow = async () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!dirty) return;
    dirty = false;
    const bytes = await connection.export();
    await writeBlob(key, bytes);
  };

  const scheduleSave = () => {
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { saveNow().catch((err) => console.error(`Plyvio: failed to save ${key}`, err)); }, SAVE_DEBOUNCE_MS);
  };

  if (typeof document !== 'undefined') {
    const flush = () => { saveNow().catch((err) => console.error(`Plyvio: failed to flush ${key}`, err)); };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
  }

  return {
    ...connection,
    run: async (sql, params) => {
      await connection.run(sql, params);
      scheduleSave();
    },
    close: async () => {
      await saveNow();
      await connection.close();
    }
  };
};

/**
 * Open a PWA-backed database: deserialize the stored blob if there is one,
 * otherwise create a fresh database, run `ddl`, optionally seed it, and persist
 * that starting state immediately so a reload before any edit reseeds nothing.
 *
 * @param {string} key `'games'` or `'config'` — the IndexedDB record this database lives in
 * @param {string} ddl the DDL to run on a fresh database
 * @param {((db: object, now: string) => void)|null} seed run against a fresh database, before it's persisted
 */
const openPwaDatabase = async (key, ddl, seed) => {
  const [bytes, sqlite3] = await Promise.all([readBlob(key), sqlite3Module()]);
  const isFresh = bytes === null;
  const db = openDb(sqlite3, bytes);

  if (isFresh) {
    db.exec({ sql: ddl });
    db.exec({ sql: `pragma user_version = ${SCHEMA_USER_VERSION}` });
    if (seed) seed(db, new Date().toISOString());
  }

  const connection = connectionFor(db, sqlite3, `${key} pwa connection`);

  if (isFresh) {
    await writeBlob(key, await connection.export());
  }

  return withAutosave(connection, key);
};

/** The browser's one game database — see this file's own header for the seeding rule. */
export const openGameDatabase = () => openPwaDatabase('games', GAME_DB_DDL, seedGames);

/** The browser's `config.db` counterpart — no seed rows. */
export const openConfigDatabase = () => openPwaDatabase('config', CONFIG_DB_DDL, null);

/**
 * A Library's game database, by id, its own IndexedDB record keyed
 * `library-<id>` so it can never collide with `'config'` or with
 * `openGameDatabase()`'s own fixed `'games'` key.
 *
 * Two callers, two different needs:
 *
 *  - Settings → Databases → Add's "create new" path (`stores/settings.js`'s
 *    `createDatabase()`, `working/wireframes/settings-databases-add.html`)
 *    calls this with no options — empty, not seeded, matching the desktop
 *    path (`backends/tauri.js` + `GAME_DB_DDL`, no seed). A user-created
 *    Library starts genuinely empty.
 *  - `stores/settings.js`'s one-time PWA bootstrap (`loadLibraries()`,
 *    the interim stand-in for the still-simulated Settings → Databases →
 *    Available "install" flow — see `ACTIONS.md`) calls this with
 *    `{ seed: true }` exactly once, for the real "Sample Games" `libraries`
 *    row it registers on first launch, so that row's own IndexedDB record
 *    starts with `sample-games.js`'s 40 games already in it rather than
 *    empty. Reuses the same private `seedGames()` `openGameDatabase()`
 *    already defines below, rather than a second seeding routine.
 *
 * @param {string|number} id the Library's id.
 * @param {{ seed?: boolean }} [options] `seed: true` runs `seedGames()`
 *   against a freshly created database; the default (`false`) leaves it
 *   empty.
 */
export const openLibraryDatabase = (id, { seed = false } = {}) =>
  openPwaDatabase(`library-${id}`, GAME_DB_DDL, seed ? seedGames : null);
