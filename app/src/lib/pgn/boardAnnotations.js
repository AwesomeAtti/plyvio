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
 *
 * The write direction (`setShapes`/`applyShapesToMovetext`) shipped 24 Sep
 * with no reader — a saved arrow reached `games.movetext` for real (proven
 * by `writeMovetext`'s own round trip) but nothing ever decoded it back
 * into what the board draws, so a save looked like it did nothing. chessops'
 * own comment parser already decodes `%csl`/`%cal` into
 * `annotation.shapes: {color, from, to}[]` — `color` is already the brush
 * name (`'green'`, not `'G'`), and `from`/`to` are chessops' numeric
 * `Square` — so `shapesFromAnnotations` only has to run `chessops/util`'s
 * own `makeSquare` and rebuild chessground's `{orig, dest?, brush}` shape,
 * dropping anything not in the four PGN defines, symmetric with
 * `shapesToArgs` dropping an unrecognized brush on write.
 */

import { emptyAnnotation, setCommand, removeCommand } from './annotations.js';
import { makeSquare } from 'chessops/util';

const BRUSH_LETTER = { green: 'G', red: 'R', blue: 'B', yellow: 'Y' };
const KNOWN_BRUSHES = new Set(Object.keys(BRUSH_LETTER));

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
 *
 * When clearing leaves the first annotation with nothing at all — no text,
 * no other command — that entry is dropped rather than kept as an empty
 * stub: `removeCommand` unconditionally marks its annotation dirty (even
 * removing a command that was never there), so without this,
 * `writeMovetext` would serialize a spurious `{}` on a ply that never
 * needed a comment. Anything genuinely left (other text, other commands)
 * still survives untouched, matching this function's own name.
 */
export function setShapes(annotations, shapes) {
  const list = annotations && annotations.length ? [...annotations] : [emptyAnnotation()];
  const { csl, cal } = shapesToArgs(shapes);
  let target = list[0];
  target = csl ? setCommand(target, 'csl', csl) : removeCommand(target, 'csl');
  target = cal ? setCommand(target, 'cal', cal) : removeCommand(target, 'cal');
  if (target.parts.length === 0) return list.slice(1);
  list[0] = target;
  return list;
}

/**
 * Write every ply's drawn shapes into a RESOLVED movetext doc (from
 * `resolveMovetext`), mutating it in place and returning it ready for
 * `writeMovetext`. Walks the main line exactly the way `game/plies.js`'s
 * `readGame` does, so "ply N" here means the same position it means on the
 * board and in the move list: ply 0 is the position before the first move,
 * ply N>0 is the position after the Nth move (that move's own `ann`).
 *
 * Ply 0 ALWAYS goes into `doc.comments`, whether the game has moves or
 * not — not the first move's `startingAnn`, which this wrote to until 24
 * Sep, and which turns out to be structurally unreachable for the main
 * line: chessops' own parser (`pgn.js`'s `handleComment`) only ever fills a
 * node's `startingComments` for a comment at the start of a VARIATION,
 * right after its opening paren. A comment before the game's own first
 * move is read while the parser's root frame is still `root: true`, which
 * routes it to the document's own `comments` instead. Writing to
 * `startingAnn` therefore produced text (`{...} 1. e4`) that read back into
 * a different place than it was written from — the bug behind "I draw an
 * arrow before the first move and save... no comment is displayed," found
 * 24 Sep. `game/plies.js`'s ply-0 read matches this same correction.
 *
 * `shapesByPly` is `gameStates`'s own `{ [ply]: DrawShape[] }` — a session
 * OVERRIDE per ply, not the whole of what's persisted (`game/plies.js`'s
 * `sh` overlays it onto whatever's already there for display; see that
 * field's own comment). A ply absent from `shapesByPly` is left entirely
 * untouched — nobody drew on it this session. A ply PRESENT but holding an
 * empty array means "drawn on, and cleared" — the user erased a
 * previously-saved arrow without redrawing anything else there — and is
 * written only if the ply's CURRENT annotation actually has `%csl`/`%cal`
 * to remove; otherwise `setShapes` would still run (`removeCommand`
 * unconditionally marks its annotation dirty) and leave a spurious empty
 * `{}` behind on a ply that never had one, from drawing and immediately
 * erasing an arrow in the same session on a ply nothing was ever saved to.
 */
function annotationsHaveShapes(annotations) {
  return (annotations ?? []).some((a) => (a.shapes ?? []).length > 0);
}

export function applyShapesToMovetext(doc, shapesByPly) {
  const touches = (ply) => Object.prototype.hasOwnProperty.call(shapesByPly ?? {}, ply);
  const shouldWrite = (ply, existing) =>
    touches(ply) && ((shapesByPly[ply]?.length ?? 0) > 0 || annotationsHaveShapes(existing));

  if (shouldWrite(0, doc.comments)) doc.comments = setShapes(doc.comments, shapesByPly[0] ?? []);
  if (!doc.moves.children.length) return doc;

  let node = doc.moves;
  let ply = 0;
  while (node.children.length) {
    const next = node.children[0];
    ply += 1;
    if (shouldWrite(ply, next.data.ann)) next.data.ann = setShapes(next.data.ann, shapesByPly[ply] ?? []);
    node = next;
  }
  return doc;
}

/**
 * The reverse of `shapesToArgs`: a ply's `%csl`/`%cal`-decoded
 * `annotation.shapes` (chessops' own parse — see the module doc above) back
 * into chessground's drawn-shape format. Reads every annotation in the
 * list and concatenates, matching `commentOf`/`bestMoveOf`'s own
 * (`game/plies.js`) convention of aggregating across all of a ply's
 * annotation entries rather than assuming there is exactly one.
 */
export function shapesFromAnnotations(annotations) {
  const shapes = [];
  for (const annotation of annotations ?? []) {
    for (const shape of annotation.shapes ?? []) {
      if (!KNOWN_BRUSHES.has(shape.color)) continue;
      const orig = makeSquare(shape.from);
      if (shape.to === shape.from) shapes.push({ orig, brush: shape.color });
      else shapes.push({ orig, dest: makeSquare(shape.to), brush: shape.color });
    }
  }
  return shapes;
}
