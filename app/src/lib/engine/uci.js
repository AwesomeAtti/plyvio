/**
 * UCI, the text protocol a chess engine speaks — pure, no DOM, no engine.
 *
 * Stage 1 of the live-engine plan (`engine-stage1-plan.md`). This file turns
 * what an engine prints into the rows the Engine Section already draws, and
 * builds the few commands the session sends. It knows nothing about workers,
 * tabs or stores; `session.js` does the talking, and the transport underneath
 * it does the carrying.
 *
 * THE ROW SHAPE IS THE ONE THE SECTION HAS ALWAYS DRAWN, on purpose:
 * `{ rank, e, x, depth, pv }` — the shape a fabricated line used to arrive
 * in, before Stage 2 gave the Section a real engine to read from — so
 * `EngineLines.svelte`, `GameSection.svelte` and the Evaluation Bar don't
 * need to know which kind of line they're reading.
 *
 *   rank   the engine's `multipv` index, 1 = best
 *   e      centipawns, WHITE-RELATIVE (like `[%eval]`), or null for a mate
 *   x      mate in n, WHITE-RELATIVE: positive when White mates, or null
 *   depth  the depth this line was reached at (not the limit asked for)
 *   pv     the line as SAN, from the position searched
 */
import { parseFen } from 'chessops/fen';
import { Chess, normalizeMove } from 'chessops/chess';
import { makeSan } from 'chessops/san';
import { parseUci } from 'chessops/util';

/* -------------------------------- commands ------------------------------ */

export const positionCommand = (fen) => `position fen ${fen}`;
export const goDepthCommand = (depth) => `go depth ${Math.round(depth)}`;
export const setOptionCommand = (name, value) => `setoption name ${name} value ${value}`;

/* --------------------------------- reading ------------------------------ */

/**
 * One `info` line, read — or `null` when the line is not a usable line of
 * analysis. Skipped, each for its own reason:
 *
 *   - anything that is not `info` (`bestmove`, `id`, `option`, `readyok`, …)
 *   - `info string …`, the engine talking about itself
 *   - `info depth N currmove …`, progress with no score and no line
 *   - a `lowerbound` / `upperbound` score: the search failed high or low
 *     and is about to re-search; the number is a bound, not an evaluation,
 *     and the line beside it is usually one move long
 *   - a line with no `pv`, or no `score`
 *
 * The score is returned as the engine printed it, from the SIDE TO MOVE's
 * point of view; `whiteRelative` turns it round.
 */
export function parseInfo(line) {
  const t = String(line ?? '').trim().split(/\s+/);
  if (t[0] !== 'info' || t[1] === 'string') return null;

  const out = { multipv: 1, depth: null, score: null, pv: [] };
  for (let i = 1; i < t.length; i++) {
    const k = t[i];
    if (k === 'depth') out.depth = Number(t[++i]);
    else if (k === 'multipv') out.multipv = Number(t[++i]);
    else if (k === 'score') {
      const kind = t[++i];
      const n = Number(t[++i]);
      if (kind === 'cp') out.score = { cp: n };
      else if (kind === 'mate') out.score = { mate: n };
    } else if (k === 'lowerbound' || k === 'upperbound') return null;
    else if (k === 'pv') {
      out.pv = t.slice(i + 1);
      break;                                   // `pv` is always last
    }
  }
  if (!out.score || !out.pv.length || !Number.isFinite(out.depth)) return null;
  return out;
}

/** `bestmove e2e4 ponder e7e5` → `'e2e4'`; anything else → `null`. */
export function parseBestMove(line) {
  const t = String(line ?? '').trim().split(/\s+/);
  return t[0] === 'bestmove' ? (t[1] ?? null) : null;
}

/** Whose move it is, from the FEN's second field. */
export const turnOf = (fen) => (String(fen ?? '').split(' ')[1] === 'b' ? 'black' : 'white');

/**
 * UCI scores are from the side to move; the Section, the Bar and `[%eval]`
 * are all White-relative. Black to move turns both kinds of score over.
 *
 * `mate 0` (the side to move is already mated) never reaches here — the
 * session doesn't search a position with no legal moves — but it stays 0,
 * which `evalScore()` prints as `#`.
 */
export function whiteRelative(score, turn) {
  const sign = turn === 'black' ? -1 : 1;
  if (score && 'mate' in score) return { e: null, x: score.mate === 0 ? 0 : sign * score.mate };
  if (score && 'cp' in score) return { e: sign * score.cp || 0, x: null };
  return { e: null, x: null };
}

function positionFrom(fen) {
  try {
    return Chess.fromSetup(parseFen(fen).unwrap()).unwrap();
  } catch {
    return null;
  }
}

/**
 * A UCI line as SAN, played out from `fen` with chessops.
 *
 * Castling arrives as the king's two-square move (`e1g1`), promotion with a
 * trailing piece letter (`a7a8q`); `normalizeMove` + `makeSan` read both,
 * the same way `pgn/movetext.js` reads a `[%bestmove]`. The line stops at
 * the first move that can't be read or isn't legal, rather than printing
 * anything past it — a truncated line is honest, a wrong one is not.
 */
export function pvToSan(fen, uciMoves = []) {
  const pos = positionFrom(fen);
  if (!pos) return [];
  const out = [];
  for (const uci of uciMoves) {
    const parsed = parseUci(uci);
    if (!parsed) break;
    const move = normalizeMove(pos, parsed);
    if (!pos.isLegal(move)) break;
    out.push(makeSan(pos, move));
    pos.play(move);
  }
  return out;
}

/**
 * The Section's rows for one position, from the latest `info` seen for each
 * `multipv` index. Ranked best first; a line whose first move could not be
 * read is dropped rather than shown empty.
 */
export function rowsFrom(fen, infos) {
  const turn = turnOf(fen);
  return [...infos]
    .sort((a, b) => a.multipv - b.multipv)
    .map((info) => ({
      rank: info.multipv,
      ...whiteRelative(info.score, turn),
      depth: info.depth,
      pv: pvToSan(fen, info.pv)
    }))
    .filter((row) => row.pv.length > 0);
}
