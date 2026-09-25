/**
 * Chess Board -- §5.4.1's own `turnColor` regression, filed 25 Sep as
 * "unable to add a variation for ply 1 / for any Black move", with dragging
 * showing grey dots on illegal squares. Root cause: `ChessBoard.svelte`
 * threaded `turnColor` into chessground's `movable.color` but never set
 * chessground's own top-level `turnColor` config -- a SEPARATE field
 * chessground's `board.selectSquare` uses to decide an ordinary move from a
 * PREMOVE (`isPremovable`: `movable.color === piece.color && state.turnColor
 * !== piece.color`). Left unset, chessground's `state.turnColor` never
 * leaves its own default, `'white'` -- so every Black-to-move position
 * satisfied that mismatch and was handled as a premove instead: grey,
 * un-legality-checked destinations, and no `movable.events.after` ever
 * firing (see `ChessBoard.svelte`'s own header comment for the full
 * mechanism). This test drives chessground's REAL `selectSquare` (not a
 * mock of it) against the component's actual mounted instance, for both
 * colors, and would have failed against the pre-fix component.
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
});
