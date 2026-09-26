/**
 * Engine Section — geometry and shaping for the Section drawn in
 * `wireframes/game-engine.html` Rev A. G1 and G2 granted 21 Sep.
 *
 * A LIVE VIEW OF THE CURRENT POSITION, and nothing else (wireframe §4). It does
 * not read `[%eval]` to decide what to show, it does not write one, and it does
 * not walk the game. What it reports is about the position on the board at this
 * moment, and it is gone the moment the board moves — including a round trip
 * back to the same position.
 *
 * Pure functions, no DOM. The Section is sized to content, so its height is a
 * layout input the shell needs before the component renders — the same
 * arrangement the Explorer uses.
 */

import { parseFen } from 'chessops/fen';
import { Chess } from 'chessops/chess';
import { makeSan } from 'chessops/san';
import { pvMoves } from './moves.js';

/* ------------------------------ legal moves ------------------------------ */

/** A chessops position from a FEN, or null if the FEN doesn't parse. */
export function positionFrom(fen) {
  try {
    return Chess.fromSetup(parseFen(fen).unwrap()).unwrap();
  } catch {
    return null;
  }
}

/** Legal moves from a position, in a stable order, as {move, san}. */
export function legalMoves(pos) {
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

/**
 * Whether the position has anything to search at all.
 *
 * Separate from an analysis returning nothing, because the two empties mean
 * different things to the Section: no engine selected is one state and a
 * finished game is another, and the prototype's games all end in one.
 */
export function hasLegalMoves(fen) {
  return legalMoveCount(fen) > 0;
}

/**
 * How many legal moves the position has — the most principal variations an
 * engine can report for it, whatever MultiPV asks for. The store uses it for
 * the built-in engine too (`engineView.expectedLines`).
 */
export function legalMoveCount(fen) {
  const pos = positionFrom(fen);
  return pos ? legalMoves(pos).length : 0;
}

/* --------------------------------- the row ------------------------------ */

/*
  Built on the Explorer's grid, because there is no reason for two Sections
  in one panel to put rows on different ones: a 30px header, 3px of padding
  either side of the body, 24px rows.
*/
export const ENGINE_ROW_H = 24;
export const ENGINE_BODY_PAD = 6;

/*
  Wireframe §6, Q5 and Q6 — the Section shows one to three principal variations
  and is sized to that count, which lands its floor and its ceiling on exactly
  the Explorer's 60 and 108. Arrived at from the same header, padding and row
  height rather than copied from it.
*/
export const ENGINE_MIN_LINES = 1;
export const ENGINE_MAX_LINES = 3;
export const ENGINE_DEFAULT_LINES = 2;      // the count the concept was drawn with

/*
  The depth LIMIT — the search's configured ceiling, the `depth` in `go depth N`
  — and not the depth reached, which is per row. Q5 keeps both in the options
  menu and labels them apart for exactly this reason.

  THE RANGE AND STEP ARE A BUILD DECISION. The wireframe drew the control at 24
  and said nothing about its bounds. They are written here rather than inline so
  that there is one place to reconcile them when the same setting is drawn in
  Settings (§3.4.8), where the engine's own defaults live.
*/
export const ENGINE_DEPTH_MIN = 10;
export const ENGINE_DEPTH_MAX = 40;
export const ENGINE_DEPTH_STEP = 2;
export const ENGINE_DEFAULT_DEPTH = 24;     // the value the options menu was drawn at

export const clampLines = (n) =>
  Math.max(ENGINE_MIN_LINES, Math.min(ENGINE_MAX_LINES, Math.round(n || 0)));

export const clampDepth = (n) =>
  Math.max(ENGINE_DEPTH_MIN, Math.min(ENGINE_DEPTH_MAX, Math.round(n || 0)));

/**
 * §5.4.2's height contract, for a Section sized to content between a 60px floor
 * and a 108px ceiling.
 *
 * A state message — off, or no engine configured — sits at the floor, so a
 * state is never taller than the row it replaced.
 */
export function engineHeight(lineCount, headerH = 30) {
  const lines = Math.min(Math.max(lineCount, ENGINE_MIN_LINES), ENGINE_MAX_LINES);
  return headerH + ENGINE_BODY_PAD + lines * ENGINE_ROW_H;
}

/* ------------------------------- the source ----------------------------- */

/** Name and version, the way the concept labelled the source slot. */
export const engineLabel = (e) => [e?.name, e?.version].filter(Boolean).join(' ');

/**
 * What the source slot offers: the engines that are installed and turned on.
 *
 * The same rule the Explorer applies to libraries — `indexed && enabled`
 * there, `ready && enabled` here — so one switch in Settings governs whether an
 * object is offered to the workspace at all.
 *
 * `kind` rides along (`'wasm' | 'native'`) so callers can tell a real,
 * searchable engine from a still-mocked one without re-deriving it —
 * engine Stage 2, 26 Sep 2026, replacing the old `isBuiltinEngine(id)`
 * special case (Stage 1 had exactly one hard-coded real engine; Stage 2 can
 * have zero or more real `kind: 'wasm'` rows, so "is this real" moved from a
 * fixed id to a fact about the row). No more built-in-first sort, either —
 * that existed only because Stage 1's one real engine had to be findable as
 * a sensible default; nothing is pinned to the front any more, and Settings'
 * own order (`config.db`'s `order by id`) is left alone.
 */
export const engineSources = (engines = []) =>
  (engines ?? [])
    .filter((e) => e.status === 'ready' && e.enabled)
    .map((e) => ({ id: e.id, name: engineLabel(e), protocol: e.protocol ?? 'UCI', kind: e.kind }));

/** Whether a source from `engineSources()` is real and searchable (Stage 2: `kind: 'wasm'` only; Stage 3 adds native). */
export const isRealEngine = (source) => source?.kind === 'wasm';

/**
 * Q2 — the Section cannot be on without an engine selected. One place decides
 * it, because three surfaces ask: the switch's disabled state, the body's
 * state message, and whether the Evaluation Bar has anything live to mirror.
 */
export const canAnalyse = (source) => !!source;

/* -------------------------------- the line ------------------------------ */

/**
 * A principal variation as the row prints it: `19. Nd2 Bd8 20. Nb3 Bb6 21. Rc1`.
 *
 * Numbering follows the Explorer's, ellipsis included, so a move number
 * means one thing down the whole panel. The row truncates this with an
 * ellipsis; it is never wrapped or shortened here, because where it truncates
 * depends on the width it is drawn at.
 */
export function formatPv(sans = [], moveNumber = 1, blackToMove = false) {
  const out = [];
  let n = moveNumber;
  let black = blackToMove;
  for (const san of sans) {
    if (black) {
      out.push(out.length === 0 ? `${n}… ${san}` : san);
      n += 1;
    } else {
      out.push(`${n}. ${san}`);
    }
    black = !black;
  }
  return out.join(' ');
}

/** The reached depth, as the row prints it beside the score. */
export const formatDepth = (d) => (d == null ? '' : `d${d}`);

/* --------------------------- hover preview ------------------------------ */

/**
 * ACTIONS.md, 25 Sep — hovering a line draws its next two plies on the
 * board: first ply green, second red. Chessground's own built-in brushes
 * (`DrawBrushes` ships both), so nothing new is registered.
 */
const HOVER_BRUSHES = ['green', 'red'];

/**
 * The board's `autoShapes` for a hovered engine line — `null` (nothing
 * hovered, or no position to draw against) means nothing to draw. Squares
 * come from `pvMoves`, which already resolves castling to the king's
 * landing square and stops at the first ply it can't read; this only maps
 * whatever it returns onto chessground's own shape format, one brush per ply.
 */
export function engineHoverAutoShapes(fen, line) {
  if (!fen || !line) return [];
  return pvMoves(fen, line.pv, HOVER_BRUSHES.length)
    .map((m, i) => ({ orig: m.from, dest: m.to, brush: HOVER_BRUSHES[i] }));
}
