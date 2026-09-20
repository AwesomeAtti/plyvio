import { writable, derived, get } from 'svelte/store';
import { SECTIONS, DEFAULT_SECTION, isSection, OBJECT_TYPES } from '$lib/settings/schema.js';
import { AVAILABLE_DATABASES, validateDraftDatabase, basename } from '$lib/settings/databases.js';
import { AVAILABLE_ENGINES, DEFAULT_THREADS, DEFAULT_HASH } from '$lib/settings/engines.js';
import {
  configConnection, explorerConnection, isTauri, defaultLibrariesDir, defaultLibraryPath
} from '$lib/data/session.js';
import {
  readPreferences, writePreference, PREFERENCE_KEYS,
  readLibraries, writeLibraryName, writeLibraryEnabled, createLibrary,
  readEngines, writeEngineName, writeEngineOption, writeEngineEnabled,
  readSubscriptions
} from '$lib/data/config.js';
import { countNewGamesForSubscription } from '$lib/data/games.js';
import { locale } from '$lib/stores/i18n.js';

/** A brand-new database's `libraries.version` — see `createDatabase()`'s own comment. */
const NEW_DATABASE_VERSION = '1.0';

/**
 * Settings Workspace state. §3.4
 *
 * Auto-apply (SW-06, approved 3 Sep): every mutation here commits immediately.
 * There is no draft, no Save and no Cancel, so no exit route can strand
 * unsaved work — which is why leaving via the Sidebar needs no prompt.
 * The corollary is that validation happens BEFORE the commit, not at save
 * time, and that destructive actions carry their own confirmation.
 */

/** Active section per Settings tab. §3.4.3 — reopening restores the last one. */
export const activeSection = writable(DEFAULT_SECTION);

/** Set briefly after a successful commit, to drive the "applied" indicator. */
export const lastApplied = writable(0);

let seq = 0;
/**
 * Generated ids carry an `n` marker so they cannot collide with the seeded
 * sample ids below (`db-1`, `engine-2`, …).
 *
 * They could, and did: `seq` starts at 0, so the first generated database id
 * was `db-1` — already taken. Svelte throws on duplicate keys in a keyed
 * {#each}, so installing anything broke the section the next time it mounted,
 * which looked like "the section will not display" rather than like an id bug.
 */
const nextId = (p) => `${p}-n${++seq}`;

/** Sample objects so the prototype opens in a working state rather than empty. */
export const objects = writable({
  engines: [
    { id: 'engine-1', name: 'Stockfish', version: '17.1', status: 'ready', protocol: 'UCI',
      binaryPath: '/usr/local/bin/stockfish', hashMb: 512, threads: 4, enabled: true },
    { id: 'engine-2', name: 'Torch', version: '3', status: 'ready', protocol: 'UCI',
      binaryPath: '/usr/local/bin/torch', hashMb: 256, threads: 2, enabled: false }
  ],
  subscriptions: [
    { id: 'sub-1', name: 'Hikaru', source: 'chesscom', state: 'idle',
      interval: 'Hourly', lastSynced: '12 min ago', newGames: 0, enabled: true },
    { id: 'sub-2', name: 'AwesomeAtti', source: 'lichess', state: 'idle',
      interval: 'Daily', lastSynced: '2 h ago', newGames: 12, enabled: true },
    { id: 'sub-3', name: 'DrNykterstein', source: 'lichess', state: 'syncing',
      interval: 'Hourly', lastSynced: '1 h ago', newGames: 0, enabled: true },
    { id: 'sub-4', name: 'MagnusCarlsen', source: 'chesscom', state: 'error',
      interval: 'Weekly', lastSynced: null, newGames: 0, enabled: false }
  ],
  databases: [
    { id: 'db-1', name: 'Master Games', status: 'indexed', version: '2.1',
      games: 2_400_000, players: 198_000, bytes: 1_000_000_000, enabled: true },
    { id: 'db-2', name: 'My Games', status: 'indexed', version: '1.0',
      games: 812, players: 24, bytes: 2_400_000, enabled: true }
  ]
});

