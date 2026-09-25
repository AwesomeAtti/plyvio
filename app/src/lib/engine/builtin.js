/**
 * The engine that ships inside the app — Stockfish 19 lite, single-threaded,
 * WebAssembly (`static/engines/stockfish-19-lite/`, copied unmodified from
 * npm `stockfish@19.0.0`; see the README.md beside it).
 *
 * INTERIM, Stage 1 of `engine-stage1-plan.md`, to be cleaned up in Stage 2:
 * the row lives in this constant rather than in storage; its Threads and
 * Hash are fixed here, not user-set (Q4); its enabled state is kept in
 * memory only and resets on reload (Q6); and the file location may move if
 * Stage 2 stores engines elsewhere.
 *
 * The same row on both platforms. The PWA seeds it into `objects.engines`;
 * desktop adds it after `loadEngines()` replaces the list with `config.db`'s
 * rows, because it is not one of them (`stores/settings.js`).
 */
import { assets } from '$app/paths';

export const BUILTIN_ENGINE_ID = 'builtin-stockfish-wasm';

export const BUILTIN_ENGINE = Object.freeze({
  id: BUILTIN_ENGINE_ID,
  name: 'Stockfish',
  version: '19 lite',
  status: 'ready',
  protocol: 'UCI',
  threads: 1,
  hashMb: 32,
  enabled: true,
  builtin: true
});

export const isBuiltinEngine = (id) => id === BUILTIN_ENGINE_ID;

const DIR = 'engines/stockfish-19-lite';

/**
 * The worker script and its `.wasm`, as absolute URLs. Same path on both
 * platforms: the files are in `static/`, which the PWA's service worker
 * precaches and the desktop app serves from the same build folder.
 */
export function builtinEngineUrls() {
  const base = `${assets}/${DIR}/stockfish-19-lite-single`;
  const href = (p) => new URL(p, globalThis.location?.href).href;
  return { script: href(`${base}.js`), wasm: href(`${base}.wasm`) };
}
