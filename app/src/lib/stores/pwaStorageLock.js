/**
 * PWA only — whether this window is locked out of storage because another
 * window or tab of the app already holds it.
 *
 * `opfs-sahpool` (`sqlite-worker.js`) locks its whole pool to one instance:
 * a second instance's worker fails to acquire the `plyvio-storage` Web Lock
 * at startup, and `worker-client.js`'s `storageStatus()` reports
 * `'locked-elsewhere'` for that instance's entire lifetime. Desktop (Tauri)
 * never hits this — each window opens its own on-disk database file — so
 * `checkStorageLock()` is a no-op there.
 *
 * See ACTIONS.md, "PWA: a second window can't open the board once OPFS
 * lands", and the agreed wireframe/copy at
 * `working/wireframes/pwa-second-window-gate.html`.
 *
 * No live recovery: the worker only checks the lock once, at startup, so
 * the only way back to a working window is a fresh page load — `retry()`
 * does exactly that. Listening for the other window's lock release and
 * recovering without a reload is a further step, deliberately not built
 * here (see that ACTIONS.md row) — it would mean restructuring
 * `sqlite-worker.js`'s lock acquisition from an immediate check into a
 * queued wait, which is more than this gate needs to close the actual
 * risk (a user thinking their games were lost).
 */

import { writable } from 'svelte/store';
import { isTauri } from '$lib/data/session.js';
import { storageStatus } from '$lib/data/backends/worker-client.js';

export const storageLockedElsewhere = writable(false);

/** Check once, on launch. Never shows the gate on Tauri. */
export async function checkStorageLock() {
  if (isTauri()) return;
  storageLockedElsewhere.set((await storageStatus()) === 'locked-elsewhere');
}

/** The gate's only recovery path: reload, so the worker attempts the lock again. */
export function retryStorageLock(win = globalThis) {
  win.location.reload();
}
