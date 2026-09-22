/**
 * The PWA's storage worker: the Worker entry point, and nothing else.
 *
 * OPFS sync access handles only exist in a Worker, so SQLite lives here and the
 * main thread reaches it through `worker-client.js`. All the logic is in
 * `sqlite-host.js`; this file only does the three things that need a real
 * browser Worker:
 *
 *  1. Takes the `plyvio-storage` Web Lock and holds it for the worker's
 *     lifetime. `opfs-sahpool` locks its whole pool for one instance, so a
 *     second tab or window of the app can't use storage. The lock makes that
 *     case identifiable: the second tab logs one error and every connection
 *     resolves `null`, as for any other storage failure. Proper handling is
 *     its own ACTIONS.md row.
 *  2. Installs the `opfs-sahpool` VFS in its own directory, `.plyvio`.
 *     `opfs-sahpool` specifically: the only OPFS VFS that needs no COOP/COEP
 *     headers, which GitHub Pages can't send.
 *  3. Hands both to `serve()`.
 */

import { sqlite3Module, openPoolDb } from './sqlite-engine.js';
import { createHost, serve } from './sqlite-host.js';

const LOCK_NAME = 'plyvio-storage';
const POOL_DIRECTORY = '.plyvio';

/** A startup failure `serve()` reports through the `status` operation. */
const storageError = (status, message) => Object.assign(new Error(message), { status });

/**
 * Resolve `true` once the lock is ours (held until the worker ends), or
 * `false` straight away if another instance holds it. Without the Web Locks
 * API, `true`: the pool install below then fails on its own in a second tab.
 */
const acquireLock = () => new Promise((resolve) => {
  if (!globalThis.navigator?.locks) { resolve(true); return; }
  navigator.locks.request(LOCK_NAME, { ifAvailable: true }, (lock) => {
    resolve(!!lock);
    return lock ? new Promise(() => {}) : undefined;
  });
});

/** The `Store` `createHost()` needs, over the installed pool. */
const poolStore = (pool) => ({
  exists: (name) => pool.getFileNames().includes(name),
  // Room for the new file, its journal during a transaction, and headroom.
  // Only grows the pool when it's short; never called at every startup.
  prepare: () => pool.reserveMinimumCapacity(pool.getFileCount() + 4),
  open: (name) => openPoolDb(pool, name),
  close: (name, db) => db.close(),
  remove: (name) => pool.unlink(name)
});

const start = async () => {
  if (!(await acquireLock())) {
    const err = storageError('locked-elsewhere',
      'Plyvio: storage is in use by another tab or window of this app, so this one has no database.');
    console.error(err.message);
    throw err;
  }
  const sqlite3 = await sqlite3Module();
  let pool;
  try {
    pool = await sqlite3.installOpfsSAHPoolVfs({ directory: POOL_DIRECTORY });
  } catch (cause) {
    const err = storageError('unavailable', `Plyvio: OPFS storage is unavailable: ${cause?.message ?? cause}`);
    console.error(err.message);
    throw err;
  }
  return createHost({ sqlite3, store: poolStore(pool) });
};

serve(self, start());
