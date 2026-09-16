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

const parse = (text) => {
  if (text === null || text === undefined) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/** Every preference, as an object keyed by name. §3.4.6, §3.4.7 */
export const readPreferences = async (connection) => {
  const rows = await connection.all('select key, value from preferences');
  return Object.fromEntries(rows.map((row) => [row.key, parse(row.value)]));
};

/** One preference, or `fallback` when it is not set. */
export const readPreference = async (connection, key, fallback = null) => {
  const row = await connection.get('select value from preferences where key = ?', [key]);
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

/** The engines configured in `config.db`. §5 */
export const readEngines = async (connection) =>
  (await connection.all('select * from engines order by id')).map((row) => ({ ...row }));

/** The subscriptions configured in `config.db`. §5 */
export const readSubscriptions = async (connection) =>
  (await connection.all('select * from subscriptions order by id')).map((row) => ({ ...row }));

/**
 * Write one preference.
 *
 * Not yet called by the application — the read path lands first, and §3.4.1's
 * auto-apply is the slice after this one. It is here because the tests that
 * prove a value survives a write and a reopen need it, and those tests are the
 * point of putting a real database behind the seam.
 */
export const writePreference = async (connection, key, value, now = new Date().toISOString()) => {
  await connection.run(
    'insert into preferences (key, value, updated_at) values (?, ?, ?) ' +
      'on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at',
    [key, JSON.stringify(value), now]
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
 * The preference keys the application reads, and the store each one feeds.
 * Written down here so the mapping between a schema key and a UI concept is in
 * one place rather than spread across the components that consume it.
 */
export const PREFERENCE_KEYS = {
  theme: 'theme',
  language: 'language',
  restore_open_games: 'restoreGames',
  board_style: 'boardStyle',
  piece_set: 'pieceSet'
};
