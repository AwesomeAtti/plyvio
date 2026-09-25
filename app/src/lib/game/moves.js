/**
 * Stage 4 of `analysis-board-plan.md` — turning a chessground drag into a
 * legal chess move, pure and synchronous. Nothing here touches a tab's
 * state or the movetext tree; `stores/game.js`'s `playMove` is the only
 * caller, and it does that part.
 *
 * Deliberately narrow: this stage only extends the mainline from its own
 * last ply (the plan doc's own words — a move played anywhere earlier
 * "starts a variation... this stage depends on [Stage 5] for the second
 * case", which is unbuilt). So every function here takes the position to
 * move FROM as a single FEN, never a tree position — there is no branch to
 * choose.
 */

import { parseFen, makeFen } from 'chessops/fen';
import { setupPosition } from 'chessops/variant';
import { makeSan, parseSan } from 'chessops/san';
import { parseSquare, makeSquare } from 'chessops/util';
import { chessgroundDests } from 'chessops/compat';

const positionFromFen = (fen) => setupPosition('chess', parseFen(fen).unwrap()).unwrap();

/**
 * `movable.dests` in chessground's own shape — every legal destination for
 * every piece that has one, from this FEN. `chessgroundDests` (chessops'
 * own helper, `chessops/compat`) already carries both representations of a
 * castling move (the king's own landing square AND the rook it castles
 * with), which is exactly what chessground's `movable.rookCastles` needs to
 * pick from; nothing here is Plyvio-specific.
 *
 * An unreadable FEN (should not happen — every caller reads it from a ply
 * this app itself produced) returns an empty map rather than throwing, so a
 * board stays inert instead of crashing.
 */
export function destsForFen(fen) {
  try {
    return chessgroundDests(positionFromFen(fen));
  } catch {
    return new Map();
  }
}

/** Whose move it is at this FEN, chessground's `movable.color` shape. */
export function turnFromFen(fen) {
  return String(fen ?? '').split(' ')[1] === 'b' ? 'black' : 'white';
}

/**
 * Whether `from -> to` needs a promotion piece before it can be played —
 * checked BEFORE the move is finalized, so the picker can be shown first.
 * Only a pawn reaching the far rank ever does; `dests` has already limited
 * `to` to a legal square, so a pawn landing on rank 1 or 8 has no other
 * legal reading.
 */
export function isPromotionMove(fen, from, to) {
  const pos = positionFromFen(fen);
  const piece = pos.board.get(parseSquare(from));
  return !!piece && piece.role === 'pawn' && (to[1] === '8' || to[1] === '1');
}

/**
 * Play one move and report it the way a new ply needs it.
 *
 * `to` is the square the user actually dropped the piece on — for castling
 * that is the king's own landing square (g1/c1/g8/c8), never chessops'
 * internal king-takes-rook form. Nothing here converts it: `Position#play`,
 * `Position#isLegal` and `makeSan` all recognize either form on their own
 * (`castlingSide` in `chessops/chess.js` treats "moved by two squares" and
 * "landed on your own rook" as the same signal), so passing the raw UI
 * squares through is correct, not a shortcut.
 *
 * @param {string} fen the position to move FROM (the mainline's last ply).
 * @param {{from: string, to: string, promotion?: string}} move `promotion`
 *   is chessops' role name (`queen`/`rook`/`bishop`/`knight`), required
 *   exactly when `isPromotionMove` said so — `Position#isLegal` itself
 *   rejects a promotion move with no promotion piece, and a non-promotion
 *   move that names one.
 * @returns {{san: string, fenAfter: string, check: boolean, from: string,
 *   to: string}|null} `null` for an illegal move — chessground's own
 *   `dests` should already have prevented one from reaching here, but nothing
 *   downstream trusts the board over the rules.
 */
export function playMove(fen, { from, to, promotion } = {}) {
  const pos = positionFromFen(fen);
  const move = { from: parseSquare(from), to: parseSquare(to), promotion: promotion || undefined };
  if (!pos.isLegal(move)) return null;
  const san = makeSan(pos, move);
  pos.play(move);
  return { san, fenAfter: makeFen(pos.toSetup()), check: pos.isCheck(), from, to };
}

/**
 * The next `n` plies of a PV (SAN strings, the shape engine rows already
 * carry — `game/engine.js`'s `formatPv`, `engine/uci.js`'s `pvToSan`),
 * replayed on `fen` with chessops, as UI squares: `{from, to, promotion}`,
 * the same shape `playMove` above takes and the board draws shapes in.
 *
 * Castling is remapped from chessops' `parseSan` (which returns the king's
 * own square as `from` and the ROOK's square as `to` — its internal
 * castling representation) to the king's actual landing square (g1/c1/g8/
 * c8), read off the SAN text itself (`O-O`/`O-O-O`) rather than inferred
 * from the move, since that is unambiguous and needs no board inspection.
 * `playMove` above documents why the landing square is the form everything
 * downstream (chessground's own drawing, `stores/game.js`'s `playMove`)
 * expects.
 *
 * Stops at the first SAN that doesn't parse or isn't legal here — a short
 * result is honest, a wrong one is not, the same rule `pvToSan` follows for
 * engine output. An unreadable `fen` (should not happen — every caller
 * reads it off the position on screen) returns no moves rather than
 * throwing, the same contract `destsForFen` above keeps.
 */
export function pvMoves(fen, pv = [], n = 2) {
  let pos;
  try {
    pos = positionFromFen(fen);
  } catch {
    return [];
  }
  const out = [];
  for (let i = 0; i < Math.min(n, pv.length); i++) {
    const san = pv[i];
    const move = parseSan(pos, san);
    if (!move || !pos.isLegal(move)) break;
    const color = pos.turn;
    let to;
    if (/^O-O-O/.test(san)) to = color === 'white' ? 'c1' : 'c8';
    else if (/^O-O/.test(san)) to = color === 'white' ? 'g1' : 'g8';
    else to = makeSquare(move.to);
    out.push({ from: makeSquare(move.from), to, promotion: move.promotion ?? null });
    pos.play(move);
  }
  return out;
}

