/**
 * The main thread's side of the storage worker: posts `{ id, op, args }` and
 * matches each reply to its request by id. `sqlite-host.js` documents the
 * operations.
 *
 * One worker per page, started on the first call. If it can't start (no
 * Worker support, as in jsdom) or it crashes, every later call rejects with
 * the same error. Nothing retries: `data/session.js` already turns a failed
 * open into a `null` connection, which is how every missing capability
 * degrades in this seam.
 */

import { DataError } from '../connection.js';
import { spawnSqliteWorker } from './sqlite-worker-port.js';

let port = null;
let failure = null;
let nextId = 1;
const pending = new Map();

/** An error from the worker, rebuilt so `DataError` stays a `DataError`. */
const rehydrate = (error) => {
  if (error?.name === 'DataError') return new DataError(error.message);
  const err = new Error(error?.message ?? 'unknown storage error');
  if (error?.name) err.name = error.name;
  return err;
};

const failAll = (err) => {
  failure = err;
  for (const { reject } of pending.values()) reject(err);
  pending.clear();
};

const ensurePort = () => {
  if (port || failure) return;
  try {
    port = spawnSqliteWorker();
  } catch (err) {
    failure = new DataError(`could not start the storage worker: ${err?.message ?? err}`);
    return;
  }
  port.addEventListener('message', (event) => {
    const { id, ok, result, error } = event.data ?? {};
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    if (ok) entry.resolve(result);
    else entry.reject(rehydrate(error));
  });
  port.addEventListener('error', (event) => {
    failAll(new DataError(`the storage worker failed: ${event?.message ?? 'unknown error'}`));
  });
};

/**
 * Send one operation to the storage worker.
 * @param {string} op
 * @param {object} [args]
 * @returns {Promise<unknown>}
 */
export const call = (op, args = {}) => {
  ensurePort();
  if (failure) return Promise.reject(failure);
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    port.postMessage({ id, op, args });
  });
};

/**
 * Whether this page has storage: `'ready'`, `'locked-elsewhere'` (another tab
 * or window of the app holds it) or `'unavailable'`.
 * @returns {Promise<'ready'|'locked-elsewhere'|'unavailable'>}
 */
export const storageStatus = () => call('status').catch(() => 'unavailable');
