/**
 * Read and write `games.movetext` (database-schema §3).
 *
 * The move tree is chessops' own tree, not a second one of ours: §3.2 says movetext
 * "does not redefine" PGN notation and that no proprietary move-tree representation is
 * required, so `walk`, `transform` and the node children all keep working and the
 * annotations ride alongside each node's raw comments.
 *
 * Reading takes no position and does no chess. Legality, per-ply FEN and the SAN form
 * of a `[%bestmove]` come from `resolveMovetext`, which is a separate pass because
 * most callers — the Library list, a `ply_count` sweep — do not need a board.
 *
 * Writing is our own serializer rather than chessops' `makePgn`, for three reasons:
 * an unmodified comment must be re-emitted verbatim (§3.1 replaces the whole document
 * on every write, so a parser's canonical form would rewrite every game the first time
 * it was touched); `makePgn` omits the `N...` before a black move that follows a
 * comment, which the PGN standard requires and every source in `samples/` writes; and
 * line width has to be ours to choose.
 */

import { parsePgn, emptyHeaders, transform } from 'chessops/pgn';
import { makeFen, parseFen } from 'chessops/fen';
import { parseSan, makeSan } from 'chessops/san';
import { parseUci, makeSquare } from 'chessops/util';
import { defaultPosition, setupPosition, normalizeMove } from 'chessops/variant';
import { parseAnnotation, formatAnnotation } from './annotations.js';
import { BESTMOVE_REFERS_TO, sideForBestMove } from './bestMove.js';

export class MovetextError extends Error {}

const RESULT = /(?:^|\s)(1-0|0-1|1\/2-1\/2|\*)\s*$/;

/** The result token, if the movetext ends in one. Comments are ignored while looking. */
const trailingResult = (text) => {
  const bare = text.replace(/\{[^}]*\}/g, ' ');
  const match = RESULT.exec(bare);
  return match ? match[1] : null;
};

const annotate = (node) => {
  for (const child of node.children) {
    child.data.ann = (child.data.comments ?? []).map(parseAnnotation);
    child.data.startingAnn = (child.data.startingComments ?? []).map(parseAnnotation);
    annotate(child);
  }
};

/**
 * Read a movetext document.
 *
 * @param {string} text movetext only — never a tag pair section (§3.1)
 * @returns {{comments: object[], engine: object|null, moves: object, result: string|null}}
 */
export const readMovetext = (text) => {
  const source = text ?? '';
  const games = parsePgn(source, emptyHeaders);
  if (games.length > 1) {
    throw new MovetextError('movetext holds more than one game; §3.1 stores one document');
  }
  const game = games[0];
  const comments = (game?.comments ?? []).map(parseAnnotation);
  const moves = game?.moves ?? { children: [] };
  annotate(moves);
  return {
    comments,
    engine: comments.map((a) => a.engine).find(Boolean) ?? null,
    moves,
    result: trailingResult(source),
  };
};

const commentToken = (annotation, spacing) => {
  const body = formatAnnotation(annotation);
  return spacing === 'padded' ? `{ ${body} }` : `{${body}}`;
};

const emitNode = (node, ply, tokens, force, spacing) => {
  let forceNumber = force;
  for (const annotation of node.data.startingAnn ?? []) {
    tokens.push(commentToken(annotation, spacing));
    forceNumber = true;
  }
  if (forceNumber || ply % 2 === 0) {
    tokens.push(`${Math.floor(ply / 2) + 1}${ply % 2 ? '...' : '.'}`);
  }
  tokens.push(node.data.san);
  forceNumber = false;
  for (const nag of node.data.nags ?? []) {
    tokens.push(`$${nag}`);
    forceNumber = true;
  }
  for (const annotation of node.data.ann ?? []) {
    tokens.push(commentToken(annotation, spacing));
    forceNumber = true;
  }
  return forceNumber;
};

const emitFrom = (parent, ply, tokens, force, spacing) => {
  let node = parent;
  let current = ply;
  let forceNumber = force;
  while (node.children.length) {
    const children = node.children;
    forceNumber = emitNode(children[0], current, tokens, forceNumber, spacing);
    for (let i = 1; i < children.length; i++) {
      const inner = [];
      const innerForce = emitNode(children[i], current, inner, true, spacing);
      emitFrom(children[i], current + 1, inner, innerForce, spacing);
      tokens.push(`(${inner.join(' ')})`);
      forceNumber = true;
    }
    node = children[0];
    current += 1;
  }
};

