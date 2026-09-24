/**
 * `pgn/boardAnnotations.js` — chessground shapes as `%csl`/`%cal`, and
 * writing them into a resolved movetext tree ply-by-ply.
 * `analysis-board-plan.md`'s Stage 2, folded into Stage 1's save path.
 */
import { describe, it, expect } from 'vitest';
import { shapesToArgs, setShapes, applyShapesToMovetext, shapesFromAnnotations } from '../src/lib/pgn/boardAnnotations.js';
import { formatAnnotation } from '../src/lib/pgn/annotations.js';
import { readMovetext, resolveMovetext, writeMovetext } from '../src/lib/pgn/index.js';

describe('shapesToArgs', () => {
  it('encodes a circle as one letter and one square', () => {
    expect(shapesToArgs([{ orig: 'e4', brush: 'green' }])).toEqual({ csl: 'Ge4', cal: '' });
  });

  it('a shape whose dest equals its orig is also a circle', () => {
    expect(shapesToArgs([{ orig: 'e4', dest: 'e4', brush: 'red' }])).toEqual({ csl: 'Re4', cal: '' });
  });

  it('encodes an arrow as one letter and two squares', () => {
    expect(shapesToArgs([{ orig: 'e2', dest: 'e4', brush: 'blue' }])).toEqual({ csl: '', cal: 'Be2e4' });
  });

  it('separates circles and arrows and joins several of a kind with commas', () => {
    const shapes = [
      { orig: 'e4', brush: 'green' },
      { orig: 'f7', brush: 'red' },
      { orig: 'c4', dest: 'c7', brush: 'green' }
    ];
    expect(shapesToArgs(shapes)).toEqual({ csl: 'Ge4,Rf7', cal: 'Gc4c7' });
  });

  it('drops a shape with no recognized brush rather than guessing', () => {
    expect(shapesToArgs([{ orig: 'e4', brush: 'purple' }])).toEqual({ csl: '', cal: '' });
  });

  it('is empty for no shapes', () => {
    expect(shapesToArgs([])).toEqual({ csl: '', cal: '' });
    expect(shapesToArgs(undefined)).toEqual({ csl: '', cal: '' });
  });
});

describe('setShapes', () => {
  it('creates a fresh annotation when there is none yet', () => {
    const result = setShapes([], [{ orig: 'e4', brush: 'green' }]);
    expect(result).toHaveLength(1);
    expect(result[0].shapes).toEqual([{ color: 'green', from: 28, to: 28 }]);
  });

  it('adds %csl/%cal onto an existing annotation without disturbing its other commands', () => {
    const { moves } = readMovetext('1. e4 { [%eval +0.30,20] a good start }');
    const ann = moves.children[0].data.ann;
    const result = setShapes(ann, [{ orig: 'e2', dest: 'e4', brush: 'blue' }]);
    expect(result[0].evaluation).toEqual({ pawns: 0.3, depth: 20 });
    expect(result[0].text).toBe('a good start');
    expect(result[0].shapes).toEqual([{ color: 'blue', from: 12, to: 28 }]);
  });

  it('removes %csl/%cal entirely once the board is cleared, leaving everything else', () => {
    const { moves } = readMovetext('1. e4 { [%csl Ge4] a note }');
    const ann = moves.children[0].data.ann;
    const cleared = setShapes(ann, []);
    expect(cleared[0].shapes).toEqual([]);
    expect(cleared[0].text).toBe('a note');
    expect(formatAnnotation(cleared[0])).not.toContain('csl');
    expect(formatAnnotation(cleared[0])).toBe('a note');
  });
});

