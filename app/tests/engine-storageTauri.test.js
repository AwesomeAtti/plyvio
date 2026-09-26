/**
 * `engine/storage.js`'s Tauri-only URL resolution (`resolveUrlsTauri`,
 * via `primeEngineUrls`/`getEngineUrls`/`deleteEngineFiles`) -- previously
 * entirely unautomated (`ACTIONS.md`: "Tauri asset-scope resolution on
 * desktop" was a by-hand-only check), which is exactly how a real bug
 * shipped undetected: a Worker cannot be started directly from Tauri's
 * `asset://` URL (found by hand, 26 Sep, on the real desktop app --
 * "engine worker failed", a generic, contentless error; WKWebView's own
 * security behavior for a worker script load it refuses, not a real error
 * from the engine).
 *
 * This file pins the fix without a real Tauri build or webview -- the same
 * "prove the LOGIC, not the real IPC" scope `backends-tauri.test.js`
 * already states for this backend: `resolveUrlsTauri` must `fetch()` the
 * asset URL (the protocol's own supported use) and hand the worker a
 * `blob:` URL made from the bytes, never the raw `asset://` URL itself.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sessionMocks = vi.hoisted(() => ({
  getBackend: vi.fn(() => 'tauri'),
  engineDir: vi.fn(async (id) => `/AppData/engines/${id}`)
}));

const tauriMocks = vi.hoisted(() => ({
  listDirectoryNames: vi.fn(async () => [
    'stockfish-19-lite.js', 'stockfish-19-lite.wasm', 'README.md'
  ]),
  assetUrlFor: vi.fn((path) => `asset://localhost/${encodeURIComponent(path)}`),
  removeDirectoryAll: vi.fn(async () => {})
}));

vi.mock('$lib/data/session.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getBackend: (...args) => sessionMocks.getBackend(...args),
    engineDir: (...args) => sessionMocks.engineDir(...args)
  };
});

vi.mock('$lib/data/backends/tauri.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    listDirectoryNames: (...args) => tauriMocks.listDirectoryNames(...args),
    assetUrlFor: (...args) => tauriMocks.assetUrlFor(...args),
    removeDirectoryAll: (...args) => tauriMocks.removeDirectoryAll(...args)
  };
});

const { primeEngineUrls, getEngineUrls, deleteEngineFiles } =
  await import('../src/lib/engine/storage.js');

const BLOB_URL = 'blob:mock-url';

beforeEach(() => {
  sessionMocks.getBackend.mockReturnValue('tauri');
  sessionMocks.engineDir.mockImplementation(async (id) => `/AppData/engines/${id}`);
  tauriMocks.listDirectoryNames.mockResolvedValue([
    'stockfish-19-lite.js', 'stockfish-19-lite.wasm', 'README.md'
  ]);
  tauriMocks.assetUrlFor.mockImplementation((path) => `asset://localhost/${encodeURIComponent(path)}`);
  tauriMocks.removeDirectoryAll.mockResolvedValue(undefined);
  global.fetch = vi.fn(async (url) => ({
    ok: true,
    status: 200,
    blob: async () => new Blob([`fake bytes for ${url}`])
  }));
  global.URL.createObjectURL = vi.fn(() => BLOB_URL);
  global.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete global.fetch;
});

describe('resolveUrlsTauri (via primeEngineUrls) -- the 26 Sep worker-start bug', () => {
  it('hands back blob: URLs, not the raw asset:// URL a Worker refuses to start from', async () => {
    const urls = await primeEngineUrls(1);
    expect(urls.script).toBe(BLOB_URL);
    expect(urls.wasm).toBe(BLOB_URL);
    expect(urls.script.startsWith('asset://')).toBe(false);
  });

  it('fetches each matching file through the asset protocol before blobbing it', async () => {
    await primeEngineUrls(2);
    expect(tauriMocks.assetUrlFor).toHaveBeenCalledWith('/AppData/engines/2/stockfish-19-lite.js');
    expect(tauriMocks.assetUrlFor).toHaveBeenCalledWith('/AppData/engines/2/stockfish-19-lite.wasm');
    expect(global.fetch).toHaveBeenCalledWith(
      `asset://localhost/${encodeURIComponent('/AppData/engines/2/stockfish-19-lite.js')}`
    );
    // README.md isn't a script or wasm file -- never fetched for a URL.
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('README.md'));
  });

  it('caches the resolved urls for getEngineUrls', async () => {
    expect(getEngineUrls(3)).toBeNull();
    await primeEngineUrls(3);
    expect(getEngineUrls(3)).toEqual({ script: BLOB_URL, wasm: BLOB_URL });
  });

  it('a failed fetch throws rather than silently caching a bad url', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 404 }));
    await expect(primeEngineUrls(4)).rejects.toThrow(/404/);
    expect(getEngineUrls(4)).toBeNull();
  });

  it('removing the engine revokes the blob urls -- the same cleanup path OPFS already uses', async () => {
    await primeEngineUrls(5);
    await deleteEngineFiles(5);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(BLOB_URL);
    expect(getEngineUrls(5)).toBeNull();
  });
});
