/**
 * Explorer — the data behind the Section drawn in
 * `wireframes/game-move-explorer.html` Rev B. G1 and G2 granted 14 Sep.
 *
 * The Section answers one question: from the position on the board, what has
 * been played before, and how did those games end? Every figure it shows is a
 * query against the game database's `positions` table (database-schema §6),
 * whose shape this module takes as given:
 *
 *     pos · move · games · white · draws · black
 *
 * Rev B was written when that table did not exist and says the build is blocked
 * on adding it. It is not: §6 defines it, one row per position per distinct move,
 * which is a row of this Section exactly. What is missing is a POPULATED one —
 * the sample databases were built on 12 Sep, before §6 — and the prototype does
 * not read the `.db` files at all, so the statistics here are mock, shaped to the
 * table so that swapping in a real query is a source change and nothing else.
 */

import { parseFen } from 'chessops/fen';
import { Chess } from 'chessops/chess';

/* ------------------------------ the row's width ------------------------- */

/*
  §2 of the wireframe — the bar is the only elastic cell, so every other width
  is spent directly out of it. These are that table, and the fit rule below is
  computed against BAR_PX for good.
*/
export const EXPLORER_MOVE_W = 84;    // binding case `12… Qxf7+`
export const EXPLORER_SHARE_W = 34;   // binding case `100%`, tabular
export const EXPLORER_BAR_W = 201;    // what is left of 337 after the cells and gaps

export const EXPLORER_ROW_H = 24;     // a 16px bar with 4px of air either side
export const EXPLORER_BODY_PAD = 6;   // 3px top and bottom
export const EXPLORER_MAX_ROWS = 3;   // the ceiling; a fourth move scrolls

/* -------------------------------- §6.2 key ------------------------------ */

/**
 * The position key: the first FOUR fields of the FEN, and nothing else.
 *
 * The halfmove clock and fullmove number are excluded because they describe a
 * game's progress, not a position — including either would stop two games that
 * reach the same position by different move orders from being recognised as the
 * same position, which is the whole purpose of the table.
 *
 * The en passant field records a square ONLY when an en passant capture is
 * actually legal. Strict FEN writes the target square whenever a pawn has just
 * advanced two, whether or not anything can take it; under that rule two
 * otherwise identical positions key differently and a genuine transposition
 * fails to merge. This is a deliberate departure from strict FEN, stated in §6.2
 * so that it is not later "corrected" back.
 */
export function positionKey(fen) {
  if (typeof fen !== 'string') return null;
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) return null;
  const [placement, turn, castling, ep] = parts;
  return `${placement} ${turn} ${castling} ${legalEp(ep, fen)}`;
}

/** `-` unless some pawn of the side to move can actually make the capture. */
function legalEp(ep, fen) {
  if (!ep || ep === '-') return '-';
  try {
    const setup = parseFen(fen).unwrap();
    if (setup.epSquare === undefined) return '-';
    const pos = Chess.fromSetup(setup).unwrap();
    for (const from of pos.board.pieces(pos.turn, 'pawn')) {
      if (pos.dests(from).has(setup.epSquare)) return ep;
    }
    return '-';
  } catch {
    // An unparseable position is not a reason to key it differently from itself.
    return ep;
  }
}

/* ------------------------------ the row model --------------------------- */

/**
 * Games that reached this position: the sum of its rows.
 *
 * §6.3 — a game contributes at most once to any position, even if it reached it
 * twice by repetition, so the rows partition the games rather than overlapping.
 */
export const positionGames = (stats) => (stats ?? []).reduce((a, r) => a + r.games, 0);

/**
 * The White / draw / Black split, as three whole percents that sum to 100.
 *
 * §6.3 — the denominator is `white + draws + black`, NOT `games`. A game with no
 * recorded result was still played, so it counts toward how often a move was
 * chosen while contributing to no side's score. Using `games` here would quietly
 * shrink every bar by the number of unfinished games behind it.
 *
 * Largest remainder, so the three displayed numbers total 100 exactly. Three
 * independently rounded values do not, and a bar whose labels read 34/42/23 is
 * a bar the reader has to distrust.
 */
