import { readFileSync } from 'node:fs';
import { sveltekit } from '@sveltejs/kit/vite';

/*
 * The DISPLAYED version comes from package.json, so there is one source of
 * truth for it (§3.4.11 shows it as "Technology Preview (v{version})").
 *
 * It is deliberately NOT SvelteKit's `kit.version.name`. That value reaches the
 * service worker as `version` from '$service-worker', where it names the cache:
 * `plyvio-${version}`. It defaults to a build timestamp, so every deploy gets
 * a fresh cache. Pinning it to the package version would make two deploys of
 * 0.1.0 share a cache name and serve users stale assets offline.
 */
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

/*
 * `@sqlite.org/sqlite-wasm` ships one module (`dist/index.mjs`) containing both
 * the plain in-memory/deserialize API `backends/pwa.js` actually uses and two
 * unrelated worker-based APIs neither `pwa.js` nor `memory.js` ever calls: the
 * OPFS VFS installer and the Worker1 promiser. Each references its own worker
 * file as `new URL("<file>", import.meta.url)`, which is exactly the pattern
 * Vite's static analysis bundles as a separate worker chunk — it can't know
 * `installOpfsVfs()`'s own runtime guard (`if (!sqlite3.opfs) return;`, true on
 * a main thread, which is all this app ever runs on) means that Worker is never
 * actually constructed. Confirmed by running the package's own source: the
 * `sqlite3ApiBootstrap` initializer only sets up `sqlite3.opfs` inside a
 * dedicated Worker context.
 *
 * Left alone, this ships ~245KB gzipped of dead code — and, worse, its mere
 * presence in the build reads as OPFS already being half-wired-in, which could
 * bias the still-open, separate long-term OPFS-vs-IndexedDB-VFS decision
 * without anyone having actually chosen it. This plugin breaks Vite's literal-
 * string detection for those two `new URL(...)` calls (wrapping the same
 * string in an array-join, so it evaluates identically if that dead code path
 * were ever somehow reached) so neither worker chunk is bundled. Nothing else
 * about the module's behavior changes — every code path this app actually
 * exercises (`sqlite3InitModule()`, `oo1.DB`, `sqlite3_deserialize`,
 * `sqlite3_js_db_export`) is untouched.
 */
const dropUnusedSqliteWasmWorkers = () => ({
  name: 'drop-unused-sqlite-wasm-workers',
  transform(code, id) {
    if (!id.includes('@sqlite.org/sqlite-wasm') || !id.endsWith('index.mjs')) return null;
    const patched = code
      .replace(
        'new URL("sqlite3-opfs-async-proxy.js", import.meta.url)',
        'new URL(["sqlite3-opfs-async-proxy.js"].join(""), import.meta.url)'
      )
      .replace(
        'new URL("sqlite3-worker1.mjs", import.meta.url)',
        'new URL(["sqlite3-worker1.mjs"].join(""), import.meta.url)'
      );
    return patched === code ? null : { code: patched, map: null };
  }
});

export default {
  plugins: [dropUnusedSqliteWasmWorkers(), sveltekit()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true }
};
