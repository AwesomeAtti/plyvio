/**
 * The Game Workspace's view of a game's moves, read from its movetext.
 *
 * §5.3 navigates by ply, and the board, the Evaluation Bar and the move list each
 * want a different slice of the same position, so one pass produces the array they
 * all index into. Ply 0 is the starting position, which no move produced; ply n is
 * the position after the nth move of the main line.
 *
 * Variations are not walked. §5 specifies no Section that shows one, and reading
 * preserves them either way — this takes the main line because the main line is what
 * the board plays through.
 *
 * The shape is terse because it repeats a few hundred times per game, and is the one
 * the components already consume:
 *
 *   s  SAN of the move that produced this position (null at ply 0)
 *   f  FEN of the resulting position
 *   m  [from, to] squares of that move, for last-move highlighting
 *   k  true when the side to move is in check
 *   e  evaluation in centipawns, from White's point of view, or null
 *   x  mate in n, signed from White's point of view; overrides e
 *   c  what remains of the comment once the banner has taken its commands, or null
 *   b  the engine's own move for this position, in SAN, or null
 *   sh drawn board annotations for this position — chessground DrawShape[],
 *      decoded from `[%csl]`/`[%cal]` (`pgn/boardAnnotations.js`); empty
 *      when the ply carries none
 *
 * `e` and `x` are read from `[%eval]`, which PGN writes from White's point of view
 * and which the schema work of 12 Sep confirmed describes the position the move led
 * to — so a move's own comment carries that move's evaluation. A game carrying none
 * leaves both null, which is every game in `games.js` today; §5.4.1's bar draws that
 * state rather than guessing at 0.00.
 *
 * Ply 0's `c`/`b`/`sh`/eval all read `doc.comments`, whether the game has
 * moves or not — never the first move's `startingAnn`. chessops only ever
 * fills a node's `startingAnn` for a comment at the start of a VARIATION
 * (right after its opening paren); a comment before the game's own first
 * move is read in the parser's ROOT frame and lands in the document's own
 * `comments` instead (`pgn.js`'s `handleComment`). `startingAnn` is
 * therefore always empty for the main line, found 24 Sep chasing "an arrow
 * drawn before the first move doesn't show up after reopening" —
 * `pgn/boardAnnotations.js`'s `applyShapesToMovetext` writes ply 0 to
 * `doc.comments` for the same reason.
 */

import { INITIAL_FEN } from 'chessops/fen';
import { readMovetext, resolveMovetext, engineSummary, shapesFromAnnotations } from '$lib/pgn/index.js';
import { movetextFromRow } from '$lib/data/games.js';

/**
 * Commands the comment banner draws, plus `engine` — not banner-drawn per
 * ply, but not prose either. `[%engine]` is document metadata (`doc.engine`
 * / `engineSummary`, read once for the whole game, not per ply) that PGN
 * still has to write somewhere textual, and the only somewhere is a leading
 * comment — `doc.comments`, the same place ply 0's own comment now reads
 * from (found 24 Sep, fixing ply 0 to read `doc.comments` at all for the
 * first time). Left out of this set, `[%engine ...]` would show up as
 * ply 0's comment text verbatim.
 *
 * A command with a banner is drawn by the banner and removed from the comment text, so it
 * is never shown twice. A command without one stays in the text exactly as written — the
 * banner is a presentation for commands we understand, not a filter that hides the rest.
 * Adding a banner for a command means adding it here and nowhere else.
 */
const BANNER_COMMANDS = new Set(['eval', 'bestmove', 'engine']);

/**
 * Chessground highlights the two squares a move ran between, so castling has to reach
 * it as the king's own journey — e1→c1 — rather than as chessops' king-takes-rook
 * encoding, which would light the square the rook came FROM and leave the king's
 * square unmarked.
 *
 * chessops encodes castling that way by design, because Chess960 needs it: the rook
 * may start on any file, so king-takes-rook is the only unambiguous form, and the
 * library uses it uniformly rather than per variant. It leaves the conversion to the
 * caller — its own `chessgroundMove()` helper passes the square through untouched —
 * and this is the caller. Nothing upstream is adjusted: `$lib/pgn` reports chessops'
 * value, and the board convention is applied here, once, at the boundary where it
 * actually applies.
 */
