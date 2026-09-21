/**
 * A game database — the `games` table and what the Library Content Table needs
 * from it. §1 and §3 of the schema.
 *
 * Reads are query-shaped rather than array-shaped: the caller asks for a page
 * and gets a page. `master-games.db` is 1,026 games and a real one is larger, so
 * nothing here loads a table into memory to filter it in JavaScript.
 */

import { DataError } from './connection.js';

/** The eight columns of §3.2.4.2, in the order the table draws them. */
export const LIST_COLUMNS = [
  'id', 'date', 'white', 'white_elo', 'black', 'black_elo', 'event', 'result', 'ply_count'
];

/**
 * `created_at` is fetched alongside the eight list columns above rather than
 * added to them — it is not one of §3.2.4.2's eight and the Content Table
 * does not draw it — but `stores/library.js`'s `loadGames()` passes it
 * through as `createdAt`, which `recentlyAdded()` (§4.3.2) reads directly.
 */
const ROW_COLUMNS = [...LIST_COLUMNS, 'created_at'];

/** How many games the database holds. The Library status bar's count. §3.2.4.4 */
export const countGames = async (connection) =>
  Number(await connection.value('select count(*) from games')) || 0;

/**
 * How many games a subscription has newly found, per §8's own definition:
 * the rows in `subscription_games` for that subscription whose game's
 * `created_at` is later than the subscription's `last_viewed_at` — not a
 * stored count, and not `imported_at` (this table has none, deliberately;
 * see §8's own comment on that).
 *
 * `connection` is to the subscription's DESTINATION library — this table
 * lives in a game database, not in `config.db` alongside the subscription
 * itself (§8's whole point: `config.db` and a game database are different
 * files). `sinceIso` is the subscription's `lastViewedAt`; `null` (never
 * viewed) counts every row rather than none.
 *
 * A game database without `subscription_games` (§7's own caveat — a
 * database not built by this application may not have it) reports 0 rather
 * than throwing, the same degradation `readPositionStats` uses for a
 * database without `positions`.
 */
export const countNewGamesForSubscription = async (connection, subscriptionId, sinceIso) => {
  try {
    if (!sinceIso) {
      return Number(await connection.value(
        'select count(*) from subscription_games where subscription_id = ?',
        [subscriptionId]
      )) || 0;
    }
    return Number(await connection.value(
      'select count(*) from subscription_games sg join games g on g.id = sg.game_id ' +
        'where sg.subscription_id = ? and g.created_at > ?',
      [subscriptionId, sinceIso]
    )) || 0;
  } catch {
    return 0;
  }
};

/**
 * A page of games, shaped for the Content Table.
 *
 * `plyCount` is very often null: `games.ply_count` is deliberately unfilled in
 * the sample databases, which is why the *Mvs* column has had nothing to show.
 * Whether it is filled at import, derived on read, or backfilled once is an open
 * decision — `derivePlyCount` below is what would do it, and nothing calls it.
 */
export const readGames = async (connection, { limit = 200, offset = 0, order = 'date' } = {}) => {
  const by = { date: 'date desc, id', white: 'white, id', black: 'black, id', event: 'event, id' };
  const rows = await connection.all(
    `select ${ROW_COLUMNS.join(', ')} from games order by ${by[order] ?? by.date} limit ? offset ?`,
    [limit, offset]
  );
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    white: row.white,
    whiteElo: row.white_elo,
    black: row.black,
    blackElo: row.black_elo,
    event: row.event,
    result: row.result,
    plyCount: row.ply_count,
    createdAt: row.created_at
  }));
};

/**
 * The columns `insertGame` can supply, in the order database-schema.md's §1
 * lists them. Only `pgn` and `created_at` are always present -- the rest come
 * from whichever PGN tags the source actually wrote (§4: "Application fields
 * with no source value remain NULL unless they can be derived safely").
 */
export const INSERT_COLUMNS = [
  'pgn', 'event', 'site', 'date', 'round', 'white', 'black', 'result',
  'white_elo', 'black_elo', 'eco', 'time_control', 'fen', 'termination',
  'ply_count', 'created_at'
];

