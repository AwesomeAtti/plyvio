/**
 * Reading a PGN document for import — database-schema.md §4, applied by
 * `pgn/importPgn.js`. Pure functions, no database, no Svelte.
 *
 * Boundary detection (`splitPgnGames`) is a light-touch, text-only splitter:
 * a blank line ends the tag-pair section (PGN standard §8.1.1) and a
 * validated termination marker ends the movetext (§8.2). Tag/field
 * extraction (`gameFieldsFromPgn`) never re-implements PGN parsing — it
 * delegates entirely to chessops' `parsePgn(...).headers`, so this file
 * never reads or interprets movetext itself.
 */

import { describe, expect, it } from 'vitest';
import {
  splitPgnGames, gameFieldsFromPgn, gameRowsFromPgnText
} from '../src/lib/pgn/importPgn.js';

const ONE_GAME = [
  '[Event "Test Open"]',
  '[Site "Somewhere"]',
  '[Date "2026.01.05"]',
  '[Round "3"]',
  '[White "Carlsen, Magnus"]',
  '[Black "Nepomniachtchi, Ian"]',
  '[Result "1-0"]',
  '[WhiteElo "2830"]',
  '[BlackElo "2790"]',
  '',
  '1. e4 e5 2. Nf3 Nc6 1-0'
].join('\n');

const OTHER_GAME = [
  '[Event "Second Event"]',
  '[White "Ding, Liren"]',
  '[Black "Caruana, Fabiano"]',
  '[Result "0-1"]',
  '',
  '1. d4 d5 0-1'
].join('\n');

describe('splitPgnGames', () => {
  it('a single game is one chunk, its own text, trimmed of outer blank lines', () => {
    const games = splitPgnGames(`\n\n${ONE_GAME}\n\n`);
    expect(games).toHaveLength(1);
    expect(games[0]).toBe(ONE_GAME);
  });

  it('splits a document holding several games back to back', () => {
    const games = splitPgnGames(`${ONE_GAME}\n\n${OTHER_GAME}`);
    expect(games).toHaveLength(2);
    expect(games[0]).toBe(ONE_GAME);
    expect(games[1]).toBe(OTHER_GAME);
  });

  it('splits even with no blank line separating the games', () => {
    const games = splitPgnGames(`${ONE_GAME}\n${OTHER_GAME}`);
    expect(games).toHaveLength(2);
  });

  it('empty or blank text yields no games', () => {
    expect(splitPgnGames('')).toEqual([]);
    expect(splitPgnGames('   \n  \n')).toEqual([]);
  });

  it('text with no tag pairs is still one game — a PGN may carry only movetext', () => {
    expect(splitPgnGames('1. e4 e5 *')).toEqual(['1. e4 e5 *']);
  });

  it('a result-like token inside a comment does not end the game early', () => {
    // The comment contains "1-0" followed by ordinary text, not by
    // whitespace-then-end-of-document or whitespace-then-"[", so the
    // guard rejects it as a false positive and keeps scanning for the
    // real termination marker.
    const withComment = [
      '[Event "Guarded"]',
      '[Result "1/2-1/2"]',
      '',
      '1. e4 e5 { transposes to a line that often ends 1-0 for white } 2. Nf3 Nc6 1/2-1/2'
    ].join('\n');
    const games = splitPgnGames(`${withComment}\n\n${OTHER_GAME}`);
    expect(games).toHaveLength(2);
    expect(games[0]).toBe(withComment);
    expect(games[1]).toBe(OTHER_GAME);
  });

  it('a result-like token inside a comment right before end-of-document is still accepted (accepted limitation)', () => {
    // Documented edge case: if a false marker happens to be followed by
    // whitespace-then-end-of-document, the cheap guard cannot tell it
    // apart from a real one. Out of scope per the agreed design.
    const text = '[Event "E"]\n\n1. e4 { analysis: often 1-0 }';
    const games = splitPgnGames(text);
    expect(games).toHaveLength(1);
  });

  it('a bare termination marker with nothing after it ends the game', () => {
    expect(splitPgnGames('1. e4 e5 *')).toEqual(['1. e4 e5 *']);
    expect(splitPgnGames('[Event "E"]\n\n1. e4 e5 1/2-1/2')).toEqual([
      '[Event "E"]\n\n1. e4 e5 1/2-1/2'
    ]);
  });
});

describe('gameFieldsFromPgn', () => {
  it('lifts every recognised tag (via chessops headers) and stores pgn verbatim', () => {
    const fields = gameFieldsFromPgn(ONE_GAME, '2026-01-05T00:00:00Z');
    expect(fields.pgn).toBe(ONE_GAME);
    expect(fields.created_at).toBe('2026-01-05T00:00:00Z');
    expect(fields.event).toBe('Test Open');
    expect(fields.site).toBe('Somewhere');
    expect(fields.date).toBe('2026.01.05');
    expect(fields.round).toBe('3');
    expect(fields.white).toBe('Carlsen, Magnus');
    expect(fields.black).toBe('Nepomniachtchi, Ian');
    expect(fields.result).toBe('1-0');
    expect(fields.white_elo).toBe(2830);
    expect(fields.black_elo).toBe(2790);
  });

  it('leaves a field the game did not carry a tag for entirely absent', () => {
    const fields = gameFieldsFromPgn(OTHER_GAME, 'now');
    expect(fields).not.toHaveProperty('white_elo');
    expect(fields).not.toHaveProperty('site');
  });

  it(`§2.2 — an unrated player's "-" becomes null, not the string itself`, () => {
    const fields = gameFieldsFromPgn('[WhiteElo "-"]\n\n*', 'now');
    expect(fields.white_elo).toBeNull();
  });

  it('§2.4 — an explicit FEN matching the standard start position is the same as none', () => {
    const standard = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(gameFieldsFromPgn(`[FEN "${standard}"]\n\n*`, 'now').fen).toBeNull();
    expect(gameFieldsFromPgn('[FEN "8/8/8/4k3/8/8/8/4K3 w - - 0 1"]\n\n*', 'now').fen)
      .toBe('8/8/8/4k3/8/8/8/4K3 w - - 0 1');
  });

  it('a text with no tags at all is still an insertable row — pgn is the only requirement', () => {
    const fields = gameFieldsFromPgn('just some text', 'now');
    expect(fields).toEqual({ pgn: 'just some text', created_at: 'now' });
  });

  it('never reads or reports the movetext — no moves-derived field appears', () => {
    const fields = gameFieldsFromPgn(ONE_GAME, 'now');
    expect(fields).not.toHaveProperty('movetext');
    expect(fields).not.toHaveProperty('moves');
  });
});

describe('gameRowsFromPgnText', () => {
  it('turns a whole document into one row per game', () => {
    const rows = gameRowsFromPgnText(`${ONE_GAME}\n\n${OTHER_GAME}`, 'now');
    expect(rows).toHaveLength(2);
    expect(rows[0].white).toBe('Carlsen, Magnus');
    expect(rows[1].white).toBe('Ding, Liren');
  });

  it('defaults created_at to now when not given', () => {
    const [row] = gameRowsFromPgnText(ONE_GAME);
    expect(typeof row.created_at).toBe('string');
    expect(row.created_at.length).toBeGreaterThan(0);
  });

  it('an empty document yields no rows', () => {
    expect(gameRowsFromPgnText('')).toEqual([]);
  });
});