const wrapTokens = (tokens, wrap) => {
  if (!wrap) return tokens.join(' ');
  const lines = [];
  let line = '';
  for (const token of tokens) {
    if (!line) line = token;
    else if (line.length + 1 + token.length <= wrap) line += ` ${token}`;
    else {
      lines.push(line);
      line = token;
    }
  }
  if (line) lines.push(line);
  return lines.join('\n');
};

/**
 * Write a movetext document.
 *
 * @param {object} doc from `readMovetext`
 * @param {object} [options]
 * @param {'tight'|'padded'} [options.spacing] `{...}` or `{ ... }` around comment bodies.
 *        chessops discards a comment's inner padding, so this is a document-wide choice
 *        rather than a per-comment one. `tight` is what the specifications print.
 * @param {number|null} [options.wrap] column to wrap at, or null for one line
 * @param {string|null} [options.result] override the trailing result token
 */
export const writeMovetext = (doc, options = {}) => {
  const { spacing = 'tight', wrap = 80, result = doc.result } = options;
  const tokens = [];
  for (const annotation of doc.comments ?? []) tokens.push(commentToken(annotation, spacing));
  emitFrom(doc.moves, 0, tokens, true, spacing);
  if (result) tokens.push(result);
  return wrapTokens(tokens, wrap);
};

/**
 * Fold newly played moves into the tree at THEIR OWN branch point — Stage 4
 * of `analysis-board-plan.md`, generalized by Stage 5 to attach anywhere,
 * not only at the mainline's own last node. Each entry is
 * `{ parentPath, ply: { s } }`: `parentPath` is the path (an array of
 * child-indices from the root, `game/plies.js`'s own convention) to the
 * node this move is played FROM, recorded at the moment it was played
 * (`stores/game.js`'s `playMove`) — so a move played at the mainline's true
 * end attaches as that node's first child (extending the mainline, Stage
 * 4's whole scope), and a move played anywhere else attaches as an
 * ADDITIONAL child (a new variation, or a further move along one already
 * begun this session). Nothing but `ply.s` (the SAN) is stored on a new
 * node — a save always re-reads the game fresh afterwards (`realGames` is
 * evicted and `loadRealGame` reruns), so nothing here needs to be right the
 * first time except the move itself.
 *
 * Entries must be processed in the order they were played: a later entry's
 * `parentPath` may name a node THIS function is about to create (playing a
 * second move onto a variation begun a moment before), and paths are only
 * meaningful once every earlier entry has already been attached. Each
 * entry is pushed as the LAST child of its parent, which is what makes an
 * entry's own resulting path predictable at play time without consulting
 * the real document: `parentPath` had exactly `childIndex` children before
 * this call (base document children plus anything this same fold has
 * already added), so the new node's path is `[...parentPath, childIndex]`
 * — `stores/game.js` computes that once, when the move is played, and
 * hands it to the NEXT entry as ITS `parentPath` if another move follows
 * from there this session.
 *
 * Mutates `doc` in place and returns it, the same convention
 * `applyShapesToMovetext` uses, since both run once on a document about to
 * be thrown away after `writeMovetext` reads it.
 *
 * @param {object} doc from `readMovetext` (resolved or not — only
 *   `.moves`'s tree shape matters, not the per-node FEN/check fields
 *   `resolveMovetext` adds, which `writeMovetext` never reads anyway).
 * @param {{parentPath: number[], ply: {s: string}}[]} pendingMoves in the
 *   order they were played.
 */
export function appendMoveTree(doc, pendingMoves) {
  if (!pendingMoves?.length) return doc;
  for (const { parentPath, ply } of pendingMoves) {
    let node = doc.moves;
    for (const index of parentPath ?? []) node = node.children[index];
    node.children.push({
      data: { san: ply.s, nags: [], ann: [], startingAnn: [], comments: [], startingComments: [] },
      children: [],
    });
  }
  return doc;
}

