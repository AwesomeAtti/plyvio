import { describe, expect, it } from 'vitest';
import {
  MovetextError,
  applyTreeEdits,
  appendMoveTree,
  deleteAt,
  moveChildAt,
  remapPathThroughChange,
  variationEditsAt,
  plyCount,
  promoteAt,
  readMovetext,
  resolveMovetext,
  writeMovetext,
} from '../src/lib/pgn/movetext.js';
import { formatAnnotation, parseAnnotation, setCommand } from '../src/lib/pgn/annotations.js';
import { setEngineAttribute } from '../src/lib/pgn/engineContext.js';

/** database-schema §3.4, the worked example of a `movetext` value after several edits. */
const SCHEMA_EXAMPLE =
  '{[%engine name="Stockfish 18.1" timestamp="2026-09-08T13:49:00Z" depth=24 hash=4096 threads=8 multipv=1]} ' +
  '1. e4 {Good choice. [%eval +0.20,24] [%bestmove e2e4]} 1... e5 ' +
  '2. Nf3 $1 (2. f4 exf4) 2... Nc6 ' +
  '3. Bb5 {[%csl Gc4] [%cal Gc4c7]}';

/** The Best Move Extension §6, under the version 1.1 reading. */
const EXTENSION_EXAMPLE =
  '{[%engine name="Stockfish 18.1" timestamp="2026-09-11T13:49:00Z" depth=24]} ' +
  '1. e4 {[%eval +0.20,24] [%bestmove e2e4]} 1... e5 {[%eval +0.15,24] [%bestmove e7e5]} ' +
  '2. Nf3 {[%eval +0.25,24] [%bestmove g1f3]} 2... Nc6 {[%eval +0.18,24] [%bestmove b8c6]} ' +
  '3. Bb5 {[%eval +0.12,24] [%bestmove f1b5]} 3... a6 {[%bestmove a7a6]} *';

const one = (text) => writeMovetext(readMovetext(text), { wrap: null });

describe('reading', () => {
  it('reads moves, NAGs, comments and variations', () => {
    const doc = readMovetext(SCHEMA_EXAMPLE);
    const mainline = [...doc.moves.mainlineNodes()].map((n) => n.data.san);
    expect(mainline).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
    const nf3 = [...doc.moves.mainlineNodes()][2];
    expect(nf3.data.nags).toEqual([1]);
    const nc6Parent = [...doc.moves.mainlineNodes()][1];
    expect(nc6Parent.children).toHaveLength(2);
    expect(nc6Parent.children[1].data.san).toBe('f4');
  });

  it('lifts the engine context out of the comment before the first move', () => {
    const doc = readMovetext(SCHEMA_EXAMPLE);
    expect(doc.engine).not.toBeNull();
    expect(doc.comments).toHaveLength(1);
  });

  it('has no engine context when none is written', () => {
    expect(readMovetext('1. e4 e5').engine).toBeNull();
  });

  it('reads the trailing result token, and tells a bare movetext from one', () => {
    expect(readMovetext('1. e4 e5 1-0').result).toBe('1-0');
    expect(readMovetext('1. e4 e5 *').result).toBe('*');
    expect(readMovetext('1. e4 e5').result).toBeNull();
  });

  it('is not fooled by a result-like token inside a comment', () => {
    expect(readMovetext('1. e4 {1-0 was agreed} e5').result).toBeNull();
  });

  it('reads an empty movetext', () => {
    const doc = readMovetext('');
    expect(plyCount(doc)).toBe(0);
    expect(writeMovetext(doc)).toBe('');
  });

  it('refuses a string holding more than one game', () => {
    const two = '[White "A"]\n\n1. e4 *\n\n[White "B"]\n\n1. d4 *\n';
    expect(() => readMovetext(two)).toThrow(MovetextError);
  });

  it('counts plies from the main line, ignoring variations', () => {
    expect(plyCount(readMovetext(SCHEMA_EXAMPLE))).toBe(5);
    expect(plyCount(readMovetext('1. e4 (1. d4 d5 2. c4) 1... e5'))).toBe(2);
  });
});

