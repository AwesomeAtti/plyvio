/**
 * `stores/game.js`'s `saveTab` — the write half of `analysis-board-plan.md`'s
 * Stage 1: what a save actually commits, for real, once something is
 * staged. Same real-connection harness as `game-saveGameInfo.test.js`, for
 * the same reason — a mock can't tell us what actually reaches the
 * database.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { resetPool } from './helpers/pwa-in-process.js';

vi.mock('../src/lib/data/backends/sqlite-worker-port.js', async () =>
  (await import('./helpers/pwa-in-process.js')).workerPortMock());

async function freshModules() {
  vi.resetModules();
  const settings = await import('../src/lib/stores/settings.js');
  const libraries = await import('../src/lib/stores/libraries.js');
  const library = await import('../src/lib/stores/library.js');
  const tabs = await import('../src/lib/stores/tabs.js');
  const game = await import('../src/lib/stores/game.js');
  const gamesData = await import('../src/lib/data/games.js');
  const sampleGames = await import('../src/lib/mock-data/sample-games.js');
  return { settings, libraries, library, tabs, game, gamesData, sampleGames };
}

async function setUpRealLibrary(mods) {
  const { settings, libraries, library } = mods;
  await settings.loadLibraries();
  const id = get(settings.objects).databases[0].id;
  libraries.activeLibraryId.set(id);
  await library.loadGames();
  return id;
}

beforeEach(() => {
  resetPool();
});

describe('loadRealGame reads a custom starting position (\u00a72.2\u2019s games.fen)', () => {
  it('a game with a custom fen shows it on the board instead of the standard start', async () => {
    const mods = await freshModules();
    const { game, library, tabs, sampleGames } = mods;
    await setUpRealLibrary(mods);
    const gameId = sampleGames.GAMES[0].id;
    const customFen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

    const connection = await library.activeLibraryConnection();
    await connection.run('update games set fen = ?, movetext = ? where id = ?', [customFen, '', gameId]);

    game.ensureGameState('t1', gameId);
    tabs.activeId.set('t1');
    await vi.waitFor(() => {
      expect(get(game.activeGame).plies[0].f).toBe(customFen);
    });
  });
});

describe('saveTab — real write round trip', () => {
  it('does nothing and reports false when the tab is not dirty', async () => {
    const mods = await freshModules();
    const { game, tabs, sampleGames } = mods;
    await setUpRealLibrary(mods);
    const gameId = sampleGames.GAMES[0].id;
    game.ensureGameState('t1', gameId);
    tabs.activeId.set('t1');

    expect(game.isDirty('t1')).toBe(false);
    await expect(game.saveTab('t1')).resolves.toBe(false);
  });

  it('writes a changed header field to the real row and clears dirty', async () => {
    const mods = await freshModules();
    const { game, library, tabs, gamesData, sampleGames } = mods;
    await setUpRealLibrary(mods);
    const gameId = sampleGames.GAMES[0].id;
    game.ensureGameState('t1', gameId);
    tabs.activeId.set('t1');

    const r = get(game.activeGame).record;
    game.saveGameInfo('t1', {
      white: r.white, white_elo: r.white_elo, black: r.black, black_elo: r.black_elo,
      result: r.result, date: r.date, round: r.round, site: r.site,
      event: 'A Brand New Event Name',
      favorite: false, tags: [], collections: []
    });
    expect(game.isDirty('t1')).toBe(true);

    const wrote = await game.saveTab('t1');
    expect(wrote).toBe(true);
    expect(game.isDirty('t1')).toBe(false);

    // Reached the real database, against a fresh connection -- not just the
    // optimistic store update.
    const connection = await library.activeLibraryConnection();
    const row = await connection.get('select event from games where id = ?', [gameId]);
    expect(row.event).toBe('A Brand New Event Name');

    // And the reloaded library row agrees (saveTab calls loadGames()).
    await vi.waitFor(() => {
      expect(get(library.games).find((g) => g.id === gameId).event).toBe('A Brand New Event Name');
    });
  });

  it('writes drawn shapes into the movetext as %csl/%cal and clears dirty', async () => {
    const mods = await freshModules();
    const { game, library, tabs, gamesData, sampleGames } = mods;
    await setUpRealLibrary(mods);
    const gameId = sampleGames.GAMES[0].id;
    game.ensureGameState('t1', gameId);
    tabs.activeId.set('t1');

    game.setPlyShapes('t1', 0, [{ orig: 'e4', brush: 'green' }]);
    expect(game.isDirty('t1')).toBe(true);

    const wrote = await game.saveTab('t1');
    expect(wrote).toBe(true);
    expect(game.isDirty('t1')).toBe(false);

    const connection = await library.activeLibraryConnection();
    const { movetext } = await gamesData.readMovetextFor(connection, gameId);
    expect(movetext).toContain('[%csl Ge4]');
  });

  it('a saved shape reads back onto the board of a freshly opened tab, clean', async () => {
    const mods = await freshModules();
    const { game, library, tabs, sampleGames } = mods;
    await setUpRealLibrary(mods);
    const gameId = sampleGames.GAMES[0].id;
    game.ensureGameState('t1', gameId);
    tabs.activeId.set('t1');

    // Ply 0 specifically -- the "arrow drawn before the first move" case
    // that exposed ply 0 never actually reading back at all (24 Sep).
    game.setPlyShapes('t1', 0, [{ orig: 'd2', brush: 'green' }, { orig: 'd4', brush: 'green' }]);
    await game.saveTab('t1');

    // A second tab on the same game, opened fresh after the save -- not the
    // tab that did the saving, so nothing here can be riding on session
    // state left over from the write.
    game.ensureGameState('t2', gameId);
    tabs.activeId.set('t2');
    await vi.waitFor(() => {
      expect(get(game.activeGame).plies[0].sh).toEqual(
        expect.arrayContaining([
          { orig: 'd2', brush: 'green' },
          { orig: 'd4', brush: 'green' }
        ])
      );
    });
    expect(get(game.activeGame).shapes).toEqual(
      expect.arrayContaining([
        { orig: 'd2', brush: 'green' },
        { orig: 'd4', brush: 'green' }
      ])
    );
    // Showing a previously-saved annotation is not itself an edit.
    expect(game.isDirty('t2')).toBe(false);
  });

  it('erasing a previously-saved shape (without ever redrawing it) is dirty, and saving removes it', async () => {
    const mods = await freshModules();
    const { game, library, tabs, gamesData, sampleGames } = mods;
    await setUpRealLibrary(mods);
    const gameId = sampleGames.GAMES[0].id;
    game.ensureGameState('t1', gameId);
    tabs.activeId.set('t1');
    game.setPlyShapes('t1', 0, [{ orig: 'e4', brush: 'red' }]);
    await game.saveTab('t1');

    game.ensureGameState('t2', gameId);
    tabs.activeId.set('t2');
    await vi.waitFor(() => {
      expect(get(game.activeGame).shapes).toEqual([{ orig: 'e4', brush: 'red' }]);
    });

    // The user erases it on the board -- chessground reports the ply's new,
    // now-empty, complete shape list.
    game.setPlyShapes('t2', 0, []);
    expect(game.isDirty('t2')).toBe(true);

    await game.saveTab('t2');
    const connection = await library.activeLibraryConnection();
    const { movetext } = await gamesData.readMovetextFor(connection, gameId);
    expect(movetext).not.toContain('%csl');
  });

  it('leaves the library row and movetext alone when the tab has no library id', async () => {
    const mods = await freshModules();
    const { game, tabs } = mods;
    await setUpRealLibrary(mods);
    game.ensureGameState('t1', null);
    tabs.activeId.set('t1');

    game.setPlyShapes('t1', 0, [{ orig: 'e4', brush: 'green' }]);
    expect(game.isDirty('t1')).toBe(true);

    await expect(game.saveTab('t1')).resolves.toBe(false);
    // Still dirty -- nothing to save to yet means nothing was saved, not a
    // silent success (Stage 3 gives a library-less tab somewhere to go).
    expect(game.isDirty('t1')).toBe(true);
  });
});

describe('saveTab’s create branch — a draft tab getting its first real row (Stage 3, "New Game")', () => {
  it('a blank New Game draft is always dirty, shows the standard start, and has no library marks', async () => {
    const mods = await freshModules();
    const { game, tabs } = mods;
    await setUpRealLibrary(mods);
    const draftId = game.seedDraftGame();
    game.ensureGameState('t1', draftId);
    tabs.activeId.set('t1');

    expect(game.isDirty('t1')).toBe(true);
    const active = get(game.activeGame);
    expect(active.plies).toHaveLength(1);
    expect(active.info.white).toBeNull(); // known(undefined) -- no player set yet
    expect(active.info.hasRow).toBe(false);
  });

  it('saving a blank draft inserts a new row, converts the tab, and clears dirty', async () => {
    const mods = await freshModules();
    const { game, library, tabs, gamesData } = mods;
    await setUpRealLibrary(mods);
    const draftId = game.seedDraftGame();
    game.ensureGameState('t1', draftId);
    tabs.activeId.set('t1');

    const wrote = await game.saveTab('t1');
    expect(wrote).toBe(true);
    expect(game.isDirty('t1')).toBe(false);

    const newId = get(game.gameStates).t1.libraryGameId;
    expect(typeof newId).toBe('number');

    const connection = await library.activeLibraryConnection();
    const row = await connection.get('select pgn, movetext, fen from games where id = ?', [newId]);
    expect(row.pgn).not.toBeNull();
    const { movetext } = await gamesData.readMovetextFor(connection, newId);
    expect(movetext.trim()).toBe('');
    expect(row.fen).toBeNull();

    await vi.waitFor(() => {
      expect(get(library.games).some((g) => g.id === newId)).toBe(true);
    });
  });

  it('saving a draft seeded from a pasted PGN carries its moves and header fields into the new row', async () => {
    const mods = await freshModules();
    const { game, library, tabs, gamesData } = mods;
    await setUpRealLibrary(mods);
    const draftId = game.seedDraftGame({
      movetext: '1. e4 e5 2. Nf3',
      fen: null,
      fields: { white: 'Pasted White', black: 'Pasted Black', event: 'A Pasted Game' }
    });
    game.ensureGameState('t1', draftId);
    tabs.activeId.set('t1');

    expect(get(game.activeGame).info.white).toBe('Pasted White');

    await game.saveTab('t1');
    const newId = get(game.gameStates).t1.libraryGameId;

    const connection = await library.activeLibraryConnection();
    const row = await connection.get('select white, black, event from games where id = ?', [newId]);
    expect(row).toEqual({ white: 'Pasted White', black: 'Pasted Black', event: 'A Pasted Game' });
    const { movetext } = await gamesData.readMovetextFor(connection, newId);
    expect(movetext).toContain('1. e4 e5 2. Nf3');
  });

  it('saving a draft seeded from a pasted FEN carries its own starting position into the new row', async () => {
    const mods = await freshModules();
    const { game, library, tabs, gamesData } = mods;
    await setUpRealLibrary(mods);
    const customFen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    const draftId = game.seedDraftGame({ fen: customFen });
    game.ensureGameState('t1', draftId);
    tabs.activeId.set('t1');
    expect(get(game.activeGame).plies[0].f).toBe(customFen);

    await game.saveTab('t1');
    const newId = get(game.gameStates).t1.libraryGameId;

    const connection = await library.activeLibraryConnection();
    const row = await connection.get('select fen from games where id = ?', [newId]);
    expect(row.fen).toBe(customFen);
    const { movetext, fen } = await gamesData.readMovetextFor(connection, newId);
    expect(fen).toBe(customFen);
  });

  it('board shapes drawn on a draft before its first save land in the new row’s movetext', async () => {
    const mods = await freshModules();
    const { game, library, tabs, gamesData } = mods;
    await setUpRealLibrary(mods);
    const draftId = game.seedDraftGame();
    game.ensureGameState('t1', draftId);
    tabs.activeId.set('t1');
    game.setPlyShapes('t1', 0, [{ orig: 'e4', brush: 'green' }]);

    await game.saveTab('t1');
    const newId = get(game.gameStates).t1.libraryGameId;

    const connection = await library.activeLibraryConnection();
    const { movetext } = await gamesData.readMovetextFor(connection, newId);
    expect(movetext).toContain('%csl');
  });

  it('replaceTabWithDraft detaches the tab without touching the game it replaces', async () => {
    const mods = await freshModules();
    const { game, library, tabs, gamesData, sampleGames } = mods;
    await setUpRealLibrary(mods);
    const gameId = sampleGames.GAMES[0].id;
    game.ensureGameState('t1', gameId);
    tabs.activeId.set('t1');
    expect(game.isDirty('t1')).toBe(false);

    const connection = await library.activeLibraryConnection();
    const before = await connection.get('select movetext, pgn from games where id = ?', [gameId]);

    game.replaceTabWithDraft('t1', { movetext: '1. d4 d5' });
    expect(game.isDirty('t1')).toBe(true);
    expect(get(game.activeGame).plies[1].s).toBe('d4');

    const after = await connection.get('select movetext, pgn from games where id = ?', [gameId]);
    expect(after).toEqual(before);
  });
});

describe('isPristineDraft — the one case a board paste’s confirm dialog skips', () => {
  it('is true for a freshly seeded, untouched draft', async () => {
    const mods = await freshModules();
    const { game, tabs } = mods;
    await setUpRealLibrary(mods);
    const draftId = game.seedDraftGame();
    game.ensureGameState('t1', draftId);
    expect(game.isPristineDraft('t1')).toBe(true);
  });

  it('is false once the draft carries seed content, session shapes, or staged info', async () => {
    const mods = await freshModules();
    const { game, tabs } = mods;
    await setUpRealLibrary(mods);

    const seeded = game.seedDraftGame({ movetext: '1. e4' });
    game.ensureGameState('t1', seeded);
    expect(game.isPristineDraft('t1')).toBe(false);

    const blank = game.seedDraftGame();
    game.ensureGameState('t2', blank);
    game.setPlyShapes('t2', 0, [{ orig: 'e4', brush: 'green' }]);
    expect(game.isPristineDraft('t2')).toBe(false);
  });

  it('is false for a real, library-backed tab', async () => {
    const mods = await freshModules();
    const { game, tabs, sampleGames } = mods;
    await setUpRealLibrary(mods);
    game.ensureGameState('t1', sampleGames.GAMES[0].id);
    expect(game.isPristineDraft('t1')).toBe(false);
  });
});
