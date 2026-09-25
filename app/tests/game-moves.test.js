/**
 * `game/moves.js` — the pure chess-rules layer Stage 4 of
 * `analysis-board-plan.md` plays a board move through. No store, no tree,
 * no DOM: just "is this legal from this FEN, and what does it produce."
 */

import { describe, expect, it } from 'vitest';
import { destsForFen, turnFromFen, isPromotionMove, playMove, pvMoves } from '../src/lib/game/moves.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('destsForFen', () => {
  it('the opening position has a destination entry for every piece that can move', () => {
    const dests = destsForFen(START);
    // 8 pawns + 2 knights = 10 pieces have a legal first move each; the
    // back-rank pieces behind them do not.
    expect(dests.size).toBe(10);
    expect(dests.get('e2')).toEqual(expect.arrayContaining(['e3', 'e4']));
    expect(dests.has('a1')).toBe(false);
  });

  it('an unreadable FEN returns an empty map rather than throwing', () => {
    expect(destsForFen('not a fen').size).toBe(0);
    expect(destsForFen(undefined).size).toBe(0);
  });
});

describe('turnFromFen', () => {
  it('reads the side to move from the FEN’s own field', () => {
    expect(turnFromFen(START)).toBe('white');
    expect(turnFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1')).toBe('black');
  });
});

describe('isPromotionMove', () => {
  it('a pawn one step from promoting says yes', () => {
    expect(isPromotionMove('8/4P3/8/8/8/8/8/4K2k w - - 0 1', 'e7', 'e8')).toBe(true);
  });

  it('the same pawn short of the last rank says no', () => {
    expect(isPromotionMove('4k3/8/8/8/8/4P3/8/4K3 w - - 0 1', 'e3', 'e4')).toBe(false);
  });

  it('a non-pawn reaching the back rank is not a promotion', () => {
    expect(isPromotionMove('4k3/8/8/8/8/8/8/R3K3 w - - 0 1', 'a1', 'a8')).toBe(false);
  });
});

describe('playMove', () => {
  it('plays a normal opening move', () => {
    const result = playMove(START, { from: 'e2', to: 'e4' });
    expect(result).toEqual({
      san: 'e4',
      fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      check: false,
      from: 'e2',
      to: 'e4'
    });
  });

  it('rejects an illegal move', () => {
    expect(playMove(START, { from: 'e2', to: 'e5' })).toBeNull();
  });

  it('castles kingside from the square the user actually dropped on (g1), not chessops’ rook-square form', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    const result = playMove(fen, { from: 'e1', to: 'g1' });
    expect(result.san).toBe('O-O');
    expect(result.fenAfter).toBe('r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1');
  });

  it('castles queenside the same way, from c1', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    const result = playMove(fen, { from: 'e1', to: 'c1' });
    expect(result.san).toBe('O-O-O');
  });

  it('plays an en passant capture', () => {
    const fen = 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3';
    const result = playMove(fen, { from: 'e5', to: 'f6' });
    expect(result.san).toBe('exf6');
    // The captured pawn (f5) is gone, not just the mover having moved.
    expect(result.fenAfter).toContain('/5P2/');
  });

  it('rejects a promotion move with no promotion piece named', () => {
    expect(playMove('8/4P3/8/8/8/8/8/4K2k w - - 0 1', { from: 'e7', to: 'e8' })).toBeNull();
  });

  it('rejects a promotion piece on a move that is not one', () => {
    expect(playMove(START, { from: 'e2', to: 'e4', promotion: 'queen' })).toBeNull();
  });

  it('promotes to the named piece and reports check when the promotion gives it', () => {
    // The black king sits on h8, off the e-file, so it's not blocking the
    // pawn's own promotion square -- and a queen landing on e8 checks it
    // along the open 8th rank.
    const result = playMove('7k/4P3/8/8/8/8/8/4K3 w - - 0 1', { from: 'e7', to: 'e8', promotion: 'queen' });
    expect(result.san).toBe('e8=Q+');
    expect(result.check).toBe(true);
    expect(result.fenAfter.startsWith('4Q2k/8/8/8/8/8/8/4K3 b')).toBe(true);
  });

  it('under-promotes when asked', () => {
    const result = playMove('7k/4P3/8/8/8/8/8/4K3 w - - 0 1', { from: 'e7', to: 'e8', promotion: 'knight' });
    expect(result.san).toBe('e8=N');
  });
});

describe('pvMoves', () => {
  it('replays the first two plies of a PV as UI squares, default n', () => {
    expect(pvMoves(START, ['e4', 'e5', 'Nf3'])).toEqual([
      { from: 'e2', to: 'e4', promotion: null },
      { from: 'e7', to: 'e5', promotion: null }
    ]);
  });

  it('takes fewer plies when asked, or when the PV runs out', () => {
    expect(pvMoves(START, ['e4', 'e5', 'Nf3'], 1)).toEqual([
      { from: 'e2', to: 'e4', promotion: null }
    ]);
    expect(pvMoves(START, ['e4'])).toEqual([{ from: 'e2', to: 'e4', promotion: null }]);
    expect(pvMoves(START, [])).toEqual([]);
  });

  it('remaps kingside castling to the king’s own landing square (g1), not chessops’ rook-square form', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    expect(pvMoves(fen, ['O-O'], 1)).toEqual([{ from: 'e1', to: 'g1', promotion: null }]);
  });

  it('remaps queenside castling to c1/c8 the same way, on both sides', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    expect(pvMoves(fen, ['O-O-O'], 1)).toEqual([{ from: 'e1', to: 'c1', promotion: null }]);

    const fenBlackToMove = 'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1';
    expect(pvMoves(fenBlackToMove, ['O-O-O'], 1)).toEqual([{ from: 'e8', to: 'c8', promotion: null }]);
    expect(pvMoves(fenBlackToMove, ['O-O'], 1)).toEqual([{ from: 'e8', to: 'g8', promotion: null }]);
  });

  it('carries the promotion piece as a chessops role name', () => {
    const fen = '7k/4P3/8/8/8/8/8/4K3 w - - 0 1';
    expect(pvMoves(fen, ['e8=Q+'], 1)).toEqual([{ from: 'e7', to: 'e8', promotion: 'queen' }]);
  });

  it('stops at the first SAN that does not parse, rather than guessing past it', () => {
    expect(pvMoves(START, ['e4', 'not a move', 'Nf3'])).toEqual([
      { from: 'e2', to: 'e4', promotion: null }
    ]);
  });

  it('an unreadable FEN returns no moves rather than throwing', () => {
    expect(pvMoves('not a fen', ['e4'])).toEqual([]);
  });
});
