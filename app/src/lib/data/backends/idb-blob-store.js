/**
 * A single named byte blob, persisted in IndexedDB. This is the entire storage model
 * of the interim PWA backend: one database's serialized bytes, one IndexedDB record.
 * No page-level access, no OPFS, no third-party VFS — `pwa.js` deserializes the whole
 * thing into an in-memory SQLite database on open and re-exports the whole thing back
 * here on save. This file only knows "get the bytes for this key" / "put the bytes
 * for this key" — it doesn't know they're a SQLite file.
 *
 * One IndexedDB database (`plyvio`), one object store (`snapshots`), one record per
 * logical database `pwa.js` opens today — `'games'` and `'config'`.
 */

const DB_NAME = 'plyvio';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

let dbPromise = null;

const openIdb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
};

/** @returns {Promise<Uint8Array|null>} the stored bytes for `key`, or null if there are none. */
export const readBlob = async (key) => {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
};

/** Replace the stored bytes for `key` whole — every save is a full snapshot, never a patch. */
export const writeBlob = async (key, bytes) => {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(bytes, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
