/**
 * Chess Board -- chessground's own `turnColor` must follow the position.
 *
 * `ChessBoard.svelte` hands chessground `movable.color`, but chessground
 * also keeps a separate `turnColor`, which it uses to tell an ordinary move
 * from a premove (`isPremovable`: `movable.color === piece.color &&
 * state.turnColor !== piece.color`) and to pick the king `check: true`
 * highlights. If it drifts from the position, a drag by the side to move is
 * handled as a premove: unfiltered destinations and no
 * `movable.events.after`. These tests drive chessground's real
 * `selectSquare` against the component's actually mounted instance.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { selectSquare } from '@lichess-org/chessground/board';
import ChessBoard from '$lib/components/game/ChessBoard.svelte';
import { destsForFen, turnFromFen } from '$lib/game/moves.js';

let capturedApi = null;
vi.mock('@lichess-org/chessground', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Chessground: (el, config) => {
      capturedApi = actual.Chessground(el, config);
      return capturedApi;
    }
  };
});

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 1';

describe('ChessBoard — turnColor reaches chessground itself, not just movable.color', () => {
  it('selecting a Black piece when Black is to move is an ordinary move, not a premove', () => {
    capturedApi = null;
    const fen = AFTER_E4_FEN;
    render(ChessBoard, {
      props: {
        fen, movable: true, dests: destsForFen(fen), turnColor: turnFromFen(fen)
      }
    });

    expect(turnFromFen(fen)).toBe('black');
    expect(capturedApi).not.toBeNull();
    expect(capturedApi.state.turnColor).toBe('black');

    // A real Black pawn, with real legal destinations from `destsForFen`.
    selectSquare(capturedApi.state, 'e7');

    expect(capturedApi.state.selected).toBe('e7');
    // Ordinary move path: chessground did NOT fall back to computing
    // premove destinations (the naive, illegal-inclusive squares the bug
    // report described as "grey dots... the dots even show illegal moves").
    expect(capturedApi.state.premovable.dests).toBeUndefined();
    // The real, legality-checked destinations are exactly what's offered.
    expect(capturedApi.state.movable.dests.get('e7')).toEqual(['e5', 'e6']);
  });

  it('selecting a White piece when White is to move is unaffected (the case that already worked)', () => {
    capturedApi = null;
    const fen = START_FEN;
    render(ChessBoard, {
      props: {
        fen, movable: true, dests: destsForFen(fen), turnColor: turnFromFen(fen)
      }
    });

    expect(capturedApi.state.turnColor).toBe('white');
    selectSquare(capturedApi.state, 'e2');

    expect(capturedApi.state.selected).toBe('e2');
    expect(capturedApi.state.premovable.dests).toBeUndefined();
    expect(capturedApi.state.movable.dests.get('e2')).toEqual(['e3', 'e4']);
  });

  it('a non-interactive board (movable=false) offers neither a move nor a premove', () => {
    capturedApi = null;
    const fen = AFTER_E4_FEN;
    render(ChessBoard, { props: { fen, movable: false } });

    selectSquare(capturedApi.state, 'e7');
    expect(capturedApi.state.selected).toBeUndefined();
  });

  it('a non-interactive board still highlights the king of the side to move', () => {
    capturedApi = null;
    // 1. e4 f5 2. Qh5+ -- Black is in check. No `turnColor` prop is passed,
    // exactly as on a board nothing can be moved on.
    const fen = 'rnbqkbnr/ppppp1pp/8/5p1Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2';
    render(ChessBoard, { props: { fen, movable: false, check: true } });

    expect(capturedApi.state.turnColor).toBe('black');
    expect(capturedApi.state.check).toBe('e8');
  });
});
