/**
 * `engine/storage.js`'s PWA/OPFS URL resolution (`resolveUrlsOpfs`, via
 * `writeEngineFiles`/`primeEngineUrls`/`getEngineUrls`/`deleteEngineFiles`)
 * -- previously entirely unautomated, the same shape of gap that let the
 * Tauri worker-start bug ship undetected (`engine-storageTauri.test.js`'s
 * own header). This one shipped a real Safari-only bug, found by hand 26
 * Sep: Safari's OPFS `getFile()` hands back a `.wasm` file's Blob with an
 * empty `type`, where Chrome infers `application/wasm` from the extension
 * on its own. A blob: URL's fetched Content-Type is exactly the Blob's own
 * `type`, and the downloaded engine's own glue code calls
 * `WebAssembly.instantiateStreaming()` on that fetch -- which WebKit
 * rejects outright with `TypeError: Unexpected response MIME type. Expected
 * 'application/wasm'` (the user's own console output, verbatim) when the
 * type isn't exactly right. `resolveUrlsOpfs` now re-types the wasm Blob
 * with `slice()` (a zero-copy view, not a real copy) before making its URL.
 *
 * This file drives a small in-memory fake of the OPFS directory-handle API
 * -- real OPFS isn't implemented under jsdom -- so it can pin down the
 * actual bug: what `Blob` ends up passed to `URL.createObjectURL()`, not
 * just what the final URL string looks like.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$lib/data/session.js', () => ({ getBackend: () => 'pwa' }));

const { writeEngineFiles, primeEngineUrls, getEngineUrls, deleteEngineFiles } =
  await import('../src/lib/engine/storage.js');

const BLOB_URL = 'blob:mock-url';

/** A tiny in-memory stand-in for navigator.storage's OPFS directory tree. */
function makeFakeOpfs() {
  const engines = {}; // { [id]: { [filename]: Blob } }

  function notFound() {
    const err = new Error('not found');
    err.name = 'NotFoundError';
    return err;
  }

  const enginesDir = {
    async getDirectoryHandle(id, opts) {
      if (!(id in engines)) {
        if (!opts?.create) throw notFound();
        engines[id] = {};
      }
      return makeEngineDir(id);
    },
    async removeEntry(id) {
      if (!(id in engines)) throw notFound();
      delete engines[id];
    }
  };

  function makeEngineDir(id) {
    return {
      async getFileHandle(name, opts) {
        if (!(name in engines[id])) {
          if (!opts?.create) throw notFound();
          engines[id][name] = null;
        }
        return {
          async createWritable() {
            return {
              async write(bytes) {
                engines[id][name] = new Blob([bytes]);
              },
              async close() {}
            };
          },
          async getFile() {
            return engines[id][name];
          }
        };
      },
      async *entries() {
        for (const [name, blob] of Object.entries(engines[id])) {
          yield [name, { kind: 'file', async getFile() { return blob; } }];
        }
      }
    };
  }

  return {
    root: { async getDirectoryHandle(name, opts) {
      if (name !== 'engines') throw notFound();
      return enginesDir;
    } },
    engines
  };
}

let fakeOpfs;
let createObjectURLCalls;

beforeEach(() => {
  fakeOpfs = makeFakeOpfs();
  global.navigator.storage = { getDirectory: async () => fakeOpfs.root };
  createObjectURLCalls = [];
  global.URL.createObjectURL = vi.fn((blob) => {
    createObjectURLCalls.push(blob);
    return BLOB_URL;
  });
  global.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const FILES = [
  { name: 'stockfish-19-lite.js', bytes: new TextEncoder().encode('// engine glue') },
  { name: 'stockfish-19-lite.wasm', bytes: new Uint8Array([0, 97, 115, 109]) },
  { name: 'README.md', bytes: new TextEncoder().encode('licence text') }
];

describe('resolveUrlsOpfs (via primeEngineUrls) -- the 26 Sep Safari wasm-MIME bug', () => {
  it('hands back blob: URLs for both the script and the wasm file', async () => {
    await writeEngineFiles(10, FILES);
    const urls = await primeEngineUrls(10);
    expect(urls.script).toBe(BLOB_URL);
    expect(urls.wasm).toBe(BLOB_URL);
  });

  it('re-types the wasm blob to application/wasm even though the stored blob has no type at all -- the actual Safari bug', async () => {
    await writeEngineFiles(11, FILES);
    await primeEngineUrls(11);
    // Two matching files (.js and .wasm); README.md is skipped entirely.
    expect(createObjectURLCalls).toHaveLength(2);
    const wasmBlob = createObjectURLCalls.find((b) => b.type === 'application/wasm');
    expect(wasmBlob).toBeDefined();
    expect(wasmBlob.size).toBe(4); // the 4 wasm magic-number bytes, untouched
  });

  it('leaves the script blob as-is -- Worker startup does not require a MIME type', async () => {
    await writeEngineFiles(12, FILES);
    await primeEngineUrls(12);
    const scriptBlob = createObjectURLCalls.find((b) => b.type !== 'application/wasm');
    expect(scriptBlob).toBeDefined();
    expect(scriptBlob.type).toBe(''); // the raw stored Blob's own (unset) type
  });

  it('never fetches or wraps README.md -- only the two files the Worker loads', async () => {
    await writeEngineFiles(13, FILES);
    await primeEngineUrls(13);
    expect(createObjectURLCalls).toHaveLength(2);
    expect(createObjectURLCalls.every((b) => b.size !== 12)).toBe(true); // 'licence text'.length
  });

  it('caches the resolved urls for getEngineUrls', async () => {
    expect(getEngineUrls(14)).toBeNull();
    await writeEngineFiles(14, FILES);
    await primeEngineUrls(14);
    expect(getEngineUrls(14)).toEqual({ script: BLOB_URL, wasm: BLOB_URL });
  });

  it('removing the engine revokes the blob urls and drops the OPFS directory', async () => {
    await writeEngineFiles(15, FILES);
    await primeEngineUrls(15);
    await deleteEngineFiles(15);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(BLOB_URL);
    expect(getEngineUrls(15)).toBeNull();
    expect(fakeOpfs.engines[15]).toBeUndefined();
  });
});
