# Offline behaviour (§1.1)

Everything needed to render ships with the app: fonts are system stacks, icons
are inline SVG, locale strings are bundled JS. The service worker precaches the
whole build on install and serves cache-first, falling back to the app shell so
the SPA boots with no network at all. No runtime request reaches a third party.

**The storage worker's files are precached too, but not by SvelteKit.** The
PWA's database runs in a Web Worker (ADR 0005), and Vite puts that worker, its
SQLite engine chunk and `sqlite3.wasm` under `_app/immutable/workers/`, a
folder SvelteKit's `$service-worker` `build` list leaves out. The runtime cache
can't cover them either: on a first visit the page starts the storage worker
before the service worker takes control, and a worker keeps the controller it
started with, so its requests never reach the service worker. Left like that,
the app shell came back offline after one visit but its database didn't
(measured 22 Sep 2026). `scripts/assemble-site.mjs` fixes it after every build
by prepending the list of worker files to the built `service-worker.js` as
`self.__PLYVIO_WORKER_ASSETS__`, and `src/service-worker.js` adds them to its
install list. The build fails if there are none to list. Playwright check 5
(`e2e/storage.spec.js`) stops a real server after one visit to hold this.
