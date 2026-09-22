# 0005 — PWA storage: SQLite on OPFS (`opfs-sahpool`), in a dedicated worker

## Status

Accepted — 2026-09-22, by AwesomeAtti. Built and verified the same day.

## Context

The PWA stored each database as one serialised blob in IndexedDB. On open,
the whole blob was deserialised into an in-memory SQLite database
(`sqlite3_deserialize`). After a write, the whole database was exported
(`sqlite3_js_db_export`) and written back as a new blob, debounced by two
seconds and flushed on `pagehide`/`visibilitychange`. Every edit therefore
rewrote the entire database: about 5.7 MB for a Master Games-sized library, to
change a few rows. A write could also be lost if the tab died inside the
debounce window. And two in-memory copies of the same library (the Library
view's and the Explorer's connections are cached separately) each saved to the
same IndexedDB key, so the last writer won.

SQLite's pager works in fixed pages through the VFS's `xRead`/`xWrite`, the
way the desktop app's file-backed connection already does. The origin-private
file system (OPFS) gives a browser the same thing. `@sqlite.org/sqlite-wasm`,
already a dependency, ships three OPFS VFSes. Two of them (`opfs`, `opfs-wl`)
need `SharedArrayBuffer`, so COOP/COEP response headers, which GitHub Pages
can't send. The third, `opfs-sahpool`, needs no such headers. OPFS sync access
handles only exist in a Worker.

## Decision

**The PWA's databases are SQLite files in OPFS, on the `opfs-sahpool` VFS,
owned by a dedicated Web Worker.** The main thread never touches SQLite.

- `data/backends/sqlite-worker.js` is the worker entry. It takes the
  `plyvio-storage` Web Lock and installs the pool in its own directory,
  `.plyvio`. `data/backends/sqlite-host.js` holds all of the worker's logic,
  with no Worker, DOM or OPFS reference, so it runs under Vitest.
- `data/backends/pwa.js` keeps its public API (`openConfigDatabase()`,
  `openLibraryDatabase(id, { seed })`). Each `Connection` it returns is a proxy
  that sends one message per call through `data/backends/worker-client.js`. A
  `run()` that resolves has been written to the file; there is no save step.
- **Plyvio's own worker and protocol**, not the package's Worker1/promiser API,
  which doesn't install `opfs-sahpool`.
- **One database object per file, shared.** `opfs-sahpool`'s locking records a
  lock level but enforces nothing, so two handles on one file in the same
  worker could corrupt it. Every `open` of an already-open file gets a new
  handle onto the same object, which closes when its last handle does.
- **A new file is created and initialised in one message**, in one
  transaction: DDL, `user_version`, and for Sample Games the seed rows. So a
  second `open` can't see a half-built file, and a failed initialisation
  leaves no file behind. The seed rows are built on the main thread and sent
  as plain statements; the worker runs SQL and nothing else.
- **The worker files are precached.** SvelteKit's `$service-worker` `build`
  list omits `_app/immutable/workers/`. And on a first visit the storage
  worker starts before the service worker controls the page, so the runtime
  cache never sees its requests. `scripts/assemble-site.mjs` therefore
  prepends the list of worker files to the built service worker, and
  `src/service-worker.js` precaches them.
- **Persistent storage** (`navigator.storage.persist()`) is requested once per
  browser, after the user's first successful write, never at startup. Firefox
  prompts for it, and a prompt should follow something the user did.
- **No migration** of IndexedDB data: the PWA is in development, so existing
  browser data was expected to be lost and Sample Games is bootstrapped fresh.
  The IndexedDB backend (`idb-blob-store.js`, the autosave) is deleted, not
  left disabled.
- `vite.config.js`: workers build as ES modules; `@sqlite.org/sqlite-wasm` is
  excluded from dependency pre-bundling (the package's own advice for Vite);
  and `dropUnusedSqliteWasmWorkers` runs on the worker build too. That plugin
  still strips the `opfs` VFS's async proxy and the Worker1 script. Checked
  against the package source: `opfs-sahpool` uses neither. The dev server
  deliberately sends no COOP/COEP headers, so dev behaves like Pages.

## Consequences

- A write costs roughly the pages it changes, not the whole database, and is
  on disk when it resolves. Nothing is left to flush on unload.
- The main bundle no longer contains SQLite; the engine and `sqlite3.wasm`
  load only in the worker.
- **One tab or window of the app at a time can use storage.** The pool locks
  every access handle for one instance. A second tab (or the installed app
  window plus a browser tab) doesn't get the Web Lock: it logs one console
  error and its connections resolve `null`, so it shows an empty app. The first
  tab is unaffected. What to do about it is an open item.
- Browsers without OPFS or `opfs-sahpool` (e.g. Safari private windows)
  degrade to `null` connections, as missing storage always has.
- OPFS is origin-private: there is still no user-visible file. File System
  Access for Chromium, a real file in a folder the user picks, is a separate,
  later decision.
- Testing: Vitest runs the real client, host and SQLite in-process
  (`tests/helpers/pwa-in-process.js`), replacing only OPFS. Playwright
  (`app/e2e/`, a dev dependency) checks OPFS, persistence across reloads, the
  second tab, the worker bundle, and offline after one visit, against the
  production build. See `docs/architecture/testing.md`.
