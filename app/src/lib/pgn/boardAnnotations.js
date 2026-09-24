/**
 * Board annotations (arrows/highlights drawn on the board) as PGN's
 * `%csl`/`%cal` commands — `analysis-board-plan.md`'s Stage 2, folded into
 * Stage 1's save path once it turned out to need no real conversion.
 *
 * Chessground's own drawn shape is `{ orig, dest?, brush }`, algebraic
 * squares (`'e4'`), `brush` one of `green`/`red`/`blue`/`yellow` — a circle
 * when `dest` is absent or equal to `orig`, an arrow otherwise. PGN's
 * `%csl`/`%cal` want the same four colors, one letter each
 * (`G`/`R`/`B`/`Y`, chessops' own convention — see `chessops/pgn`'s
 * unexported `makeCommentShapeColor`), and the same squares, so this is a
 * letter lookup and string join, not a coordinate system to translate.
 */

import { emptyAnnotation, setCommand, removeCommand } from './annotations.js';

const BRUSH_LETTER = { green: 'G', red: 'R', blue: 'B', yellow: 'Y' };

/**
 * Chessground shapes as `%csl`/`%cal` argument strings — the comma-joined
 * body `setCommand` expects, not the whole `[%csl ...]` token. A shape
 * whose brush isn't one of the four PGN defines is dropped rather than
 * guessed at.
 */
export function shapesToArgs(shapes) {
  const circles = [];
  const arrows = [];
  for (const shape of shapes ?? []) {
    const letter = BRUSH_LETTER[shape.brush];
    if (!letter || !shape.orig) continue;
    if (!shape.dest || shape.dest === shape.orig) circles.push(`${letter}${shape.orig}`);
    else arrows.push(`${letter}${shape.orig}${shape.dest}`);
  }
  return { csl: circles.join(','), cal: arrows.join(',') };
}

/**
 * Write a ply's drawn shapes into its annotations — the first one if any
 * already exist there (a played-move comment, an `[%eval]`, ...), a fresh
 * one otherwise. Removes `%csl`/`%cal` entirely rather than writing an
 * empty command when a ply's shapes are cleared. Returns a NEW array;
 * `annotations` itself is not mutated, matching `setCommand`/
 * `removeCommand`'s own copy-on-write annotation objects.
 */
export function setShapes(annotations, shapes) {
  const list = annotations && annotations.length ? [...annotations] : [emptyAnnotation()];
  const { csl, cal } = shapesToArgs(shapes);
  let target = list[0];
  target = csl ? setCommand(target, 'csl', csl) : removeCommand(target, 'csl');
  target = cal ? setCommand(target, 'cal', cal) : removeCommand(target, 'cal');
  list[0] = target;
  return list;
}

/**
 * Write every ply's drawn shapes into a RESOLVED movetext doc (from
 * `resolveMovetext`), mutating it in place and returning it ready for
 * `writeMovetext`. Walks the main line exactly the way `game/plies.js`'s
 * `readGame` does, so "ply N" here means the same position it means on the
 * board and in the move list: ply 0 is the position before the first move
 * (the first move's own `startingAnn`, or the document's own leading
 * comments when the game has no moves at all), ply N>0 is the position
 * after the Nth move (that move's own `ann`).
 *
 * `shapesByPly` is `gameStates`'s own `{ [ply]: DrawShape[] }` — a ply
 * absent from it, or holding an empty array, is left untouched.
 */
export function applyShapesToMovetext(doc, shapesByPly) {
  const hasShapes = (ply) => (shapesByPly?.[ply]?.length ?? 0) > 0;

  if (!doc.moves.children.length) {
    if (hasShapes(0)) doc.comments = setShapes(doc.comments, shapesByPly[0]);
    return doc;
  }

  const first = doc.moves.children[0];
  if (hasShapes(0)) first.data.startingAnn = setShapes(first.data.startingAnn, shapesByPly[0]);

  let node = doc.moves;
  let ply = 0;
  while (node.children.length) {
    const next = node.children[0];
    ply += 1;
    if (hasShapes(ply)) next.data.ann = setShapes(next.data.ann, shapesByPly[ply]);
    node = next;
  }
  return doc;
}
