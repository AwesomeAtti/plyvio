/**
 * Add Games, for real — the Online tab, Chess.com source. §3.2.4.5, §4.4.5.
 *
 * Mirrors `addGames-real.test.js`'s split (a `planImport`-level describe,
 * then a lane-level describe against the real store) for the online path
 * approved 23 Sep: fetch, PGN-first mapping + JSON overlay
 * (`import/sources/chesscom.js`, covered on its own in
 * `chesscom-adapter.test.js`), the variant-scope skip, the empty
 * processing-rules seam, and a real write through the existing
 * `insertGames` path. Lichess has no adapter yet and is covered here only
 * to the extent of proving it still falls back to the old simulated
 * behavior rather than trying (and failing) to fetch anything.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { planImport, resolveOutcome, outcomeMessage } from '../src/lib/library/importJob.js';

vi.mock('$lib/data/session.js', () => ({
  libraryConnection: vi.fn(), isTauri: () => false,
  requestPersistentStorage: vi.fn(() => Promise.resolve())
}));
vi.mock('$lib/data/games.js', () => ({
  insertGames: vi.fn(),
  readGames: vi.fn(async () => []),
  readFavoriteIds: vi.fn(async () => []),
  readTrashedIds: vi.fn(async () => []),
  readTags: vi.fn(async () => []),
  readCollections: vi.fn(async () => []),
  readTagIdsByGame: vi.fn(async () => ({})),
  readCollectionIdsByGame: vi.fn(async () => ({}))
}));
vi.mock('$lib/import/sources/chesscom.js', async () => {
  const actual = await vi.importActual('$lib/import/sources/chesscom.js');
  return { ...actual, fetchAllGames: vi.fn() };
});

const onlineDraft = (over = {}) => ({ files: [], text: '', source: 'chesscom', username: 'gothamchess', range: 'all', ...over });

const request = (over = {}) => ({
  tab: 'online', draft: onlineDraft(), outcome: 'real',
  destination: 'db-1', duplicates: 'skip', tags: [], collections: [],
  ...over
});

const CHESSCOM_GAME = (over = {}) => ({
  rules: 'chess', pgn: '[Event "Live Chess"]\n[White "GothamChess"]\n[Black "Opponent"]\n[Result "1-0"]\n\n1. e4 e5 1-0',
  rated: true, time_class: 'blitz', ...over
});

describe('resolveOutcome — real now applies to Online too', () => {
  it('resolves on Online, same as Paste', () => {
    expect(resolveOutcome('online', 'real')).toBe('real');
  });
  it('still falls back to no-games-found on File, which has no real path yet', () => {
    expect(resolveOutcome('file', 'real')).toBe('none');
  });
});

describe('planImport — real Online', () => {
  it('returns a fetch marker for Chess.com, rather than a finished plan', () => {
    const p = planImport(request());
    expect(p).toEqual({
      needsOnlineFetch: true,
      draft: onlineDraft(),
      destination: 'db-1', duplicates: 'skip', tags: [], collections: []
    });
  });

  it('falls back to the old simulated behavior for Lichess, which has no adapter yet', () => {
    const p = planImport(request({ draft: onlineDraft({ source: 'lichess' }) }));
    expect(p.needsOnlineFetch).toBeUndefined();
    expect(p.outcome).toBe('none');
    expect(p.tab).toBe('online');
  });
});

const { games, tags, collections } = await import('../src/lib/stores/library.js');
const { startImport, resetImporter, cancelImport, retryImport, phase, downloaded, notice, canRetry } = await import('../src/lib/stores/importer.js');
const { libraryConnection } = await import('$lib/data/session.js');
const { objects } = await import('../src/lib/stores/settings.js');
const { activeLibraryId } = await import('../src/lib/stores/libraries.js');
const { insertGames, readGames } = await import('$lib/data/games.js');
const { fetchAllGames, ChessComUserNotFoundError } = await import('$lib/import/sources/chesscom.js');

describe('the lane runs a real Chess.com import', () => {
  beforeEach(() => {
    games.set([]);
    tags.set([]);
    collections.set([]);
    resetImporter();
    libraryConnection.mockReset();
    insertGames.mockReset();
    readGames.mockReset();
    readGames.mockImplementation(async () => []);
    fetchAllGames.mockReset();
    objects.update((o) => ({
      ...o,
      databases: [{ id: 'db-1', name: 'Destination Library', location: '/tmp/db-1.db', enabled: true, status: 'indexed' }]
    }));
    activeLibraryId.set('db-1');
    libraryConnection.mockResolvedValue({});
  });
  afterEach(() => resetImporter());

  const flush = () => new Promise((resolve) => {
    const unsub = phase.subscribe((p) => { if (p === 'done') { unsub(); resolve(); } });
  });

  it('fetches, maps, and writes the account\'s games, reporting real progress while it downloads', async () => {
    fetchAllGames.mockImplementation(async (username, { onMonth }) => {
      expect(username).toBe('gothamchess');
      onMonth(1, 1);
      onMonth(1, 2);
      return [CHESSCOM_GAME(), CHESSCOM_GAME({ pgn: CHESSCOM_GAME().pgn })];
    });
    insertGames.mockImplementation(async (_conn, rows) => rows.map((r, i) => ({ id: i + 1, ...r })));

    expect(startImport(request())).toBe(true);
    expect(get(phase)).toBe('downloading');
    await flush();

    expect(get(downloaded)).toBe(2);
    expect(insertGames).toHaveBeenCalledTimes(1);
    const rows = insertGames.mock.calls[0][1];
    expect(rows).toHaveLength(2);
    expect(rows[0].white).toBe('GothamChess');
    expect(rows[0].rated).toBe(1);
    expect(rows[0].time_class).toBe('blitz');
    expect(get(notice).kind).toBe('clean');
  });

  it('skips games in variants Plyvio cannot render, without failing the whole import', async () => {
    fetchAllGames.mockResolvedValue([CHESSCOM_GAME(), CHESSCOM_GAME({ rules: 'bughouse' })]);
    insertGames.mockImplementation(async (_conn, rows) => rows.map((r, i) => ({ id: i + 1, ...r })));

    expect(startImport(request())).toBe(true);
    await flush();

    expect(insertGames.mock.calls[0][1]).toHaveLength(1);
  });

  it('reports "no games found" for an account that does not exist, without touching the database', async () => {
    fetchAllGames.mockRejectedValue(new ChessComUserNotFoundError('no such account'));

    expect(startImport(request())).toBe(true);
    await flush();

    expect(insertGames).not.toHaveBeenCalled();
    expect(get(notice).kind).toBe('attention');
    expect(get(notice).plan.outcome).toBe('none');
    // Regression, 23 Sep: `planRealOnlineImport`'s empty-rows case used to
    // leave `sources: []`, which made the report fall back to its
    // Paste-only default ("Pasted text") and left `add.none.online`'s
    // `{name}` empty -- "No games found for" with nothing after it.
    expect(get(notice).plan.sources).toEqual([
      { kind: 'online', label: 'chess.com — gothamchess', detail: null, games: 0 }
    ]);
    expect(outcomeMessage(get(notice).plan)).toEqual({
      key: 'add.none.online', vars: { name: 'chess.com — gothamchess' }
    });
  });

  it('reports a network failure, with nothing written, when the fetch itself fails', async () => {
    fetchAllGames.mockRejectedValue(new Error('fetch failed'));

    expect(startImport(request())).toBe(true);
    await flush();

    expect(insertGames).not.toHaveBeenCalled();
    expect(get(notice).plan.outcome).toBe('network');
    expect(get(canRetry)).toBe(true);
  });

  it('lets a failed fetch be retried', async () => {
    fetchAllGames.mockRejectedValueOnce(new Error('fetch failed'));
    fetchAllGames.mockResolvedValueOnce([CHESSCOM_GAME()]);
    insertGames.mockImplementation(async (_conn, rows) => rows.map((r, i) => ({ id: i + 1, ...r })));

    expect(startImport(request())).toBe(true);
    await flush();
    expect(get(notice).plan.outcome).toBe('network');

    expect(retryImport()).toBe(true);
    await flush();
    expect(get(notice).kind).toBe('clean');
    expect(insertGames).toHaveBeenCalledTimes(1);
  });

  it('does not let a slow fetch that resolves after a cancel overwrite the cancelled state', async () => {
    let resolveFetch;
    fetchAllGames.mockImplementation(() => new Promise((resolve) => { resolveFetch = resolve; }));

    expect(startImport(request())).toBe(true);
    expect(cancelImport()).toBe(true);
    expect(get(phase)).toBe('done');
    expect(get(notice).kind).toBe('cancelled');

    resolveFetch([CHESSCOM_GAME()]);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(insertGames).not.toHaveBeenCalled();
    expect(get(notice).kind).toBe('cancelled');
  });
});
