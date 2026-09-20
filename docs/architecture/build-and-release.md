# Build and release

## Hosting on GitHub Pages

Published by hand to a `gh-pages` branch. There is no CI workflow — building
and testing happen locally, and only the built output is pushed.

```bash
cd app
npm test
BASE_PATH=/<repo> npm run build     # omit BASE_PATH to build for a domain root
npm run preview                     # serves at http://localhost:4173/<repo>/

cd build
git init && git checkout -b gh-pages
git add -A && git commit -m "Deploy"
git push -f https://github.com/<user>/<repo>.git gh-pages
```

Then **Settings → Pages → Source: Deploy from a branch → `gh-pages` / `(root)`**.
The site lands at `https://<user>.github.io/<repo>/`.

**`app/build/` is the entire publishable set** — 29 files, about 530KB. No
source, no `node_modules`, no spec or wireframes. It is self-contained and
gitignored on `main`, so it never appears in the source history.

Four things have to be true for a SvelteKit PWA to work on Pages, and each is
handled rather than assumed:

| | Why it breaks | What handles it |
| --- | --- | --- |
| **Base path** | A project site is served from `/<repo>/`, so every absolute URL 404s | `BASE_PATH`, read by `svelte.config.js` |
| **`.nojekyll`** | Jekyll ignores directories starting with `_`, so `_app/` vanishes and the page renders blank **with no error** | `static/.nojekyll`, which lands at the root of `build/` |
| **SPA fallback** | Pages serves `404.html` for unknown paths | `fallback: '404.html'` in the adapter |
| **Manifest paths** | `static/` files aren't templated, so `%sveltekit.assets%` can't be used | `start_url` and `scope` are `"."`, which resolve against the manifest's own URL and so work at any depth |

SvelteKit does the clever half of this itself: `index.html` gets **relative**
asset URLs, so the build isn't welded to the path it was built for, while
`404.html` gets **absolute** ones, because a fallback served at
`/repo/some/deep/path` cannot resolve relative URLs. Both are verified.

**Verified in the container** by serving the build under a `/plyvio/` prefix
and requesting every asset the entry page names: 19 of 19 return 200, and the
manifest, service worker, icons and fonts resolve. What that does *not* prove is
that the page renders — the app is client-rendered and no browser binary was
installable here.

**Two things a manual deploy leaves to you.** `BASE_PATH` has to be right, or
every asset 404s under the subpath — `npm run preview` catches this before you
push. And nothing gates the deploy on `npm test`, so run it first.

**One caveat worth knowing.** The service worker caches aggressively by design
(§1.1 wants offline-first). After a deploy, an already-installed copy keeps
serving the old `plyvio-<version>` cache until the new worker activates, so a
hard reload — or closing every tab of the app — is what shows a fresh build.

## Desktop target

Not yet documented — the Tauri packaging work comes after the tree is settled
and verified.