/**
 * Insert one game. §1, §4 -- every import stores the source PGN verbatim,
 * lifts each PGN tag it recognises into its field, and leaves `movetext`
 * NULL (§3.1: NULL means "read `pgn`"). `movetext` is never written here.
 *
 * Only `pgn` is required (§1: "Only `id` and `pgn` are required"); every
 * other column in `INSERT_COLUMNS` is optional and stored NULL when
 * `fields` does not supply it. A key `fields` carries that is not in
 * `INSERT_COLUMNS` is ignored rather than inserted, so a caller that hands
 * this an object with extra bookkeeping on it (a parser's own scratch
 * fields, say) cannot corrupt the row by accident.
 *
 * @param {import('./connection.js').Connection} connection
 * @param {Record<string, unknown>} fields schema-spelled (snake_case) column
 *   values -- see `INSERT_COLUMNS`.
 * @returns {Promise<number>} the new row's id.
 */
export const insertGame = async (connection, fields) => {
  if (!fields || fields.pgn === undefined || fields.pgn === null) {
    throw new DataError('insertGame requires pgn');
  }
  const columns = INSERT_COLUMNS.filter((c) => fields[c] !== undefined);
  const sql =
    `insert into games (${columns.join(', ')}) values (${columns.map(() => '?').join(', ')})`;
  await connection.run(sql, columns.map((c) => fields[c] ?? null));
  return Number(await connection.value('select last_insert_rowid()'));
};

/**
 * Insert several games, in order, and return each as `readGames`'s own row
 * shape -- the same fields, the same camelCase -- so a row just inserted and
 * a row just reloaded from the database are indistinguishable to a caller.
 *
 * ONE STATEMENT, not `begin` / one `insertGame` per row / `commit` (what
 * this used to do). That pattern sent four-plus separate calls to the
 * connection and relied on all of them sharing one physical connection to
 * behave as a single transaction. `@tauri-apps/plugin-sql` pools
 * connections -- each `run()`/`value()` call is its own IPC round trip that
 * can land on any connection in the pool -- so nothing guaranteed `begin`,
 * the inserts and `commit` ran on the same one; when they didn't, `commit`
 * (or the recovery `rollback`) failed with "no transaction is active" and
 * the whole batch silently never wrote (20 Sep 2026 -- caught live, via
 * Plyvio's own Add Games: pasting into a library whose `loadGames()` had
 * just run reliably triggered it, because that's exactly the kind of
 * concurrent connection demand that makes two calls land on different pooled
 * connections). A single multi-row INSERT can't have this problem: SQLite
 * commits one statement as an atomic unit on its own, and there is only one
 * call to route, so there's nothing left to split across connections. See
 * `data/backends/tauri.js`'s own header comment on `last_insert_rowid()`
 * for the earlier instance of this exact class of bug.
 *
 * Every row in one INSERT must supply the same columns, so `columns` is the
 * union of whatever any row in the batch actually carries (in
 * `INSERT_COLUMNS`' own order) -- a row that doesn't carry one of them gets
 * an explicit NULL for it, the same value an omitted column would already
 * default to, so this changes nothing about what gets stored.
 *
 * Validated up front, before anything touches the connection: a batch with
 * a `pgn`-less row throws before the INSERT is even built, so a bad row
 * still loses the whole import (nothing partial to roll back, because
 * nothing partial was ever sent).
 *
 * Ids: SQLite assigns a multi-row INSERT's own rowids sequentially, in the
 * order the rows were listed, when -- as here -- no row supplies its own
 * `id` (`INSERT_COLUMNS` never includes it). `last_insert_rowid()` reports
 * the LAST row's id, so the batch's ids run backward from it. This depends
 * on nothing else inserting into `games` between this statement and reading
 * its result, which is exactly what `stores/importer.js`'s own single-lane
 * rule ("EXACTLY ONE IMPORT AT A TIME") already guarantees.
 *
 * @param {import('./connection.js').Connection} connection
 * @param {Record<string, unknown>[]} rows one per game -- see `insertGame`.
 * @returns {Promise<object[]>}
 */
export const insertGames = async (connection, rows) => {
  if (!rows.length) return [];

  for (const fields of rows) {
    if (!fields || fields.pgn === undefined || fields.pgn === null) {
      throw new DataError('insertGame requires pgn');
    }
  }

  const columns = INSERT_COLUMNS.filter((c) => rows.some((fields) => fields[c] !== undefined));
  const placeholders = `(${columns.map(() => '?').join(', ')})`;
  const sql =
    `insert into games (${columns.join(', ')}) values ${rows.map(() => placeholders).join(', ')}`;
  const params = rows.flatMap((fields) => columns.map((c) => fields[c] ?? null));

  await connection.run(sql, params);
  const lastId = Number(await connection.value('select last_insert_rowid()'));
  const firstId = lastId - (rows.length - 1);

  return rows.map((fields, i) => ({
    id: firstId + i,
    date: fields.date ?? null,
    white: fields.white ?? null,
    whiteElo: fields.white_elo ?? null,
    black: fields.black ?? null,
    blackElo: fields.black_elo ?? null,
    event: fields.event ?? null,
    result: fields.result ?? null,
    plyCount: fields.ply_count ?? null,
    createdAt: fields.created_at ?? null
  }));
};

