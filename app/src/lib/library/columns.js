/**
 * Content Table column sizing. §3.2.4.2 (as revised 3 Sep)
 *
 * Pure, so the model is verifiable without a DOM — vitest applies no
 * stylesheets, so computed widths could not be tested any other way.
 *
 * Fixed widths are derived from IBM Plex Mono's 0.600em advance at 12px
 * (7.2px per character) plus 12px of cell padding. They are only correct
 * against that bundled face; see fonts.css.
 */

export const PAD = 12;                 // 6px each side
export const ADVANCE = 7.2;            // 0.600em at 12px

/**
 * The table's outer edges. Between columns a cell keeps 6px a side, so values
 * in adjacent columns sit 12px apart. The first column's leading edge and the
 * last column's trailing edge get 12px instead of 6, so Date does not start
 * against the table's edge (and clears the 3px selection bar), and Moves does
 * not end against the scrollbar. The extra 6px is part of those two columns'
 * widths: Date 84 → 90, Moves 34 → 40. Header and rows use the same values,
 * so every label stays over its column. Agreed 15 Sep.
 */
export const EDGE_EXTRA = 6;

export const NAME_MIN = 90;
export const NAME_MAX = 180;
export const EVENT_MIN = 90;

/**
 * Moves from plies. The database stores `ply_count`; the table displays moves,
 * which is not the same number — a game ending on White's 25th move is 49 plies
 * and 25 moves, so it rounds up.
 *
 * `ply_count` is optional (database-schema §1). When it is absent the cell is
 * empty: the table shows what the data holds, and does not invent a number for a
 * column the data has nothing for.
 */
export const movesFromPlies = (plyCount) =>
  plyCount === null || plyCount === undefined || plyCount === '' ? '' : String(Math.ceil(Number(plyCount) / 2));

/**
 * Result as the table draws it. The database holds the PGN tag pair's own
 * spelling, so a draw arrives as `1/2-1/2`; §3.2.4.2 draws it as `½-½` (U+00BD),
 * which is what lets the column hold at 34px. Only the table substitutes —
 * the Game Stack keeps the plain PGN form (§5).
 */
export const formatResult = (result) =>
  result === null || result === undefined ? '' : result === '1/2-1/2' ? '\u00bd-\u00bd' : String(result);

/**
 * A column's `key` names the column; `field` names the database column it reads,
 * when the two differ; `format` turns the stored value into what is drawn.
 * Field names are the schema's own, so a column is spelled the same way in the
 * table, the query and the data — see the Conventions in database-schema.
 */
export const COLUMNS = [
  { key: 'date',      labelKey: 'col.date',   header: 'Date',  mono: true,  type: 'fixed', width: 84 + EDGE_EXTRA },
  { key: 'white',     labelKey: 'col.white',  header: 'White', mono: false, type: 'name' },
  { key: 'white_elo', labelKey: 'col.elo',    header: 'Elo',   mono: true,  type: 'fixed', width: 41,
    a11yKey: 'col.whiteElo' },
  { key: 'black',     labelKey: 'col.black',  header: 'Black', mono: false, type: 'name' },
  { key: 'black_elo', labelKey: 'col.elo',    header: 'Elo',   mono: true,  type: 'fixed', width: 41,
    a11yKey: 'col.blackElo' },
  { key: 'event',     labelKey: 'col.event',  header: 'Event', mono: false, type: 'event' },
  { key: 'result',    labelKey: 'col.resultShort', header: 'Res', mono: true, type: 'fixed', width: 34,
    a11yKey: 'col.result', format: formatResult },
  { key: 'moves',     labelKey: 'col.movesShort',  header: 'Mvs', mono: true, type: 'fixed', width: 34 + EDGE_EXTRA,
    a11yKey: 'col.moves', field: 'ply_count', format: movesFromPlies }
];

/**
 * snake_case -> camelCase, so a column's schema-spelled key (`white_elo`)
 * also finds a row that carries it the other way.
 */
const toCamel = (key) => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

/**
 * What a column draws for a row.
 *
 * Two shapes reach this table today, and neither is going away on its own:
 * `data/games.js`'s real reads are deliberately camelCase ("the same fields,
 * the same camelCase" as `insertGames()`'s own doc comment puts it), while
 * `library/mock.js`'s simulated rows -- still what File and Online/Lichess
 * draw, and what the Library workspace was originally built against --
 * are snake_case, the schema's own column spelling. A column here is
 * declared with the schema's spelling (`key: 'white_elo'`, matching
 * `database-schema.md`), so a real row's `whiteElo` needs its own lookup or
 * it reads as `undefined` and the cell renders blank -- found 23 Sep, live:
 * a real Chess.com import's White/Black Elo and Moves columns were empty
 * even though every row genuinely had the data (confirmed against the row
 * objects directly). Not new to Chess.com or even to Online import -- the
 * real Paste write path (20 Sep) has had the same gap since it landed;
 * nothing exercised it closely enough to notice a blank column before now.
 * `stores/game.js`'s own `record.whiteElo ?? record.white_elo` is the same
 * fix, already applied in one other spot for the same reason.
 */
export const cellValue = (row, column) => {
  const key = column.field ?? column.key;
  const raw = row?.[key] ?? row?.[toCamel(key)];
  return column.format ? column.format(raw) : raw;
};

export const FIXED_TOTAL = COLUMNS
  .filter((c) => c.type === 'fixed')
  .reduce((a, c) => a + c.width, 0);                       // 246

export const TABLE_MIN = FIXED_TOTAL + NAME_MIN * 2 + EVENT_MIN;   // 516

/**
 * Distribute the available width.
 *
 *   surplus = available − 516
 *   White = Black = 90 + min(⌊surplus ÷ 2⌋, 90)      capped at 180
 *   Event         = 90 + (surplus − 2 × name growth) no maximum
 *
 * Event is uncapped, so the columns always sum exactly to the available width
 * and trailing whitespace cannot occur. White and Black are equal by
 * construction — the floor is taken once and applied to both, with any odd
 * pixel going to Event.
 */
export function layoutColumns(available) {
  const surplus = Math.max(0, available - TABLE_MIN);
  const grow = Math.min(Math.floor(surplus / 2), NAME_MAX - NAME_MIN);
  const name = NAME_MIN + grow;
  const event = EVENT_MIN + (surplus - grow * 2);

  return COLUMNS.map((c) => ({
    ...c,
    w: c.type === 'fixed' ? c.width : c.type === 'name' ? name : event
  }));
}

/** Convenience for tests and readouts. */
export function widths(available) {
  const surplus = Math.max(0, available - TABLE_MIN);
  const grow = Math.min(Math.floor(surplus / 2), NAME_MAX - NAME_MIN);
  return {
    name: NAME_MIN + grow,
    event: EVENT_MIN + (surplus - grow * 2),
    total: FIXED_TOTAL + (NAME_MIN + grow) * 2 + EVENT_MIN + (surplus - grow * 2),
    surplus
  };
}
