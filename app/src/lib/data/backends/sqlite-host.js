/**
 * The storage worker's logic, with no Worker, DOM or OPFS reference in it.
 *
 * `sqlite-worker.js` is the real Worker entry: it takes the storage lock,
 * installs the `opfs-sahpool` VFS and hands the result to `createHost()` and
 * `serve()` below. The tests do the same with an in-memory `store` and an
 * in-process port (`tests/helpers/pwa-in-process.js`), so everything here runs
 * for real under Vitest. Only OPFS itself is swapped out.
 *
 * THE PROTOCOL. The main thread (`worker-client.js`) posts
 * `{ id, op, args }` and gets back `{ id, ok: true, result }` or
 * `{ id, ok: false, error: { name, message } }`. Operations:
 *
 *   open   { name, init? }        → { handle, fresh }
 *   all / get / value / run
 *          { handle, sql, params } → what `connection.js`'s Connection returns
 *   batch  { handle, statements }  → runs `[{ sql, params }]` as one transaction
 *   export { handle }              → the database's current bytes
 *   close  { handle }              → releases this handle
 *   status {}                      → 'ready' | 'locked-elsewhere' | 'unavailable'
 *
 * ONE DATABASE OBJECT PER FILE, SHARED. `data/session.js` keeps separate
 * caches for the Library view and the Explorer, so both routinely open the
 * same library. `opfs-sahpool`'s xLock/xUnlock only record a lock level, they
 * enforce nothing, so two database objects writing one file in this worker
 * could corrupt it. Every `open` of a name that is already open gets a new
 * handle onto the same object; the object is closed when its last handle is.
 *
 * FRESH FILES ARE INITIALISED INSIDE `open`. `init` (DDL, `user_version`,
 * seed rows) runs in the same message that creates the file, in one
 * transaction. If it ran as a separate message, a second `open` of the same
 * name could arrive in between, find the file existing, and query tables
 * that aren't there yet. If `init` fails, the file is removed, so a
 * half-built database never survives to the next load.
 *
 * ONE MESSAGE AT A TIME. `serve()` queues messages and handles each one to
 * completion before the next, so a caller's statements always reach the
 * database in the order it sent them.
 */

import { connectionFor } from './sqlite-engine.js';
import { DataError } from '../connection.js';

/**
 * @typedef {object} Store where database files live — OPFS in the worker,
 *   a Map in the tests.
 * @property {(name: string) => boolean} exists
 * @property {(name: string) => Promise<unknown>} prepare room for one new file
 * @property {(name: string) => object} open an oo1 `DB` for `name`, creating it if needed
 * @property {(name: string, db: object) => void} close
 * @property {(name: string) => void} remove
 */

/**
 * @param {{ sqlite3: object, store: Store }} deps
 * @returns {{ handle: (op: string, args: object) => unknown }}
 */
export const createHost = ({ sqlite3, store }) => {
  /** name → { db, connection, refs } */
  const files = new Map();
  /** handle → name */
  const handles = new Map();
  let nextHandle = 1;

  const entryFor = (handle) => {
    const name = handles.get(handle);
    if (name === undefined) throw new DataError(`no open database for handle ${handle}`);
    return files.get(name);
  };

  const runBatch = (db, statements) =>
    db.transaction((tx) => {
      for (const { sql, params } of statements) tx.exec({ sql, bind: params });
    });

  const ops = {
    async open({ name, init = [] }) {
      let entry = files.get(name);
      let fresh = false;
      if (!entry) {
        fresh = !store.exists(name);
        if (fresh) await store.prepare(name);
        const db = store.open(name);
        if (fresh && init.length) {
          try {
            runBatch(db, init);
          } catch (err) {
            store.close(name, db);
            store.remove(name);
            throw err;
          }
        }
        entry = { db, connection: connectionFor(db, sqlite3, name), refs: 0 };
        files.set(name, entry);
      }
      entry.refs += 1;
      const handle = nextHandle++;
      handles.set(handle, name);
      return { handle, fresh };
    },
    all: ({ handle, sql, params }) => entryFor(handle).connection.all(sql, params),
    get: ({ handle, sql, params }) => entryFor(handle).connection.get(sql, params),
    value: ({ handle, sql, params }) => entryFor(handle).connection.value(sql, params),
    run: ({ handle, sql, params }) => entryFor(handle).connection.run(sql, params),
    batch: ({ handle, statements }) => {
      runBatch(entryFor(handle).db, statements);
    },
    export: ({ handle }) => entryFor(handle).connection.export(),
    close: ({ handle }) => {
      const name = handles.get(handle);
      if (name === undefined) return;
      handles.delete(handle);
      const entry = files.get(name);
      entry.refs -= 1;
      if (entry.refs === 0) {
        files.delete(name);
        store.close(name, entry.db);
      }
    }
  };

  return {
    handle: (op, args) => {
      const fn = ops[op];
      if (!fn) throw new DataError(`unknown storage operation: ${op}`);
      return fn(args);
    }
  };
};

/**
 * Answer messages on `port` (the Worker's `self`, or a test port) with the host
 * `hostPromise` resolves to. If it rejects — the storage lock is held by
 * another tab, or OPFS is unavailable — every operation fails with that
 * error, and `status` reports its `status` field.
 *
 * @param {{ addEventListener: Function, postMessage: Function }} port
 * @param {Promise<ReturnType<typeof createHost>>} hostPromise
 */
export const serve = (port, hostPromise) => {
  // Observed once here so a rejected startup is never an unhandled rejection.
  const status = hostPromise.then(() => 'ready', (err) => err?.status ?? 'unavailable');
  let queue = Promise.resolve();

  port.addEventListener('message', (event) => {
    const { id, op, args } = event.data ?? {};
    queue = queue.then(async () => {
      try {
        const result = op === 'status'
          ? await status
          : await (await hostPromise).handle(op, args ?? {});
        port.postMessage({ id, ok: true, result });
      } catch (err) {
        // `DataError` doesn't set its own `name`, so it's identified here,
        // where `instanceof` still works, for `worker-client.js` to rebuild.
        const name = err instanceof DataError ? 'DataError' : (err?.name ?? 'Error');
        port.postMessage({
          id,
          ok: false,
          error: { name, message: err?.message ?? String(err) }
        });
      }
    });
  });
};
