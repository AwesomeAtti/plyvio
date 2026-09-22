/**
 * `data/session.js`'s `explorerConnection()`, backend-aware as of 22 Sep
 * 2026 — see the working notes' `explorer-three-layer-gap-plan.md`.
 * `game-explorerStats.test.js` covers the store layer above this with
 * `explorerConnection` mocked away; this file exercises the real function
 * against a real PWA connection, the same way `settings-pwaBootstrap.test.js`
 * exercises `libraryConnection()` — the in-process PWA backend, no seam mocked.
 *
 * `data/session.js` caches connections and the backend choice at module
 * scope, so every test below calls `freshModules()` (same helper and same
 * reasoning as `settings-pwaBootstrap.test.js`) to start from nothing.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { vi } from 'vitest';
import { resetPool } from './helpers/pwa-in-process.js';

vi.mock('../src/lib/data/backends/sqlite-worker-port.js', async () =>
  (await import('./helpers/pwa-in-process.js')).workerPortMock());


async function freshModules() {
  vi.resetModules();
  const settings = await import('../src/lib/stores/settings.js');
  const session = await import('../src/lib/data/session.js');
  const games = await import('../src/lib/data/games.js');
  return { settings, session, games };
}

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

beforeEach(() => {
  resetPool();
});

describe('explorerConnection — PWA (no longer Tauri-only)', () => {
  it('resolves a real connection for a real, bootstrapped PWA library', async () => {
    const { settings, session } = await freshModules();
    await settings.loadLibraries();
    const id = get(settings.objects).databases[0].id;

    const connection = await session.explorerConnection(id);
    expect(connection).not.toBe(null);
  });

  it('opening an unregistered id creates its own empty file rather than resolving null', async () => {
    // PWA-specific: `openLibraryById()`'s PWA branch opens a library's
    // file directly by id and does not check `config.db`
    // first (see that function's own comment on the asymmetry with Tauri,
    // where an unregistered id DOES resolve null). Every real caller only
    // ever passes an id it already read out of a real `config.db` row, so
    // this documents the behavior rather than exercising a live bug.
    const { settings, session, games } = await freshModules();
    await settings.loadLibraries();

    const connection = await session.explorerConnection(999999);
    expect(connection).not.toBe(null);
    expect(await games.countGames(connection)).toBe(0);
  });

  it('opens the SAME per-library data libraryConnection() does, for the same id', async () => {
    const { settings, session, games } = await freshModules();
    await settings.loadLibraries();
    const id = get(settings.objects).databases[0].id;

    const viaLibrary = await session.libraryConnection(id);
    const viaExplorer = await session.explorerConnection(id);
    expect(await games.countGames(viaLibrary)).toBe(await games.countGames(viaExplorer));
  });

  it('answers real §6 position statistics — the Sample Games bootstrap seeds positions too', async () => {
    const { settings, session, games } = await freshModules();
    await settings.loadLibraries();
    const id = get(settings.objects).databases[0].id;

    const connection = await session.explorerConnection(id);
    const rows = await games.readPositionStats(connection, START);

    // Cross-checked against samples/build_positions.py's own output for the
    // same 40-game corpus — see game-buildPositions.test.js.
    expect(rows).not.toBeNull();
    const byMove = Object.fromEntries(rows.map((r) => [r.move, r]));
    expect(byMove.e4).toEqual({ move: 'e4', games: 17, white: 6, draws: 3, black: 8 });
    expect(byMove.d4).toEqual({ move: 'd4', games: 17, white: 10, draws: 0, black: 7 });
    expect(byMove.c4).toEqual({ move: 'c4', games: 5, white: 2, draws: 0, black: 3 });
    expect(byMove.Nf3).toEqual({ move: 'Nf3', games: 1, white: 0, draws: 0, black: 1 });
    const total = rows.reduce((a, r) => a + r.games, 0);
    expect(total).toBe(40);
  });
});
