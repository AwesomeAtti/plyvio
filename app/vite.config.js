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
 * `@sqlite.org/sqlite-wasm` ships one module (`dist/index.mjs`) that also
 * contains two worker-based APIs this app never uses, each referencing its own
 * worker file as `new URL("<file>", import.meta.url)` — the pattern Vite
 * bundles as a separate worker chunk:
 *
 *  - `sqlite3-opfs-async-proxy.js`, the async half of the plain `opfs` VFS.
 *    That VFS needs `SharedArrayBuffer`, so COOP/COEP response headers, which
 *    GitHub Pages can't send; its installer refuses to start without them.
 *    The PWA's storage uses the `opfs-sahpool` VFS instead, which runs
 *    entirely inside Plyvio's own worker (`data/backends/sqlite-worker.js`)
 *    and never loads this file.
 *  - `sqlite3-worker1.mjs`, the package's generic Worker1/promiser API.
 *    Plyvio has its own worker and protocol (`data/backends/sqlite-host.js`).
 *
 * Checked against the package source (3.53.4-build1): `installOpfsSAHPoolVfs()`
 * references neither file. Left alone they add ~245KB gzipped of dead code.
 * This plugin breaks Vite's literal-string detection for those two
 * `new URL(...)` calls (the same string, wrapped in an array-join, so it
 * evaluates identically if that code path were ever reached) so neither
 * chunk is bundled. Nothing else about the module changes.
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
  // The storage worker imports the ES-module sqlite-wasm package; an 'iife'
  // worker (Vite's default) can't split it. Worker chunks are built with
  // their own plugin list, and the package is imported in the worker now, so
  // the plugin above has to be listed here too or the dead chunks come back.
  worker: { format: 'es', plugins: () => [dropUnusedSqliteWasmWorkers()] },
  // Per sqlite-wasm's README for Vite: pre-bundling rewrites the module and
  // breaks its `new URL('sqlite3.wasm', import.meta.url)`. Deliberately NOT
  // the README's COOP/COEP `server.headers`: dev must behave like GitHub
  // Pages, which can't send them.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true }
};
