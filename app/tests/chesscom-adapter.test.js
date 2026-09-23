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
  chessComRowFromApiGame,
  archiveMonthOf,
  archivesFromCursor,
  endTimeFromPgn,
  latestEndTimeFromPgns,
  chessComRowsSinceCursor,
  normalizeUsername
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

// Stage 2 -- incremental re-import (`EXPLORATION.md`, "Per-game source
// tracking", approved and built 23 Sep). `end_time`/`EndDate`/`EndTime`
// values below (1788271197 / 2026.09.01 / 13:59:57) are a real Chess.com
// game, cross-checked live against 381 real games with zero mismatches
// (`working/CLOSED.md`, 23 Sep) -- not invented numbers.

describe('archiveMonthOf', () => {
  it('reads {year, month} from a real archive URL', () => {
    expect(archiveMonthOf('https://api.chess.com/pub/player/x/games/2026/08')).toEqual({ year: 2026, month: 8 });
  });

  it('returns null for anything that doesn\'t carry the archive URL shape', () => {
    expect(archiveMonthOf('https://api.chess.com/pub/player/x/games/archives')).toBeNull();
    expect(archiveMonthOf('not a url')).toBeNull();
  });
});

describe('archivesFromCursor', () => {
  const archives = [
    'https://api.chess.com/pub/player/x/games/2026/06',
    'https://api.chess.com/pub/player/x/games/2026/07',
    'https://api.chess.com/pub/player/x/games/2026/08',
    'https://api.chess.com/pub/player/x/games/2026/09'
  ];

  it('returns every archive unchanged for a first import (no cursor)', () => {
    expect(archivesFromCursor(archives, null)).toEqual(archives);
  });

  it('drops whole months strictly before the cursor\'s month, keeping its own month and later', () => {
    expect(archivesFromCursor(archives, '2026.08.15')).toEqual([
      'https://api.chess.com/pub/player/x/games/2026/08',
      'https://api.chess.com/pub/player/x/games/2026/09'
    ]);
  });

  it('keeps everything when the cursor date can\'t be placed in a month (an unknown-digit date)', () => {
    expect(archivesFromCursor(archives, '2026.??.??')).toEqual(archives);
  });

  it('a cursor in the very last archived month keeps only that one', () => {
    expect(archivesFromCursor(archives, '2026.09.01')).toEqual([
      'https://api.chess.com/pub/player/x/games/2026/09'
    ]);
  });
});

const pgnWithEnd = ({ date = '2026.09.01', white = 'A', black = 'B', endDate = date, endTime = '12:00:00' } = {}) => [
  '[Event "Live Chess"]',
  `[Date "${date}"]`,
  `[White "${white}"]`,
  `[Black "${black}"]`,
  '[Result "1-0"]',
  '[Timezone "UTC"]',
  `[EndDate "${endDate}"]`,
  `[EndTime "${endTime}"]`,
  '',
  '1. e4 e5 1-0'
].join('\n');

describe('endTimeFromPgn', () => {
  it('combines EndDate/EndTime into the same Unix timestamp Chess.com\'s own end_time uses (live-verified value)', () => {
    const pgn = pgnWithEnd({ endDate: '2026.09.01', endTime: '13:59:57' });
    expect(endTimeFromPgn(pgn)).toBe(1788271197);
  });

  it('returns null when EndDate or EndTime is missing', () => {
    const noEnd = '[Event "Live Chess"]\n[Date "2026.09.01"]\n\n1. e4 e5 1-0';
    expect(endTimeFromPgn(noEnd)).toBeNull();
  });

  it('returns null for unparseable text', () => {
    expect(endTimeFromPgn('')).toBeNull();
  });
});

describe('latestEndTimeFromPgns', () => {
  it('returns the latest of several', () => {
    const pgns = [
      pgnWithEnd({ endTime: '10:00:00' }),
      pgnWithEnd({ endTime: '15:30:00' }),
      pgnWithEnd({ endTime: '12:00:00' })
    ];
    expect(latestEndTimeFromPgns(pgns)).toBe(endTimeFromPgn(pgnWithEnd({ endTime: '15:30:00' })));
  });

  it('returns null for an empty list, or one with nothing parseable', () => {
    expect(latestEndTimeFromPgns([])).toBeNull();
    expect(latestEndTimeFromPgns(['no tags here'])).toBeNull();
  });
});