const CASTLE = /^O-O(-O)?[+#]?$/;

const boardDestination = (san, from, to) => {
  if (!from || !CASTLE.test(san)) return to;
  return `${san.startsWith('O-O-O') ? 'c' : 'g'}${from[1]}`;
};

/**
 * What is left of a comment once the banner has taken its share.
 *
 * Prose survives, and so does any command the banner does not draw — `[%clk]` today —
 * written exactly as the document wrote it. Several comments on one move join with a
 * space, which is what they mean: PGN allows more than one and gives no significance to
 * the boundary.
 */
const commentOf = (annotations) => {
  const pieces = [];
  for (const annotation of annotations ?? []) {
    for (const part of annotation.parts ?? []) {
      if (part.kind === 'text') {
        const value = part.value.trim();
        if (value) pieces.push(value);
      } else if (!BANNER_COMMANDS.has(part.name)) {
        pieces.push(part.raw);
      }
    }
  }
  const text = pieces.join(' ').trim();
  return text || null;
};

/**
 * The move the engine would have played, in SAN.
 *
 * `resolveMovetext` has already decided which position a `[%bestmove]` is read against
 * and turned it into SAN there; this takes that answer rather than forming a second one.
 * An unreadable or illegal value falls back to the raw UCI, because showing what the
 * document actually says beats showing nothing.
 */
const bestMoveOf = (annotations) => {
  for (const annotation of annotations ?? []) {
    const best = annotation.bestmove;
    if (best) return best.san ?? best.uci ?? null;
  }
  return null;
};

/** A ply's drawn board annotations — see `sh` above. */
const shapesOf = (annotations) => shapesFromAnnotations(annotations);

const none = () => ({ e: null, x: null });

/** `[%eval]` mapped onto the two fields §5.4.1's bar reads. The first one wins. */
const evaluationOf = (annotations) => {
  for (const annotation of annotations ?? []) {
    const ev = annotation.evaluation;
    if (!ev) continue;
    if (typeof ev.mate === 'number') return { e: null, x: ev.mate };
    if (typeof ev.pawns === 'number') return { e: Math.round(ev.pawns * 100), x: null };
  }
  return none();
};

/**
 * Walk a movetext document's main line into the per-ply array.
 *
 * Ply 0 has no move of its own to carry a comment, so it reads the
 * document's own leading comments (`doc.comments`) instead — see this
 * file's own header comment for why that is the only place it can be.
 */
export const pliesOf = (movetext) => readGame(movetext).plies;

/**
 * A movetext read once, into everything the Section needs.
 *
 * The engine context is a property of the *document*, not of a move: the extension writes
 * one `[%engine]` before the first move and every evaluation in the game is that engine's.
 * So it is read here and handed to the banner, rather than copied onto each ply.
 */
export const readGame = (movetext) => {
  const doc = resolveMovetext(readMovetext(movetext ?? ''));
  const plies = [];
  let node = doc.moves;

  while (node.children.length) {
    const next = node.children[0];
    if (!plies.length) {
      plies.push({
        s: null,
        f: next.data.fenBefore,
        m: null,
        k: false,
        c: commentOf(doc.comments),
        b: bestMoveOf(doc.comments),
        sh: shapesOf(doc.comments),
        ...evaluationOf(doc.comments)
      });
    }
    plies.push({
      s: next.data.san,
      f: next.data.fenAfter,
      m: next.data.from
        ? [next.data.from, boardDestination(next.data.san, next.data.from, next.data.to)]
        : null,
      k: next.data.check,
      c: commentOf(next.data.ann),
      b: bestMoveOf(next.data.ann),
      sh: shapesOf(next.data.ann),
      ...evaluationOf(next.data.ann)
    });
    node = next;
  }

  // A game with no moves is still a position to show.
  if (!plies.length) {
    plies.push({
      s: null, f: INITIAL_FEN, m: null, k: false,
      c: commentOf(doc.comments),
      b: bestMoveOf(doc.comments),
      sh: shapesOf(doc.comments),
      ...evaluationOf(doc.comments)
    });
  }
  return { plies, engine: doc.engine ? engineSummary(doc.engine) : null };
};

/**
 * The plies of a `games` row, parsed once.
 *
 * The row is resolved through §3.1's precedence rather than by reading a field: a row
 * carrying its own `movetext` is read from that, and one without — which is every row
 * in `samples/` and every row in `games.js` — has its PGN parsed for one. The rule
 * lives in `$lib/data`, so this applies it rather than restating it.
 *
 * Reading a movetext is not free — the whole 1,026-game sample takes a few hundred
 * milliseconds — and §5.3 asks for a position on every arrow key, so the walk happens
 * once per game rather than once per keystroke. Keyed on the row itself, so nothing is
 * held after the row goes.
 */
const cache = new WeakMap();

const readRow = (game) => {
  const hit = cache.get(game);
  if (hit) return hit;
  const read = readGame(movetextFromRow(game).movetext);
  cache.set(game, read);
  return read;
};

export const pliesFor = (game) => (game ? readRow(game).plies : []);

/** The engine that produced this game's evaluations, or null when none is declared. */
export const engineFor = (game) => (game ? readRow(game).engine : null);
