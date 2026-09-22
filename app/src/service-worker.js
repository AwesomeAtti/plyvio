/// <reference lib="webworker" />
import { build, files, prerendered, version } from '$service-worker';
import { scopeBase } from '$lib/swScope.js';

// Everything needed to render is bundled with the app — no runtime network dependency. (§1.1)
const CACHE = `plyvio-${version}`;

/**
 * The path this worker was served from, minus its own filename — '' at a
 * domain root, '/plyvio-pwa' under a GitHub Pages project subpath.
 *
 * Read at runtime, never written down: see $lib/swScope.js for why, and
 * swScope.test.js for the cases it has to survive.
 */
const BASE = scopeBase(location.pathname);
/*
 * The storage worker's files: its script, the SQLite engine chunk and
 * `sqlite3.wasm`, all under `_app/immutable/workers/`. SvelteKit's `build`
 * list leaves that folder out, and the runtime cache below can't make up for
 * it on a first visit: the page starts the storage worker before this service
 * worker takes control, and a worker keeps the controller it started with, so
 * its requests never pass through here. Without these, the app shell comes
 * back offline after one visit but its database doesn't (measured 22 Sep).
 *
 * `scripts/assemble-site.mjs` fills this in after `vite build`, by prepending
 * `self.__PLYVIO_WORKER_ASSETS__ = [...]` to the built file: paths relative to
 * the app root. Absent (e.g. `vite dev`), it's an empty list.
 */
const WORKER_ASSETS = (self.__PLYVIO_WORKER_ASSETS__ ?? []).map((p) => `${BASE}/${p}`);

// `prerendered` carries the entry page itself, so a cold offline start works
// without relying on the page having been cached opportunistically.
const ASSETS = [...build, ...files, ...prerendered, ...WORKER_ASSETS];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch {
      /*
        Offline and uncached.

        Only a NAVIGATION falls back to the app shell. Handing the shell to a
        failed image, font or JSON request would answer it with HTML — a
        broken image rather than an honest failure, and harder to diagnose
        than the error it replaced.

        The old code also tried '/index.html' first. Nothing is ever stored
        under that key: `prerendered` caches the entry page as the directory
        path, so that branch could never hit and is gone.
      */
      if (req.mode === 'navigate') {
        return (await cache.match(`${BASE}/`)) || Response.error();
      }
      return Response.error();
    }
  })());
});
