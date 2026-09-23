/**
 * The data seam, against the real sample databases.
 *
 * These open `samples/config.db` and `samples/sample-games.db` through the seam, with
 * the same SQLite build the application uses. What they prove is the schema and
 * the queries. What they cannot prove is the storage layer — no worker, no OPFS —
 * which is the browser's half and needs a browser.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { openMemoryDatabase } from '../src/lib/data/backends/memory.js';
import {
  CONFIG_TABLES,
  SCHEMA_USER_VERSION,
  addGameToCollection,
  addTagToGame,
  countGames,
  describe as describeIdentity,
  findOrCreateCollection,
  findOrCreateTag,
  identify,
  insertGame,
  insertGames,
  isConnection,
  movetextOf,
  readCollections,
  readFavoriteIds,
  readGameIdsForCollection,
  readGameIdsForTag,
  readGames,
  readTagIdsByGame,
  readCollectionIdsByGame,
  countNewGamesForSubscription,
  latestGameDateForSource,
  gamePgnsForSourceOnDate,
  readEngines,
  readLibraries,
  readMovetextFor,
  readPgn,
  readPreference,
  readPreferences,
  readSubscriptions,
  writeEngineEnabled,
  writeEngineName,
  writeEngineOption,
  writeLibraryEnabled,
  writeLibraryName,
  readCollectionCounts,
  readTagCounts,
  readTagIdsForGame,
  readTags,
  readTrashedIds,
  readUiState,
  removeGameFromCollection,
  removeTagFromGame,
  setFavorite,
  setTrashed,
  writeMovetextFor,
  writePreference
} from '../src/lib/data/index.js';
import { plyCount, readMovetext, writeMovetext } from '../src/lib/pgn/movetext.js';

const samples = resolve(dirname(fileURLToPath(import.meta.url)), '../../samples');
const bytesOf = (name) => new Uint8Array(readFileSync(resolve(samples, name)));
const available = existsSync(resolve(samples, 'config.db'));
const suite = available ? describe : describe.skip;

suite('config.db through the seam', () => {
  let config;
  beforeAll(async () => {
    config = await openMemoryDatabase(bytesOf('config.db'));
  });
  afterAll(async () => config?.close());

  it('satisfies the connection contract', () => {
    expect(isConnection(config)).toBe(true);
  });

  it('identifies itself as a config database at the schema version', async () => {
    const identity = await identify(config);
    expect(identity.kind).toBe('config');
    expect(identity.userVersion).toBe(SCHEMA_USER_VERSION);
    expect(identity.matchesSchema).toBe(true);
    for (const table of CONFIG_TABLES) expect(identity.tables).toContain(table);
    expect(describeIdentity(identity)).toBe('a config database at schema v010');
  });

  it('carries no application_id, so the file is not self-identifying', async () => {
    // Recorded rather than asserted as desirable: adopting one is an open decision.
    expect((await identify(config)).applicationId).toBe(0);
  });

  it('reads preferences, parsing the JSON the schema stores', async () => {
    const values = await readPreferences(config);
    expect(values.theme).toBe('system');
    expect(values.language).toBe('en');
    expect(values.restoreOpenGames).toBe(true);
    expect(values.boardStyle).toBe('Default');
  });

  it('reads one preference, with a fallback for a key that is not set', async () => {
    expect(await readPreference(config, 'language')).toBe('en');
    expect(await readPreference(config, 'nothing.here', 'fallback')).toBe('fallback');
  });

  it('translates a schema key to camelCase, both directions', async () => {
    // readPreferences() and readPreference() are keyed by the schema's own
    // spelling nowhere — callers never see `restore_open_games`.
    expect(await readPreference(config, 'restoreOpenGames')).toBe(true);

    const copy = await openMemoryDatabase(bytesOf('config.db'));
    await writePreference(copy, 'restoreOpenGames', false);
    expect(await readPreference(copy, 'restoreOpenGames')).toBe(false);
    // The row underneath is still spelled the way the table spells it.
    expect(await copy.value("select value from preferences where key = 'restore_open_games'"))
      .toBe('false');
    await copy.close();
  });

  it('reads UI state, including a nested object', async () => {
    const state = await readUiState(config);
    expect(state['library.sidebar_collapsed']).toBe(false);
    expect(state['library.folded_groups']).toMatchObject({ subscriptions: false });
    expect(state['game.open_tabs']).toEqual([]);
  });

  it('reads the libraries, and names the file each one points at', async () => {
    // Checks that the two seeded libraries are present, rather than the
    // exact full list -- `samples/config.db` doubles as the desktop app's
    // own live config database (see `data/session.js`'s `CONFIG_DB_PATH`
    // comment) until it has a real data directory of its own, so manual
    // testing against the real app can add rows here that this test has no
    // business asserting against.
    const libraries = await readLibraries(config);
    const byName = Object.fromEntries(libraries.map((l) => [l.name, l]));
    expect(byName['Sample Games']).toMatchObject({ path: 'sample-games.db', enabled: true });
    expect(byName['Master Games']).toBeTruthy();
  });

  it('renames a library and reads it back, on a copy', async () => {
    const copy = await openMemoryDatabase(bytesOf('config.db'));
    const [first] = await readLibraries(copy);
    await writeLibraryName(copy, first.id, 'Renamed Library');
    expect((await readLibraries(copy))[0].name).toBe('Renamed Library');
    await copy.close();
  });

  it('disables and re-enables a library, on a copy', async () => {
    const copy = await openMemoryDatabase(bytesOf('config.db'));
    const [first] = await readLibraries(copy);
    expect(first.enabled).toBe(true);
    await writeLibraryEnabled(copy, first.id, false);
    expect((await readLibraries(copy))[0].enabled).toBe(false);
    await writeLibraryEnabled(copy, first.id, true);
    expect((await readLibraries(copy))[0].enabled).toBe(true);
    await copy.close();
  });

  it('leaves the original untouched when a copy is renamed or disabled', async () => {
    const libraries = await readLibraries(config);
    expect(libraries[0]).toMatchObject({ name: 'Master Games', enabled: true });
  });

  it('reads the engines, translated to camelCase', async () => {
    const engines = await readEngines(config);
    expect(engines.map((e) => e.name)).toEqual(['Stockfish', 'Torch']);
    expect(engines[0]).toMatchObject({
      binaryPath: '/usr/local/bin/stockfish', hashMb: 512, threads: 4, enabled: true
    });
  });

  it('renames an engine, sets its threads/hash, and toggles it, on a copy', async () => {
    const copy = await openMemoryDatabase(bytesOf('config.db'));
    const [first] = await readEngines(copy);
    await writeEngineName(copy, first.id, 'Renamed Engine');
    await writeEngineOption(copy, first.id, 'threads', 8);
    await writeEngineOption(copy, first.id, 'hashMb', 1024);
    await writeEngineEnabled(copy, first.id, false);
    const [updated] = await readEngines(copy);
    expect(updated).toMatchObject({
      name: 'Renamed Engine', threads: 8, hashMb: 1024, enabled: false
    });
    await copy.close();
  });

  it('leaves the original untouched when a copy\'s engine is changed', async () => {
    const engines = await readEngines(config);
    expect(engines[0]).toMatchObject({ name: 'Stockfish', enabled: true });
  });

  it('reads the subscriptions, translated to camelCase', async () => {
    const subs = await readSubscriptions(config);
    expect(subs.map((s) => s.name)).toEqual(['Hikaru', 'GothamChess']);
    expect(subs[0]).toMatchObject({
      sourceType: 'chess_com_player', sourceIdentifier: 'hikaru', libraryId: 2,
      syncInterval: 'hourly', lastViewedAt: '2026-09-11T21:30:00Z'
    });
  });

  it('counts a subscription\'s new games against its destination library', async () => {
    const games = await openMemoryDatabase(bytesOf('master-games.db'));
    // Never viewed: every row in subscription_games counts.
    expect(await countNewGamesForSubscription(games, 2, null)).toBe(493);
    // Every sample game predates this subscription's real last_viewed_at.
    expect(await countNewGamesForSubscription(games, 2, '2026-09-11T21:30:00Z')).toBe(0);
    // A date before every sample game counts them all.
    expect(await countNewGamesForSubscription(games, 2, '2026-01-01T00:00:00Z')).toBe(493);
    await games.close();
  });

  it('counts zero for a database with no subscription_games table, rather than throwing', async () => {
    const empty = await openMemoryDatabase(null);
    expect(await countNewGamesForSubscription(empty, 1, null)).toBe(0);
    await empty.close();
  });

  it('writes a preference and reads it back, on a copy', async () => {
    const copy = await openMemoryDatabase(bytesOf('config.db'));
    await writePreference(copy, 'theme', 'dark');
    expect(await readPreference(copy, 'theme')).toBe('dark');
    await writePreference(copy, 'never.seen.before', { a: 1 });
    expect(await readPreference(copy, 'never.seen.before')).toEqual({ a: 1 });
    await copy.close();
  });

  it('leaves the original untouched when a copy is written to', async () => {
    expect(await readPreference(config, 'theme')).toBe('system');
  });
});

suite('a game database through the seam', () => {
  let games;
  beforeAll(async () => {
    // master-games.db, not sample-games.db: the "no ply_count" check below needs a
    // database where that column is uniformly unfilled, which holds for
    // hikaru.pgn/gothamchess-annotated.pgn (neither carries a PlyCount tag) but no
    // longer holds for sample-games.pgn (its Live Chess games do carry one).
    games = await openMemoryDatabase(bytesOf('master-games.db'));
  });
  afterAll(async () => games?.close());

  it('identifies itself as a game database', async () => {
    const identity = await identify(games);
    expect(identity.kind).toBe('games');
    expect(identity.userVersion).toBe(SCHEMA_USER_VERSION);
  });

  it('counts its games', async () => {
    expect(await countGames(games)).toBe(1026);
  });

  it('reads a page shaped for the Content Table', async () => {
    const page = await readGames(games, { limit: 5 });
    expect(page).toHaveLength(5);
    expect(Object.keys(page[0])).toEqual([
      'id', 'date', 'white', 'whiteElo', 'black', 'blackElo', 'event', 'result', 'plyCount',
      'createdAt'
    ]);
  });

  it('pages rather than loading the table', async () => {
    const first = await readGames(games, { limit: 2, offset: 0 });
    const second = await readGames(games, { limit: 2, offset: 2 });
    expect(first.map((g) => g.id)).not.toEqual(second.map((g) => g.id));
  });

  it('has no ply_count to show, which is why the Mvs column is empty', async () => {
    const page = await readGames(games, { limit: 10 });
    expect(page.every((game) => game.plyCount === null)).toBe(true);
  });
});

suite('insertGame / insertGames — writing', () => {
  const fresh = async () => openMemoryDatabase(bytesOf('sample-games.db'));

  it('requires pgn, and nothing else', async () => {
    const db = await fresh();
    await expect(insertGame(db, { event: 'No PGN' })).rejects.toThrow(/pgn/);
    await db.close();
  });

  it('stores pgn verbatim and every recognised tag, leaving the rest NULL', async () => {
    const db = await fresh();
    const pgn = [
      '[Event "Test Open"]',
      '[Site "Somewhere"]',
      '[Date "2026.01.05"]',
      '[Round "3"]',
      '[White "Player, One"]',
      '[Black "Player, Two"]',
      '[Result "1-0"]',
      '[WhiteElo "2200"]',
      '[BlackElo "-"]',
      '',
      '1. e4 e5 1-0'
    ].join('\n');

    const id = await insertGame(db, {
      pgn, event: 'Test Open', site: 'Somewhere', date: '2026.01.05', round: '3',
      white: 'Player, One', black: 'Player, Two', result: '1-0',
      white_elo: 2200, black_elo: null, created_at: '2026-01-05T00:00:00Z'
    });

    const row = await db.get('select * from games where id = ?', [id]);
    expect(row.pgn).toBe(pgn);
    expect(row.event).toBe('Test Open');
    expect(row.white_elo).toBe(2200);
    expect(row.black_elo).toBeNull();
    expect(row.eco).toBeNull();
    expect(row.movetext).toBeNull();
    await db.close();
  });

  it('added games are visible to countGames and readGames right away', async () => {
    const db = await fresh();
    const before = await countGames(db);
    await insertGame(db, { pgn: '[Event "A"]\n\n1. e4 *', event: 'A', created_at: 'now' });
    expect(await countGames(db)).toBe(before + 1);
    await db.close();
  });

  it('insertGames returns readGames\' own row shape, in order', async () => {
    const db = await fresh();
    const rows = await insertGames(db, [
      { pgn: '[White "A"]\n\n*', white: 'A', created_at: 'now' },
      { pgn: '[White "B"]\n\n*', white: 'B', created_at: 'now' }
    ]);
    expect(rows.map((r) => r.white)).toEqual(['A', 'B']);
    expect(Object.keys(rows[0]).sort()).toEqual(
      ['id', 'date', 'white', 'whiteElo', 'black', 'blackElo', 'event', 'result', 'plyCount', 'createdAt'].sort()
    );
    expect(rows[0].id).not.toBe(rows[1].id);
    await db.close();
  });

  it('commits nothing from a failed batch — one bad row loses the whole import', async () => {
    const db = await fresh();
    const before = await countGames(db);
    await expect(insertGames(db, [
      { pgn: '[White "A"]\n\n*', white: 'A', created_at: 'now' },
      { event: 'No PGN here' }
    ])).rejects.toThrow();
    expect(await countGames(db)).toBe(before);
    await db.close();
  });

  it('an empty batch is a no-op, not an empty transaction', async () => {
    const db = await fresh();
    expect(await insertGames(db, [])).toEqual([]);
    await db.close();
  });

  it('batches a large import instead of exceeding SQLite\'s bound-parameter limit (regression, 23 Sep)', async () => {
    // A real ~10,000-game Chess.com import hit "too many SQL variables" when
    // this was one statement for the whole batch. 6,000 rows here, at 3
    // bound columns each, crosses MAX_INSERT_VARIABLES' chunk boundary at
    // least once against the real SQLite build -- enough to prove chunking
    // actually happens and that rowids stay correct across the seam.
    const db = await fresh();
    const before = await countGames(db);
    const n = 6000;
    const rows = Array.from({ length: n }, (_, i) => ({
      pgn: `[White "P${i}"]\n\n*`, white: `P${i}`, created_at: 'now'
    }));

    const inserted = await insertGames(db, rows);

    expect(inserted).toHaveLength(n);
    expect(inserted.map((r) => r.white)).toEqual(rows.map((r) => r.white));
    const ids = inserted.map((r) => r.id);
    expect(new Set(ids).size).toBe(n);
    for (let i = 1; i < ids.length; i++) expect(ids[i]).toBe(ids[i - 1] + 1);
    expect(await countGames(db)).toBe(before + n);
    await db.close();
  });

  it('stores the seven columns added to INSERT_COLUMNS 23 Sep for §4.1\'s Chess.com mapping', async () => {
    const db = await fresh();
    const id = await insertGame(db, {
      pgn: '[White "A"]\n\n*', white: 'A', created_at: 'now',
      tournament: 'https://example/t', current_position: '8/8/8/8/8/8/8/K6k w - - 0 1',
      variant: 'freestyle', rated: 1, white_accuracy: 91.2, black_accuracy: 84.6, time_class: 'blitz'
    });

    const row = await db.get('select * from games where id = ?', [id]);
    expect(row.tournament).toBe('https://example/t');
    expect(row.current_position).toBe('8/8/8/8/8/8/8/K6k w - - 0 1');
    expect(row.variant).toBe('freestyle');
    expect(row.rated).toBe(1);
    expect(row.white_accuracy).toBe(91.2);
    expect(row.black_accuracy).toBe(84.6);
    expect(row.time_class).toBe('blitz');
    await db.close();
  });

  it('stores source_type/source_identifier (§2.3, added 23 Sep for per-game source tracking), NULL when omitted', async () => {
    const db = await fresh();
    const online = await insertGame(db, {
      pgn: '[White "A"]\n\n*', white: 'A', created_at: 'now',
      source_type: 'chess_com_player', source_identifier: 'awesomeatti'
    });
    const pasted = await insertGame(db, { pgn: '[White "B"]\n\n*', white: 'B', created_at: 'now' });

    const onlineRow = await db.get('select * from games where id = ?', [online]);
    expect(onlineRow.source_type).toBe('chess_com_player');
    expect(onlineRow.source_identifier).toBe('awesomeatti');

    // NULL for Paste/File -- a caller that never supplies the columns gets
    // no provenance recorded, not a guessed one.
    const pastedRow = await db.get('select * from games where id = ?', [pasted]);
    expect(pastedRow.source_type).toBeNull();
    expect(pastedRow.source_identifier).toBeNull();
    await db.close();
  });
});

suite('latestGameDateForSource / gamePgnsForSourceOnDate -- stage 2\'s cursor reads', () => {
  const fresh = async () => openMemoryDatabase(bytesOf('sample-games.db'));
  const online = (db, over) => insertGame(db, {
    pgn: `[White "${over.white ?? 'A'}"]\n\n*`, created_at: 'now',
    source_type: 'chess_com_player', source_identifier: 'awesomeatti', ...over
  });

  it('returns null when nothing from that source pair is on record yet', async () => {
    const db = await fresh();
    expect(await latestGameDateForSource(db, 'chess_com_player', 'nobody')).toBeNull();
    await db.close();
  });

  it('returns the latest date, chronologically, not lexicographically-first', async () => {
    const db = await fresh();
    await online(db, { date: '2026.03.15' });
    await online(db, { date: '2026.09.01' });
    await online(db, { date: '2025.12.31' });
    expect(await latestGameDateForSource(db, 'chess_com_player', 'awesomeatti')).toBe('2026.09.01');
    await db.close();
  });

  it('is scoped to the exact source pair -- a different identifier or type doesn\'t contribute', async () => {
    const db = await fresh();
    await online(db, { date: '2026.09.01' });
    await online(db, { date: '2026.09.20', source_identifier: 'someoneelse' });
    await online(db, { date: '2026.09.25', source_type: 'lichess_player' });
    expect(await latestGameDateForSource(db, 'chess_com_player', 'awesomeatti')).toBe('2026.09.01');
    await db.close();
  });

  it('ignores Paste/File rows (NULL source_type), which max() already skips', async () => {
    const db = await fresh();
    await insertGame(db, { pgn: '[White "P"]\n\n*', white: 'P', date: '2099.01.01', created_at: 'now' });
    expect(await latestGameDateForSource(db, 'chess_com_player', 'awesomeatti')).toBeNull();
    await db.close();
  });

  it('gamePgnsForSourceOnDate returns only that source pair\'s pgns for that exact date', async () => {
    const db = await fresh();
    await online(db, { date: '2026.09.01', white: 'Same-day-1' });
    await online(db, { date: '2026.09.01', white: 'Same-day-2' });
    await online(db, { date: '2026.09.02', white: 'Next-day' });
    await online(db, { date: '2026.09.01', white: 'Other-account', source_identifier: 'someoneelse' });

    const pgns = await gamePgnsForSourceOnDate(db, 'chess_com_player', 'awesomeatti', '2026.09.01');
    expect(pgns.sort()).toEqual(['[White "Same-day-1"]\n\n*', '[White "Same-day-2"]\n\n*'].sort());
    await db.close();
  });

  it('gamePgnsForSourceOnDate returns an empty array for a date with nothing on record', async () => {
    const db = await fresh();
    expect(await gamePgnsForSourceOnDate(db, 'chess_com_player', 'awesomeatti', '2026.09.01')).toEqual([]);
    await db.close();
  });
});

suite('§3.1 — movetext precedence and complete replacement', () => {
  let games;
  let id;
  beforeAll(async () => {
    games = await openMemoryDatabase(bytesOf('master-games.db'));
    id = (await games.get('select id from games order by id limit 1')).id;
  });
  afterAll(async () => games?.close());

  it('falls back to the movetext inside pgn while movetext is NULL', async () => {
    const { movetext, source } = await readMovetextFor(games, id);
    expect(source).toBe('pgn');
    expect(movetext.length).toBeGreaterThan(0);
    expect(movetext.startsWith('[')).toBe(false);
  });

  it('strips the tag pair section and nothing else', async () => {
    const pgn = await readPgn(games, id);
    expect(pgn.startsWith('[Event')).toBe(true);
    const text = movetextOf(pgn);
    // The movetext is the tail of the document, with nothing of the tag pairs in it.
    expect(pgn.trimEnd().endsWith(text)).toBe(true);
    expect(text).not.toContain('[Event');
    expect(movetextOf('')).toBe('');
    expect(movetextOf('[A "b"]\n\n1. e4 *')).toBe('1. e4 *');
  });

  it('prefers movetext once it is not NULL', async () => {
    const { movetext } = await readMovetextFor(games, id);
    const edited = `${movetext.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '')} {A note.} *`;
    await writeMovetextFor(games, id, edited);

    const after = await readMovetextFor(games, id);
    expect(after.source).toBe('movetext');
    expect(after.movetext).toBe(edited);
  });

  it('never patches pgn', async () => {
    const pgn = await readPgn(games, id);
    expect(pgn.startsWith('[Event')).toBe(true);
    expect(pgn).not.toContain('{A note.}');
  });

  it('stores the complete document, not a diff', async () => {
    const { movetext } = await readMovetextFor(games, id);
    const doc = readMovetext(movetext);
    expect([...doc.moves.mainlineNodes()].length).toBeGreaterThan(10);
  });
});

suite('an annotation round trip through the database', () => {
  let games;
  let id;
  beforeAll(async () => {
    games = await openMemoryDatabase(bytesOf('master-games.db'));
    // A game carrying the engine context and the two commands chessops does not know.
    const row = await games.get(
      "select id from games where pgn like '%[%bestmove%' and pgn like '%[%engine%' limit 1"
    );
    id = row?.id ?? (await games.get('select id from games order by id limit 1')).id;
  });
  afterAll(async () => games?.close());

  it('preserves [%engine], [%eval] and [%bestmove] across a write and a read', async () => {
    const before = await readMovetextFor(games, id);
    const doc = readMovetext(before.movetext);
    const written = writeMovetext(doc, { wrap: null, spacing: 'padded' });

    await writeMovetextFor(games, id, written);
    const after = await readMovetextFor(games, id);

    expect(after.source).toBe('movetext');
    expect(after.movetext).toBe(written);
    for (const command of ['[%engine', '[%eval', '[%bestmove', '[%clk']) {
      const wasThere = before.movetext.split(command).length;
      if (wasThere > 1) expect(after.movetext.split(command).length).toBe(wasThere);
    }
  });

  it('derives a ply count the games table does not store', async () => {
    const { movetext } = await readMovetextFor(games, id);
    const count = plyCount(readMovetext(movetext));
    expect(count).toBeGreaterThan(0);
    expect(await games.value('select ply_count from games where id = ?', [id])).toBeNull();
  });
});

/* ===================== §7 — Library features, read side ================= */

