/**
 * The data seam, against the real sample databases.
 *
 * These open `samples/config.db` and `samples/my-games.db` through the seam, with
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
  countGames,
  describe as describeIdentity,
  identify,
  isConnection,
  movetextOf,
  readGames,
  readLibraries,
  readMovetextFor,
  readPgn,
  readPreference,
  readPreferences,
  readUiState,
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
    expect(describeIdentity(identity)).toBe('a config database at schema v009');
  });

  it('carries no application_id, so the file is not self-identifying', async () => {
    // Recorded rather than asserted as desirable: adopting one is an open decision.
    expect((await identify(config)).applicationId).toBe(0);
  });

  it('reads preferences, parsing the JSON the schema stores', async () => {
    const values = await readPreferences(config);
    expect(values.theme).toBe('system');
    expect(values.language).toBe('en');
    expect(values.restore_open_games).toBe(true);
    expect(values.board_style).toBe('Default');
  });

  it('reads one preference, with a fallback for a key that is not set', async () => {
    expect(await readPreference(config, 'language')).toBe('en');
    expect(await readPreference(config, 'nothing.here', 'fallback')).toBe('fallback');
  });

  it('reads UI state, including a nested object', async () => {
    const state = await readUiState(config);
    expect(state['library.sidebar_collapsed']).toBe(false);
    expect(state['library.folded_groups']).toMatchObject({ subscriptions: false });
    expect(state['game.open_tabs']).toEqual([]);
  });

  it('reads the libraries, and names the file each one points at', async () => {
    const libraries = await readLibraries(config);
    expect(libraries.map((l) => l.name)).toEqual(['My Games', 'Master Games']);
    expect(libraries[0]).toMatchObject({ path: 'my-games.db', enabled: true });
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
    games = await openMemoryDatabase(bytesOf('my-games.db'));
  });
  afterAll(async () => games?.close());

  it('identifies itself as a game database', async () => {
    const identity = await identify(games);
    expect(identity.kind).toBe('games');
    expect(identity.userVersion).toBe(SCHEMA_USER_VERSION);
  });

  it('counts its games', async () => {
    expect(await countGames(games)).toBe(104);
  });

  it('reads a page shaped for the Content Table', async () => {
    const page = await readGames(games, { limit: 5 });
    expect(page).toHaveLength(5);
    expect(Object.keys(page[0])).toEqual([
      'id', 'date', 'white', 'whiteElo', 'black', 'blackElo', 'event', 'result', 'plyCount'
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

suite('§3.1 — movetext precedence and complete replacement', () => {
  let games;
  let id;
  beforeAll(async () => {
    games = await openMemoryDatabase(bytesOf('my-games.db'));
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
    games = await openMemoryDatabase(bytesOf('my-games.db'));
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
