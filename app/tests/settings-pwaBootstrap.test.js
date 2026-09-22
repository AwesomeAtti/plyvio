/**
 * `stores/settings.js`'s `ensureSampleGamesLibrary()` — the PWA's one-time
 * default-library bootstrap, called from `loadLibraries()`. Registers a
 * real "Sample Games" row in `config.db` and seeds its own database file
 * from `sample-games.js`'s 40 games, on first launch only. See ACTIONS.md's
 * "sequenced first" item 1 and the working notes'
 * `pwa-default-library-connections-plan.md` for the plan this implements.
 *
 * The PWA storage worker runs in-process here (`tests/helpers/
 * pwa-in-process.js`), the same way `backends-pwa.test.js` and
 * `databases-create.test.js` do — a
 * real round trip through the actual PWA backend, not a mocked seam, since
 * the whole point of this function is what it writes to `config.db` and to
 * the new library's own file.
 *
 * `data/session.js` caches its connections and its backend choice at MODULE
 * scope (`configConnectionPromise`, `libraryConnectionPromises`,
 * `backendChoice`), on purpose (one connection per id, reused) — which
 * means a stale cached connection from an earlier test would silently keep
 * pointing at an earlier test's now-cleared pool otherwise. Every
 * test below calls `freshModules()`, which resets the module registry and
 * re-imports `stores/settings.js`/`data/session.js` fresh, so each test's
 * `loadLibraries()` genuinely starts from nothing — not a convention this
 * codebase uses elsewhere yet, but the isolation this file specifically
 * needs to test idempotency honestly (see the third test below, which
 * DELIBERATELY calls `loadLibraries()` twice within one fresh module
 * instance rather than across two, since that is the only way to prove
 * idempotence rather than merely two independently-empty runs).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { GAMES } from '../src/lib/mock-data/sample-games.js';
import { resetPool } from './helpers/pwa-in-process.js';

vi.mock('../src/lib/data/backends/sqlite-worker-port.js', async () =>
  (await import('./helpers/pwa-in-process.js')).workerPortMock());


async function freshModules() {
  vi.resetModules();
  const settings = await import('../src/lib/stores/settings.js');
  const session = await import('../src/lib/data/session.js');
  const config = await import('../src/lib/data/config.js');
  const games = await import('../src/lib/data/games.js');
  return { settings, session, config, games };
}

beforeEach(() => {
  resetPool();
});

describe('ensureSampleGamesLibrary (via loadLibraries, PWA)', () => {
  it('registers a real, numeric-id Sample Games library on first launch', async () => {
    const { settings, session, config } = await freshModules();
    await settings.loadLibraries();

    const dbs = get(settings.objects).databases;
    expect(dbs).toHaveLength(1);
    expect(dbs[0].name).toBe('Sample Games');
    expect(typeof dbs[0].id).toBe('number');
    expect(dbs[0].location).toBe(null); // "Stored in this browser" (DB‑03r)
    expect(dbs[0].enabled).toBe(true);

    const connection = await session.configConnection();
    const libs = await config.readLibraries(connection);
    expect(libs).toHaveLength(1);
    expect(libs[0].name).toBe('Sample Games');

    const { pwaSampleLibrarySeeded } = await config.readUiState(connection);
    expect(pwaSampleLibrarySeeded).toBe(true);
  });

  it('seeds the new library with all 40 sample games, reachable through the normal connection path', async () => {
    const { settings, session, games } = await freshModules();
    await settings.loadLibraries();
    const id = get(settings.objects).databases[0].id;

    const connection = await session.libraryConnection(id);
    expect(connection).not.toBe(null);
    const rows = await games.readGames(connection, { limit: 100 });
    expect(rows).toHaveLength(GAMES.length);
    expect(rows.map((g) => g.id).sort((a, b) => a - b)).toEqual(
      GAMES.map((g) => g.id).sort((a, b) => a - b)
    );
  });

  it('does not create a second row on a later call in the same session (idempotent)', async () => {
    const { settings, session, config } = await freshModules();
    await settings.loadLibraries();
    const firstId = get(settings.objects).databases[0].id;

    await settings.loadLibraries();

    const dbs = get(settings.objects).databases;
    expect(dbs).toHaveLength(1);
    expect(dbs[0].id).toBe(firstId);

    const connection = await session.configConnection();
    const libs = await config.readLibraries(connection);
    expect(libs).toHaveLength(1);
  });

  it('never registers a Master Games row', async () => {
    const { settings, session, config } = await freshModules();
    await settings.loadLibraries();

    const connection = await session.configConnection();
    const libs = await config.readLibraries(connection);
    expect(libs.some((l) => l.name === 'Master Games')).toBe(false);
    expect(get(settings.objects).databases.some((d) => d.name === 'Master Games')).toBe(false);
  });
});
