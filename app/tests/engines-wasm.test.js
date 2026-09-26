/**
 * The real install path — `installWasmEngine()`/`removeEngine()` in
 * `stores/settings.js` (engine Stage 2, `engine-stage2-plan.md`). The most
 * novel code the Stage 2 build added: a genuine fetch, a SHA-256 check
 * BEFORE unzipping, `fflate`'s real `unzipSync`, and a real `engines` row.
 *
 * Nothing here is the real Stockfish package — `engine-real.test.js` (a
 * committed fixture) already covers running the real binary. This file
 * instead builds its own tiny zip in-test (`fflate`'s `zipSync`) against a
 * `WASM_ENGINES` entry it controls, so the checksum can be computed locally
 * rather than depending on a network fetch or a specific pinned hash.
 *
 * `$lib/engine/storage.js` is mocked throughout: OPFS (`navigator.storage`)
 * isn't implemented under jsdom, and these tests are about the install/remove
 * LOGIC in settings.js, not OPFS/Tauri storage itself (covered by hand —
 * see `working/ACTIONS.md`).
 *
 * `configConnection()` resolves `null` under jsdom by default (no Tauri, no
 * IndexedDB-backed sqlite worker — see `data/session.js`), which exercises
 * the store-only fallback (`nextId('engine')`, a string id) for free; the
 * "a real, numeric config.db id" tests below mock `configConnection` and
 * `createEngine`/`deleteEngine` explicitly to reach that other branch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { zipSync } from 'fflate';

const TEST_ENTRY = vi.hoisted(() => ({
  id: 'test-wasm-engine',
  name: 'Test Engine',
  version: '1.0-test',
  kind: 'wasm',
  platform: 'wasm',
  protocol: 'UCI',
  assetUrl: 'https://example.invalid/test-engine.zip',
  bytes: 0,
  threadsMax: 1,
  sha256: ''
}));

const storageMocks = vi.hoisted(() => ({
  writeEngineFiles: vi.fn(async () => {}),
  primeEngineUrls: vi.fn(async () => ({ script: null, wasm: null })),
  deleteEngineFiles: vi.fn(async () => {})
}));

const sessionMocks = vi.hoisted(() => ({
  configConnection: vi.fn(async () => null)
}));

const configMocks = vi.hoisted(() => ({
  createEngine: vi.fn(async () => { throw new Error('createEngine should not be called here'); }),
  deleteEngine: vi.fn(async () => {})
}));

vi.mock('$lib/settings/engines.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, WASM_ENGINES: [TEST_ENTRY] };
});

vi.mock('$lib/engine/storage.js', () => storageMocks);

vi.mock('$lib/data/session.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, configConnection: (...args) => sessionMocks.configConnection(...args) };
});

vi.mock('$lib/data/config.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createEngine: (...args) => configMocks.createEngine(...args),
    deleteEngine: (...args) => configMocks.deleteEngine(...args)
  };
});

const { objects, installEngine, removeEngine, downloads } = await import('../src/lib/stores/settings.js');

/** A fetch Response stand-in: one chunk, read once, then done. */
function fakeResponse(bytes, { ok = true, status = 200 } = {}) {
  let sent = false;
  return {
    ok,
    status,
    headers: { get: (h) => (h === 'content-length' ? String(bytes.length) : null) },
    body: {
      getReader: () => ({
        read: async () => {
          if (sent) return { done: true, value: undefined };
          sent = true;
          return { done: false, value: bytes };
        }
      })
    }
  };
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** A real, tiny zip — `unzipSync` genuinely round-trips these two files. */
function buildTestZip() {
  const enc = new TextEncoder();
  return zipSync({
    'test-wasm-engine.js': enc.encode('// fake engine script\n'),
    'README.md': enc.encode('fake package readme\n')
  });
}

const until = async (fn, ms = 2000) => {
  const end = Date.now() + ms;
  while (!fn()) {
    if (Date.now() > end) throw new Error('timed out waiting for the install to settle');
    await new Promise((r) => setTimeout(r, 10));
  }
};

const ORIGINAL_ENGINES = Object.freeze(
  [
    { id: 'engine-1', name: 'Stockfish', version: '17.1', status: 'ready', protocol: 'UCI',
      binaryPath: '/usr/local/bin/stockfish', hashMb: 512, threads: 4, enabled: true },
    { id: 'engine-2', name: 'Torch', version: '3', status: 'ready', protocol: 'UCI',
      binaryPath: '/usr/local/bin/torch', hashMb: 256, threads: 2, enabled: false }
  ].map(Object.freeze)
);

beforeEach(() => {
  objects.update((o) => ({ ...o, engines: ORIGINAL_ENGINES.map((e) => ({ ...e })) }));
  downloads.set({});
  vi.restoreAllMocks();
  sessionMocks.configConnection.mockReset().mockResolvedValue(null);
  configMocks.createEngine.mockReset()
    .mockImplementation(async () => { throw new Error('createEngine should not be called here'); });
  configMocks.deleteEngine.mockReset().mockResolvedValue(undefined);
  storageMocks.writeEngineFiles.mockClear();
  storageMocks.primeEngineUrls.mockClear();
  storageMocks.deleteEngineFiles.mockClear();
  Object.assign(TEST_ENTRY, {
    id: 'test-wasm-engine', name: 'Test Engine', version: '1.0-test', kind: 'wasm',
    platform: 'wasm', protocol: 'UCI', assetUrl: 'https://example.invalid/test-engine.zip',
    bytes: 0, threadsMax: 1, sha256: ''
  });
});

afterEach(() => {
  delete global.fetch;
});

describe('installWasmEngine — the real download/checksum/unzip/storage path', () => {
  it('installs on a genuine checksum match: fetched, verified, unzipped, stored', async () => {
    const zip = buildTestZip();
    TEST_ENTRY.sha256 = await sha256Hex(zip);
    global.fetch = vi.fn(async () => fakeResponse(zip));

    expect(installEngine('test-wasm-engine')).toBe(true);
    await until(() => get(objects).engines.some((e) => e.name === 'Test Engine'));

    expect(global.fetch).toHaveBeenCalledWith('https://example.invalid/test-engine.zip');

    // The zip's actual two files, unzipped for real via fflate's unzipSync.
    expect(storageMocks.writeEngineFiles).toHaveBeenCalledTimes(1);
    const [writtenId, files] = storageMocks.writeEngineFiles.mock.calls[0];
    expect(files.map((f) => f.name).sort()).toEqual(['README.md', 'test-wasm-engine.js']);
    expect(new TextDecoder().decode(files.find((f) => f.name === 'README.md').bytes))
      .toBe('fake package readme\n');

    expect(storageMocks.primeEngineUrls).toHaveBeenCalledWith(writtenId);

    const row = get(objects).engines.find((e) => e.name === 'Test Engine');
    expect(row).toMatchObject({
      id: writtenId, kind: 'wasm', threadsMax: 1, status: 'ready', enabled: true
    });
    // No config.db connection under jsdom — falls back to a generated id,
    // never config.db's createEngine.
    expect(configMocks.createEngine).not.toHaveBeenCalled();
    expect(typeof writtenId).toBe('string');

    // The in-flight download clears once installed.
    await until(() => get(downloads)['test-wasm-engine'] === undefined);
  });

  it('refuses a second transfer of the same entry while one is in flight', async () => {
    const zip = buildTestZip();
    TEST_ENTRY.sha256 = await sha256Hex(zip);
    let resolveRead;
    global.fetch = vi.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (h) => (h === 'content-length' ? String(zip.length) : null) },
      body: { getReader: () => ({ read: () => new Promise((r) => { resolveRead = r; }) }) }
    }));

    expect(installEngine('test-wasm-engine')).toBe(true);
    await until(() => get(downloads)['test-wasm-engine'] !== undefined);
    expect(installEngine('test-wasm-engine')).toBe(false);

    resolveRead({ done: true, value: undefined });
  });

  it('a checksum mismatch installs nothing and clears the in-flight download', async () => {
    const zip = buildTestZip();
    TEST_ENTRY.sha256 = 'not-the-real-hash-0000000000000000000000000000000000000000000';
    global.fetch = vi.fn(async () => fakeResponse(zip));

    expect(installEngine('test-wasm-engine')).toBe(true);
    await until(() => get(downloads)['test-wasm-engine'] === undefined);

    expect(get(objects).engines.some((e) => e.name === 'Test Engine')).toBe(false);
    expect(storageMocks.writeEngineFiles).not.toHaveBeenCalled();
    expect(storageMocks.primeEngineUrls).not.toHaveBeenCalled();
  });

  it('an HTTP failure installs nothing and clears the in-flight download', async () => {
    const zip = buildTestZip();
    TEST_ENTRY.sha256 = await sha256Hex(zip);
    global.fetch = vi.fn(async () => fakeResponse(zip, { ok: false, status: 404 }));

    expect(installEngine('test-wasm-engine')).toBe(true);
    await until(() => get(downloads)['test-wasm-engine'] === undefined);

    expect(get(objects).engines.some((e) => e.name === 'Test Engine')).toBe(false);
    expect(storageMocks.writeEngineFiles).not.toHaveBeenCalled();
  });

  it('a real config.db connection installs a numeric id via createEngine', async () => {
    const zip = buildTestZip();
    TEST_ENTRY.sha256 = await sha256Hex(zip);
    global.fetch = vi.fn(async () => fakeResponse(zip));
    sessionMocks.configConnection.mockResolvedValue({ fake: 'config-connection' });
    configMocks.createEngine.mockResolvedValue(777);

    expect(installEngine('test-wasm-engine')).toBe(true);
    await until(() => get(objects).engines.some((e) => e.id === 777));

    expect(configMocks.createEngine).toHaveBeenCalledWith(
      { fake: 'config-connection' },
      expect.objectContaining({ kind: 'wasm', assetUrl: TEST_ENTRY.assetUrl, sha256: TEST_ENTRY.sha256 })
    );
    expect(storageMocks.writeEngineFiles).toHaveBeenCalledWith(777, expect.any(Array));
    expect(storageMocks.primeEngineUrls).toHaveBeenCalledWith(777);
  });
});

describe('removeEngine — real (numeric) vs mock (string) ids', () => {
  it('a real engine has its stored files and config.db row removed', async () => {
    objects.update((o) => ({
      ...o,
      engines: [...o.engines, { id: 900, name: 'Installed WASM', kind: 'wasm', enabled: true }]
    }));
    sessionMocks.configConnection.mockResolvedValue({ fake: 'config-connection' });

    removeEngine(900);
    expect(get(objects).engines.some((e) => e.id === 900)).toBe(false);

    await until(() => configMocks.deleteEngine.mock.calls.length > 0);
    expect(storageMocks.deleteEngineFiles).toHaveBeenCalledWith(900);
    expect(configMocks.deleteEngine).toHaveBeenCalledWith({ fake: 'config-connection' }, 900);
  });

  it('a mock (string-id) row is removed store-only, no storage or config.db call', () => {
    removeEngine('engine-1');
    expect(get(objects).engines.some((e) => e.id === 'engine-1')).toBe(false);
    expect(storageMocks.deleteEngineFiles).not.toHaveBeenCalled();
    expect(configMocks.deleteEngine).not.toHaveBeenCalled();
  });
});
