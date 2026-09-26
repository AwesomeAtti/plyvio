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
 * (`new Worker()`'s own contract). Both sides end up handing the worker a
 * `blob:` URL, not the platform's own storage URL directly: OPFS's
 * `getFile()` was always async and always produced one, and Tauri's own
 * `asset://` URL (`assetUrlFor()`) turned out NOT to be something a Worker
 * can be started from at all — found by hand, 26 Sep, on the real desktop
 * app: the worker starts and dies immediately with a generic, contentless
 * "engine worker failed" (WKWebView's own security behavior for a worker
 * script load it refuses, not a real error from the engine). `resolveUrlsTauri`
 * now `fetch()`es the asset URL (a supported, ordinary use of the asset
 * protocol) and hands the worker a `blob:` URL made from the bytes, the same
 * shape `resolveUrlsOpfs` already produces — `deleteEngineFiles`'s existing
 * blob-URL revocation already covers both without any change, since it only
 * checks the URL's own scheme, not which platform produced it. Either way
 * the URL has to be resolved once, ahead of time, and cached
 * (`primeEngineUrls`) rather than computed the moment a search wants one:
 * `engine/session.js`'s `createTransport` factory is called synchronously
 * (`stores/game.js`), and nothing above this module changes for that to
 * keep working.
 *
 * A fourth platform quirk, found by hand on Safari, 26 Sep: Safari's OPFS
 * `getFile()` hands back a `.wasm` file's Blob with an empty `type`, where
 * Chrome infers `application/wasm` from the extension on its own. A blob:
 * URL's fetched Content-Type is exactly the Blob's own `type`, and the
 * downloaded engine's own glue code calls `WebAssembly.instantiateStreaming()`
 * on that fetch, which WebKit rejects outright when the type isn't exactly
 * `application/wasm` ("Unexpected response MIME type. Expected
 * 'application/wasm'"). `resolveUrlsOpfs` now re-types the wasm Blob with
 * `slice()` before making its URL -- a zero-copy view over the same bytes,
 * so it costs nothing on Chrome, where this was already correct.
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

const WASM_MIME = 'application/wasm';

async function resolveUrlsOpfs(id) {
  const dir = await opfsEngineDir(id);
  let script = null;
  let wasm = null;
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== 'file') continue;
    if (!name.endsWith(SCRIPT_EXT) && !name.endsWith(WASM_EXT)) continue;
    const file = await handle.getFile();
    if (name.endsWith(SCRIPT_EXT)) {
      script = URL.createObjectURL(file);
    } else {
      // Safari/WebKit's OPFS getFile() doesn't infer application/wasm from
      // the extension the way Chrome does (see this file's header) --
      // slice() with no byte range re-types the same underlying bytes with
      // no copy.
      wasm = URL.createObjectURL(file.slice(0, file.size, WASM_MIME));
    }
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

/**
 * Fetch a desktop-stored file through Tauri's asset protocol and hand back a
 * `blob:` URL a Worker can actually be started from (see this file's own
 * header: a Worker refuses to load directly from `asset://`, found by hand
 * 26 Sep). `fetch()` against the asset URL is the protocol's own supported
 * use, unlike `new Worker(assetUrl)`.
 */
async function assetBlobUrl(path) {
  const { assetUrlFor } = await import('../data/backends/tauri.js');
  const response = await fetch(assetUrlFor(path));
  if (!response.ok) throw new Error(`could not read ${path}: HTTP ${response.status}`);
  return URL.createObjectURL(await response.blob());
}

async function resolveUrlsTauri(id) {
  const { engineDir } = await import('../data/session.js');
  const { listDirectoryNames } = await import('../data/backends/tauri.js');
  const dir = await engineDir(id);
  const names = await listDirectoryNames(dir);
  let script = null;
  let wasm = null;
  for (const name of names) {
    if (name.endsWith(SCRIPT_EXT)) script = await assetBlobUrl(`${dir}/${name}`);
    else if (name.endsWith(WASM_EXT)) wasm = await assetBlobUrl(`${dir}/${name}`);
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