/**
 * Promote the node at `path` past one branch point — Stage 6 of
 * `analysis-board-plan.md`. Genuinely generic over any `{children:[...]}`
 * -shaped node tree, not just this file's own PGN doc tree
 * (`{data, children}`): the algorithm only ever touches `.children`
 * arrays, so it works unchanged against `game/plies.js`'s separate, UI-
 * facing `{ply, children}` tree too — `stores/game.js` runs it against
 * THAT tree the moment the user promotes something, and `applyTreeEdits`
 * below runs it again, from scratch, against the real document at save
 * time. This is why it lives here rather than in `game/plies.js`, which
 * already depends on this module (`readMovetext`/`resolveMovetext`) — the
 * reverse import would cycle.
 *
 * Matches Lichess's `tree.ts` `promoteAt` and En Croissant's
 * `promoteVariation`/`promoteToMainline` (both read directly, 25 Sep, not
 * guessed at): walk from `path`'s DEEPEST non-root index up toward the
 * root, and at each one, move that child to the front of its parent's
 * `children` — everything between the old front and the promoted child's
 * old slot shifts right by one to make room, nothing else moves.
 * `toMainline: false` (Lichess's "Promote Variation") stops after the
 * first such swap; `true` ("Make Main Line") keeps going to the root, so a
 * variation nested inside another variation becomes the game's own actual
 * mainline in one call rather than needing one call per level. Plyvio's
 * own Promote Variation moves a line up ONE step instead (`moveChildAt`,
 * via `variationEditsAt` below); only Make Main Line uses this.
 *
 * Mutates `root` in place. Returns the swaps actually made, deepest first,
 * as `{depth, from}` — `from` is the promoted child's OLD index at that
 * depth, which is exactly what every OTHER path-addressed piece of state
 * (the cursor, drawn shapes, still-pending moves, a held engine line) needs
 * to re-key itself against: a path sharing `path.slice(0, depth)` has its
 * OWN segment at `depth` remapped the same way this swap just remapped the
 * promoted line's (`stores/game.js`'s `promote`/`remapPath`) — everything
 * shallower or deeper than `depth` is untouched by a swap AT `depth`, so
 * the swaps can be applied to another path in any order.
 *
 * @param {object} root a `{children}`-shaped tree node — `doc.moves` for a
 *   PGN doc, or a `game/plies.js` tree's own root.
 * @param {number[]} path to the node being promoted.
 * @param {{toMainline?: boolean}} [options]
 * @returns {{depth: number, from: number}[]}
 */
export function promoteAt(root, path, { toMainline = false } = {}) {
  const swaps = [];
  for (let depth = (path?.length ?? 0) - 1; depth >= 0; depth--) {
    const from = path[depth];
    if (from === 0) continue; // already first at this depth -- nothing to promote past
    let parent = root;
    for (let i = 0; i < depth; i++) parent = parent?.children?.[path[i]];
    if (!parent?.children?.[from]) break;
    const [node] = parent.children.splice(from, 1);
    parent.children.unshift(node);
    swaps.push({ depth, from });
    if (!toMainline) break;
  }
  return swaps;
}

/*
 * Variation editing: reorder and delete. Like `promoteAt` above, every
 * function here is generic over any `{children:[...]}`-shaped tree, so the
 * same code edits the live `game/plies.js` tree the moment a command is
 * chosen and the real PGN document again at save time.
 *
 * Every edit reports what it did as a list of primitive CHANGES, each one
 * touching the children of exactly one parent:
 *
 *   { op: 'move-child', parentPath, from, to }  one child moved from index
 *                                               `from` to index `to`;
 *   { op: 'delete', path }                      one child and its whole
 *                                               subtree removed.
 *
 * `remapPathThroughChange` turns a change into the matching update for any
 * OTHER path that addressed the same tree (the cursor, drawn shapes, a held
 * engine result), so nothing is left pointing at the wrong position.
 */

const parentAt = (root, parentPath) => {
  let node = root;
  for (const index of parentPath ?? []) node = node?.children?.[index];
  return node ?? null;
};

/** True when every segment is 0 — the path runs down the main line. */
export const isMainlinePath = (path) => (path ?? []).every((seg) => seg === 0);

/**
 * Depth of the branch point that starts the line `path` belongs to: the
 * deepest non-zero segment. -1 on the main line, which has no branch point
 * of its own.
 */
export function lineBranchDepth(path) {
  for (let d = (path?.length ?? 0) - 1; d >= 0; d--) if (path[d] !== 0) return d;
  return -1;
}

/**
 * Move one child of the node at `parentPath` from index `from` to index
 * `to`; everything in between shifts by one. Mutates `root`. Returns the
 * change made, or `null` when either index is out of range or they match.
 */