describe('writing', () => {
  it('round-trips the schema §3.4 example', () => {
    expect(one(SCHEMA_EXAMPLE)).toBe(SCHEMA_EXAMPLE);
  });

  it('round-trips the Best Move Extension §6 example', () => {
    expect(one(EXTENSION_EXAMPLE)).toBe(EXTENSION_EXAMPLE);
  });

  it('is stable on a second pass', () => {
    expect(one(one(SCHEMA_EXAMPLE))).toBe(one(SCHEMA_EXAMPLE));
  });

  it('numbers a black move that does not directly follow its white move', () => {
    expect(one('1. e4 {a comment} e5')).toBe('1. e4 {a comment} 1... e5');
    expect(one('1. e4 $1 e5')).toBe('1. e4 $1 1... e5');
    expect(one('1. e4 (1. d4 d5) e5')).toBe('1. e4 (1. d4 d5) 1... e5');
  });

  it('does not number a black move that does', () => {
    expect(one('1. e4 e5 2. Nf3 Nc6')).toBe('1. e4 e5 2. Nf3 Nc6');
    expect(one('1. e4 (1. d4 d5) e5')).toContain('(1. d4 d5)');
  });

  it('nests variations', () => {
    const text = '1. e4 e5 2. Nf3 (2. f4 exf4 (2... d5 3. exd5) 3. Nf3) 2... Nc6';
    expect(one(text)).toBe(text);
  });

  it('writes a comment that precedes a move inside a variation', () => {
    const text = '1. e4 ({a thought} 1. d4 d5) 1... e5';
    expect(one(text)).toBe(text);
  });

  it('offers both comment spacings, since chessops discards the source’s own', () => {
    const doc = readMovetext('1. e4 {[%eval +0.20]}');
    expect(writeMovetext(doc, { wrap: null, spacing: 'tight' })).toBe('1. e4 {[%eval +0.20]}');
    expect(writeMovetext(doc, { wrap: null, spacing: 'padded' })).toBe('1. e4 { [%eval +0.20] }');
  });

  it('wraps at the requested column without breaking a token', () => {
    const doc = readMovetext(EXTENSION_EXAMPLE);
    const written = writeMovetext(doc, { wrap: 80 });
    expect(written.split('\n').length).toBeGreaterThan(1);
    for (const line of written.split('\n')) {
      // A single token longer than the column is allowed to overflow; nothing else is.
      expect(line.length <= 80 || line.split(' ').length === 1).toBe(true);
    }
    expect(one(written)).toBe(EXTENSION_EXAMPLE);
  });

  it('keeps the result token, and writes none when there was none', () => {
    expect(one('1. e4 e5 1-0')).toBe('1. e4 e5 1-0');
    expect(one('1. e4 e5')).toBe('1. e4 e5');
  });
});

describe('preservation across an edit (§3.1)', () => {
  it('keeps an unrecognized command and an unrecognized attribute', () => {
    const source =
      '{[%engine name="Stockfish 18.1" nodes=123456 depth=10]} ' +
      '1. e4 {[%eval +0.20,24] [%zzz keep me] [%bestmove e2e4]} 1... e5';

    const doc = readMovetext(source);
    setEngineAttribute(doc.engine, 'depth', 24);
    const first = [...doc.moves.mainlineNodes()][0];
    setCommand(first.data.ann[0], 'clk', '0:09:57');

    const written = writeMovetext(doc, { wrap: null });
    expect(written).toBe(
      '{[%engine name="Stockfish 18.1" nodes=123456 depth=24]} ' +
        '1. e4 {[%eval +0.20,24] [%zzz keep me] [%bestmove e2e4] [%clk 0:09:57]} 1... e5',
    );

    const again = readMovetext(written);
    expect(again.engine.attributes.map((a) => a.key)).toEqual(['name', 'nodes', 'depth']);
    expect([...again.moves.mainlineNodes()][0].data.ann[0].unrecognized).toHaveLength(1);
  });

  it('leaves an untouched comment’s own text alone when a neighbour is changed', () => {
    // Brace padding is the writer's, but everything between the braces is the source's:
    // the odd double space inside the second comment survives untouched.
    const source = '1. e4 {[%eval +0.20] [%zzz a]} 1... e5 {[%clk 0:09:57]  [%zzz b]}';
    const doc = readMovetext(source);
    setCommand([...doc.moves.mainlineNodes()][0].data.ann[0], 'bestmove', 'e2e4');
    const written = writeMovetext(doc, { wrap: null });
    expect(written).toContain('[%clk 0:09:57]  [%zzz b]');
    expect(written).toContain('{[%eval +0.20] [%zzz a] [%bestmove e2e4]}');
  });

  it('adds a comment to a move that had none', () => {
    const doc = readMovetext('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6');
    const nc6 = [...doc.moves.mainlineNodes()][3];
    const annotation = parseAnnotation('');
    setCommand(annotation, 'bestmove', 'b8c6');
    nc6.data.ann = [annotation];
    expect(writeMovetext(doc, { wrap: null })).toBe(
      '1. e4 e5 2. Nf3 Nc6 {[%bestmove b8c6]} 3. Bb5 a6',
    );
  });

  it('matches the schema §3.1 illustration of adding a comment', () => {
    const doc = readMovetext('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6');
    const nc6 = [...doc.moves.mainlineNodes()][3];
    nc6.data.ann = [parseAnnotation('A common developing move.')];
    expect(writeMovetext(doc, { wrap: null })).toBe(
      '1. e4 e5 2. Nf3 Nc6 {A common developing move.} 3. Bb5 a6',
    );
    expect(formatAnnotation(nc6.data.ann[0])).toBe('A common developing move.');
  });
});

