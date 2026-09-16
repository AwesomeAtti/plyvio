/**
 * The data seam.
 *
 * Everything that talks to a database talks to a *connection*, and a connection
 * is a handful of async methods. Nothing above this line names SQLite, a driver,
 * or a file.
 *
 * **The prototype does not read SQLite.** It runs on mock data shaped to this
 * schema; the only thing that opens a real database is the test suite. What this
 * seam is for is the move to a Tauri application, where the databases are opened
 * natively: that is one new file in `backends/`, and nothing above the seam
 * changes.
 *
 * Async, although nothing here is slow today, because everything that will
 * implement it is: a Tauri command is IPC, and any browser-side storage would be
 * a worker. A synchronous, array-shaped seam would have to be rewritten by the
 * first real backend, which is the rewrite this exists to avoid.
 *
 * ---------------------------------------------------------------------------
 * EVERYTHING THAT KNOWS SQLITE IS A LIBRARY LIVES IN `backends/`.
 *
 * Not "mostly", and not "by convention": `data/backends/` is the only directory
 * that imports a SQLite package or knows how a database is opened. One backend
 * exists today — `memory.js`, which opens a database from its bytes and is used
 * by the tests — and the next is one file satisfying the contract below.
 *
 * The repositories beside this file (`config.js`, `games.js`, `identify.js`) hold
 * SQL, and that is deliberate: SQL is the schema's own language and it travels to
 * any SQLite driver. What does not travel is the driver, and none of that appears
 * outside `backends/`.
 * ---------------------------------------------------------------------------
 *
 * @typedef {object} Connection
 * @property {(sql: string, params?: unknown[]|object) => Promise<object[]>} all
 *           Every row, as plain objects keyed by column name.
 * @property {(sql: string, params?: unknown[]|object) => Promise<object|null>} get
 *           The first row, or null.
 * @property {(sql: string, params?: unknown[]|object) => Promise<unknown>} value
 *           The first column of the first row, or null.
 * @property {(sql: string, params?: unknown[]|object) => Promise<void>} run
 *           A statement with no result.
 * @property {() => Promise<void>} close
 */

/** Thrown for anything the seam itself refuses; SQLite's own errors pass through. */
export class DataError extends Error {}

/**
 * A connection is duck-typed rather than a class, so a test can pass a stub.
 * This is the one place that says what the shape is.
 */
export const CONNECTION_METHODS = ['all', 'get', 'value', 'run', 'close'];

/** @returns {boolean} whether `candidate` satisfies the Connection contract. */
export const isConnection = (candidate) =>
  !!candidate && CONNECTION_METHODS.every((m) => typeof candidate[m] === 'function');

/** @throws {DataError} when it does not. */
export const assertConnection = (candidate, who = 'connection') => {
  if (!isConnection(candidate)) {
    const missing = CONNECTION_METHODS.filter((m) => typeof candidate?.[m] !== 'function');
    throw new DataError(`${who} is not a connection: missing ${missing.join(', ')}`);
  }
  return candidate;
};
