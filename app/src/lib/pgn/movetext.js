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
 * Extend the mainline with newly played moves — Stage 4 of
 * `analysis-board-plan.md`. Each entry is `{s}` from a ply this session's
 * board produced (`game/moves.js`'s own `san`, renamed the way
 * `game/plies.js`'s terse ply shape already spells it); nothing else in
 * that shape (`f`/`m`/`k`/…) is stored on a node — a save always re-reads
 * the game fresh afterwards (`realGames` is evicted and `loadRealGame`
 * reruns), so nothing here needs to be right the first time except the SAN.
 *
 * Deliberately dumb about WHERE it attaches: it walks to the mainline's own
 * last node (`children[0]` all the way down, same walk `plyCount`/
 * `applyShapesToMovetext` already do) and appends there, in order — correct
 * because this stage only ever plays a move at the last ply to begin with
 * (`stores/game.js`'s `playMove` refuses anywhere else). Mutates `doc` in
 * place and returns it, the same convention `applyShapesToMovetext` uses,
 * since both run once on a document about to be thrown away after
 * `writeMovetext` reads it.
 *
 * @param {object} doc from `readMovetext` (resolved or not — only
 *   `.moves`'s tree shape matters, not the per-node FEN/check fields
 *   `resolveMovetext` adds, which `writeMovetext` never reads anyway).
 * @param {{s: string}[]} moves plies to append, mainline order.
 */
export function appendMoves(doc, moves) {
  if (!moves?.length) return doc;
  let node = doc.moves;
  while (node.children.length) node = node.children[0];
  for (const { s } of moves) {
    const child = {
      data: { san: s, nags: [], ann: [], startingAnn: [], comments: [], startingComments: [] },
      children: [],
    };
    node.children.push(child);
    node = child;
  }
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
