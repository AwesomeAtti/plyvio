/**
 * What is this file?
 *
 * §1 of the schema says a game database is *any* SQLite file conforming to it,
 * "whether created by Plyvio, supplied by another application, or populated
 * independently". So the first thing done with a file is not a query — it is
 * asking whether the query would mean anything.
 *
 * Two markers SQLite provides for exactly this:
 *
 *   `user_version`    which schema revision the file was written to.
 *                     `samples/build_samples.py` already writes **9**, matching
 *                     database-schema v009 — a convention the builder
 *                     established and the specification does not yet state.
 *   `application_id`  which application owns the format. **0 in every sample
 *                     file**, which is to say unset: a Plyvio database is
 *                     currently indistinguishable from any other SQLite file.
 *
 * This module **reads both and enforces neither**. What to do with a file that
 * does not match — refuse it, migrate it, open it read-only, warn — is a
 * decision that has not been taken, and inventing one here would bury it.
 * `identify()` reports; the caller decides.
 */

/** The schema revision this build of Plyvio is written against. */
export const SCHEMA_USER_VERSION = 9;

/**
 * The value `application_id` would carry if it were adopted. Unused: every
 * sample file has 0, and adopting it means changing `build_samples.py` and
 * rebuilding the samples, which is a decision rather than a detail.
 */
export const APPLICATION_ID = null;

/** Tables a game database must have for the rest of the application to work. */
export const GAME_TABLES = ['games'];

/** Tables `config.db` must have. §5 */
export const CONFIG_TABLES = ['preferences', 'libraries', 'subscriptions', 'engines', 'ui_state'];

/**
 * Read a file's markers and the tables it actually has.
 *
 * @param {import('./connection.js').Connection} connection
 * @returns {Promise<{userVersion: number, applicationId: number, tables: string[],
 *                    kind: 'config'|'games'|'unknown', matchesSchema: boolean}>}
 */
export const identify = async (connection) => {
  const userVersion = Number(await connection.value('pragma user_version')) || 0;
  const applicationId = Number(await connection.value('pragma application_id')) || 0;
  const tables = (
    await connection.all("select name from sqlite_master where type = 'table' order by name")
  ).map((row) => row.name);

  const has = (names) => names.every((name) => tables.includes(name));
  const kind = has(CONFIG_TABLES) ? 'config' : has(GAME_TABLES) ? 'games' : 'unknown';

  return {
    userVersion,
    applicationId,
    tables,
    kind,
    matchesSchema: userVersion === SCHEMA_USER_VERSION && kind !== 'unknown'
  };
};

/**
 * A one-line account of a file, for a log line or a message to the user. Says
 * what was found rather than what should be done about it.
 */
export const describe = (identity) => {
  if (identity.kind === 'unknown') return 'not a Plyvio database';
  if (identity.userVersion === 0) return `a ${identity.kind} database with no schema version`;
  if (identity.userVersion !== SCHEMA_USER_VERSION) {
    return `a ${identity.kind} database at schema v${String(identity.userVersion).padStart(3, '0')}, expected v${String(SCHEMA_USER_VERSION).padStart(3, '0')}`;
  }
  return `a ${identity.kind} database at schema v${String(identity.userVersion).padStart(3, '0')}`;
};