describe('chessComRowsSinceCursor', () => {
  const apiGame = (over = {}) => ({
    rules: 'chess', pgn: pgnWithEnd(over), end_time: over.end_time, ...over
  });

  it('with no cursor, maps everything -- same as a first import', () => {
    const rows = chessComRowsSinceCursor(
      [apiGame({ date: '2026.09.01' }), apiGame({ date: '2026.09.02' })],
      'now', 'AwesomeAtti', null, null
    );
    expect(rows).toHaveLength(2);
  });

  it('drops a row dated strictly before the cursor -- guaranteed already known', () => {
    const rows = chessComRowsSinceCursor(
      [apiGame({ date: '2026.08.31' })], 'now', 'AwesomeAtti', '2026.09.01', null
    );
    expect(rows).toEqual([]);
  });

  it('keeps a row dated strictly after the cursor -- unambiguously new, no comparison needed', () => {
    const rows = chessComRowsSinceCursor(
      [apiGame({ date: '2026.09.02', end_time: 1 })], 'now', 'AwesomeAtti', '2026.09.01', 999999999
    );
    expect(rows).toHaveLength(1);
  });

  describe('on the boundary date itself', () => {
    const cursorDate = '2026.09.01';
    const knownEndTime = endTimeFromPgn(pgnWithEnd({ date: cursorDate, endTime: '12:00:00' }));

    it('drops a fetched game whose end_time is not after what\'s already known for that day', () => {
      const rows = chessComRowsSinceCursor(
        [apiGame({ date: cursorDate, end_time: knownEndTime })], 'now', 'AwesomeAtti', cursorDate, knownEndTime
      );
      expect(rows).toEqual([]);
    });

    it('keeps a fetched game whose end_time is after what\'s already known for that day', () => {
      const later = knownEndTime + 60;
      const rows = chessComRowsSinceCursor(
        [apiGame({ date: cursorDate, end_time: later })], 'now', 'AwesomeAtti', cursorDate, knownEndTime
      );
      expect(rows).toHaveLength(1);
    });

    it('keeps a boundary-date row when nothing is known for that day (knownEndTimeOnCursorDate null)', () => {
      const rows = chessComRowsSinceCursor(
        [apiGame({ date: cursorDate, end_time: 1 })], 'now', 'AwesomeAtti', cursorDate, null
      );
      expect(rows).toHaveLength(1);
    });

    it('keeps rather than drops when the fetched game\'s own end_time can\'t be compared (missing/non-numeric)', () => {
      const rows = chessComRowsSinceCursor(
        [{ rules: 'chess', pgn: pgnWithEnd({ date: cursorDate }), end_time: undefined }],
        'now', 'AwesomeAtti', cursorDate, knownEndTime
      );
      expect(rows).toHaveLength(1);
    });
  });

  it('still applies the variant-scope skip -- an unsupported row never reaches the date filter at all', () => {
    const rows = chessComRowsSinceCursor(
      [{ rules: 'bughouse', pgn: pgnWithEnd({ date: '2026.09.02' }), end_time: 1 }],
      'now', 'AwesomeAtti', '2026.09.01', null
    );
    expect(rows).toEqual([]);
  });
});

describe('normalizeUsername', () => {
  it('trims and lowercases, matching fetchArchives\' own request-URL normalization', () => {
    expect(normalizeUsername('  AwesomeAtti  ')).toBe('awesomeatti');
  });
});

describe('fetchAllGames with a cursor (stage 2)', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('never requests a month archivesFromCursor rules out', async () => {
    const requested = [];
    fetch.mockImplementation(async (url) => {
      requested.push(url);
      if (url.endsWith('/archives')) {
        return {
          ok: true, status: 200, json: async () => ({
            archives: [
              'https://api.chess.com/pub/player/x/games/2026/07',
              'https://api.chess.com/pub/player/x/games/2026/08',
              'https://api.chess.com/pub/player/x/games/2026/09'
            ]
          })
        };
      }
      return { ok: true, status: 200, json: async () => ({ games: [{ rules: 'chess' }] }) };
    });

    const games = await fetchAllGames('x', { cursorDate: '2026.08.15' });

    expect(requested).toEqual([
      'https://api.chess.com/pub/player/x/games/archives',
      'https://api.chess.com/pub/player/x/games/2026/08',
      'https://api.chess.com/pub/player/x/games/2026/09'
    ]);
    expect(games).toHaveLength(2);
  });

  it('with no cursor, requests every month, same as before stage 2', async () => {
    const requested = [];
    fetch.mockImplementation(async (url) => {
      requested.push(url);
      if (url.endsWith('/archives')) {
        return { ok: true, status: 200, json: async () => ({ archives: ['https://api.chess.com/pub/player/x/games/2026/09'] }) };
      }
      return { ok: true, status: 200, json: async () => ({ games: [] }) };
    });
    await fetchAllGames('x', {});
    expect(requested).toEqual([
      'https://api.chess.com/pub/player/x/games/archives',
      'https://api.chess.com/pub/player/x/games/2026/09'
    ]);
  });
});
