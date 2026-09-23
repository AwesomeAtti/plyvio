/**
 * The Chess.com source adapter. `working/EXPLORATION.md`'s "Online game
 * import" section for the architecture; `working/CLOSED.md` (23 Sep) for the
 * live tag-shape/CORS spike this mapping is built from.
 *
 * Two halves, tested separately: `chessComRowFromApiGame` is pure (no
 * network at all) and is exercised directly; `fetchArchives`/`fetchMonthGames`/
 * `fetchAllGames` talk to `fetch()`, mocked here so nothing in this suite
 * touches the real Chess.com API.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  SOURCE_TYPE,
  ChessComUserNotFoundError,
  fetchArchives,
  fetchMonthGames,
  fetchAllGames,
  chessComRowFromApiGame
} from '../src/lib/import/sources/chesscom.js';

describe('chessComRowFromApiGame', () => {
  const PGN = [
    '[Event "Live Chess"]', '[White "Carlsen, Magnus"]', '[Black "Nepomniachtchi, Ian"]',
    '[Result "1-0"]', '[WhiteElo "2830"]', '', '1. e4 e5 1-0'
  ].join('\n');

  it('maps the PGN tags the same way every other import path does', () => {
    const row = chessComRowFromApiGame({ rules: 'chess', pgn: PGN }, '2026-09-23T00:00:00.000Z', 'AwesomeAtti');
    expect(row.white).toBe('Carlsen, Magnus');
    expect(row.black).toBe('Nepomniachtchi, Ian');
    expect(row.result).toBe('1-0');
    expect(row.white_elo).toBe(2830);
    expect(row.pgn).toBe(PGN);
    expect(row.created_at).toBe('2026-09-23T00:00:00.000Z');
  });

  it('overlays the JSON-only fields the PGN never carries', () => {
    const row = chessComRowFromApiGame({
      rules: 'chess', pgn: PGN, rated: true, time_class: 'blitz', tournament: 'https://example/t',
      accuracies: { white: 91.2, black: 84.6 },
      fen: '8/8/8/8/8/8/8/K6k w - - 0 40',
      initial_setup: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    }, 'now', 'AwesomeAtti');
    expect(row.rated).toBe(1);
    expect(row.time_class).toBe('blitz');
    expect(row.tournament).toBe('https://example/t');
    expect(row.white_accuracy).toBe(91.2);
    expect(row.black_accuracy).toBe(84.6);
    // §4.1: Chess.com's `fen` is the FINAL position, its `initial_setup` the
    // STARTING one -- the opposite of Plyvio's own `fen`/`current_position`.
    expect(row.current_position).toBe('8/8/8/8/8/8/8/K6k w - - 0 40');
    // A standard starting position is stored as NULL, same rule `gameFieldsFromPgn`
    // already applies to an explicit `[FEN]` tag.
    expect(row.fen).toBeNull();
  });

  it('stores a non-standard starting position as fen', () => {
    const row = chessComRowFromApiGame({
      rules: 'chess960', pgn: PGN, initial_setup: 'nbbrkrqn/pppppppp/8/8/8/8/PPPPPPPP/NBBRKRQN w KQkq - 0 1'
    }, 'now', 'AwesomeAtti');
    expect(row.fen).toBe('nbbrkrqn/pppppppp/8/8/8/8/PPPPPPPP/NBBRKRQN w KQkq - 0 1');
    expect(row.variant).toBe('freestyle');
  });

  it('skips a variant Plyvio cannot render, rather than guessing a shape for it', () => {
    for (const rules of ['bughouse', 'crazyhouse', 'kingofthehill', 'threecheck']) {
      expect(chessComRowFromApiGame({ rules, pgn: PGN }, 'now', 'AwesomeAtti')).toBeNull();
    }
  });

  it('leaves accuracy fields unset when Chess.com omits them', () => {
    const row = chessComRowFromApiGame({ rules: 'chess', pgn: PGN }, 'now', 'AwesomeAtti');
    expect(row.white_accuracy).toBeUndefined();
    expect(row.black_accuracy).toBeUndefined();
  });

  // §2.3 -- per-game source tracking, added 23 Sep.
  describe('source_type / source_identifier (§2.3)', () => {
    it('stamps every row with the source type and the account imported', () => {
      const row = chessComRowFromApiGame({ rules: 'chess', pgn: PGN }, 'now', 'AwesomeAtti');
      expect(row.source_type).toBe(SOURCE_TYPE);
      expect(row.source_identifier).toBe('awesomeatti');
    });

    it('normalizes the username the same way fetchArchives does, so the two always match', () => {
      const row = chessComRowFromApiGame({ rules: 'chess', pgn: PGN }, 'now', '  GothamChess  ');
      expect(row.source_identifier).toBe('gothamchess');
    });
  });
});

describe('fetchArchives / fetchMonthGames / fetchAllGames', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lowercases and trims the username, per Chess.com\'s own API rule', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ archives: [] }) });
    await fetchArchives('  GothamChess  ');
    expect(fetch).toHaveBeenCalledWith('https://api.chess.com/pub/player/gothamchess/games/archives');
  });

  it('throws ChessComUserNotFoundError on a 404, not a generic error', async () => {
    fetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    await expect(fetchArchives('nobody-plays-this')).rejects.toBeInstanceOf(ChessComUserNotFoundError);
  });

  it('throws a plain error on any other failure status', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    await expect(fetchArchives('someone')).rejects.not.toBeInstanceOf(ChessComUserNotFoundError);
  });

  it('fetches one month\'s games from its archive URL', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ games: [{ rules: 'chess' }] }) });
    const games = await fetchMonthGames('https://api.chess.com/pub/player/x/games/2026/09');
    expect(games).toEqual([{ rules: 'chess' }]);
  });

  it('fetches every archive month in order and reports running totals via onMonth', async () => {
    fetch.mockImplementation(async (url) => {
      if (url.endsWith('/archives')) {
        return { ok: true, status: 200, json: async () => ({ archives: ['.../2026/08', '.../2026/09'] }) };
      }
      if (url.endsWith('/08')) {
        return { ok: true, status: 200, json: async () => ({ games: [{ rules: 'chess' }, { rules: 'chess' }] }) };
      }
      return { ok: true, status: 200, json: async () => ({ games: [{ rules: 'chess' }] }) };
    });

    const calls = [];
    const games = await fetchAllGames('someone', { onMonth: (count, total) => calls.push([count, total]) });

    expect(games).toHaveLength(3);
    expect(calls).toEqual([[2, 2], [1, 3]]);
  });

  it('surfaces "no such account" from the very first request', async () => {
    fetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    await expect(fetchAllGames('nobody-plays-this')).rejects.toBeInstanceOf(ChessComUserNotFoundError);
  });
});

it('has a stable source_type matching database-schema.md §5.2\'s existing vocabulary', () => {
  expect(SOURCE_TYPE).toBe('chess_com_player');
});