export function resultSplit({ white = 0, draws = 0, black = 0 } = {}) {
  const decided = white + draws + black;
  if (!decided) return null;                 // played, but nothing is decided yet
  const exact = [white, draws, black].map((v) => (v / decided) * 100);
  const out = exact.map(Math.floor);
  let left = 100 - out.reduce((a, v) => a + v, 0);
  const order = exact
    .map((v, i) => [v - Math.floor(v), i])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; left > 0; k++, left--) out[order[k % 3][1]]++;
  return { white: out[0], draws: out[1], black: out[2] };
}

/* -------------------------------- fit rule ------------------------------ */

/*
  §4 — a label is drawn inside its own segment or not at all. Never clipped,
  never moved outside, never shrunk. The label is the bare integer: a bar in
  three parts is self-evidently proportional, and the "%" costs 6.6px in every
  segment, which is the difference between a label and no label in the cases
  that matter.
*/
export const MONO_11_ADVANCE = 6.6;   // IBM Plex Mono, 0.600em at 11px
export const LABEL_CLEARANCE = 8;     // 4px either side of the digits

/*
  Rounded to the pixel, which is what §4's table is computed from: a two-digit
  label is 13px and needs 21px of segment, giving 10.4% as the Section's binding
  figure. Carrying 13.2px unrounded would report 10.5% and quietly disagree with
  the document the Section was built from.
*/
export const labelWidth = (n) => Math.round(String(n).length * MONO_11_ADVANCE);
export const labelFits = (segmentPx, n) => segmentPx >= labelWidth(n) + LABEL_CLEARANCE;

/** The smallest share of a move's games that can carry its own label. */
export const smallestLabelled = (barPx = EXPLORER_BAR_W) =>
  ((labelWidth(38) + LABEL_CLEARANCE) / barPx) * 100;

/**
 * Segment widths across the bar.
 *
 * A 0% result draws NO segment — not a hairline, because "never happened" and
 * "happened rarely" have to stay distinguishable. A non-zero one is never drawn
 * below 2px for the same reason; the pixels that buys come off the largest
 * segment, so the three still fill the bar exactly.
 */
export function segments(split, barPx = EXPLORER_BAR_W) {
  if (!split) return [];
  const keys = ['white', 'draws', 'black'];
  const px = keys.map((k) => (split[k] / 100) * barPx);
  for (let i = 0; i < 3; i++) if (split[keys[i]] > 0 && px[i] < 2) px[i] = 2;
  const over = px.reduce((a, v) => a + v, 0) - barPx;
  if (over > 0) px[px.indexOf(Math.max(...px))] -= over;
  return keys.map((k, i) => ({
    key: k,
    pct: split[k],
    px: px[i],
    drawn: split[k] > 0,
    label: split[k] > 0 && labelFits(px[i], split[k]) ? split[k] : null
  }));
}

/* --------------------------------- rows --------------------------------- */

/**
 * The Section's rows, ordered by share descending.
 *
 * Fixed ordering, so the share column reads as a decreasing list and needs no
 * explanation. A sort by result would put one-game rows in the only three slots
 * the Section has.
 */
export function explorerRows(stats, barPx = EXPLORER_BAR_W) {
  const total = positionGames(stats);
  if (!total) return [];
  return (stats ?? [])
    .map((r) => {
      const split = resultSplit(r);
      return {
        move: r.move,
        games: r.games,
        share: Math.round((r.games / total) * 100),
        split,
        segments: segments(split, barPx)
      };
    })
    /*
      Ties break on the SAN itself, compared as a plain string rather than with
      localeCompare: the tiebreak only has to be STABLE, and a locale-aware
      collation would put two rows in a different order for a German user than
      for an English one, for no reason the reader could see.
    */
    .sort((a, b) => b.games - a.games || (a.move < b.move ? -1 : a.move > b.move ? 1 : 0));
}

/**
 * §5.4.2's height contract, for the one Section that needs a ceiling.
 *
 * Sized to content between a 60px floor and a 108px ceiling. A state message
 * sits at the floor, so a state is never taller than the row it replaced.
 */
export function explorerHeight(rowCount, headerH = 30) {
  const rows = Math.min(Math.max(rowCount, 1), EXPLORER_MAX_ROWS);
  return headerH + EXPLORER_BODY_PAD + rows * EXPLORER_ROW_H;
}
