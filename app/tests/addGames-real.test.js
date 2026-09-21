/**
 * Add Games, for real — the Paste tab. §3.2.4.5, §4.3.
 *
 * `addGames.test.js` covers the whole simulated lane (timing, cancel, retry,
 * the Status Bar, the report) with the `simulatedImport` preference pinned
 * to an explicit outcome, which is untouched by any of this — see
 * `library/importJob.js`'s `OUTCOME_APPLIES`. This file covers only the new
 * thing: `outcome: 'real'` (the default now — `stores/settings.js`) actually
 * reading pasted PGN and writing it to the database.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { planImport, resolveOutcome } from '../src/lib/library/importJob.js';

vi.mock('$lib/data/session.js', () => ({ libraryConnection: vi.fn() }));
vi.mock('$lib/data/games.js', () => ({
  insertGames: vi.fn(),
  // `runRealWrite()` no longer patches `games` itself -- a write that lands
  // on the active library now asks `loadGames()` to reload for real, so
  // these need mocking too, the same as `tests/library-loadGames.test.js`
  // already does for `loadGames()` on its own.
  readGames: vi.fn(async () => []),
  readFavoriteIds: vi.fn(async () => []),
  readTrashedIds: vi.fn(async () => []),
  readTags: vi.fn(async () => []),
  readCollections: vi.fn(async () => []),
  readTagIdsByGame: vi.fn(async () => ({})),
  readCollectionIdsByGame: vi.fn(async () => ({}))
}));

const pasteDraft = (text) => ({ files: [], text, source: 'chesscom', username: '', range: 'all' });

const ONE_GAME = [
  '[Event "Test Open"]', '[White "Carlsen, Magnus"]', '[Black "Nepomniachtchi, Ian"]',
  '[Result "1-0"]', '[WhiteElo "2830"]', '', '1. e4 e5 1-0'
].join('\n');

const request = (over = {}) => ({
  tab: 'paste', draft: pasteDraft(ONE_GAME), outcome: 'real',
  destination: 'db-1', duplicates: 'skip', tags: [], collections: [],
  ...over
});

describe('resolveOutcome — real is Paste-only so far', () => {
  it('resolves on Paste', () => {
    expect(resolveOutcome('paste', 'real')).toBe('real');
  });
  it('falls back to no-games-found on File and Online, which have no real path yet', () => {
    expect(resolveOutcome('file', 'real')).toBe('none');
    expect(resolveOutcome('online', 'real')).toBe('none');
  });
});

describe('planImport — real Paste', () => {
  it('parses the pasted PGN and reports it as a clean, real import', () => {
    const p = planImport(request());
    expect(p.outcome).toBe('clean');
    expect(p.total).toBe(1);
    expect(p.added).toBe(1);
    expect(p.failures).toEqual([]);
    expect(p.skipped).toBe(0);
    expect(p.download).toBe(false);
    expect(p.rows).toHaveLength(1);
    expect(p.rows[0].white).toBe('Carlsen, Magnus');
    expect(p.rows[0].pgn).toBe(ONE_GAME);
  });

  it('several games in one paste become several rows', () => {
    const second = '[Event "E2"]\n[White "Ding, Liren"]\n\n1. d4 *';
    const p = planImport(request({ draft: pasteDraft(`${ONE_GAME}\n\n${second}`) }));
    expect(p.total).toBe(2);
    expect(p.rows.map((r) => r.white)).toEqual(['Carlsen, Magnus', 'Ding, Liren']);
  });

  it('an empty paste reports no games found, same as the simulated outcome would', () => {
    const p = planImport(request({ draft: pasteDraft('') }));
    expect(p.outcome).toBe('none');
    expect(p.total).toBe(0);
    expect(p.sources).toEqual([]);
  });

  it('does not apply the outcome an explicit simulated request still asks for', () => {
    // Any pasted text at all is real content once the outcome is 'real' —
    // there is no longer a way to force 'problems'/'none' on Paste except
    // by changing the preference away from 'real' (see OUTCOME_APPLIES).
    const p = planImport(request({ draft: pasteDraft(ONE_GAME) }));
    expect(p.outcome).not.toBe('problems');
  });
});

const { games, tags, collections } = await import('../src/lib/stores/library.js');
const { startImport, resetImporter, phase, notice } = await import('../src/lib/stores/importer.js');
const { libraryConnection } = await import('$lib/data/session.js');
const { objects } = await import('../src/lib/stores/settings.js');
const { activeLibraryId } = await import('../src/lib/stores/libraries.js');
const {
  insertGames, readGames, readFavoriteIds, readTrashedIds,
  readTags, readCollections, readTagIdsByGame, readCollectionIdsByGame
} = await import('$lib/data/games.js');

describe('the lane writes a real Paste import to the database', () => {
  beforeEach(() => {
    games.set([]);
    tags.set([]);
    collections.set([]);
    resetImporter();
    libraryConnection.mockReset();
    insertGames.mockReset();
    for (const fn of [readGames, readFavoriteIds, readTrashedIds, readTags, readCollections, readTagIdsByGame, readCollectionIdsByGame]) {
      fn.mockReset();
      fn.mockImplementation(async () => (fn === readTagIdsByGame || fn === readCollectionIdsByGame ? {} : []));
    }
    // `runRealWrite()` (via `connectionForLibrary()`) writes to the
    // request's own `destination` ('db-1', the shared `request()` helper's
    // default) — NOT necessarily the active library; `id: 7` here is a
    // second, different library, active but not the destination, to prove
    // that distinction actually holds.
    objects.update((o) => ({
      ...o,
      databases: [
        { id: 'db-1', name: 'Destination Library', location: '/tmp/db-1.db', enabled: true, status: 'indexed' },
        { id: 7, name: 'Active Library', location: '/tmp/test.db', enabled: true, status: 'indexed' }
      ]
    }));
    activeLibraryId.set(7);
  });
  afterEach(() => resetImporter());

  // `runRealWrite()` now `await`s `loadGames()` itself before `finish(p)`
  // runs (when the destination is the active library), so a plain
  // `setTimeout(0)` flush that was enough for the old synchronous splice is
  // no longer reliably enough once a real reload's own chain of awaited
  // reads is in the mix. Waiting on `phase` to reach 'done' is exact rather
  // than a timing guess.
  const flush = () => new Promise((resolve) => {
    const unsub = phase.subscribe((p) => { if (p === 'done') { unsub(); resolve(); } });
  });

  it('inserts the parsed rows into the request\'s destination, and leaves the Library view alone when that destination is not the active library', async () => {
    // 20 Sep 2026 -- `runRealWrite()` used to splice its inserted rows
    // straight into `games` regardless of which library was active, which
    // is exactly the bug this fixes: the Library view showed a game from a
    // library the user wasn't even looking at. The destination here ('db-1')
    // is deliberately NOT the active library (7, from `beforeEach`), so the
    // correct outcome is that the write happens for real but `games` -- the
    // active library's own view -- is untouched. Switching to 'db-1' later
    // is what `library-loadGames.test.js` already covers.
    const connection = {};
    libraryConnection.mockResolvedValue(connection);
    insertGames.mockResolvedValue([
      { id: 501, date: null, white: 'Carlsen, Magnus', whiteElo: 2830, black: 'Nepomniachtchi, Ian',
        blackElo: null, event: 'Test Open', result: '1-0', plyCount: null, createdAt: 'now' }
    ]);

    expect(startImport(request())).toBe(true);
    await flush();

    expect(insertGames).toHaveBeenCalledWith(connection, expect.arrayContaining([
      expect.objectContaining({ pgn: ONE_GAME, white: 'Carlsen, Magnus' })
    ]));
    // 20 Sep 2026 — the write goes to the request's DESTINATION ('db-1'),
    // not whichever library happens to be active (7); this used to be a
    // real gap where `destination` was collected by the dialog and then
    // silently ignored.
    expect(libraryConnection).toHaveBeenCalledWith('db-1');
    expect(get(phase)).toBe('done');
    expect(get(games)).toEqual([]);
    expect(readGames).not.toHaveBeenCalled();
    expect(get(notice).kind).toBe('clean');
  });

  it('reloads the Library view from the database when the destination IS the active library', async () => {
    // The other half of the same fix: when you're looking at the library you
    // just added to, the view must actually update -- through a real reload,
    // not a hand-spliced copy of the inserted row. Setting up readGames() et
    // al. to answer with the post-insert state (rather than asserting
    // against the row shape `insertGames()` returned) is what proves this
    // goes through `loadGames()` for real, not a shortcut that happens to
    // look similar.
    activeLibraryId.set('db-1');
    const connection = {};
    libraryConnection.mockResolvedValue(connection);
    insertGames.mockResolvedValue([
      { id: 501, date: null, white: 'Carlsen, Magnus', whiteElo: 2830, black: 'Nepomniachtchi, Ian',
        blackElo: null, event: 'Test Open', result: '1-0', plyCount: null, createdAt: 'now' }
    ]);
    readGames.mockResolvedValue([
      { id: 501, date: null, white: 'Carlsen, Magnus', whiteElo: 2830, black: 'Nepomniachtchi, Ian',
        blackElo: null, event: 'Test Open', result: '1-0', plyCount: null, createdAt: 'now' }
    ]);

    expect(startImport(request({ tags: [{ id: 5, name: 'Blitz' }], collections: [{ id: 9, name: 'Prep' }] }))).toBe(true);
    await flush();

    expect(readGames).toHaveBeenCalledWith(connection, expect.objectContaining({ limit: expect.any(Number) }));
    expect(get(games)).toHaveLength(1);
    expect(get(games)[0].white).toBe('Carlsen, Magnus');
    expect(get(games)[0].id).toBe(501);
    // Tags/Collections chosen in the dialog are not yet written to
    // `tag_games`/`collection_games` (`registerOrganisation`'s own comment,
    // unchanged by this fix), so a real reload -- correctly -- does not show
    // them on the row the way the old optimistic splice used to pretend.
    // This is the existing, known gap, not a regression from this change.
    expect(get(games)[0].tags).toEqual([]);
    expect(get(games)[0].collections).toEqual([]);
  });

  it('finishes cleanly, without writing anything, when there is no real connection', async () => {
    libraryConnection.mockResolvedValue(null);

    startImport(request());
    await flush();

    expect(insertGames).not.toHaveBeenCalled();
    expect(get(phase)).toBe('done');
    expect(get(games)).toEqual([]);
  });
});
