/**
 * Mock analysis for the Engine Section.
 *
 * THE PROTOTYPE RUNS NO ENGINE. There is no UCI process here, no `go depth N`,
 * and nothing in this file talks to a binary: the Section was built against
 * mock static data by agreement, so that every state the wireframe draws is
 * reachable and testable before a real engine is wired in.
 *
 * IT IS SHAPED LIKE A SEARCH RESULT — one entry per principal variation, ranked
 * best first, each carrying a score, the depth reached and the line itself — so
 * replacing it means replacing this file. Nothing downstream knows or cares
 * where a line came from.
 *
 * THE MOVES ARE REAL. Each PV is played out on the position with chessops, so
 * every line is a legal sequence from the board as it stands. Only the scores
 * are fiction — the same division `explorerMock.js` draws between real moves
 * and invented numbers.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It never reports a mate score. A fabricated
 * mate announcement is a claim about the position that the row would state in
 * the strongest terms available to it (`M3`), and unlike a plausible centipawn
 * number it is falsifiable on sight by anyone who looks at the board. The
 * formatter handles mate because `evalScore()` already does; the mock does not
 * produce one.
 */
import { parseFen } from 'chessops/fen';
import { Chess } from 'chessops/chess';
import { makeSan } from 'chessops/san';
import { positionKey } from './explorer.js';
import { clampDepth, clampLines } from './engine.js';

/** How many plies of line to generate. The row truncates; it never wraps. */
const PV_PLIES = 6;

/** Deterministic: the same position, engine and settings always agree. */
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const rng = (seed) => () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0) / 4294967296);

function positionFrom(fen) {
  try {
    return Chess.fromSetup(parseFen(fen).unwrap()).unwrap();
  } catch {
    return null;
  }
}

/** Legal moves from a position, in a stable order, as {move, san}. */
function legalMoves(pos) {
  const out = [];
  try {
    for (const [from, dests] of pos.allDests()) {
      for (const to of dests) {
        const piece = pos.board.get(from);
        const promotion = piece?.role === 'pawn' && (to < 8 || to >= 56) ? 'queen' : undefined;
        const move = { from, to, ...(promotion ? { promotion } : {}) };
        try {
          out.push({ move, san: makeSan(pos, move) });
        } catch {
          /* not a move we can name */
        }
      }
    }
  } catch {
    return [];
  }
  return out;
}

/*
  PLAUSIBILITY, NOT STRENGTH.

  Ordering the candidate moves by hash alone put `1. f3` and `1. Nh3` at the top
  of the pane, which reads as a broken engine rather than as mock data and makes
  the Section useless for judging the design it is there to exercise. This is a
  crude static preference — the centre, development, captures — applied only to
  the ORDER the mock offers its first moves in.

  It is not a search and it is not an evaluation. Nothing downstream reads it,
  the scores are still fiction, and deleting it would change how sensible the
  lines look and nothing else.
*/
const CENTRE = new Set(['d4', 'd5', 'e4', 'e5']);
const WIDE_CENTRE = new Set(['c4', 'c5', 'd3', 'd6', 'e3', 'e6', 'f4', 'f5']);

function plausibility(san) {
  let v = 0;
  if (san.includes('x')) v += 3;                       // a capture is at least a candidate
  if (san.endsWith('+')) v += 1;
  const to = san.replace(/[+#]$/, '').slice(-2);
  if (CENTRE.has(to)) v += 3;
  else if (WIDE_CENTRE.has(to)) v += 2;
  if (/^[NB]/.test(san)) v += 2;                       // developing move
  if (/^[a|h]/.test(san)) v -= 2;                      // a rook's pawn, this early
  if (/^Q/.test(san)) v -= 1;                          // the queen out first
  if (/^[NB][a-h][1-8]?[13]$/.test(san)) v -= 1;       // back to the back rank
  if (/^(O-O|O-O-O)/.test(san)) v += 3;
  return v;
}

/**
 * One line, played out from a chosen first move.
 *
 * Continuations are picked by hash rather than by any notion of strength: this
 * is a legal sequence that looks like a line, not a search result. The walk
 * stops at the end of the game, which is why a line can be shorter than
 * PV_PLIES.
 */
function walk(pos, first, key) {
  const board = pos.clone();
  const sans = [first.san];
  board.play(first.move);

  for (let i = 1; i < PV_PLIES; i++) {
    const moves = legalMoves(board);
    if (!moves.length) break;
    const pick = moves
      .map((m) => ({ ...m, p: plausibility(m.san), k: hash(`${key}|${i}|${m.san}`) }))
      .sort((a, b) => b.p - a.p || a.k - b.k)[0];
    sans.push(pick.san);
    board.play(pick.move);
  }
  return sans;
}

/**
 * Whether the position has anything to search at all.
 *
 * Separate from `analyse()` returning nothing, because the two empties mean
 * different things to the Section: no engine selected is one state and a
 * finished game is another, and the prototype's games all end in one.
 */
export function hasLegalMoves(fen) {
  const pos = positionFrom(fen);
  return !!pos && legalMoves(pos).length > 0;
}

/**
 * The Section's lines for one position.
 *
 * Returns [] where there is nothing to analyse — no engine, no position, or a
 * game that is already over — which is the same empty the caller shows a state
 * message for.
 *
 * Scores are WHITE-RELATIVE, like `[%eval]` and like the Evaluation Bar that
 * mirrors them, so the two never disagree about which way up the number is.
 * Ranking is from the side to move: each line after the first is worse for
 * whoever is on move, which with a White-relative score means descending for
 * White and ascending for Black. A second line that outscored the first would
 * read as a bug on sight.
 */
export function analyse(fen, { engineId = '', lines = 2, depth = 24 } = {}) {
  if (!engineId || !fen) return [];
  const pos = positionFrom(fen);
  if (!pos) return [];

  const moves = legalMoves(pos);
  if (!moves.length) return [];

  const key = positionKey(fen) ?? fen;
  const want = clampLines(lines);
  const reached = clampDepth(depth);
  const r = rng(hash(`${engineId}|${key}|${reached}`));

  /*
    A handful of first moves, deterministically ordered. MultiPV asks for the
    best n; this stands in for that ordering with a stable one, which is all the
    Section's layout and states need from it.
  */
  const chosen = moves
    .map((m) => ({ ...m, p: plausibility(m.san), k: hash(`${key}|${m.san}`) }))
    .sort((a, b) => b.p - a.p || a.k - b.k)
    .slice(0, Math.min(want, moves.length));

  // A quiet middlegame number, then a gap per line: small, as real MultiPV
  // output is when the top moves are close.
  const best = Math.round((r() * 120 - 40));
  const gap = () => 4 + Math.round(r() * 22);
  const forWhite = pos.turn === 'white';

  let score = best;
  return chosen.map((m, i) => {
    if (i > 0) score += forWhite ? -gap() : gap();
    return {
      rank: i + 1,
      e: score,          // centipawns, White-relative — `evalScore()` prints it
      x: null,           // mate: never fabricated here, see the header
      depth: reached,
      pv: walk(pos, m, `${key}|${i}`)
    };
  });
}