/** Conventional settings controls for General and Appearance. §3.4.6, §3.4.7 */
export const preferences = writable({
  /*
    Keys are camelCase — `config.db`'s own schema keys (§5), translated the
    same way `readGames` translates a column (`data/config.js`'s
    `PREFERENCE_KEYS`). `libraryLocation` is the exception: §3.4.6 specifies
    the setting and `preferences` has no key for it, so it is not a schema
    field and is never persisted (see `applyPreference` below).
  */
  restoreOpenGames: true,
  libraryLocation: '~/Documents/Plyvio',
  boardStyle: 'Default',
  pieceSet: 'Merida',
  /*
    PROTOTYPE ONLY for its non-'real' values, and not specified.

    'real' -- the default -- means Add Games actually reads what it's given;
    so far that's only true for the Paste tab (see `planRealPasteImport` in
    library/importJob.js). Every other value forces a fake outcome instead,
    which exists so the outcomes a real, well-formed import cannot easily
    produce (a broken file, a dropped connection) stay reachable by hand
    while File and Online still have no real importer of their own. See
    `OUTCOMES` in library/importJob.js.
  */
  simulatedImport: 'real'
});

/** The camelCase keys `config.db`'s `preferences` table actually has a row for. */
const PERSISTED_PREFERENCE_KEYS = new Set(Object.values(PREFERENCE_KEYS));

/**
 * Replace the schema-backed fields of `preferences` with the real values from
 * `config.db`, once. `libraryLocation` and `simulatedImport` have no schema
 * column and are left exactly as the defaults above set them.
 *
 * A no-op outside Tauri (`configConnection()` resolves `null`) — `preferences`
 * is left exactly as whatever set it last, the same as `stores/library.js`'s
 * `loadGames()`.
 */
export async function loadPreferences() {
  const connection = await configConnection();
  if (!connection) return;
  const real = await readPreferences(connection);
  preferences.update((p) => ({ ...p, ...real }));
}

/**
 * Replace the installed half of `objects.databases` with the real rows from
 * `config.db`'s `libraries` table, once, on mount. Only replaces what was
 * there before startup — a row `installDatabase()` adds afterward (a
 * simulated catalogue install, still out of scope for a real download)
 * lands the same way it always has, on top of whatever this loaded.
 *
 * `games`/`players`/`bytes` have no column on `libraries` and are
 * deliberately left off rather than faked; `DatabaseSection.svelte` only
 * draws `installedDetail()` for a row that actually has them.
 *
 * DESKTOP ONLY, DELIBERATELY, even though `configConnection()` now resolves
 * a real connection in the PWA too. A `libraries` row is a filesystem path
 * to a `.db` file — a concept the PWA's single in-browser database has no
 * counterpart for. Giving it real (empty) storage without a PWA-shaped
 * design for what a "library" even means there would look like a built
 * capability from the data alone; staying mocked here says plainly it isn't
 * one yet. See `backends/schema.js`'s own comment on the same call for
 * `engines`.
 */
export async function loadLibraries() {
  if (!isTauri()) return;
  const connection = await configConnection();
  if (!connection) return;
  const real = await readLibraries(connection);
  objects.update((all) => ({
    ...all,
    databases: real.map((lib) => ({
      id: lib.id,
      name: lib.name,
      status: 'indexed',
      version: lib.version,
      enabled: lib.enabled,
      createdAt: lib.createdAt,
      lastOpenedAt: lib.lastOpenedAt,
      // DB‑03r — Location carries the full path once a database is real.
      // `readLibraries()`'s own `path` is `game_db_path` (§5.1), untranslated.
      location: lib.path
    }))
  }));
}

/**
 * Replace `objects.engines` with the real rows from `config.db`'s `engines`
 * table, once, on mount. Same shape as `loadLibraries()`: only replaces what
 * was there before startup, so a row `installEngine()` adds afterward (still
 * simulated, per the catalogue being a static file rather than a `config.db`
 * table) lands the way it always has.
 *
 * `protocol` has no column — §5.3 says every engine here speaks UCI, so it
 * is set rather than read.
 *
 * DESKTOP ONLY, DELIBERATELY — same reasoning as `loadLibraries()`. An
 * `engines` row is a UCI binary on disk; live engine analysis stays mocked
 * via `engineMock.js` in the PWA regardless (a separate, unrelated
 * decision), so persisting installed-engine rows there would be real
 * storage for a capability the PWA doesn't functionally have.
 */
export async function loadEngines() {
  if (!isTauri()) return;
  const connection = await configConnection();
  if (!connection) return;
  const real = await readEngines(connection);
  objects.update((all) => ({
    ...all,
    engines: real.map((e) => ({
      id: e.id,
      name: e.name,
      version: e.version,
      protocol: 'UCI',
      binaryPath: e.binaryPath,
      hashMb: e.hashMb,
      threads: e.threads,
      enabled: e.enabled
    }))
  }));
}