describe('resolving positions', () => {
  it('gives each move its ply, mover and positions', () => {
    const resolved = resolveMovetext(readMovetext('1. e4 e5 2. Nf3'));
    const nodes = [...resolved.moves.mainlineNodes()].map((n) => n.data);
    expect(nodes.map((d) => d.ply)).toEqual([0, 1, 2]);
    expect(nodes.map((d) => d.mover)).toEqual(['white', 'black', 'white']);
    expect(nodes[0].fenBefore).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(nodes[0].fenAfter).toContain('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b');
    expect(resolved.plyCount).toBe(3);
  });

  it('reads a best move in the position the move was played from', () => {
    const resolved = resolveMovetext(readMovetext('1. h3 {[%bestmove e2e4]}'));
    const bestmove = [...resolved.moves.mainlineNodes()][0].data.ann[0].bestmove;
    expect(bestmove).toMatchObject({ uci: 'e2e4', san: 'e4', legal: true, side: 'white' });
  });

  it('finds the same value illegal under the version 1.0 reading', () => {
    const resolved = resolveMovetext(readMovetext('1. h3 {[%bestmove e2e4]}'), {
      bestMoveRefersTo: 'after',
    });
    expect([...resolved.moves.mainlineNodes()][0].data.ann[0].bestmove).toMatchObject({
      legal: false,
      san: null,
      side: 'black',
    });
  });

  it('reports an illegal best move rather than rejecting the comment', () => {
    const resolved = resolveMovetext(readMovetext('1. e4 {prose [%bestmove a1a8]}'));
    const annotation = [...resolved.moves.mainlineNodes()][0].data.ann[0];
    expect(annotation.bestmove.legal).toBe(false);
    expect(annotation.text).toBe('prose');
  });

  it('reads castling as the engine writes it', () => {
    const text =
      '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O {[%bestmove e1g1]} 4... Nf6 {[%bestmove g8f6]}';
    const resolved = resolveMovetext(readMovetext(text));
    const castle = [...resolved.moves.mainlineNodes()][6].data.ann[0].bestmove;
    expect(castle).toMatchObject({ legal: true, san: 'O-O', side: 'white' });
  });

  it('resolves best moves inside variations too', () => {
    const resolved = resolveMovetext(readMovetext('1. e4 (1. h3 {[%bestmove e2e4]} 1... e5) 1... c5'));
    const variation = resolved.moves.children[1];
    expect(variation.data.ann[0].bestmove).toMatchObject({ legal: true, san: 'e4' });
  });

  it('starts from a given position', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 40';
    const resolved = resolveMovetext(readMovetext('40. e4 {[%bestmove e2e4]}'), { fen });
    const node = [...resolved.moves.mainlineNodes()][0].data;
    expect(node.ply).toBe(78);
    expect(node.ann[0].bestmove.legal).toBe(true);
  });

  it('leaves the document it was given untouched', () => {
    const doc = readMovetext('1. e4 {[%bestmove e2e4]}');
    resolveMovetext(doc);
    expect([...doc.moves.mainlineNodes()][0].data.ply).toBeUndefined();
    expect([...doc.moves.mainlineNodes()][0].data.ann[0].bestmove.legal).toBeUndefined();
  });

  it('cuts the tree off at an illegal move instead of throwing', () => {
    const resolved = resolveMovetext(readMovetext('1. e4 e5 2. Qxf7 Nc6'));
    expect([...resolved.moves.mainlineNodes()].map((n) => n.data.san)).toEqual(['e4', 'e5']);
  });

  it('gives each move the squares it ran between', () => {
    const resolved = resolveMovetext(readMovetext('1. e4 e5 2. Nf3'));
    const [e4, e5, nf3] = [...resolved.moves.mainlineNodes()].map((n) => n.data);
    expect([e4.from, e4.to]).toEqual(['e2', 'e4']);
    expect([e5.from, e5.to]).toEqual(['e7', 'e5']);
    expect([nf3.from, nf3.to]).toEqual(['g1', 'f3']);
  });

  it('marks the move that gives check, and the one that mates', () => {
    const resolved = resolveMovetext(readMovetext('1. f3 e5 2. g4 Qh4#'));
    const checks = [...resolved.moves.mainlineNodes()].map((n) => n.data.check);
    expect(checks).toEqual([false, false, false, true]);
  });

  /**
   * chessops encodes castling as king-takes-rook because Chess960 requires it — the
   * rook may start on any file, so "the king moves two squares" is not a well-defined
   * move. This module reports what chessops reports, deliberately and unaltered. The
   * board convention is applied by the caller, in $lib/game/plies.js.
   */
  it("reports castling as chessops encodes it, king onto its own rook", () => {
    const resolved = resolveMovetext(readMovetext('1. e4 e5 2. Nf3 Nf6 3. Bc4 Bc5 4. O-O O-O'));
    const [, , , , , , white, black] = [...resolved.moves.mainlineNodes()].map((n) => n.data);
    expect([white.from, white.to]).toEqual(['e1', 'h1']);
    expect([black.from, black.to]).toEqual(['e8', 'h8']);
  });

  it('reports queenside castling the same way', () => {
    const movetext = '1. d4 d5 2. Nc3 Nc6 3. Bf4 Bf5 4. Qd2 Qd7 5. O-O-O O-O-O';
    const nodes = [...resolveMovetext(readMovetext(movetext)).moves.mainlineNodes()];
    const [white, black] = nodes.slice(-2).map((n) => n.data);
    expect([white.from, white.to]).toEqual(['e1', 'a1']);
    expect([black.from, black.to]).toEqual(['e8', 'a8']);
  });
});


