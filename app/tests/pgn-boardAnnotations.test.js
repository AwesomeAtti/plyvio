/**
 * `pgn/boardAnnotations.js` — chessground shapes as `%csl`/`%cal`, and
 * writing them into a resolved movetext tree ply-by-ply.
 * `analysis-board-plan.md`'s Stage 2, folded into Stage 1's save path.
 */
import { describe, it, expect } from 'vitest';
import { shapesToArgs, setShapes, applyShapesToMovetext } from '../src/lib/pgn/boardAnnotations.js';
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
  it('writes ply 0 (before the first move) into the first move\'s startingAnn', () => {
    const doc = resolveMovetext(readMovetext('1. e4 e5'));
    applyShapesToMovetext(doc, { 0: [{ orig: 'e4', brush: 'green' }] });
    const text = writeMovetext(doc);
    expect(text).toMatch(/\{\s*\[%csl Ge4\]\s*\}\s*1\.\s*e4/);
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
