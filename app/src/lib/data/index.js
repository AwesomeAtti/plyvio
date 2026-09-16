/**
 * The data seam. §1, §3 and §5 of the schema, behind one interface.
 *
 * The backends are deliberately NOT re-exported here. `backends/memory.js` is
 * the tests', and keeping it imported only by its own caller is what keeps the
 * SQLite engine out of the application's import graph — and therefore out of the
 * bundle — while the prototype runs on mock data.
 */

export { DataError, isConnection, assertConnection, CONNECTION_METHODS } from './connection.js';

export {
  identify,
  describe,
  SCHEMA_USER_VERSION,
  APPLICATION_ID,
  CONFIG_TABLES,
  GAME_TABLES
} from './identify.js';

export {
  readPreferences,
  readPreference,
  writePreference,
  readUiState,
  writeUiState,
  readLibraries,
  readEngines,
  readSubscriptions,
  PREFERENCE_KEYS
} from './config.js';

export {
  LIST_COLUMNS,
  countGames,
  readGames,
  movetextFromRow,
  readMovetextFor,
  writeMovetextFor,
  readPgn,
  movetextOf,
  derivePlyCount
} from './games.js';