/**
 * `appendMoveTree` -- Stage 4/5 of `analysis-board-plan.md`: folding moves
 * played on the board into the movetext tree at save time, each at its own
 * recorded `parentPath` rather than always the mainline's last node (Stage
 * 5 generalised this from Stage 4's mainline-only version).
 */
describe('promoteAt', () => {
  it('does nothing when the path is already the mainline', () => {
    const doc = readMovetext('1. e4 e5 2. Nf3 Nc6');
    const before = writeMovetext(doc, { wrap: null });
    const swaps = promoteAt(doc.moves, [0, 0, 0, 0]);
    expect(swaps).toEqual([]);
    expect(writeMovetext(doc, { wrap: null })).toBe(before);
  });

  it('promotes a variation past its one sibling (Promote Variation)', () => {
    const doc = readMovetext('1. e4 e5 2. Nf3 Nc6 3. Bb5 (3. Bc4 Bc5) 3... a6');
    // e4=0 e5=0 Nf3=0 Nc6=0 Bc4=1 (sibling of Bb5, both children of Nc6)
    const swaps = promoteAt(doc.moves, [0, 0, 0, 0, 1]);
    expect(swaps).toEqual([{ depth: 4, from: 1 }]);
    expect(writeMovetext(doc, { wrap: null }))
      .toBe('1. e4 e5 2. Nf3 Nc6 3. Bc4 (3. Bb5 a6) 3... Bc5');
  });

  it('shifts every sibling between the old front and the promoted slot by one', () => {
    const doc = readMovetext('1. e4 e5 2. Nf3 (2. f4) (2. Nc3) Nc6');
    // e4=0, then e5's children: Nf3=0 (main), f4=1, Nc3=2
    const swaps = promoteAt(doc.moves, [0, 0, 2]);
    expect(swaps).toEqual([{ depth: 2, from: 2 }]);
    expect(writeMovetext(doc, { wrap: null }))
      .toBe('1. e4 e5 2. Nc3 (2. Nf3 Nc6) (2. f4)');
  });

  it('cascades every level to the root with toMainline (Make Main Line)', () => {
    const doc = readMovetext('1. e4 e5 2. Nf3 Nc6 3. Bb5 (3. Bc4 Bc5 (3... Qe7)) 3... a6');
    // e4=0 e5=0 Nf3=0 Nc6=0, Bc4=1 (sibling of Bb5), Qe7=1 (sibling of Bc5, under Bc4)
    const swaps = promoteAt(doc.moves, [0, 0, 0, 0, 1, 1], { toMainline: true });
    expect(swaps).toEqual([
      { depth: 5, from: 1 },
      { depth: 4, from: 1 },
    ]);
    expect(writeMovetext(doc, { wrap: null }))
      .toBe('1. e4 e5 2. Nf3 Nc6 3. Bc4 (3. Bb5 a6) 3... Qe7 (3... Bc5)');
  });

  it('stops after one level even when a shallower index is also non-mainline', () => {
    // Same starting position as the cascade test, but toMainline defaults to
    // false: only the deepest branch point (Qe7 vs. Bc5) should move.
    const doc = readMovetext('1. e4 e5 2. Nf3 Nc6 3. Bb5 (3. Bc4 Bc5 (3... Qe7)) 3... a6');
    const swaps = promoteAt(doc.moves, [0, 0, 0, 0, 1, 1]);
    expect(swaps).toEqual([{ depth: 5, from: 1 }]);
    expect(writeMovetext(doc, { wrap: null }))
      .toBe('1. e4 e5 2. Nf3 Nc6 3. Bb5 (3. Bc4 Qe7 (3... Bc5)) 3... a6');
  });
});

