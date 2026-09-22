/**
 * STOPGAP — to be replaced, or folded into an indexing feature, once the UI
 * has a place to trigger indexing (not yet decided). Added ahead of that
 * decision on 22 Sep 2026; it keeps working until then. Only caller: the
 * Sample Games seed in `data/backends/pwa.js`. Nothing keeps the table
 * current as games are added. Tracked in ACTIONS.md, "STOPGAP: the PWA builds `positions` itself".
 *
 * Populate the `positions` table (database-schema.md §6) from a set of
 * seeded game rows — the PWA's own equivalent of `samples/build_positions.py`,
 * run once at Sample Games' seed time rather than as a separate offline
 * pass, because the PWA's per-library database is built at runtime from
 * `mock-data/sample-games.js` and has no `.db` file for that script to
 * target.
 *
 * Mirrors `build_positions.py`'s algorithm exactly, reusing this codebase's
 * own movetext reader (`$lib/pgn`, the same one `game/plies.js` walks) and
 * `game/explorer.js`'s own `positionKey()` — the same §6.2 key both the
 * Section and the Python script compute independently. A generator that
 * keyed positions differently would silently produce a table that never
 * matches a live query, which is why this reuses `positionKey()` rather
 * than reimplementing it a third time. No new dependency: chessops and the
 * movetext reader are already in the bundle and already used for exactly
 * this kind of walk elsewhere (`game/plies.js`, `game/explorerMock.js`).
 */

import { readMovetext, resolveMovetext } from '$lib/pgn/index.js';
import { movetextFromRow } from '$lib/data/games.js';
import { positionKey } from './explorer.js';

/** database-schema.md §6.3: an unrecorded or unrecognised result has no side. */
const RESULT_SIDE = { '1-0': 'white', '0-1': 'black', '1/2-1/2': 'draws' };

/**
 * Walk one game's main line — variations are not part of this table, the
 * same choice `game/plies.js` makes for the board — and yield this game's
 * contribution: one `{ pos, move, side }` per distinct position it reached,
 * crediting only the FIRST time it reaches a given position.
 *
 * §6.3: "A game contributes at most once to any position." A game that
 * transposes back into a position it already passed through must not be
 * counted a second time there, however many times it revisits it or
 * whichever move it plays on a later visit — `seen` is keyed by `pos` alone,
 * matching `build_positions.py`'s own `seen` set exactly.
 */
function* positionsInGame(row) {
  const { movetext } = movetextFromRow(row);
  const doc = resolveMovetext(readMovetext(movetext));
  const side = RESULT_SIDE[row.result] ?? null;

  const seen = new Set();
  let node = doc.moves;
  while (node.children.length) {
    const next = node.children[0];
    const pos = positionKey(next.data.fenBefore);
    const move = next.data.san;
    node = next;
    if (!pos || seen.has(pos)) continue;
    seen.add(pos);
    yield { pos, move, side };
  }
}

/**
 * Every seeded game's `positions` rows, aggregated — the exact shape §6.1's
 * table stores: one row per `(pos, move)`, with `games`/`white`/`draws`/
 * `black` computed the same way `build_positions.py` computes them from the
 * desktop corpus.
 *
 * A row that fails to parse is skipped, logged, and does not stop the rest
 * — the same stance `build_positions.py` takes (one bad game must not block
 * a build) — since this runs once, silently, at first PWA launch, with no
 * user watching a script's stderr.
 *
 * @param {object[]} games rows shaped like `mock-data/sample-games.js`'s `GAMES`
 * @returns {{pos: string, move: string, games: number, white: number, draws: number, black: number}[]}
 */
export function computePositions(games) {
  const totals = new Map(); // `${pos}\u0000${move}` -> [games, white, draws, black]

  for (const row of games ?? []) {
    let contributions;
    try {
      contributions = [...positionsInGame(row)];
    } catch (err) {
      console.error(
        `Plyvio: skipping unreadable game (id ${row?.id}) while building positions`, err
      );
      continue;
    }
    for (const { pos, move, side } of contributions) {
      const key = `${pos}\u0000${move}`;
      const counts = totals.get(key) ?? [0, 0, 0, 0];
      counts[0] += 1;
      if (side === 'white') counts[1] += 1;
      else if (side === 'draws') counts[2] += 1;
      else if (side === 'black') counts[3] += 1;
      totals.set(key, counts);
    }
  }

  return [...totals.entries()].map(([key, [g, w, d, b]]) => {
    const sep = key.indexOf('\u0000');
    return { pos: key.slice(0, sep), move: key.slice(sep + 1), games: g, white: w, draws: d, black: b };
  });
}
