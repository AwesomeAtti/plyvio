/**
 * `config.db` — preferences, UI state, and the libraries the application knows
 * about. §5 of the schema.
 *
 * Every function here takes a connection, so the same code serves a test opening
 * the file from bytes and whatever opens it for real later.
 *
 * `preferences.value` and `ui_state.value` hold JSON, so `"system"` is a quoted
 * string and `true` is a boolean. That is the schema's choice, not this
 * module's: it is what lets one key/value table carry values of different types
 * without a type column. Reading parses; writing serialises. A value that will
 * not parse is returned as the raw text rather than thrown away, because losing
 * a user's setting to a stray character is worse than showing it oddly.
 */

import { DataError } from './connection.js';

const parse = (text) => {
  if (text === null || text === undefined) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/**
 * Every preference, as an object keyed by its camelCase name — `readGames`'s
 * `white_elo` → `whiteElo` treatment, applied here too: `preferences.key` is
 * spelled the way the table spells it, and everything past this function sees
 * the way the rest of the application spells it (`PREFERENCE_KEYS`, below). A
 * key the table has that `PREFERENCE_KEYS` doesn't know is passed through
 * unchanged rather than dropped, so a preference added to the schema and not
 * yet added here is still visible.
 */
export const readPreferences = async (connection) => {
  const rows = await connection.all('select key, value from preferences');
  return Object.fromEntries(
    rows.map((row) => [PREFERENCE_KEYS[row.key] ?? row.key, parse(row.value)])
  );
};

/**
 * One preference, or `fallback` when it is not set. `key` is the camelCase
 * name (`restoreOpenGames`), the same as everywhere else a preference is
 * named — not the schema's `restore_open_games`.
 */
export const readPreference = async (connection, key, fallback = null) => {
  const schemaKey = SCHEMA_PREFERENCE_KEYS[key] ?? key;
  const row = await connection.get('select value from preferences where key = ?', [schemaKey]);
  return row ? parse(row.value) : fallback;
};

/** Persisted UI state — sidebar, folded groups, open tabs. */
export const readUiState = async (connection) => {
  const rows = await connection.all('select key, value from ui_state');
  return Object.fromEntries(rows.map((row) => [row.key, parse(row.value)]));
};

/**
 * The libraries, in the order the Library switcher wants them. §3.2.3.10
 *
 * `game_db_path` is the file each one points at, which is what the switcher
 * opens and what `static/db/` has to contain for a shipped library to work.
 */
export const readLibraries = async (connection) => {
  const rows = await connection.all(
    'select id, name, game_db_path, created_at, last_opened_at, enabled, version ' +
      'from libraries order by id'
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    path: row.game_db_path,
    createdAt: row.created_at,
    lastOpenedAt: row.last_opened_at,
    enabled: row.enabled === 1,
    version: row.version
  }));
};

/** Rename a Library. §5.1 */
export const writeLibraryName = async (connection, id, name) => {
  await connection.run('update libraries set name = ? where id = ?', [name, id]);
};

/**
 * Enable or disable a Library. A disabled Library leaves the switcher's
 * offer (§3.4.8's own wording) — the row and its `game_db_path` are
 * untouched, only `enabled` changes.
 */
export const writeLibraryEnabled = async (connection, id, enabled) => {
  await connection.run('update libraries set enabled = ? where id = ?', [enabled ? 1 : 0, id]);
};

/**
 * The engines configured in `config.db`. §5, camelCase per `readLibraries`/
 * `readGames`'s own convention: `binary_path` → `binaryPath`, `hash_mb` →
 * `hashMb`, `created_at` → `createdAt`.
 */
export const readEngines = async (connection) => {
  const rows = await connection.all(
    'select id, name, version, url, binary_path, created_at, enabled, threads, hash_mb ' +
      'from engines order by id'
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    version: row.version,
    url: row.url,
    binaryPath: row.binary_path,
    createdAt: row.created_at,
    enabled: row.enabled === 1,
    threads: row.threads,
    hashMb: row.hash_mb
  }));
};

/** Rename an engine. §5.3 */
export const writeEngineName = async (connection, id, name) => {
  await connection.run('update engines set name = ? where id = ?', [name, id]);
};

/**
 * Threads or Hash. `key` is the camelCase option name (`'threads'` or
 * `'hashMb'`) — the same two `stores/settings.js`'s `setEngineOption` already
 * accepts, translated here to the schema's own column.
 */
export const writeEngineOption = async (connection, id, key, value) => {
  const column = { threads: 'threads', hashMb: 'hash_mb' }[key];
  if (!column) throw new DataError(`writeEngineOption: unknown option '${key}'`);
  await connection.run(`update engines set ${column} = ? where id = ?`, [value, id]);
};

/** Enable or disable an engine. A disabled engine stays configured, just unavailable to pick. */
export const writeEngineEnabled = async (connection, id, enabled) => {
  await connection.run('update engines set enabled = ? where id = ?', [enabled ? 1 : 0, id]);
};

/**
 * The subscriptions configured in `config.db`. §5.2, camelCase per
 * `readLibraries`/`readEngines`'s own convention.
 */
export const readSubscriptions = async (connection) => {
  const rows = await connection.all(
    'select id, name, source_type, source_identifier, library_id, enabled, created_at, ' +
      'last_checked_at, last_status, last_status_message, sync_interval, last_synced_at, ' +
      'last_viewed_at from subscriptions order by id'
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sourceType: row.source_type,
    sourceIdentifier: row.source_identifier,
    libraryId: row.library_id,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    lastCheckedAt: row.last_checked_at,
    lastStatus: row.last_status,
    lastStatusMessage: row.last_status_message,
    syncInterval: row.sync_interval,
    lastSyncedAt: row.last_synced_at,
    lastViewedAt: row.last_viewed_at
  }));
};

/**
 * Write one preference. `key` is the camelCase name — see `readPreference`.
 *
 * Called from `stores/settings.js`'s `applyPreference`, fire-and-forget, the
 * same shape as `loadRealGame`'s write-side counterparts: the store commits
 * synchronously (§3.4.1's auto-apply), and this persists it without the UI
 * waiting on the round trip.
 */
export const writePreference = async (connection, key, value, now = new Date().toISOString()) => {
  const schemaKey = SCHEMA_PREFERENCE_KEYS[key] ?? key;
  await connection.run(
    'insert into preferences (key, value, updated_at) values (?, ?, ?) ' +
      'on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at',
    [schemaKey, JSON.stringify(value), now]
  );
};

/** Write one UI-state value. Same standing as `writePreference`. */
export const writeUiState = async (connection, key, value, now = new Date().toISOString()) => {
  await connection.run(
    'insert into ui_state (key, value, updated_at) values (?, ?, ?) ' +
      'on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at',
    [key, JSON.stringify(value), now]
  );
};

/**
 * `preferences.key` → the camelCase name used everywhere above this seam.
 * Literal translations of the schema's own spelling (§5), the same rule
 * `readGames` and `readLibraries` already apply to their own columns —
 * not a shortened or renamed UI concept, so a reader of §5 can predict a
 * key here without checking this file.
 */
export const PREFERENCE_KEYS = {
  theme: 'theme',
  language: 'language',
  restore_open_games: 'restoreOpenGames',
  board_style: 'boardStyle',
  piece_set: 'pieceSet'
};

/** The reverse of `PREFERENCE_KEYS`, built once rather than by hand, so the two can't drift. */
const SCHEMA_PREFERENCE_KEYS = Object.fromEntries(
  Object.entries(PREFERENCE_KEYS).map(([schemaKey, camelKey]) => [camelKey, schemaKey])
);