/**
 * Strip the tag pair section from a PGN document, leaving the movetext.
 *
 * A tag pair section is a run of `[Name "value"]` lines at the top, ended by a
 * blank line. Lives here rather than in `$lib/pgn` because it is about a PGN
 * *document*, and that module deals only in movetext, which §3.1 is careful to
 * say is what `games.movetext` holds.
 */
export const movetextOf = (pgn) => {
  if (!pgn) return '';
  const lines = String(pgn).split(/\r?\n/);
  let i = 0;
  while (i < lines.length && (lines[i].trim() === '' || /^\s*\[[^\]]*\]\s*$/.test(lines[i]))) i++;
  return lines.slice(i).join('\n').trim();
};

/**
 * The movetext of a `games` row, following §3.1's precedence exactly:
 *
 *   if games.movetext IS NOT NULL   use it
 *   else                            use the movetext inside games.pgn
 *
 * The second return value says which, because "the application is reading its
 * own copy" and "the application is reading the imported original" are different
 * states and a caller that edits needs to know which one it started from.
 *
 * Today every row in `samples/` takes the second branch: import writes `pgn` and
 * leaves `movetext` NULL (§4), so all 1,130 sample games resolve through their
 * PGN. The first branch is what a row looks like once something has written a
 * movetext back to it, which nothing yet does.
 *
 * Pure and row-shaped rather than query-shaped, so that a caller holding a row
 * already — mock data included — applies the same rule as one reading a database
 * instead of a second copy of it that can drift.
 *
 * @param {{movetext?: string|null, pgn?: string|null}|null} row
 * @returns {{movetext: string, source: 'movetext'|'pgn'|'none'}}
 */
export const movetextFromRow = (row) => {
  if (!row) return { movetext: '', source: 'none' };
  if (row.movetext !== null && row.movetext !== undefined) {
    return { movetext: row.movetext, source: 'movetext' };
  }
  if (row.pgn === null || row.pgn === undefined) return { movetext: '', source: 'none' };
  return { movetext: movetextOf(row.pgn), source: 'pgn' };
};

/**
 * The movetext for a game in a database. §3.1's precedence, applied to the row.
 *
 * @returns {Promise<{movetext: string, source: 'movetext'|'pgn'|'none'}>}
 */
export const readMovetextFor = async (connection, id) =>
  movetextFromRow(await connection.get('select movetext, pgn from games where id = ?', [id]));

/**
 * Store an edited movetext. §3.1: every write stores the complete resulting
 * document, `pgn` is never patched, and nothing is stored as a diff.
 *
 * Not yet called by the application; the read path lands first. The tests use
 * it, because a round trip through the database is the thing worth proving.
 */
export const writeMovetextFor = async (connection, id, movetext) => {
  await connection.run('update games set movetext = ? where id = ?', [movetext, id]);
};

/** The original PGN, byte for byte as imported. §1, field 2. */
export const readPgn = async (connection, id) =>
  (await connection.get('select pgn from games where id = ?', [id]))?.pgn ?? null;

/**
 * A game's `site` and `round` — §1's two record fields the Library's list
 * columns don't carry (§3.2.4.2 names eight, not these two), so a caller
 * that needs them for one game — the Info card — reads them on demand
 * rather than the Content Table paying for them on every row.
 *
 * Both are nullable in the schema and stay that way here: a game genuinely
 * without a Round is `{ round: null }`, not a reason to fall back to some
 * other row's value. Optional data reads as absent, never as someone else's.
 */
export const readRecordFields = async (connection, id) =>
  (await connection.get('select site, round from games where id = ?', [id])) ?? {
    site: null, round: null
  };

/**
 * Count the plies of a game's main line.
 *
 * Nothing calls this. It is what would fill `games.ply_count`, and where that
 * happens — at import, on read, or as a one-off backfill — has not been decided.
 * Parsing is not free: the whole 1,026-game sample takes a few hundred
 * milliseconds, which is nothing once and too much per keystroke.
 *
 * @param {(text: string) => number} count usually `plyCount(readMovetext(text))`
 */
export const derivePlyCount = async (connection, id, count) => {
  const { movetext } = await readMovetextFor(connection, id);
  return movetext ? count(movetext) : 0;
};