suite('favorites, trash, tags and collections — reading', () => {
  let games;
  beforeAll(async () => {
    games = await openMemoryDatabase(bytesOf('master-games.db'));
  });
  afterAll(async () => games?.close());

  it('reads which games are favorited or trashed', async () => {
    const favorites = await readFavoriteIds(games);
    const trashed = await readTrashedIds(games);
    expect(favorites).toHaveLength(34);
    expect(trashed).toHaveLength(3);
  });

  it('reads the tags, ordered by name', async () => {
    const tags = await readTags(games);
    expect(tags).toHaveLength(4);
    expect(tags.map((t) => t.name)).toEqual([...tags.map((t) => t.name)].sort(
      (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })
    ));
    expect(tags.map((t) => t.name)).toContain('Blunder');
  });

  it('reads a tag membership both directions', async () => {
    const [{ id: tagId }] = await readTags(games);
    const gameIds = await readGameIdsForTag(games, tagId);
    expect(gameIds.length).toBeGreaterThan(0);
    const tagIds = await readTagIdsForGame(games, gameIds[0]);
    expect(tagIds).toContain(tagId);
  });

  it('counts every tag in one query, matching a per-tag count', async () => {
    const counts = await readTagCounts(games);
    const [{ id: tagId }] = await readTags(games);
    const gameIds = await readGameIdsForTag(games, tagId);
    expect(counts[tagId]).toBe(gameIds.length);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(134);
  });

  it('reads the collections, including the Smart one, with smart as a boolean', async () => {
    const collections = await readCollections(games);
    expect(collections).toHaveLength(3);
    const smart = collections.find((c) => c.smart);
    expect(smart).toBeTruthy();
    expect(smart.criteria).toContain('Hikaru');
    for (const c of collections) expect(typeof c.smart).toBe('boolean');
  });

  it('reads a regular Collection’s membership, and nothing for the Smart one', async () => {
    const collections = await readCollections(games);
    const regular = collections.find((c) => !c.smart);
    const smart = collections.find((c) => c.smart);
    expect((await readGameIdsForCollection(games, regular.id)).length).toBeGreaterThan(0);
    expect(await readGameIdsForCollection(games, smart.id)).toEqual([]);
  });

  it('counts regular collections only, omitting the Smart one rather than reporting it as zero', async () => {
    const counts = await readCollectionCounts(games);
    const collections = await readCollections(games);
    const smart = collections.find((c) => c.smart);
    expect(smart.id in counts).toBe(false);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(117);
  });
});

