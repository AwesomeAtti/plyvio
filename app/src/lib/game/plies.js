/**
 * The Game Workspace's view of a game's moves, read from its movetext.
 *
 * §5.3 navigates by ply, and the board, the Evaluation Bar and the move list each
 * want a different slice of the same position, so one pass produces the tree they
 * all index into. Ply 0 is the starting position, which no move produced; a node
 * N plies deep is the position after N moves along whatever line reaches it.
 *
 * VARIATIONS ARE WALKED — Stage 5 of `analysis-board-plan.md`. Every child of
 * every node is kept, not just `children[0]` (the mainline continuation): the
 * shape below is a genuine tree, addressed by PATH (an array of child-indices
 * from the root, `[]` for the starting position, `[3,1,0]` for "4th mainline
 * ply's 2nd variation's 1st move"), the same convention Lichess and En
 * Croissant's own source both use — chosen, after reading both (25 Sep), over
 * a flat-index-plus-overlay scheme, which no reference tool uses.
 *
 * `pliesOf`/`pliesFor` still return the flat, MAINLINE-ONLY array components
 * built against before Stage 5 (the Evaluation Timeline's scrubber and the
 * Explorer/Engine Sections' move-number arithmetic still want exactly this,
 * and never needed to become variation-aware — see the plan doc's own Stage 5
 * scope). It is now derived from the tree (`lineFrom(tree)`) rather than being
 * the tree, so it is still there for anything holding onto the old shape.
 *
 * The per-node shape is terse because it repeats a few hundred times per game, and
 * is the one the components already consume:
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
 * `doc.comments` for the same reason. A comment at the START of a real
 * variation (right after its own opening paren) is the one place
 * `startingAnn`/`startingComments` legitimately fire — not read here, since
 * nothing yet writes a comment there; existing PGNs carrying one keep it
 * attached to the variation's own first node once chessops resolves it,
 * which `buildChildren` below reads off `child.data.ann` the same as any
 * other node, so it is not lost — just not distinguished from a comment
 * anywhere else on that node's own line.
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

/** One real move node's ply-shape, shared by every child regardless of depth
 *  or which line it's on — a variation's own moves are read exactly the way
 *  the mainline's are, off the same `data` shape `resolveMovetext` already
 *  produces for every node in the tree, not just `children[0]`. */
const nodePlyOf = (data) => ({
  s: data.san,
  f: data.fenAfter,
  m: data.from ? [data.from, boardDestination(data.san, data.from, data.to)] : null,
  k: data.check,
  c: commentOf(data.ann),
  b: bestMoveOf(data.ann),
  sh: shapesOf(data.ann),
  ...evaluationOf(data.ann)
});

/** The root's own ply-shape (ply 0) — the position before any move, read
 *  from the document's own leading comments rather than a move's `ann` (see
 *  this file's header comment for why). `fen` is §2.2's custom starting
 *  position; a game with at least one move reads its actual starting FEN
 *  off that move's own `fenBefore` instead, which is what `resolveMovetext`
 *  already resolved it against. */
const rootPlyOf = (doc, fen) => {
  const first = doc.moves.children[0];
  return {
    s: null,
    f: first ? first.data.fenBefore : (fen ?? INITIAL_FEN),
    m: null,
    k: false,
    c: commentOf(doc.comments),
    b: bestMoveOf(doc.comments),
    sh: shapesOf(doc.comments),
    ...evaluationOf(doc.comments)
  };
};

/** Every child of a chessops tree node, recursively, ply-shaped — not just
 *  `children[0]`. This is the one place Stage 5 actually changes what gets
 *  read: everything above builds one node's own shape the same way it
 *  always did, and this is what now visits all of them rather than
 *  discarding every sibling past the first. */
const buildChildren = (chessopsNode) =>
  chessopsNode.children.map((child) => ({
    ply: nodePlyOf(child.data),
    children: buildChildren(child)
  }));

/**
 * PATH utilities — a path is an array of child-indices from the root,
 * `[]` for the root itself (ply 0). Shared by `stores/game.js` (the
 * board/Section cursor and the pending-move overlay), `MoveList.svelte`
 * (walking every line to draw it), and `pgn/boardAnnotations.js` (locating
 * a path's node in the real chessops tree at save time, which uses the
 * same index-per-child convention so a path means the same thing in both
 * trees).
 */

/** The node at a path, or `null` if the path doesn't resolve (a stale path
 *  against a tree that changed shape under it — defensive, not expected in
 *  normal use since every path in state was computed against a tree of the
 *  same shape or an extension of it). */
export function nodeAtPath(root, path) {
  let node = root;
  for (const index of path ?? []) {
    node = node?.children?.[index];
    if (!node) return null;
  }
  return node ?? null;
}