export function moveChildAt(root, parentPath, from, to) {
  const parent = parentAt(root, parentPath);
  const kids = parent?.children;
  if (!kids || from === to || !kids[from] || to < 0 || to >= kids.length) return null;
  const [node] = kids.splice(from, 1);
  kids.splice(to, 0, node);
  return { op: 'move-child', parentPath: [...(parentPath ?? [])], from, to };
}

/**
 * Remove the node at `path` and everything after it. Its later siblings
 * shift down by one, so deleting a main-line move that had alternatives
 * makes the first alternative the main continuation. Mutates `root`.
 * Returns the change made, or `null` if nothing is at `path` (the root
 * itself cannot be deleted).
 */
export function deleteAt(root, path) {
  if (!path?.length) return null;
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  const parent = parentAt(root, parentPath);
  if (!parent?.children?.[index]) return null;
  parent.children.splice(index, 1);
  return { op: 'delete', path: [...path] };
}

/**
 * What each variation command would do from the move at `path`, against
 * `root` as it stands: an edit object for `applyTreeEdit`, or `null` when
 * the command does not apply to that move (the menu shows it disabled).
 *
 *   promote          one step up at the line's own branch point;
 *   demote           one step down there. On a main-line move, the move's
 *                    own point: disabled when it has no alternative;
 *   mainline         Make Main Line, cascading to the root;
 *   deleteFromHere   this move and everything after it;
 *   deleteVariation  the whole line the move belongs to, from its first
 *                    move. Sibling lines are untouched.
 */
export function variationEditsAt(root, path) {
  const none = { promote: null, demote: null, mainline: null, deleteFromHere: null, deleteVariation: null };
  if (!path?.length || !parentAt(root, path)) return none;
  const d = lineBranchDepth(path);
  const onMain = d === -1;
  const at = onMain ? path.length - 1 : d;
  const parentPath = path.slice(0, at);
  const from = path[at];
  const siblings = parentAt(root, parentPath).children.length;
  return {
    promote: !onMain ? { op: 'move-child', parentPath, from, to: from - 1 } : null,
    demote: from + 1 < siblings ? { op: 'move-child', parentPath, from, to: from + 1 } : null,
    mainline: !onMain ? { op: 'mainline', path: [...path] } : null,
    deleteFromHere: { op: 'delete', path: [...path] },
    deleteVariation: !onMain ? { op: 'delete', path: path.slice(0, d + 1) } : null,
  };
}

/**
 * Apply one edit (from `variationEditsAt`, or a recorded one being
 * replayed) to `root`. Mutates `root`. Returns the primitive changes made,
 * in order — empty when the edit had nothing to do.
 */
export function applyTreeEdit(root, edit) {
  if (edit?.op === 'mainline') {
    return promoteAt(root, edit.path, { toMainline: true }).map(({ depth, from }) => (
      { op: 'move-child', parentPath: edit.path.slice(0, depth), from, to: 0 }
    ));
  }
  if (edit?.op === 'move-child') {
    const change = moveChildAt(root, edit.parentPath, edit.from, edit.to);
    return change ? [change] : [];
  }
  if (edit?.op === 'delete') {
    const change = deleteAt(root, edit.path);
    return change ? [change] : [];
  }
  return [];
}

/**
 * Re-key one other path after one change. Returns the new path, the same
 * array when nothing about it moved, or `null` when it pointed inside a
 * deleted subtree.
 */
export function remapPathThroughChange(path, change) {
  if (!path) return path;
  const parentPath = change.op === 'delete' ? change.path.slice(0, -1) : change.parentPath;
  const depth = parentPath.length;
  if (path.length <= depth) return path;
  for (let i = 0; i < depth; i++) if (path[i] !== parentPath[i]) return path;
  const seg = path[depth];
  let next = seg;
  if (change.op === 'delete') {
    const removed = change.path[depth];
    if (seg === removed) return null;
    if (seg > removed) next = seg - 1;
  } else {
    const { from, to } = change;
    if (seg === from) next = to;
    else if (from < to && seg > from && seg <= to) next = seg - 1;
    else if (to < from && seg >= to && seg < from) next = seg + 1;
  }
  if (next === seg) return path;
  const out = path.slice();
  out[depth] = next;
  return out;
}