/** `subscriptions.source_type` → the mark/label key `SOURCES` (settings/subscriptions.js) uses. */
const SOURCE_TYPE_TO_SOURCE = { chess_com_player: 'chesscom', lichess_player: 'lichess' };

/** `sync_interval` ('daily') → the label `INTERVALS` uses ('Daily'). */
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * An ISO timestamp as a reader would want it — §5.2's own example is
 * "August 31, 2026 10:42 AM", not a relative "12 min ago" (which the mock
 * invented and no schema column can reconstruct: `last_synced_at` is a
 * point in time, not a duration).
 */
const formatTimestamp = (iso) => {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(get(locale), { dateStyle: 'medium', timeStyle: 'short' })
      .format(new Date(iso));
  } catch {
    return iso;
  }
};

/**
 * Replace `objects.subscriptions` with the real rows from `config.db`'s
 * `subscriptions` table, once, on mount — READ-ONLY. Rename, interval,
 * enable, create and Sync Now all stay on the mock store: the Edit View's
 * single `url` field doesn't match the schema (`source_type` +
 * `source_identifier` + a destination Library picker), and that redesign is
 * its own piece of work, scoped separately.
 *
 * `newGames` is computed for real — §5.2/§8 define it as the count of
 * `subscription_games` rows (in the subscription's DESTINATION library, not
 * `config.db`) whose game postdates `last_viewed_at`. A library that can't
 * be opened (missing, or no `libraryId`) reports 0 rather than failing the
 * whole list — `countNewGamesForSubscription` already degrades the same way
 * for a database with no `subscription_games` table.
 *
 * `state` only ever resolves to `'idle'` or `'error'` here: nothing in this
 * pass actually checks a source, so there is no live `'syncing'` to report.
 *
 * A no-op outside Tauri, the same as `loadLibraries()`/`loadEngines()`.
 */
export async function loadSubscriptions() {
  const connection = await configConnection();
  if (!connection) return;
  const real = await readSubscriptions(connection);
  const rows = await Promise.all(real.map(async (s) => {
    let newGames = 0;
    try {
      const libConnection = await explorerConnection(s.libraryId);
      if (libConnection) {
        newGames = await countNewGamesForSubscription(libConnection, s.id, s.lastViewedAt);
      }
    } catch (err) {
      console.error(`Plyvio: failed to count new games for subscription ${s.id}`, err);
    }
    return {
      id: s.id,
      name: s.name,
      source: SOURCE_TYPE_TO_SOURCE[s.sourceType] ?? s.sourceType,
      state: s.lastStatus === 'error' ? 'error' : 'idle',
      interval: capitalize(s.syncInterval),
      lastSynced: formatTimestamp(s.lastSyncedAt),
      newGames,
      enabled: s.enabled
    };
  }));
  objects.update((all) => ({ ...all, subscriptions: rows }));
}

/* ---------------- navigation ---------------------------------------- */

export function selectSection(id) {
  if (!isSection(id)) return;
  activeSection.set(id);
}

export function findObject(section, id) {
  return (get(objects)[section] || []).find((o) => o.id === id) || null;
}

/* ---------------- auto-apply mutations ------------------------------ */

/**
 * Commit one preference. The store updates synchronously, per §3.4.1's
 * auto-apply; persisting it to `config.db` happens fire-and-forget after,
 * the same shape as `stores/game.js`'s real-data fetches use for their own
 * write side. `libraryLocation` and `simulatedImport` have no schema column
 * (see `preferences`' own comment) and are left store-only.
 */
export function applyPreference(key, value) {
  preferences.update((p) => ({ ...p, [key]: value }));
  lastApplied.set(Date.now());
  if (!PERSISTED_PREFERENCE_KEYS.has(key)) return;
  (async () => {
    try {
      const connection = await configConnection();
      if (connection) await writePreference(connection, key, value);
    } catch (err) {
      console.error(`Plyvio: failed to save preference ${key}`, err);
    }
  })();
}

/* ---------------- create / destroy ---------------------------------- */