/* ============================================================================
 * §6 — the `positions` table. Derived data: every row in it is
 * reconstructible from `games`, built offline (`samples/build_positions.py`)
 * rather than aggregated by the application at read time.
 * ========================================================================= */

/**
 * A position's statistics — the Explorer Section's rows.
 *
 * One indexed lookup, not an aggregation: `positions` is `WITHOUT ROWID`,
 * clustered by `(pos, move)` (§6.1), so this is a single B-tree seek and a
 * short sequential run. `posKey` is what `game/explorer.js`'s `positionKey()`
 * already computes for the board — the first four FEN fields, per §6.2 —
 * and is passed in rather than recomputed here, so there is one function in
 * the application that knows what a position key is.
 *
 * Resolves to `[]` when `positions` doesn't exist, rather than throwing: §6
 * says plainly that "a game database without one is valid — it simply
 * cannot answer position queries, and any feature that needs them is
 * unavailable until the table is present." A library database nothing has
 * run `build_positions.py`-equivalent tooling against is exactly that case,
 * not an error.
 *
 * @returns {Promise<{move: string, games: number, white: number, draws: number, black: number}[]>}
 */
export const readPositionStats = async (connection, posKey) => {
  try {
    return await connection.all(
      'select move, games, white, draws, black from positions where pos = ?',
      [posKey]
    );
  } catch {
    return [];
  }
};

/* ============================================================================
 * Library features — §7. Favorites and Trash are presence tables (a row
 * means the game is a favorite / in the trash); Tags and Collections are
 * many-to-many through a membership table. None of these add a column to
 * `games` — see §7's own header for why.
 *
 * The tag membership table is `tag_games` (`tag_id, game_id`, per
 * database-schema.md §7.2) — samples/build_samples.py agrees. Sample .db
 * files built before that table was renamed still had the old `tag_games`
 * name; that was a stale-fixture problem, not a schema question, and it was
 * fixed by rebuilding the samples rather than by this file following the
 * old name.
 * ========================================================================= */

/** Every game id that is a favorite. §7.1 */
export const readFavoriteIds = async (connection) =>
  (await connection.all('select game_id from favorites')).map((r) => r.game_id);

/** Every game id in the Trash. §7.1 */
export const readTrashedIds = async (connection) =>
  (await connection.all('select game_id from trash')).map((r) => r.game_id);

/**
 * Mark a game as a favorite, or unmark it. Presence, not a flag: `on`
 * inserts the row if it is missing, `off` deletes it if it is there —
 * either way idempotent, so a caller never has to check first.
 */
export const setFavorite = async (connection, gameId, on) => {
  if (on) await connection.run('insert or ignore into favorites (game_id) values (?)', [gameId]);
  else await connection.run('delete from favorites where game_id = ?', [gameId]);
};

/** Move a game to the Trash, or restore it. Same presence-table shape as `setFavorite`. */
export const setTrashed = async (connection, gameId, on) => {
  if (on) await connection.run('insert or ignore into trash (game_id) values (?)', [gameId]);
  else await connection.run('delete from trash where game_id = ?', [gameId]);
};

/** Every Tag in this game database, in the order the Sidebar lists them. §7.2 */
export const readTags = async (connection) =>
  connection.all('select id, name from tags order by name collate nocase');

/** The tag ids a game carries. */
export const readTagIdsForGame = async (connection, gameId) =>
  (await connection.all('select tag_id from tag_games where game_id = ?', [gameId]))
    .map((r) => r.tag_id);

/** The game ids carrying a tag — what the Sidebar's Tag row filters to. */
export const readGameIdsForTag = async (connection, tagId) =>
  (await connection.all('select game_id from tag_games where tag_id = ?', [tagId]))
    .map((r) => r.game_id);

/**
 * Every game's tag ids, as a map keyed by game id. One query rather than one
 * per game — what a caller filling in a whole Content Table's worth of rows
 * needs, without an N+1 fetch.
 */
export const readTagIdsByGame = async (connection) => {
  const rows = await connection.all('select game_id, tag_id from tag_games');
  const byGame = {};
  for (const row of rows) (byGame[row.game_id] ??= []).push(row.tag_id);
  return byGame;
};

/** Every tag's game count in one query, for the Sidebar's trailing-count slots. */
export const readTagCounts = async (connection) => {
  const rows = await connection.all('select tag_id, count(*) as n from tag_games group by tag_id');
  return Object.fromEntries(rows.map((r) => [r.tag_id, r.n]));
};

