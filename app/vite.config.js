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

export default {
  plugins: [sveltekit()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true }
};
