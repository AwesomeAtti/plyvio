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
