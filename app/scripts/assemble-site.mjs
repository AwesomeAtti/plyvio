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
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const SITE = path.join(root, '..', 'site');
const BUILD = path.join(root, 'build');
const APP = path.join(BUILD, 'app');

/** Everything the adapter owns. Left alone; the rest of the root is rebuilt. */
const KEEP = new Set(['app']);

const WORKERS = path.join(APP, '_app', 'immutable', 'workers');
const SERVICE_WORKER = path.join(APP, 'service-worker.js');
const WORKER_ASSETS_GLOBAL = 'self.__PLYVIO_WORKER_ASSETS__';

/*
  The storage worker's files go into the service worker's install-time cache.

  SvelteKit's `$service-worker` `build` list omits `_app/immutable/workers/`,
  where Vite puts the storage worker, its SQLite engine chunk and
  `sqlite3.wasm`. They can't be left to the runtime cache: on a first visit the
  storage worker starts before the service worker controls the page, so its
  requests bypass it, and the app comes back offline without its database
  (measured 22 Sep; `e2e/storage.spec.js` check 5 holds it).

  So this lists them and PREPENDS a global to the built service worker, which
  `src/service-worker.js` reads (`WORKER_ASSETS`). Prepended rather than
  patched in: minification can rewrite anything inside the file, but it can't
  touch a line added after it. Refuses to finish if there is nothing to list,
  since a build without these files can't store anything in the browser.
*/
/*
  Nothing from the builder's machine gets published.

  Vite copies every `import.meta.env.VITE_*` value into the built JavaScript,
  so a path kept out of the source (in a gitignored `.env`) can still land in
  the build. It did: the v0.1.1 deploy carried a developer's home directory
  (found 22 Sep 2026). This checks every text file in the assembled site for
  the home directory of whoever is building it, and fails the build if any
  file contains it. The same build is what the desktop app packages, so this
  covers both.
*/
async function refuseHomePaths() {
  const home = homedir();
  if (!home || home === '/') return;
  const hits = [];
  for (const entry of await readdir(BUILD, { recursive: true })) {
    if (!/\.(js|mjs|html|css|json|webmanifest|txt|xml|svg|map)$/i.test(entry)) continue;
    const file = path.join(BUILD, entry);
    if (!(await stat(file)).isFile()) continue;
    if ((await readFile(file, 'utf8')).includes(home)) hits.push(entry);
  }
  if (hits.length) {
    throw new Error(
      `The build contains this machine's home directory in:\n    ${hits.join('\n    ')}\n` +
      `  Nothing from the builder's machine may be published. Look for an import.meta.env value.`
    );
  }
}

async function precacheWorkerAssets() {
  const entries = await readdir(WORKERS, { recursive: true }).catch(() => []);
  const assets = [];
  for (const entry of entries) {
    if ((await stat(path.join(WORKERS, entry))).isFile()) {
      assets.push(['_app', 'immutable', 'workers', ...entry.split(path.sep)].join('/'));
    }
  }
  if (!assets.length) {
    throw new Error(`No storage worker files under ${path.relative(root, WORKERS)}.`);
  }
  const code = await readFile(SERVICE_WORKER, 'utf8');
  if (!code.startsWith(WORKER_ASSETS_GLOBAL)) {
    await writeFile(SERVICE_WORKER, `${WORKER_ASSETS_GLOBAL} = ${JSON.stringify(assets.sort())};\n${code}`);
  }
  return assets.length;
}

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

  /*
    macOS metadata does not get published.

    The recursive copy above is deliberate — `.nojekyll` is a dotfile and
    dropping it breaks the deploy — but it takes `.DS_Store` with it, and the
    deploy repo `build/` becomes is created by `git init` with no `.gitignore`
    at all, so `git add -A` published one on every deploy. A `.DS_Store`
    describes the folder it sits in, so that put Finder's record of `site/`
    on a public branch for no reason.

    Swept rather than filtered out of the copy, and over the WHOLE tree: the
    adapter writes `build/app/` and Finder can leave one there too, so
    filtering only the `site/` copy would miss half the problem. Missing
    files are not an error here — the usual case is that there are none.
  */
  for (const entry of await readdir(BUILD, { recursive: true })) {
    if (path.basename(entry) === '.DS_Store') {
      await rm(path.join(BUILD, entry), { force: true });
    }
  }

  await refuseHomePaths();

  const precached = await precacheWorkerAssets();
  console.log(`  Precaching ${precached} storage worker files in the service worker`);

  const written = (await readdir(BUILD)).sort();
  console.log(`  Assembled site root from site/ → build/`);
  console.log(`  ${written.join('  ')}`);
}

main().catch((err) => {
  console.error(`\n  assemble-site failed: ${err.message}\n`);
  process.exitCode = 1;
});