describe('moveChildAt', () => {
  it('moves a line up one step at its branch point', () => {
    const doc = readMovetext('1. e4 e5 2. Nf3 (2. f4) (2. Nc3) Nc6');
    // e5's children: Nf3=0 (main), f4=1, Nc3=2
    expect(moveChildAt(doc.moves, [0, 0], 2, 1))
      .toEqual({ op: 'move-child', parentPath: [0, 0], from: 2, to: 1 });
    expect(writeMovetext(doc, { wrap: null })).toBe('1. e4 e5 2. Nf3 (2. Nc3) (2. f4) 2... Nc6');
  });

  it('moving line 2 up one step makes it the main continuation there', () => {
    const doc = readMovetext('1. e4 e5 2. Nf3 (2. f4) (2. Nc3) Nc6');
    moveChildAt(doc.moves, [0, 0], 1, 0);
    expect(writeMovetext(doc, { wrap: null })).toBe('1. e4 e5 2. f4 (2. Nf3 Nc6) (2. Nc3)');
  });

  it('returns null and changes nothing for an out-of-range or same index', () => {
    const doc = readMovetext('1. e4 e5 2. Nf3 (2. f4)');
    const before = writeMovetext(doc, { wrap: null });
    expect(moveChildAt(doc.moves, [0, 0], 1, 2)).toBeNull();
    expect(moveChildAt(doc.moves, [0, 0], 0, 0)).toBeNull();
    expect(moveChildAt(doc.moves, [0, 0], 0, -1)).toBeNull();
    expect(writeMovetext(doc, { wrap: null })).toBe(before);
  });
});

describe('deleteAt', () => {
  it('deletes a main-line move and everything after it', () => {
    const doc = readMovetext('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6');
    expect(deleteAt(doc.moves, [0, 0, 0, 0, 0])).toEqual({ op: 'delete', path: [0, 0, 0, 0, 0] });
    expect(writeMovetext(doc, { wrap: null })).toBe('1. e4 e5 2. Nf3 Nc6');
  });

  it('deleting a main-line move with an alternative makes the alternative main', () => {
    const doc = readMovetext('1. e4 e5 2. Nf3 (2. f4 exf4) (2. Nc3) Nc6');
    deleteAt(doc.moves, [0, 0, 0]);
    expect(writeMovetext(doc, { wrap: null })).toBe('1. e4 e5 2. f4 (2. Nc3) 2... exf4');
  });

  it('deleting inside a variation keeps the variation up to that move', () => {
    const doc = readMovetext('1. e4 e5 2. Nf3 (2. f4 exf4 3. Nf3) Nc6');
    deleteAt(doc.moves, [0, 0, 1, 0]);
    expect(writeMovetext(doc, { wrap: null })).toBe('1. e4 e5 2. Nf3 (2. f4) 2... Nc6');
  });

  it("deleting a variation's first move removes the variation, siblings untouched", () => {
    const doc = readMovetext('1. e4 e5 2. Nf3 (2. f4 exf4) (2. Nc3) Nc6');
    deleteAt(doc.moves, [0, 0, 1]);
    expect(writeMovetext(doc, { wrap: null })).toBe('1. e4 e5 2. Nf3 (2. Nc3) 2... Nc6');
  });

  it('returns null for the root or a missing path', () => {
    const doc = readMovetext('1. e4 e5');
    expect(deleteAt(doc.moves, [])).toBeNull();
    expect(deleteAt(doc.moves, [0, 3])).toBeNull();
  });
});

