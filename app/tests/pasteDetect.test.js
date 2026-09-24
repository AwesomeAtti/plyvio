/**
 * `pgn/pasteDetect.js` — what a board paste is, if anything. Pure
 * functions, no database, no Svelte — same spirit as `importPgn.test.js`.
 */

import { describe, expect, it } from 'vitest';
import { detectPaste } from '../src/lib/pgn/pasteDetect.js';

const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const CUSTOM_FEN = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

describe('detectPaste', () => {
  it('is a no-op for empty or whitespace-only clipboard text', () => {
    expect(detectPaste('')).toEqual({ type: 'none' });
    expect(detectPaste('   \n  ')).toEqual({ type: 'none' });
    expect(detectPaste(null)).toEqual({ type: 'none' });
    expect(detectPaste(undefined)).toEqual({ type: 'none' });
  });

  it('is a no-op for plain text that is neither a FEN nor a game', () => {
    expect(detectPaste('hello world')).toEqual({ type: 'none' });
    expect(detectPaste('just some notes about an opening')).toEqual({ type: 'none' });
  });

  it('recognises a bare FEN, standard or custom', () => {
    expect(detectPaste(STANDARD_FEN)).toEqual({ type: 'fen', fen: STANDARD_FEN });
    expect(detectPaste(CUSTOM_FEN)).toEqual({ type: 'fen', fen: CUSTOM_FEN });
  });

  it('tolerates surrounding whitespace on a pasted FEN', () => {
    expect(detectPaste(`  ${STANDARD_FEN}  \n`)).toEqual({ type: 'fen', fen: STANDARD_FEN });
  });

  it('does not mistake a single line of moves for a FEN', () => {
    const detected = detectPaste('1. e4 e5 2. Nf3');
    expect(detected.type).toBe('pgn');
  });

  it('recognises a headerless, single-line movetext-only paste as a game', () => {
    expect(detectPaste('1. e4 e5 2. Nf3')).toEqual({
      type: 'pgn', movetext: '1. e4 e5 2. Nf3', fen: null, fields: {}
    });
  });

  it('recognises a fully-tagged single game, tags lifted, movetext separated', () => {
    const pgn = [
      '[Event "A Test Game"]',
      '[White "Alice"]',
      '[Black "Bob"]',
      '[Result "1-0"]',
      '',
      '1. e4 e5 2. Nf3 1-0'
    ].join('\n');
    expect(detectPaste(pgn)).toEqual({
      type: 'pgn',
      movetext: '1. e4 e5 2. Nf3 1-0',
      fen: null,
      fields: { event: 'A Test Game', white: 'Alice', black: 'Bob', result: '1-0' }
    });
  });

  it('lifts a [FEN] tag as the game’s own starting position, normalizing the standard array to null', () => {
    const custom = [
      '[White "Alice"]',
      `[FEN "${CUSTOM_FEN}"]`,
      '',
      '1. Kf1 Kd8 *'
    ].join('\n');
    expect(detectPaste(custom).fen).toBe(CUSTOM_FEN);

    const standard = [
      '[White "Alice"]',
      `[FEN "${STANDARD_FEN}"]`,
      '',
      '1. e4 *'
    ].join('\n');
    expect(detectPaste(standard).fen).toBeNull();
  });

  it('a game with tags but no moves is still recognised (a header-only paste)', () => {
    const pgn = ['[White "Alice"]', '[Black "Bob"]', '', '*'].join('\n');
    const detected = detectPaste(pgn);
    expect(detected.type).toBe('pgn');
    expect(detected.fields).toEqual({ white: 'Alice', black: 'Bob' });
  });

  it('reports more than one game as "multi" rather than guessing which one was meant', () => {
    const two = [
      '[White "Alice"] [Result "1-0"]', '', '1. e4 1-0', '',
      '[White "Carol"] [Result "0-1"]', '', '1. d4 0-1'
    ].join('\n');
    expect(detectPaste(two)).toEqual({ type: 'multi', count: 2 });
  });
});
