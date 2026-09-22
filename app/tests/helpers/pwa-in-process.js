/**
 * The PWA backend, run in-process for Vitest: jsdom has no Worker and no OPFS.
 *
 * Everything real except OPFS itself. `worker-client.js`, `sqlite-host.js`'s
 * `createHost()` and `serve()`, and SQLite are the app's own code. Only two
 * stand-ins:
 *
 *  - A port pair instead of a Worker. Messages are copied with
 *    `structuredClone`, as `postMessage` does, and delivered asynchronously,
 *    so anything that couldn't cross a real worker boundary fails here too.
 *  - An in-memory store instead of the `opfs-sahpool` pool. Each "file" is a
 *    live in-memory database that outlives closing it, the way a file
 *    outlives its handle. `resetPool()` is the equivalent of clearing the
 *    browser's site data.
 *
 * Use it in a test file with:
 *
 *   vi.mock('../src/lib/data/backends/sqlite-worker-port.js', async () =>
 *     (await import('./helpers/pwa-in-process.js')).workerPortMock());
 *   beforeEach(() => resetPool());
 *
 * The pool and the SQLite instance are kept on `globalThis`, not in module
 * state, because several of these tests call `vi.resetModules()`: a
 * re-imported module must still see the same "files", and those files must
 * belong to the same WASM instance that reads them.
 */

import { sqlite3Module, openDb } from '../../src/lib/data/backends/sqlite-engine.js';
import { createHost, serve } from '../../src/lib/data/backends/sqlite-host.js';

const files = () => (globalThis.__plyvioTestFiles ??= new Map());
const sqlite3 = () => (globalThis.__plyvioTestSqlite3 ??= sqlite3Module());

/**
 * Forget every file, as clearing the browser's site data would. The databases
 * aren't closed: a test file that doesn't reset modules keeps its cached
 * connections from one test to the next (`data/session.js` caches them), the
 * same as it did over `fake-indexeddb`, and closing them under it would break
 * that rather than model anything real.
 */
export const resetPool = () => {
  globalThis.__plyvioTestFiles = new Map();
};

/** The names of every file in the pool. */
export const poolFileNames = () => [...files().keys()];

const memoryStore = (sqlite) => ({
  exists: (name) => files().has(name),
  prepare: async () => {},
  open: (name) => {
    if (!files().has(name)) files().set(name, openDb(sqlite));
    return files().get(name);
  },
  // The "file" stays; only a real pool file handle would be released.
  close: () => {},
  remove: (name) => {
    files().get(name)?.close();
    files().delete(name);
  }
});

/** Two connected ports, each with `postMessage` and `addEventListener`. */
export const portPair = () => {
  const make = () => ({ listeners: new Set(), other: null });
  const a = make();
  const b = make();
  a.other = b;
  b.other = a;
  const expose = (end) => ({
    postMessage: (data) => {
      const copy = structuredClone(data);
      setTimeout(() => {
        for (const fn of end.other.listeners) fn({ data: copy });
      }, 0);
    },
    addEventListener: (type, fn) => {
      if (type === 'message') end.listeners.add(fn);
    }
  });
  return [expose(a), expose(b)];
};

/** A stand-in for `spawnSqliteWorker()`: a port onto an in-process host. */
export const spawnInProcessWorker = () => {
  const [client, worker] = portPair();
  serve(worker, sqlite3().then((sqlite) => createHost({ sqlite3: sqlite, store: memoryStore(sqlite) })));
  return client;
};

/** The `vi.mock` factory result for `sqlite-worker-port.js`. */
export const workerPortMock = () => ({ spawnSqliteWorker: spawnInProcessWorker });
