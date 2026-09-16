/**
 * Where the app is being served from, derived at runtime.
 *
 * The build must run unchanged from a domain root, a GitHub Pages project
 * subpath (`/chessgui-pwa/`), or any other server or folder. Nothing may name
 * the deployment: `paths.relative` already makes the page's own assets
 * portable, and this is the service worker's half of the same guarantee.
 *
 * A service worker is always served from the directory it controls, so its own
 * pathname minus its filename IS the base. That is the same derivation
 * SvelteKit uses for the precache list under `paths.relative`, which is what
 * makes the key this builds match the key `prerendered` stored.
 *
 * Lives in $lib rather than inline in service-worker.js so it can be tested —
 * service-worker.js imports `$service-worker`, a virtual module that only
 * exists inside a SvelteKit build, so the file itself cannot be imported by a
 * test.
 */

/**
 * @param {string} pathname the worker's own `location.pathname`
 * @returns {string} the base path: '' at a root, '/sub' under a subpath.
 *                   Never has a trailing slash, so callers append their own.
 */
export function scopeBase(pathname) {
  return String(pathname ?? '').replace(/\/[^/]*$/, '');
}