const NEW_DEFAULTS = {
  engines:       { name: 'New Engine',       status: 'not configured', binaryPath: '', hashMb: 256, threads: 4, enabled: false },
  subscriptions: { name: 'New Subscription', status: 'not configured', url: '',  interval: 'Daily', enabled: false },
  /*
    A database's Add button doesn't create a "not configured" placeholder the
    way Engines/Subscriptions do — DB‑04's row is a real draft the user names
    and creates on the spot, and nothing is written to disk until `Create` is
    pressed (`createDatabase()`, below). `draft: true` marks that state for
    `DatabaseSection.svelte` (Name+Filename+Location, Cancel/Create) and is
    the one field `createDatabase()` strips on success, alongside every other
    field it replaces with the real object's own.

    `enabled: true` — confirmed 20 Sep 2026, replacing the `false` this
    started at: a newly created database arrives enabled, the same as an
    installed one (`installDatabase()`, below), rather than needing a
    separate step to switch it on. It has no bearing on the draft state
    itself (the toggle isn't meaningfully actionable until the file exists),
    only on the row `createDatabase()` produces.
  */
  databases:     { name: 'New Database',     status: 'not configured', location: '', format: 'PGN', enabled: true, draft: true }
};

/**
 * §3.4.8 — the Add action creates the object. The caller (each row section's
 * own Add button) opens it by setting its local `expanded` state to the
 * returned id, the same as expanding any existing row — there is no
 * separate Detail/Edit View to switch to.
 */
export function addObject(section) {
  const base = NEW_DEFAULTS[section];
  if (!base) return null;
  const id = nextId(section.slice(0, -1));
  objects.update((all) => ({ ...all, [section]: [...all[section], { ...base, id }] }));
  return id;
}

/**
 * Remove an object. Destructive and NOT undoable — with auto-apply there is no
 * Cancel to walk back, so callers must confirm first (see ConfirmRemove).
 */
export function removeObject(section, id) {
  objects.update((all) => ({
    ...all,
    [section]: (all[section] || []).filter((o) => o.id !== id)
  }));
}

/* ---------------- databases: create new (DB‑04/DB‑05) ----------------- */

/**
 * DB‑04's Cancel — discard a database draft with nothing written, same as
 * `removeObject('databases', id)` under a name that reads correctly for a
 * row that was never real. A draft carries nothing on disk or in `config.db`
 * to undo.
 */
export function cancelDatabaseDraft(id) {
  removeObject('databases', id);
}

/**
 * The names/filenames DB‑05 checks a draft against: every OTHER database
 * this store already knows about — real rows and any other draft — never
 * the draft being validated itself. `existingFilenames` is derived from a
 * real row's `location` (DB‑03r's full path; `basename()` gets the filename
 * back out of it); a still-draft row has no filename of its own to collide
 * on yet from this store's point of view.
 */
function existingDatabaseIdentity(excludingId) {
  const others = get(objects).databases.filter((db) => db.id !== excludingId && !db.draft);
  return {
    existingNames: others.map((db) => db.name),
    existingFilenames: others.map((db) => db.location && basename(db.location)).filter(Boolean)
  };
}

/**
 * DB‑04/DB‑05 — create the draft's real database file (Tauri) or its own
 * IndexedDB record (PWA), then replace the draft object with the real one.
 * Nothing is written until this is called; a validation failure writes
 * nothing either.
 *
 * `version` on the resulting row is `NEW_DATABASE_VERSION` (`'1.0'`) — a
 * brand-new, empty database has no catalogue edition the way an installed
 * one does (`installDatabase()`'s `entry.version`); this is a starting
 * point, not a meaningful figure to compare against another database's.
 *
 * @returns {Promise<{field: 'name'|'filename', key: string, params: object}|null>}
 *   `null` on success; otherwise the same shape `validateDraftDatabase`
 *   returns, for the caller to show in the shared message area.
 */
