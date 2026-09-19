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
// `prerendered` carries the entry page itself, so a cold offline start works
// without relying on the page having been cached opportunistically.
const ASSETS = [...build, ...files, ...prerendered];

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