describe('variationEditsAt', () => {
  // e5's children: Nf3=0 (main), Bc4=1, f4=2.
  const PGN = '1. e4 e5 2. Nf3 (2. Bc4 Nf6 3. d3 (3. Nc3)) (2. f4 exf4) Nc6 3. Bb5 a6';

  it('a main-line move with no alternative: only Delete from Here applies', () => {
    const doc = readMovetext(PGN);
    expect(variationEditsAt(doc.moves, [0, 0, 0, 0, 0])).toEqual({
      promote: null,
      demote: null,
      mainline: null,
      deleteFromHere: { op: 'delete', path: [0, 0, 0, 0, 0] },
      deleteVariation: null,
    });
  });

  it("a main-line move with alternatives can be demoted at its own point", () => {
    const doc = readMovetext(PGN);
    expect(variationEditsAt(doc.moves, [0, 0, 0]).demote)
      .toEqual({ op: 'move-child', parentPath: [0, 0], from: 0, to: 1 });
  });

  it('a move deep in a variation acts on the line from its first move', () => {
    const doc = readMovetext(PGN);
    // 3. d3 inside the Bc4 line: [0, 0, 1, 0, 0]; the line starts at depth 2.
    expect(variationEditsAt(doc.moves, [0, 0, 1, 0, 0])).toEqual({
      promote: { op: 'move-child', parentPath: [0, 0], from: 1, to: 0 },
      demote: { op: 'move-child', parentPath: [0, 0], from: 1, to: 2 },
      mainline: { op: 'mainline', path: [0, 0, 1, 0, 0] },
      deleteFromHere: { op: 'delete', path: [0, 0, 1, 0, 0] },
      deleteVariation: { op: 'delete', path: [0, 0, 1] },
    });
  });

  it('the last line at a branch point cannot be demoted', () => {
    const doc = readMovetext(PGN);
    expect(variationEditsAt(doc.moves, [0, 0, 2, 0]).demote).toBeNull();
  });

  it('a nested variation acts at its own, deeper branch point', () => {
    const doc = readMovetext(PGN);
    // 3. Nc3, the alternative to 3. d3 inside the Bc4 line.
    const edits = variationEditsAt(doc.moves, [0, 0, 1, 0, 1]);
    expect(edits.promote).toEqual({ op: 'move-child', parentPath: [0, 0, 1, 0], from: 1, to: 0 });
    expect(edits.deleteVariation).toEqual({ op: 'delete', path: [0, 0, 1, 0, 1] });
  });

  it('nothing applies to the root or a missing path', () => {
    const doc = readMovetext(PGN);
    expect(Object.values(variationEditsAt(doc.moves, [])).every((v) => v === null)).toBe(true);
    expect(Object.values(variationEditsAt(doc.moves, [0, 7])).every((v) => v === null)).toBe(true);
  });
});