/**
 * Fold this tab's recorded tree edits into the real document at save
 * time, in the order they were made. Each edit's paths were valid against
 * the tree as it stood when it was made, so replaying in order reproduces
 * what the tab showed. Mutates `doc` in place and returns it, the same
 * convention `appendMoveTree`/`applyShapesToMovetext` use.
 *
 * @param {object} doc from `readMovetext`, with any earlier pending moves
 *   already folded in via `appendMoveTree`.
 * @param {object[]} edits in the order they were made.
 */
export function applyTreeEdits(doc, edits) {
  for (const edit of edits ?? []) applyTreeEdit(doc.moves, edit);
  return doc;
}

/** Main-line length in plies — the value `games.ply_count` is to hold. No board needed. */
export const plyCount = (doc) => {
  let count = 0;
  let node = doc.moves;
  while (node.children.length) {
    node = node.children[0];
    count += 1;
  }
  return count;
};

class Context {
  constructor(position, ply) {
    this.position = position;
    this.ply = ply;
  }
  clone() {
    return new Context(this.position.clone(), this.ply);
  }
}

const startPosition = ({ variant, fen }) => {
  const rules = variant ?? 'chess';
  if (!fen) return defaultPosition(rules);
  const setup = parseFen(fen).unwrap();
  return setupPosition(rules, setup).unwrap();
};

/**
 * The chess pass: per-node positions, and the reading of `[%bestmove]`.
 *
 * Returns a new document; the one passed in is not touched. An illegal move cuts the
 * tree off there, as chessops' `transform` does.
 *
 * `from`, `to` and `check` are here because a board needs them and nothing else in the
 * document carries them: the SAN names a move without naming its squares, and finding
 * them again means replaying the position, which this pass has already done. A drop
 * (crazyhouse) has no origin square, so `from` is null there rather than invented.
 *
 * CASTLING. chessops encodes a castling move as king-takes-rook — `e1a1` for O-O-O,
 * not `e1c1` — and `to` reports that, unchanged. This is chessops working as designed,
 * not something to correct: in Chess960 the rook may start on any file, so "the king
 * moves two squares" is not a well-defined move, and king-takes-rook is the only
 * unambiguous form. The library uses it uniformly rather than switching convention per
 * variant, and this module reports what the library reports.
 *
 * A board wants the king's own journey instead, and converting is the caller's job —
 * chessops' own `chessgroundMove()` helper passes `to` straight through too. In this
 * application that caller is `$lib/game/plies.js`, which is the only place the
 * conversion happens.
 *
 * @param {object} doc from `readMovetext`
 * @param {object} [options] `variant` (chessops rules) and `fen` (start position)
 */
export const resolveMovetext = (doc, options = {}) => {
  const position = startPosition(options);
  const refersTo = options.bestMoveRefersTo ?? BESTMOVE_REFERS_TO;
  const initialPly = options.fen ? (position.fullmoves - 1) * 2 + (position.turn === 'white' ? 0 : 1) : 0;

  const moves = transform(doc.moves, new Context(position, initialPly), (ctx, data) => {
    const before = ctx.position.clone();
    const move = parseSan(ctx.position, data.san);
    if (!move) return;
    const mover = before.turn;
    ctx.position.play(move);
    const after = ctx.position.clone();
    const ply = ctx.ply;
    ctx.ply += 1;

    const resolved = (annotation) => {
      if (!annotation.bestmove) return annotation;
      const target = refersTo === 'before' ? before : after;
      const parsed = parseUci(annotation.bestmove.uci);
      const normalized = parsed ? normalizeMove(target, parsed) : null;
      const legal = !!normalized && target.isLegal(normalized);
      return {
        ...annotation,
        bestmove: {
          ...annotation.bestmove,
          refersTo,
          side: sideForBestMove(mover, refersTo),
          legal,
          san: legal ? makeSan(target, normalized) : null,
        },
      };
    };

    return {
      ...data,
      ply,
      mover,
      from: 'from' in move ? makeSquare(move.from) : null,
      to: makeSquare(move.to),
      check: after.isCheck(),
      fenBefore: makeFen(before.toSetup()),
      fenAfter: makeFen(after.toSetup()),
      ann: (data.ann ?? []).map(resolved),
      startingAnn: data.startingAnn ?? [],
    };
  });

  return { ...doc, moves, plyCount: plyCount({ moves }) };
};