/**
 * Find a Tag by name, or create it. `tags.name` is unique ignoring case
 * (§7.2), so applying "Blunder" when "blunder" already exists must reuse the
 * existing row rather than fail or fork the Sidebar into two rows for one tag.
 *
 * @returns {Promise<number>} the tag's id, existing or newly created.
 */
export const findOrCreateTag = async (connection, name) => {
  const clean = String(name ?? '').trim();
  const existing = await connection.get(
    'select id from tags where name = ? collate nocase',
    [clean]
  );
  if (existing) return existing.id;
  await connection.run('insert into tags (name) values (?)', [clean]);
  return connection.value('select id from tags where name = ? collate nocase', [clean]);
};

/** Apply a tag to a game. Idempotent — applying an already-carried tag is a no-op. */
export const addTagToGame = async (connection, tagId, gameId) => {
  await connection.run(
    'insert or ignore into tag_games (game_id, tag_id) values (?, ?)',
    [gameId, tagId]
  );
};

/** Remove a tag from a game. Idempotent in the same way `addTagToGame` is. */
export const removeTagFromGame = async (connection, tagId, gameId) => {
  await connection.run(
    'delete from tag_games where game_id = ? and tag_id = ?',
    [gameId, tagId]
  );
};

/**
 * Every Collection in this game database — regular and Smart alike, in the
 * order the Sidebar lists them. §7.3
 *
 * `smart` comes back as a boolean (the schema stores it as 0/1, per the
 * convention `database-schema.md` states once for every such column); a
 * Smart Collection's `criteria` is returned exactly as stored — parsing it is
 * not this function's job, since §7.3 leaves the format unspecified.
 */
export const readCollections = async (connection) =>
  (await connection.all(
    'select id, name, smart, criteria from collections order by name collate nocase'
  )).map((row) => ({ ...row, smart: row.smart === 1 }));

/**
 * The game ids in a regular Collection. Not meaningful for a Smart
 * Collection — §7.3 says its membership is computed from `criteria` at query
 * time, not stored in `collection_games` — so this returns `[]` for one
 * rather than silently answering a different question.
 */
export const readGameIdsForCollection = async (connection, collectionId) =>
  (await connection.all(
    'select game_id from collection_games where collection_id = ?',
    [collectionId]
  )).map((r) => r.game_id);

/**
 * Every regular Collection's game count in one query. A Smart Collection is
 * absent from the result (see `readGameIdsForCollection`) rather than
 * reported as zero, so a caller can tell "empty" apart from "not this kind
 * of count."
 */
export const readCollectionCounts = async (connection) => {
  const rows = await connection.all(
    'select collection_id, count(*) as n from collection_games group by collection_id'
  );
  return Object.fromEntries(rows.map((r) => [r.collection_id, r.n]));
};

/**
 * Every regular Collection's member game ids, as a map keyed by game id. Same
 * shape and reason as `readTagIdsByGame`; a Smart Collection contributes no
 * entries, for the reason given on `readGameIdsForCollection`.
 */
export const readCollectionIdsByGame = async (connection) => {
  const rows = await connection.all('select game_id, collection_id from collection_games');
  const byGame = {};
  for (const row of rows) (byGame[row.game_id] ??= []).push(row.collection_id);
  return byGame;
};

/**
 * Create a regular Collection. Smart Collections are not built here —
 * `criteria`'s format is unspecified (§7.3) and inventing one as a side
 * effect of this function would be the kind of decision this file avoids
 * making silently, same as the `tag_games`/`tag_games` naming above.
 *
 * `collections.name` is unique ignoring case, like `tags.name`; creating a
 * Collection that only differs in case reuses the existing row.
 *
 * @returns {Promise<number>} the collection's id, existing or newly created.
 */
export const findOrCreateCollection = async (connection, name) => {
  const clean = String(name ?? '').trim();
  const existing = await connection.get(
    'select id from collections where name = ? collate nocase',
    [clean]
  );
  if (existing) return existing.id;
  await connection.run('insert into collections (name, smart) values (?, 0)', [clean]);
  return connection.value('select id from collections where name = ? collate nocase', [clean]);
};

/** Add a game to a regular Collection. Idempotent, same shape as `addTagToGame`. */
export const addGameToCollection = async (connection, collectionId, gameId) => {
  await connection.run(
    'insert or ignore into collection_games (collection_id, game_id) values (?, ?)',
    [collectionId, gameId]
  );
};

/** Remove a game from a regular Collection. Idempotent, same shape as `removeTagFromGame`. */
export const removeGameFromCollection = async (connection, collectionId, gameId) => {
  await connection.run(
    'delete from collection_games where collection_id = ? and game_id = ?',
    [collectionId, gameId]
  );
};
