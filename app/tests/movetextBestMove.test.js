import { describe, expect, it } from 'vitest';
import {
  BESTMOVE_EXTENSION_VERSION,
  BESTMOVE_REFERS_TO,
  bestMoveIsMoversOwn,
  formatBestMove,
  parseBestMove,
  positionForBestMove,
  sideForBestMove,
} from '../src/lib/pgn/bestMove.js';

describe('[%bestmove] values', () => {
  it('reads a UCI move', () => {
    expect(parseBestMove('e2e4')).toMatchObject({ uci: 'e2e4', wellFormed: true });
  });

  it('reads a promotion', () => {
    expect(parseBestMove('e7e8q')).toMatchObject({ uci: 'e7e8q', wellFormed: true });
  });

  it('reads castling as the engine reports it, without translating', () => {
    expect(parseBestMove('e1g1')).toMatchObject({ uci: 'e1g1', wellFormed: true });
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseBestMove('  e2e4 ').uci).toBe('e2e4');
  });

  it('marks a malformed value rather than throwing', () => {
    expect(parseBestMove('Nf3')).toMatchObject({ uci: 'Nf3', wellFormed: false });
    expect(parseBestMove('')).toMatchObject({ wellFormed: false });
  });

  it('writes the value back unquoted and unchanged', () => {
    expect(formatBestMove(parseBestMove('e7e8q'))).toBe('e7e8q');
  });
});

describe('the meaning is stated in one place', () => {
  it('is the position the move was played from', () => {
    expect(BESTMOVE_REFERS_TO).toBe('before');
    expect(BESTMOVE_EXTENSION_VERSION).toBe('1.1');
    expect(bestMoveIsMoversOwn()).toBe(true);
  });

  it('names a move for the side that has just moved', () => {
    expect(sideForBestMove('white')).toBe('white');
    expect(sideForBestMove('black')).toBe('black');
  });

  it('names the reply under the version 1.0 reading', () => {
    expect(sideForBestMove('white', 'after')).toBe('black');
    expect(sideForBestMove('black', 'after')).toBe('white');
  });

  it('selects the position by the same switch', () => {
    const positions = { before: 'B', after: 'A' };
    expect(positionForBestMove(positions)).toBe('B');
    expect(positionForBestMove(positions, 'after')).toBe('A');
  });
});
