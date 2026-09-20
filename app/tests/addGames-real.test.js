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
vi.mock('$lib/data/games.js', () => ({ insertGames: vi.fn() }));

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
const { insertGames } = await import('$lib/data/games.js');

describe('the lane writes a real Paste import to the database', () => {
  beforeEach(() => {
    games.set([]);
    tags.set([]);
    collections.set([]);
    resetImporter();
    libraryConnection.mockReset();
    insertGames.mockReset();
  });
  afterEach(() => resetImporter());

  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('inserts the parsed rows through the seam and shows them in the Library', async () => {
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
    expect(get(phase)).toBe('done');
    expect(get(games)).toHaveLength(1);
    expect(get(games)[0].white).toBe('Carlsen, Magnus');
    expect(get(games)[0].id).toBe(501);
    expect(get(notice).kind).toBe('clean');
  });

  it('applies chosen tags and collections to the rows shown, same as a simulated import', async () => {
    libraryConnection.mockResolvedValue({});
    insertGames.mockResolvedValue([{ id: 1, white: 'A', black: 'B' }]);

    startImport(request({ tags: [{ id: 5, name: 'Blitz' }], collections: [{ id: 9, name: 'Prep' }] }));
    await flush();

    expect(get(games)[0].tags).toEqual([5]);
    expect(get(games)[0].collections).toEqual([9]);
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
