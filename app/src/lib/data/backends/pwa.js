/**
 * The browser/PWA backend: SQLite files in the origin-private file system
 * (OPFS), on the `opfs-sahpool` VFS, owned by a dedicated worker.
 *
 * OPFS sync access handles only exist in a Worker, so this module doesn't touch
 * SQLite itself. Each `Connection` it returns is a proxy: every method is one
 * message to the storage worker (`worker-client.js` → `sqlite-worker.js` →
 * `sqlite-host.js`). A `run()` that resolves has been written to the file,
 * page by page. Nothing is exported or flushed afterwards, on unload or otherwise.
 *
 * Files: `/config.db` (the browser's `config.db` counterpart: fresh tables, no
 * seed rows) and `/library-<id>.db`, one per Library.
 *
 * A fresh file is set up inside the worker's own `open` operation: DDL,
 * `user_version`, and for the Sample Games bootstrap the seed rows, all in one
 * transaction (see `sqlite-host.js` for why it can't be a separate step). The
 * seed rows are built here on the main thread and sent over as plain
 * statements, so the worker runs SQL and nothing else: no PGN reader, no
 * chessops, no sample games in its bundle.
 */

import { assertConnection } from '../connection.js';
import { call } from './worker-client.js';
import { GAME_DB_DDL, CONFIG_DB_DDL, SCHEMA_USER_VERSION } from './schema.js';
import { GAMES } from '../../mock-data/sample-games.js';
import { computePositions } from '../../game/buildPositions.js';

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

/**
 * The Sample Games seed: `sample-games.js`'s 40 games, then §6's `positions`
 * table computed from them by `game/buildPositions.js`'s `computePositions()`,
 * the PWA's own equivalent of `samples/build_positions.py` (the PWA has no
 * `.db` file for that script to target). Real Explorer statistics from the
 * first open, not a mock.
 *
 * The `positions` half is a STOPGAP (see `game/buildPositions.js`'s header,
 * and ACTIONS.md, "STOPGAP: the PWA builds `positions` itself"): it goes when indexing gets its own
 * UI trigger. The 40 games stay.
 */
const seedStatements = (now) => {
  const gamesSql =
    `insert into games (${SEED_COLUMNS.join(', ')}) values ` +
    `(${SEED_COLUMNS.map(() => '?').join(', ')})`;
  const positionsSql =
    'insert into positions (pos, move, games, white, draws, black) values (?, ?, ?, ?, ?, ?)';
  return [
    ...GAMES.map((g) => {
      const row = { ...g, created_at: now };
      return { sql: gamesSql, params: SEED_COLUMNS.map((c) => row[c] ?? null) };
    }),
    ...computePositions(GAMES).map((r) => ({
      sql: positionsSql,
      params: [r.pos, r.move, r.games, r.white, r.draws, r.black]
    }))
  ];
};

/** A `Connection` (plus `export()`) whose every method is a message to the worker. */
const proxyConnection = (handle, name) => {
  const send = (op) => (sql, params) => call(op, { handle, sql, params });
  return assertConnection({
    all: send('all'),
    get: send('get'),
    value: send('value'),
    run: send('run'),
    close: () => call('close', { handle }),
    /** The current bytes of the database. */
    export: () => call('export', { handle })
  }, `${name} pwa connection`);
};

/**
 * Open `name`, creating it with `ddl` (and `seed`'s rows) if it doesn't exist.
 * @param {string} name an absolute pool file name
 * @param {string} ddl
 * @param {((now: string) => {sql: string, params?: unknown[]}[])|null} seed
 */
const openPwaDatabase = async (name, ddl, seed) => {
  const init = [
    { sql: ddl },
    { sql: `pragma user_version = ${SCHEMA_USER_VERSION}` },
    ...(seed ? seed(new Date().toISOString()) : [])
  ];
  const { handle } = await call('open', { name, init });
  return proxyConnection(handle, name);
};

/** The browser's `config.db` counterpart — no seed rows. */
export const openConfigDatabase = () => openPwaDatabase('/config.db', CONFIG_DB_DDL, null);

/**
 * A Library's game database, by id: the file `/library-<id>.db`.
 *
 * Two callers, two different needs:
 *
 *  - Settings → Databases → Add's "create new" path (`stores/settings.js`'s
 *    `createDatabase()`, `working/wireframes/settings-databases-add.html`)
 *    calls this with no options — empty, not seeded, matching the desktop
 *    path (`backends/tauri.js` + `GAME_DB_DDL`, no seed). A user-created
 *    Library starts genuinely empty.
 *  - `stores/settings.js`'s one-time PWA bootstrap (`ensureSampleGamesLibrary()`,
 *    the interim stand-in for the still-simulated Settings → Databases →
 *    Available "install" flow — see `ACTIONS.md`) calls this with
 *    `{ seed: true }` exactly once, for the real "Sample Games" `libraries`
 *    row it registers on first launch, so that file starts with the 40 sample
 *    games and their `positions` rows (`seedStatements()`, above).
 *
 * `seed` only matters when the file is new; an existing file is opened as it is.
 *
 * @param {string|number} id the Library's id.
 * @param {{ seed?: boolean }} [options]
 */
export const openLibraryDatabase = (id, { seed = false } = {}) =>
  openPwaDatabase(`/library-${id}.db`, GAME_DB_DDL, seed ? seedStatements : null);
