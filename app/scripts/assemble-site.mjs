/**
 * Assembles the published site, after `vite build`.
 *
 *   ../site/     ─┐
 *                 ├─→  build/          the project page, at the entry URL
 *   build/app/   ─┘     build/app/     the application (written by the adapter)
 *
 * WHY A STEP AT ALL. `static/` is copied into the *app's* output, which is now
 * a subdirectory, so it can no longer carry anything that has to sit at the
 * site root — `.nojekyll` above all, which GitHub Pages only honours there.
 * `site/` is that root, and this copies it into place.
 *
 * `site/` lives at the project root (a sibling of `app/`), not inside `app/`
 * — moved there in the plyvio restructuring, hence the `..` below.
 *
 * It also CLEARS the root of everything except `app/`. Without that, a build
 * made before the app moved leaves `index.html`, `_app/` and the rest of the
 * old layout lying beside the new one, and a stale `index.html` at the entry
 * URL is exactly the file that would still be served.
 *
 *   node scripts/assemble-site.mjs
 */
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const SITE = path.join(root, '..', 'site');
const BUILD = path.join(root, 'build');
const APP = path.join(BUILD, 'app');

/** Everything the adapter owns. Left alone; the rest of the root is rebuilt. */
const KEEP = new Set(['app']);

async function main() {
  const app = await stat(APP).catch(() => null);
  if (!app?.isDirectory()) {
    throw new Error(
      `Expected the app at ${path.relative(root, APP)}. Run \`vite build\` first.`
    );
  }

  await mkdir(BUILD, { recursive: true });

  for (const entry of await readdir(BUILD)) {
    if (KEEP.has(entry)) continue;
    await rm(path.join(BUILD, entry), { recursive: true, force: true });
  }

  // `recursive` copies dotfiles too — which is the whole point, since
  // `.nojekyll` is one and dropping it is what breaks a Pages deploy.
  await cp(SITE, BUILD, { recursive: true });

  /*
    GitHub Pages serves the SITE-ROOT 404.html for anything it cannot find,
    and only that one — the adapter's `build/app/404.html` is never reached.
    The project page is the right thing to land on, so it is also the 404.

    Note for later: this means the app's SPA fallback is inert on Pages. It
    does not matter while the app has a single route and no URL-driven
    navigation. Give it real routes and deep links will need a root 404.html
    that boots the app instead.
  */
  await cp(path.join(SITE, 'index.html'), path.join(BUILD, '404.html'));

  const written = (await readdir(BUILD)).sort();
  console.log(`  Assembled site root from site/ → build/`);
  console.log(`  ${written.join('  ')}`);
}

main().catch((err) => {
  console.error(`\n  assemble-site failed: ${err.message}\n`);
  process.exitCode = 1;
});