export async function createDatabase(id, { name, filename }) {
  const draft = findObject('databases', id);
  if (!draft || !draft.draft) return null;

  const cleanName = String(name ?? '').trim();
  const cleanFilename = String(filename ?? '').trim();
  const { existingNames, existingFilenames } = existingDatabaseIdentity(id);

  if (isTauri()) {
    // DB‑05: "checked against ... the actual directory listing on disk" too,
    // not just registered Libraries — a stray .db file nobody registered
    // would otherwise go unnoticed. Best-effort: a listing failure (the
    // directory not existing yet, most commonly) falls back to the
    // registered-only check rather than blocking Create outright.
    try {
      const { listDirectoryNames } = await import('$lib/data/backends/tauri.js');
      const dir = await defaultLibrariesDir();
      const onDisk = await listDirectoryNames(dir);
      for (const entry of onDisk) if (!existingFilenames.includes(entry)) existingFilenames.push(entry);
    } catch (err) {
      console.error('Plyvio: failed to list the Libraries directory', err);
    }
  }

  const error = validateDraftDatabase({
    name: cleanName, filename: cleanFilename, existingNames, existingFilenames
  });
  if (error) return error;

  const now = new Date().toISOString();
  let real;

  if (isTauri()) {
    const { openFileDatabase, ensureDirectory } = await import('$lib/data/backends/tauri.js');
    const { GAME_DB_DDL, SCHEMA_USER_VERSION, splitSqlStatements } = await import('$lib/data/backends/schema.js');
    const dir = await defaultLibrariesDir();
    await ensureDirectory(dir);
    const path = await defaultLibraryPath(cleanFilename);

    const fileConnection = await openFileDatabase(path);
    try {
      for (const statement of splitSqlStatements(GAME_DB_DDL)) await fileConnection.run(statement);
      await fileConnection.run(`pragma user_version = ${SCHEMA_USER_VERSION}`);
    } finally {
      await fileConnection.close();
    }

    const config = await configConnection();
    const newId = config
      ? await createLibrary(config, {
          name: cleanName, path, createdAt: now, enabled: true, version: NEW_DATABASE_VERSION
        })
      : nextId('db');

    real = {
      id: newId, name: cleanName, status: 'indexed', version: NEW_DATABASE_VERSION,
      enabled: true, createdAt: now, lastOpenedAt: null, location: path
    };
  } else {
    // PWA — no filesystem: the typed Filename identifies nothing once the
    // draft becomes real (DB‑03r's Location reads "Stored in this browser"
    // there instead), so it's validated above and then dropped.
    const newId = nextId('db');
    try {
      const { openLibraryDatabase } = await import('$lib/data/backends/pwa.js');
      const conn = await openLibraryDatabase(newId);
      await conn.close();
    } catch (err) {
      console.error('Plyvio: failed to create the database', err);
    }
    real = {
      id: newId, name: cleanName, status: 'indexed', version: NEW_DATABASE_VERSION,
      enabled: true, createdAt: now, lastOpenedAt: null, location: null
    };
  }

  objects.update((all) => ({
    ...all,
    databases: all.databases.map((db) => (db.id === id ? real : db))
  }));
  lastApplied.set(Date.now());
  return null;
}

/* ---------------- databases: available and install (§3.4.8) ---------- */

/**
 * Downloads in flight, keyed by the Available entry's id: { pct, done }.
 * `done` marks the brief "Installed" state before the row leaves Available,
 * so the transition is visible rather than the row vanishing under the cursor.
 */
export const downloads = writable({});

/** The Available list, minus anything already installed by name. */
export const availableDatabases = derived([objects, downloads], ([$o, $d]) => {
  const installed = new Set(($o.databases ?? []).map((db) => db.name));
  return AVAILABLE_DATABASES
    .filter((db) => !installed.has(db.name) || $d[db.id]?.done)
    .map((db) => ({ ...db, progress: $d[db.id] ?? null }));
});

/**
 * Install a database from the catalogue.
 *
 * A distributed database is a Plyvio database file that arrives ready, so
 * there is no indexing phase: the object is created enabled, unlike §3.4.8's
 * default for objects that still need configuring. `tick` is injected so the
 * transfer can be driven deterministically in tests.
 */
export function installDatabase(id, { tick = (fn) => setTimeout(fn, 260) } = {}) {
  const entry = AVAILABLE_DATABASES.find((d) => d.id === id);
  if (!entry) return false;
  if (get(downloads)[id]) return false;          // already in flight

  downloads.update((d) => ({ ...d, [id]: { pct: 0, done: false } }));

  const step = () => {
    const cur = get(downloads)[id];
    if (!cur || cur.done) return;
    const pct = Math.min(100, cur.pct + 20);
    if (pct < 100) {
      downloads.update((d) => ({ ...d, [id]: { pct, done: false } }));
      tick(step);
      return;
    }
    // Transfer complete: the file is on disk and usable.
    objects.update((all) => ({
      ...all,
      databases: [...all.databases, {
        id: nextId('db'),
        name: entry.name,
        version: entry.version,
        games: entry.games,
        players: entry.players,
        bytes: entry.bytes,
        status: 'indexed',
        enabled: true
      }]
    }));
    downloads.update((d) => ({ ...d, [id]: { pct: 100, done: true } }));
    lastApplied.set(Date.now());
    tick(() => downloads.update((d) => {
      const { [id]: _gone, ...rest } = d;
      return rest;
    }));
  };
  tick(step);
  return true;
}