describe('applyShapesToMovetext', () => {
  it('writes ply 0 (before the first move) into the document\'s own comments, and it reads back', () => {
    const doc = resolveMovetext(readMovetext('1. e4 e5'));
    applyShapesToMovetext(doc, { 0: [{ orig: 'e4', brush: 'green' }] });
    const text = writeMovetext(doc);
    expect(text).toMatch(/\{\s*\[%csl Ge4\]\s*\}\s*1\.\s*e4/);

    // Not the first move's startingAnn -- chessops never fills that for the
    // main line (see boardAnnotations.js's note). Prove it survives an
    // actual reparse, not just that the text looks right.
    const reread = resolveMovetext(readMovetext(text));
    expect(reread.moves.children[0].data.startingAnn).toEqual([]);
    expect(reread.comments[0].shapes).toEqual([{ color: 'green', from: expect.any(Number), to: expect.any(Number) }]);
  });

  it('writes ply N (after the Nth move) into that move\'s own ann', () => {
    const doc = resolveMovetext(readMovetext('1. e4 e5 2. Nf3'));
    applyShapesToMovetext(doc, { 2: [{ orig: 'e5', dest: 'e4', brush: 'red' }] });
    const text = writeMovetext(doc);
    expect(text).toMatch(/e5\s*\{\s*\[%cal Re5e4\]\s*\}/);
  });

  it('several plies at once each land on their own move', () => {
    const doc = resolveMovetext(readMovetext('1. e4 e5 2. Nf3'));
    applyShapesToMovetext(doc, {
      0: [{ orig: 'e4', brush: 'green' }],
      1: [{ orig: 'e5', brush: 'red' }]
    });
    const text = writeMovetext(doc);
    expect(text).toMatch(/\[%csl Ge4\][\s\S]*1\.\s*e4/);
    expect(text).toMatch(/e4\s*\{\s*\[%csl Re5\]\s*\}\s*1\.\.\.\s*e5/);
  });

  it('a ply with no shapes staged is left untouched', () => {
    const before = writeMovetext(resolveMovetext(readMovetext('1. e4 e5')));
    const doc = resolveMovetext(readMovetext('1. e4 e5'));
    applyShapesToMovetext(doc, {});
    expect(writeMovetext(doc)).toBe(before);
  });

  it('an empty override on a ply that already has %csl/%cal removes it, and the stub comment with it', () => {
    const doc = resolveMovetext(readMovetext('1. e4 { [%csl Ge4] } e5'));
    applyShapesToMovetext(doc, { 1: [] });
    const text = writeMovetext(doc);
    expect(text).not.toContain('%csl');
    // No comment left on e4 to force "1..." before e5 either.
    expect(text).toBe('1. e4 e5');
  });

  it('an empty override on a ply with nothing to clear writes no spurious empty comment', () => {
    const before = writeMovetext(resolveMovetext(readMovetext('1. e4 e5')));
    const doc = resolveMovetext(readMovetext('1. e4 e5'));
    applyShapesToMovetext(doc, { 1: [] });
    expect(writeMovetext(doc)).toBe(before);
  });

  it('falls back to the document\'s own comments when the game has no moves at all', () => {
    const doc = resolveMovetext(readMovetext(''));
    applyShapesToMovetext(doc, { 0: [{ orig: 'd4', brush: 'yellow' }] });
    expect(writeMovetext(doc)).toBe('{[%csl Yd4]}');
  });

  it('round-trips back through readMovetext/resolveMovetext into the same shapes', () => {
    const doc = resolveMovetext(readMovetext('1. e4 e5 2. Nf3'));
    applyShapesToMovetext(doc, { 1: [{ orig: 'e5', dest: 'e4', brush: 'blue' }, { orig: 'g8', brush: 'green' }] });
    const written = writeMovetext(doc);

    const reread = resolveMovetext(readMovetext(written));
    const firstMove = reread.moves.children[0];
    expect(firstMove.data.ann[0].shapes).toEqual(
      expect.arrayContaining([
        { color: 'blue', from: expect.any(Number), to: expect.any(Number) },
        { color: 'green', from: expect.any(Number), to: expect.any(Number) }
      ])
    );
  });
});

describe('shapesFromAnnotations — the read-back direction', () => {
  it('decodes a circle back into a chessground shape', () => {
    const { comments } = readMovetext('{ [%csl Ge4] }');
    expect(shapesFromAnnotations(comments)).toEqual([{ orig: 'e4', brush: 'green' }]);
  });

  it('decodes an arrow back into a chessground shape', () => {
    const { comments } = readMovetext('{ [%cal Be2e4] }');
    expect(shapesFromAnnotations(comments)).toEqual([{ orig: 'e2', dest: 'e4', brush: 'blue' }]);
  });

  it('decodes several circles and arrows together, order not required to match', () => {
    const { comments } = readMovetext('{ [%csl Ge4,Rf7][%cal Gc4c7] }');
    expect(shapesFromAnnotations(comments)).toEqual(
      expect.arrayContaining([
        { orig: 'e4', brush: 'green' },
        { orig: 'f7', brush: 'red' },
        { orig: 'c4', dest: 'c7', brush: 'green' }
      ])
    );
    expect(shapesFromAnnotations(comments)).toHaveLength(3);
  });

  it('is empty when the annotation has no shapes at all', () => {
    const { comments } = readMovetext('{ a plain comment }');
    expect(shapesFromAnnotations(comments)).toEqual([]);
    expect(shapesFromAnnotations([])).toEqual([]);
    expect(shapesFromAnnotations(undefined)).toEqual([]);
  });

  it('round-trips a full save through applyShapesToMovetext, write, reread and decode', () => {
    const doc = resolveMovetext(readMovetext('1. e4 e5 2. Nf3'));
    applyShapesToMovetext(doc, {
      0: [{ orig: 'd2', brush: 'green' }, { orig: 'd4', brush: 'green' }],
      2: [{ orig: 'e5', dest: 'e4', brush: 'red' }]
    });
    const written = writeMovetext(doc);

    const reread = resolveMovetext(readMovetext(written));
    const firstMove = reread.moves.children[0];
    const secondMove = firstMove.children[0]; // ply 2 (after e5) -- shapesByPly's key 2

    // Ply 0 reads from the document's own comments, not the first move's
    // startingAnn -- see boardAnnotations.js's own note on why.
    expect(shapesFromAnnotations(reread.comments)).toEqual(
      expect.arrayContaining([
        { orig: 'd2', brush: 'green' },
        { orig: 'd4', brush: 'green' }
      ])
    );
    expect(shapesFromAnnotations(secondMove.data.ann)).toEqual([
      { orig: 'e5', dest: 'e4', brush: 'red' }
    ]);
  });
});
