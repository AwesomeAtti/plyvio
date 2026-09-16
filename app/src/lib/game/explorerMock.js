/**
 * Mock position statistics for the Explorer.
 *
 * THE NUMBERS HERE ARE INVENTED. The Game Workspace reads `games.js` and never
 * opens the `.db` files, and no sample database carries a `positions` table yet
 * (database-schema §6 defines one; `build_samples.py` predates it). So this
 * stands in for the query until there is something to query.
 *
 * It is shaped as §6 rows — `move · games · white · draws · black` — so that
 * replacing it means replacing this file. Nothing downstream knows where a row
 * came from.
 *
 * THE MOVES ARE REAL. They are generated from the position with chessops, so
 * every row is a legal move and the move the game actually played is always
 * among them — which is what lets MX-09 mark it and scroll to it. Only the
 * counts are fiction.
 */

import { parseFen } from 'chessops/fen';
import { Chess } from 'chessops/chess';
import { makeSan } from 'chessops/san';
import { positionKey } from './explorer.js';

/** Deterministic: the same position and library always give the same answer. */
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const rng = (seed) => () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0) / 4294967296);

/** Legal moves from a FEN, in SAN. Promotions are shown as queening. */
function legalSans(fen) {
  try {
    const pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap();
    const out = [];
    for (const [from, dests] of pos.allDests()) {
      for (const to of dests) {
        const piece = pos.board.get(from);
        const promotion =
          piece?.role === 'pawn' && (to < 8 || to >= 56) ? 'queen' : undefined;
        const move = { from, to, ...(promotion ? { promotion } : {}) };
        try { out.push(makeSan(pos, move)); } catch { /* not a move we can name */ }
      }
    }
    return [...new Set(out)];
  } catch {
    return [];
  }
}

/**
 * How many of a library's games reach a position.
 *
 * Falls away with depth, which is the one thing about this that is true of real
 * data: a library holds every game at ply 0 and almost none of them by move 30.
 * The decay is tuned so a master-scale library reads in the low thousands around
 * move six, which is where the wireframe's figures sit.
 */
function gamesAtPosition(librarySize, ply, r) {
  const decayed = librarySize * Math.pow(0.55, ply) * (0.7 + r() * 0.6);
  return decayed < 1 ? 0 : Math.round(decayed);
}

/**
 * §6 rows for one position in one library.
 *
 * Returns [] where the library has nothing — the out-of-book state, which is
 * reachable here rather than hypothetical, because the decay above reaches zero.
 */
export function positionStats(fen, ply, library, playedSan = null) {
  if (!library || !fen) return [];
  const key = positionKey(fen);
  if (!key) return [];

  const r = rng(hash(`${library.id}|${key}`));
  const total = gamesAtPosition(library.games ?? 0, ply, r);
  if (total < 1) return [];

  const sans = legalSans(fen);
  if (!sans.length) return [];

  // A handful of moves carry a position; the rest are tried once and forgotten.
  const count = Math.min(sans.length, 1 + Math.floor(r() * 9));
  let chosen = sans
    .map((san) => ({ san, k: hash(`${key}|${san}`) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, count)
    .map((x) => x.san);

  /*
    The move the game actually played is always in the list, and leads it.
    MX-09 marks that row and scrolls to it, so a list that could omit it would
    leave the mark with nothing to point at. Leading is also the plausible
    shape: the move played in a game of this standard is usually a main one,
    and a mock that put 1.f3 above 1.e4 would be read as a bug on sight.
  */
  if (playedSan && sans.includes(playedSan)) {
    chosen = [playedSan, ...chosen.filter((s) => s !== playedSan)].slice(0, Math.max(count, 1));
  }

  // Descending weights, so one or two moves dominate as they do in practice.
  const weights = chosen.map((_, i) => Math.pow(0.55, i) * (0.75 + r() * 0.5));
  const sum = weights.reduce((a, w) => a + w, 0);

  let left = total;
  return chosen.map((move, i) => {
    const games = i === chosen.length - 1 ? left : Math.max(1, Math.round((weights[i] / sum) * total));
    left -= games;
    const g = Math.max(games, 1);

    // A White score a little above even, as a real corpus shows, plus drift.
    const drawRate = 0.25 + r() * 0.3;
    const whiteRate = (1 - drawRate) * (0.45 + r() * 0.16);
    const draws = Math.round(g * drawRate);
    const white = Math.round(g * whiteRate);
    return { move, games: g, white, draws, black: Math.max(0, g - white - draws) };
  }).filter((row) => row.games > 0);
}

/** The libraries the source slot offers: those indexed and enabled (§3.2.3.10). */
export const explorerLibraries = (databases = []) =>
  databases.filter((d) => d.status === 'indexed' && d.enabled)
           .map((d) => ({ id: d.id, name: d.name, games: d.games }));
