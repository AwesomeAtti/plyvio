/**
 * Where a downloaded engine's files live, and how they get there — engine
 * Stage 2 (26 Sep 2026, `engine-stage2-plan.md`). Two backends, one contract:
 *
 *   PWA:   the origin-private file system (OPFS), reached with its plain
 *          async File API directly on the main thread — no worker needed,
 *          unlike the SQLite VFS in `backends/pwa.js`, which only needs a
 *          worker because OPFS's SYNCHRONOUS access handles are
 *          worker-only. Plain async reads/writes need no worker.
 *   Tauri: a real directory, `session.js`'s `engineDir(id)`
 *          (`$APPDATA/engines/<id>/`), written through the small custom
 *          Rust commands `backends/tauri.js` wraps.
 *
 * A Web Worker needs a URL, not a path or a Blob, even on desktop
 * (`new Worker()`'s own contract). Tauri's asset protocol
 * (`assetUrlFor()`) is a synchronous string rewrite, but OPFS's `getFile()`
 * is not — so a PWA-side URL has to be resolved once, ahead of time, and
 * cached (`primeEngineUrls`) rather than computed the moment a search wants
 * one: `engine/session.js`'s `createTransport` factory is called
 * synchronously (`stores/game.js`), and nothing above this module changes
 * for that to keep working.
 *
 * Every file the package contained is kept — engine script, `.wasm`,
 * licence, README — not just the two the Worker loads, so an installed
 * engine carries its own attribution locally too (see the plan's "Source
 * availability").
 */

import { getBackend } from '../data/session.js';

const SCRIPT_EXT = '.js';
const WASM_EXT = '.wasm';

/**
 * Resolved `{script, wasm}` URLs, by `engines.id`. The PWA side genuinely
 * needs this (OPFS resolution is async); Tauri's `resolveUrlsTauri` is fast
 * and pure enough that caching it is only for symmetry, not correctness.
 */
const urlCache = new Map();

/* --------------------------------- PWA (OPFS) ---------------------------- */

async function opfsEnginesRoot({ create = false } = {}) {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle('engines', { create });
}

async function opfsEngineDir(id, { create = false } = {}) {
  const engines = await opfsEnginesRoot({ create });
  return engines.getDirectoryHandle(String(id), { create });
}

async function writeFilesOpfs(id, files) {
  const dir = await opfsEngineDir(id, { create: true });
  for (const { name, bytes } of files) {
    const handle = await dir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(bytes);
    await writable.close();
  }
}

async function resolveUrlsOpfs(id) {
  const dir = await opfsEngineDir(id);
  let script = null;
  let wasm = null;
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== 'file') continue;
    if (!name.endsWith(SCRIPT_EXT) && !name.endsWith(WASM_EXT)) continue;
    const file = await handle.getFile();
    const url = URL.createObjectURL(file);
    if (name.endsWith(SCRIPT_EXT)) script = url;
    else wasm = url;
  }
  return { script, wasm };
}

async function deleteFilesOpfs(id) {
  let engines;
  try {
    engines = await opfsEnginesRoot({ create: true });
  } catch {
    return; // no OPFS root at all — nothing to remove
  }
  try {
    await engines.removeEntry(String(id), { recursive: true });
  } catch (err) {
    if (err?.name !== 'NotFoundError') throw err;
  }
}

/* -------------------------------- Tauri ----------------------------------- */

async function writeFilesTauri(id, files) {
  const { engineDir } = await import('../data/session.js');
  const { writeBinaryFile } = await import('../data/backends/tauri.js');
  const dir = await engineDir(id);
  for (const { name, bytes } of files) {
    await writeBinaryFile(`${dir}/${name}`, bytes);
  }
}

async function resolveUrlsTauri(id) {
  const { engineDir } = await import('../data/session.js');
  const { listDirectoryNames, assetUrlFor } = await import('../data/backends/tauri.js');
  const dir = await engineDir(id);
  const names = await listDirectoryNames(dir);
  let script = null;
  let wasm = null;
  for (const name of names) {
    if (name.endsWith(SCRIPT_EXT)) script = assetUrlFor(`${dir}/${name}`);
    else if (name.endsWith(WASM_EXT)) wasm = assetUrlFor(`${dir}/${name}`);
  }
  return { script, wasm };
}

async function deleteFilesTauri(id) {
  const { engineDir } = await import('../data/session.js');
  const { removeDirectoryAll } = await import('../data/backends/tauri.js');
  await removeDirectoryAll(await engineDir(id));
}

/* -------------------------------- shared API ------------------------------ */

/**
 * Write a freshly-downloaded, checksum-verified engine's files to this
 * platform's storage.
 *
 * @param {string|number} id the engine's `engines.id`
 * @param {{name: string, bytes: Uint8Array}[]} files every file the
 *   package's zip contained
 */
export async function writeEngineFiles(id, files) {
  if (getBackend() === 'tauri') return writeFilesTauri(id, files);
  return writeFilesOpfs(id, files);
}

/**
 * Resolve this engine's `{script, wasm}` URLs and cache them. Called once
 * right after install, and once per real `kind: 'wasm'` row whenever
 * `stores/settings.js`'s `loadEngines()` runs — so that by the time a
 * search actually wants a transport, the URLs are already sitting in
 * `urlCache` rather than needing to be awaited there.
 *
 * @param {string|number} id
 * @returns {Promise<{script: string|null, wasm: string|null}>}
 */
export async function primeEngineUrls(id) {
  const urls = getBackend() === 'tauri' ? await resolveUrlsTauri(id) : await resolveUrlsOpfs(id);
  urlCache.set(id, urls);
  return urls;
}

/**
 * The cached `{script, wasm}` URLs for an engine, or `null` if
 * `primeEngineUrls()` hasn't resolved them yet — `stores/game.js`'s
 * `engineRequest` simply doesn't start a search until it has.
 *
 * @param {string|number} id
 */
export function getEngineUrls(id) {
  return urlCache.get(id) ?? null;
}

/**
 * Delete an engine's stored files (and drop its cached URLs — including
 * revoking any OPFS blob URL, so the browser doesn't hold onto bytes for a
 * file that no longer exists).
 *
 * @param {string|number} id
 */
export async function deleteEngineFiles(id) {
  const cached = urlCache.get(id);
  if (cached?.script?.startsWith('blob:')) URL.revokeObjectURL(cached.script);
  if (cached?.wasm?.startsWith('blob:')) URL.revokeObjectURL(cached.wasm);
  urlCache.delete(id);
  if (getBackend() === 'tauri') return deleteFilesTauri(id);
  return deleteFilesOpfs(id);
}