/** One line from `node` (inclusive) to wherever `children[0]` runs out —
 *  the mainline read starting there. `basePath` is the path TO `node`
 *  itself, so the returned entries carry each one's real, absolute path
 *  rather than one relative to where the walk started. Used both for the
 *  game's own mainline (`basePath: []`, from the root) and for a
 *  variation's own line (`basePath` the path to wherever it branches off). */
export function lineFrom(node, basePath = []) {
  const out = [];
  let n = node;
  let path = basePath;
  while (n) {
    out.push({ ply: n.ply, path });
    if (!n.children.length) break;
    n = n.children[0];
    path = [...path, 0];
  }
  return out;
}

/** The path to the last node of the game's actual mainline — always
 *  `children[0]` at every step, regardless of what line the cursor is
 *  currently showing. This is what the `End` key jumps to (Lichess's own
 *  `last()`: "the end of the mainline", not "the end of whatever line
 *  you're in" — confirmed from its source, 25 Sep). */
export function mainlinePath(root) {
  const line = lineFrom(root);
  return line.at(-1)?.path ?? [];
}

/** A path as the string key `st.shapes`/`applyShapesToMovetext` address it
 *  by — `''` for the root, `'3.1.0'` for `[3,1,0]`. Plain `.join('.')`:
 *  every segment is a small non-negative integer, so there's no ambiguity
 *  to escape against. */
export const pathKey = (path) => (path ?? []).join('.');

/** The reverse of `pathKey` — `''` back to `[]`, `'3.1.0'` back to `[3,1,0]`. */
export const parsePathKey = (key) => (key === '' ? [] : key.split('.').map(Number));

/**
 * Walk a movetext document into its full tree — Stage 5's own change; see
 * this file's header comment. `readGame` below is the one caller, and the
 * tree is what everything else (the flat mainline `plies`, `stores/game.js`'s
 * pending-move overlay, the Moves Section) is now built from or against.
 */
const buildTree = (doc, fen) => ({
  ply: rootPlyOf(doc, fen),
  children: buildChildren(doc.moves)
});

/**
 * A movetext read once, into everything the Section needs.
 *
 * The engine context is a property of the *document*, not of a move: the extension writes
 * one `[%engine]` before the first move and every evaluation in the game is that engine's.
 * So it is read here and handed to the banner, rather than copied onto each ply.
 *
 * `options.fen` is §2.2's custom starting position (`games.fen`) — NULL/
 * absent means the standard initial array, same as the column itself.
 * `resolveMovetext` already knows how to start from an arbitrary FEN (built
 * for `[FEN]`-tagged imports); this is its second caller, not new chessops
 * surface. Threading it through fixes two things at once, found 24 Sep:
 * a custom-position game's ply 0 previously showed the standard start
 * whenever it had no moves yet, and Stage 3's New Game (a blank tab, or one
 * seeded by a pasted FEN) needed exactly this same plumbing to show
 * anything but the standard board.
 */
export const readGame = (movetext, { fen } = {}) => {
  const doc = resolveMovetext(readMovetext(movetext ?? ''), { fen });
  const tree = buildTree(doc, fen);
  const plies = lineFrom(tree).map((entry) => entry.ply);
  return { tree, plies, engine: doc.engine ? engineSummary(doc.engine) : null };
};

/**
 * Walk a movetext document's main line into the per-ply array — kept for
 * every caller that only ever wanted that (the Evaluation Timeline, and the
 * Explorer/Engine Sections' move-number arithmetic; see this file's header
 * comment). `readGame(movetext, options).plies` is the same array; this is
 * the older, narrower entry point some callers still use.
 */
export const pliesOf = (movetext, options) => readGame(movetext, options).plies;

/** The tree half of `readGame`, for a caller (MoveList's own tests) that wants
 *  variations rather than just the mainline `pliesOf` gives. */
export const treeOf = (movetext, options) => readGame(movetext, options).tree;

/**
 * The plies (and, since Stage 5, the tree) of a `games` row, parsed once.
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
  const { movetext, fen } = movetextFromRow(game);
  const read = readGame(movetext, { fen });
  cache.set(game, read);
  return read;
};

export const pliesFor = (game) => (game ? readRow(game).plies : []);

/** The engine that produced this game's evaluations, or null when none is declared. */
export const engineFor = (game) => (game ? readRow(game).engine : null);

/** This game's move tree, root at ply 0 — Stage 5's own addition, the same
 *  cached read `pliesFor`/`engineFor` already share. An empty game (no row)
 *  gets a bare, childless root at the standard start, matching `pliesFor`'s
 *  own `[]` for the same case at the flat-array level. */
export const treeFor = (game) =>
  game ? readRow(game).tree : { ply: { s: null, f: INITIAL_FEN, m: null, k: false, c: null, b: null, sh: [], ...none() }, children: [] };
