/**
 * A game database — the `games` table and what the Library Content Table needs
 * from it. §1 and §3 of the schema.
 *
 * Reads are query-shaped rather than array-shaped: the caller asks for a page
 * and gets a page. `master-games.db` is 1,026 games and a real one is larger, so
 * nothing here loads a table into memory to filter it in JavaScript.
 */

/** The eight columns of §3.2.4.2, in the order the table draws them. */
export const LIST_COLUMNS = [
  'id', 'date', 'white', 'white_elo', 'black', 'black_elo', 'event', 'result', 'ply_count'
];

/** How many games the database holds. The Library status bar's count. §3.2.4.4 */
export const countGames = async (connection) =>
  Number(await connection.value('select count(*) from games')) || 0;

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
    `select ${LIST_COLUMNS.join(', ')} from games order by ${by[order] ?? by.date} limit ? offset ?`,
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
    plyCount: row.ply_count
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