/**
 * Rename a database. The name is what the Library switcher shows (§3.2.3.10).
 *
 * A real Library's id is the `libraries.id` integer `readLibraries()`
 * returns; a mock row added by `installDatabase()` gets a generated string
 * id (`nextId('db')`). Only the former is persisted — the latter has no
 * `config.db` row to write to.
 */
export function renameDatabase(id, name) {
  const clean = String(name ?? '').trim();
  if (!clean) return 'validation.required';
  objects.update((all) => ({
    ...all,
    databases: all.databases.map((db) => (db.id === id ? { ...db, name: clean } : db))
  }));
  lastApplied.set(Date.now());
  if (typeof id === 'number') {
    (async () => {
      try {
        const connection = await configConnection();
        if (connection) await writeLibraryName(connection, id, clean);
      } catch (err) {
        console.error(`Plyvio: failed to rename library ${id}`, err);
      }
    })();
  }
  return null;
}

/**
 * Enable or disable a database. Disabled databases leave the switcher's
 * offer. Persisted for a real Library (integer id); a mock catalogue-install
 * row (string id) stays store-only, the same as `renameDatabase`.
 */
export function setDatabaseEnabled(id, enabled) {
  objects.update((all) => ({
    ...all,
    databases: all.databases.map((db) => (db.id === id ? { ...db, enabled } : db))
  }));
  lastApplied.set(Date.now());
  if (typeof id === 'number') {
    (async () => {
      try {
        const connection = await configConnection();
        if (connection) await writeLibraryEnabled(connection, id, enabled);
      } catch (err) {
        console.error(`Plyvio: failed to update library ${id}`, err);
      }
    })();
  }
}

/* ---------------- subscriptions: SU-A rows --------------------------- */

/** Rename a subscription. Empty names are refused rather than committed. */
export function renameSubscription(id, name) {
  const clean = String(name ?? '').trim();
  if (!clean) return 'validation.required';
  objects.update((all) => ({
    ...all,
    subscriptions: all.subscriptions.map((s) => (s.id === id ? { ...s, name: clean } : s))
  }));
  lastApplied.set(Date.now());
  return null;
}

/** The update interval. Commits on change, per §3.4.9. */
export function setSubscriptionInterval(id, interval) {
  objects.update((all) => ({
    ...all,
    subscriptions: all.subscriptions.map((s) => (s.id === id ? { ...s, interval } : s))
  }));
  lastApplied.set(Date.now());
}

export function setSubscriptionEnabled(id, enabled) {
  objects.update((all) => ({
    ...all,
    subscriptions: all.subscriptions.map((s) => (s.id === id ? { ...s, enabled } : s))
  }));
  lastApplied.set(Date.now());
}

/**
 * Sync now — the manual action no other object type has. It lives in the
 * expander rather than on the row (SU‑D was rejected): the row already carries
 * two trailing controls, and a subscription's whole point is that it syncs by
 * itself, so this is a rare action.
 *
 * A disabled subscription does not sync. `tick` is injected for tests.
 */
export function syncSubscription(id, { tick = (fn) => setTimeout(fn, 700) } = {}) {
  const sub = get(objects).subscriptions.find((s) => s.id === id);
  if (!sub || sub.enabled === false || sub.state === 'syncing') return false;
  objects.update((all) => ({
    ...all,
    subscriptions: all.subscriptions.map((s) => (s.id === id ? { ...s, state: 'syncing' } : s))
  }));
  tick(() => objects.update((all) => ({
    ...all,
    subscriptions: all.subscriptions.map((s) =>
      (s.id === id ? { ...s, state: 'idle', lastSynced: 'just now', newGames: 0 } : s))
  })));
  return true;
}

export function resetDatabases() {
  downloads.set({});
}

/* ---------------- engines: available and install (§3.4.8.2) ---------- */

/**
 * Engines and Databases share one download map, keyed by catalogue id. The two
 * catalogues have disjoint ids, and one map means one progress model rather
 * than two that could drift.
 */