/* ==================== §7 — Library features, write side ================= */

suite('favorites, trash, tags and collections — writing', () => {
  const fresh = async () => openMemoryDatabase(bytesOf('sample-games.db'));

  it('favoriting and unfavoriting a game is idempotent either way', async () => {
    const db = await fresh();
    const id = (await db.get('select id from games order by id limit 1')).id;
    const before = await readFavoriteIds(db);
    expect(before).not.toContain(id);

    await setFavorite(db, id, true);
    await setFavorite(db, id, true); // idempotent
    expect(await readFavoriteIds(db)).toContain(id);

    await setFavorite(db, id, false);
    await setFavorite(db, id, false); // idempotent
    expect(await readFavoriteIds(db)).not.toContain(id);
    await db.close();
  });

  it('trashing and restoring a game leaves the count where it started', async () => {
    const db = await fresh();
    const id = (await db.get('select id from games order by id limit 1')).id;
    const before = (await readTrashedIds(db)).length;

    await setTrashed(db, id, true);
    expect(await readTrashedIds(db)).toContain(id);

    await setTrashed(db, id, false);
    expect(await readTrashedIds(db)).toHaveLength(before);
    await db.close();
  });

  it('finds an existing tag by name ignoring case, rather than forking it', async () => {
    const db = await fresh();
    const [existing] = await readTags(db);
    const found = await findOrCreateTag(db, existing.name.toUpperCase());
    expect(found).toBe(existing.id);
    expect(await readTags(db)).toHaveLength(4); // no new row
    await db.close();
  });

  it('creates a new tag, then reuses it on a second call', async () => {
    const db = await fresh();
    const id = await findOrCreateTag(db, 'Endgame Blunder');
    expect(await readTags(db)).toHaveLength(5);
    expect(await findOrCreateTag(db, 'endgame blunder')).toBe(id);
    expect(await readTags(db)).toHaveLength(5); // still five
    await db.close();
  });

  it('applies and removes a tag from a game, idempotently', async () => {
    const db = await fresh();
    const id = (await db.get('select id from games order by id limit 1')).id;
    const tagId = await findOrCreateTag(db, 'Temp Tag');

    await addTagToGame(db, tagId, id);
    await addTagToGame(db, tagId, id); // idempotent
    expect(await readTagIdsForGame(db, id)).toEqual([tagId]);

    await removeTagFromGame(db, tagId, id);
    await removeTagFromGame(db, tagId, id); // idempotent
    expect(await readTagIdsForGame(db, id)).toEqual([]);
    await db.close();
  });

  it('creates a regular Collection, never a Smart one', async () => {
    const db = await fresh();
    const id = await findOrCreateCollection(db, 'New Collection');
    const created = (await readCollections(db)).find((c) => c.id === id);
    expect(created.smart).toBe(false);
    expect(created.criteria).toBeNull();
    await db.close();
  });

  it('adds and removes a game from a Collection, idempotently', async () => {
    const db = await fresh();
    const id = (await db.get('select id from games order by id limit 1')).id;
    const collectionId = await findOrCreateCollection(db, 'Temp Collection');

    await addGameToCollection(db, collectionId, id);
    await addGameToCollection(db, collectionId, id); // idempotent
    expect(await readGameIdsForCollection(db, collectionId)).toEqual([id]);

    await removeGameFromCollection(db, collectionId, id);
    await removeGameFromCollection(db, collectionId, id); // idempotent
    expect(await readGameIdsForCollection(db, collectionId)).toEqual([]);
    await db.close();
  });
});

/* =============== §7 — bulk membership maps (no N+1 per row) ============= */

suite('tag and collection membership, as bulk maps', () => {
  let games;
  beforeAll(async () => {
    games = await openMemoryDatabase(bytesOf('master-games.db'));
  });
  afterAll(async () => games?.close());

  it('maps every game to its tag ids, matching the per-tag query summed', async () => {
    const byGame = await readTagIdsByGame(games);
    const total = Object.values(byGame).reduce((a, ids) => a + ids.length, 0);
    expect(total).toBe(134);
    const [gameId] = Object.keys(byGame);
    const tagIds = await readTagIdsForGame(games, Number(gameId));
    expect(byGame[gameId]).toEqual(tagIds);
  });

  it('maps every game to its regular-Collection ids, omitting the Smart one', async () => {
    const byGame = await readCollectionIdsByGame(games);
    const total = Object.values(byGame).reduce((a, ids) => a + ids.length, 0);
    expect(total).toBe(117);
    const collections = await readCollections(games);
    const smart = collections.find((c) => c.smart);
    for (const ids of Object.values(byGame)) expect(ids).not.toContain(smart.id);
  });
});