describe('remapPathThroughChange', () => {
  const up = { op: 'move-child', parentPath: [0, 0], from: 2, to: 0 };
  const down = { op: 'move-child', parentPath: [0, 0], from: 0, to: 2 };
  const del = { op: 'delete', path: [0, 0, 1] };

  it('follows the moved child and shifts the ones it passed', () => {
    expect(remapPathThroughChange([0, 0, 2, 0], up)).toEqual([0, 0, 0, 0]);
    expect(remapPathThroughChange([0, 0, 0], up)).toEqual([0, 0, 1]);
    expect(remapPathThroughChange([0, 0, 1, 3], up)).toEqual([0, 0, 2, 3]);
    expect(remapPathThroughChange([0, 0, 0], down)).toEqual([0, 0, 2]);
    expect(remapPathThroughChange([0, 0, 2], down)).toEqual([0, 0, 1]);
  });

  it('leaves paths under another parent, or above it, alone', () => {
    const other = [0, 1, 2];
    expect(remapPathThroughChange(other, up)).toBe(other);
    const shallow = [0];
    expect(remapPathThroughChange(shallow, up)).toBe(shallow);
  });

  it('drops paths inside a deleted subtree and shifts later siblings down', () => {
    expect(remapPathThroughChange([0, 0, 1], del)).toBeNull();
    expect(remapPathThroughChange([0, 0, 1, 0, 0], del)).toBeNull();
    expect(remapPathThroughChange([0, 0, 2, 0], del)).toEqual([0, 0, 1, 0]);
    const before = [0, 0, 0, 0];
    expect(remapPathThroughChange(before, del)).toBe(before);
  });
});

describe('applyTreeEdits', () => {
  it('does nothing when handed no edits', () => {
    const doc = readMovetext('1. e4 e5 2. Nf3');
    const before = writeMovetext(doc, { wrap: null });
    applyTreeEdits(doc, []);
    expect(writeMovetext(doc, { wrap: null })).toBe(before);
  });

  it('replays edits in order, each against the result of the last', () => {
    const doc = readMovetext('1. e4 e5 2. Nf3 (2. f4) (2. Nc3) Nc6');
    applyTreeEdits(doc, [
      // Nc3 up one step: [Nf3, f4, Nc3] -> [Nf3, Nc3, f4].
      { op: 'move-child', parentPath: [0, 0], from: 2, to: 1 },
      // Then delete what is now line 3, f4.
      { op: 'delete', path: [0, 0, 2] },
      // Then make Nc3 the main line.
      { op: 'mainline', path: [0, 0, 1] },
    ]);
    expect(writeMovetext(doc, { wrap: null })).toBe('1. e4 e5 2. Nc3 (2. Nf3 Nc6)');
  });
});

describe('appendMoveTree', () => {
  it('appends onto a blank document', () => {
    const doc = appendMoveTree(readMovetext(''), [
      { parentPath: [], ply: { s: 'e4' } },
      { parentPath: [0], ply: { s: 'e5' } }
    ]);
    expect(writeMovetext(doc, { wrap: null })).toBe('1. e4 e5');
  });

  it('appends after an existing mainline, continuing the move numbers', () => {
    const doc = appendMoveTree(readMovetext('1. e4 e5 2. Nf3'), [
      { parentPath: [0, 0, 0], ply: { s: 'Nc6' } },
      { parentPath: [0, 0, 0, 0], ply: { s: 'Bb5' } }
    ]);
    expect(writeMovetext(doc, { wrap: null })).toBe('1. e4 e5 2. Nf3 Nc6 3. Bb5');
  });

  it('leaves existing comments, NAGs and variations on earlier nodes untouched', () => {
    const doc = appendMoveTree(
      readMovetext('1. e4 {Good choice} e5 2. Nf3 $1 (2. f4 exf4) Nc6'),
      [{ parentPath: [0, 0, 0, 0], ply: { s: 'Bb5' } }]
    );
    // A black move right after a comment or NAG always gets its own
    // move number (`writeMovetext`'s own rule, unrelated to appendMoveTree) --
    // both pre-existing, neither something appending a move changes.
    expect(writeMovetext(doc, { wrap: null }))
      .toBe('1. e4 {Good choice} 1... e5 2. Nf3 $1 (2. f4 exf4) 2... Nc6 3. Bb5');
  });

  it('does nothing to a document when handed no moves', () => {
    const before = readMovetext('1. e4 e5');
    const doc = appendMoveTree(before, []);
    expect(writeMovetext(doc, { wrap: null })).toBe('1. e4 e5');
  });

  it('a resolved document (fenBefore/fenAfter already attached) appends the same way', () => {
    // `stores/game.js` always hands `appendMoveTree` a RESOLVED doc (it needs
    // one anyway for `applyShapesToMovetext`) -- this is what `writeMovetext`
    // actually reads at save time, so it is the shape worth proving against.
    const doc = appendMoveTree(resolveMovetext(readMovetext('1. e4 e5')), [
      { parentPath: [0, 0], ply: { s: 'Nf3' } }
    ]);
    expect(writeMovetext(doc, { wrap: null })).toBe('1. e4 e5 2. Nf3');
  });
});