export const availableEngines = derived([objects, downloads], ([$o, $d]) => {
  const installed = new Set(($o.engines ?? []).map((e) => e.name));
  return AVAILABLE_ENGINES
    .filter((e) => !installed.has(e.name) || $d[e.id]?.done)
    .map((e) => ({ ...e, progress: $d[e.id] ?? null }));
});

/**
 * Install an engine from the catalogue. One phase, as for Databases: a binary
 * downloads and is ready.
 *
 * Unlike a downloaded database, a downloaded engine arrives **enabled** too —
 * it needs no path supplying, which is the reason §3.4.8 disables new objects.
 */
export function installEngine(id, { tick = (fn) => setTimeout(fn, 260) } = {}) {
  const entry = AVAILABLE_ENGINES.find((e) => e.id === id);
  if (!entry) return false;
  if (get(downloads)[id]) return false;

  downloads.update((d) => ({ ...d, [id]: { pct: 0, done: false } }));

  const step = () => {
    const cur = get(downloads)[id];
    if (!cur || cur.done) return;
    const pct = Math.min(100, cur.pct + 20);
    if (pct < 100) {
      downloads.update((d) => ({ ...d, [id]: { pct, done: false } }));
      tick(step);
      return;
    }
    objects.update((all) => ({
      ...all,
      engines: [...all.engines, {
        id: nextId('engine'),
        name: entry.name,
        version: entry.version,
        protocol: entry.protocol,
        bytes: entry.bytes,
        threads: DEFAULT_THREADS,
        hashMb: DEFAULT_HASH,
        status: 'ready',
        enabled: true
      }]
    }));
    downloads.update((d) => ({ ...d, [id]: { pct: 100, done: true } }));
    lastApplied.set(Date.now());
    tick(() => downloads.update((d) => {
      const { [id]: _gone, ...rest } = d;
      return rest;
    }));
  };
  tick(step);
  return true;
}

/**
 * Rename an engine. Empty names are refused rather than committed (§3.4.1).
 * Persisted for a real engine (integer id, from `config.db`); a mock
 * catalogue-install row (string id, from `installEngine()`) stays
 * store-only, the same split `renameDatabase` uses for Libraries.
 */
export function renameEngine(id, name) {
  const clean = String(name ?? '').trim();
  if (!clean) return 'validation.required';
  objects.update((all) => ({
    ...all,
    engines: all.engines.map((e) => (e.id === id ? { ...e, name: clean } : e))
  }));
  lastApplied.set(Date.now());
  if (typeof id === 'number') {
    (async () => {
      try {
        const connection = await configConnection();
        if (connection) await writeEngineName(connection, id, clean);
      } catch (err) {
        console.error(`Plyvio: failed to rename engine ${id}`, err);
      }
    })();
  }
  return null;
}

/**
 * Threads and Hash commit on change, per §3.4.9. `key` is `'threads'` or
 * `'hashMb'` — camelCase, matching every other field on the object.
 */
export function setEngineOption(id, key, value) {
  if (key !== 'threads' && key !== 'hashMb') return false;
  objects.update((all) => ({
    ...all,
    engines: all.engines.map((e) => (e.id === id ? { ...e, [key]: value } : e))
  }));
  lastApplied.set(Date.now());
  if (typeof id === 'number') {
    (async () => {
      try {
        const connection = await configConnection();
        if (connection) await writeEngineOption(connection, id, key, value);
      } catch (err) {
        console.error(`Plyvio: failed to update engine ${id}`, err);
      }
    })();
  }
  return true;
}

/**
 * Enable or disable an engine. Persisted for a real engine (integer id);
 * a mock catalogue-install row (string id) stays store-only.
 */
export function setEngineEnabled(id, enabled) {
  objects.update((all) => ({
    ...all,
    engines: all.engines.map((e) => (e.id === id ? { ...e, enabled } : e))
  }));
  lastApplied.set(Date.now());
  if (typeof id === 'number') {
    (async () => {
      try {
        const connection = await configConnection();
        if (connection) await writeEngineEnabled(connection, id, enabled);
      } catch (err) {
        console.error(`Plyvio: failed to update engine ${id}`, err);
      }
    })();
  }
}

export function resetSettings() {
  activeSection.set(DEFAULT_SECTION);
  lastApplied.set(0);
}

export { SECTIONS, OBJECT_TYPES, DEFAULT_SECTION };
