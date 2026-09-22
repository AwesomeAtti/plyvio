# Build and release

## Hosting on GitHub Pages

Published by hand to a `gh-pages` branch. There is no CI workflow — building
and testing happen locally, and only the built output is pushed.

```bash
cd app
rm -rf build .svelte-kit            # see "a clean build", below
npm test
npm run build                       # NO BASE_PATH — see below
npm run preview                     # site at :4173/, app at :4173/app/

cd build
git init && git checkout -B gh-pages
git config user.name  "<pseudonymous name>"
git config user.email "<n>+<user>@users.noreply.github.com"
git add -A && git commit -m "Deploy v<version>"
git push -f https://github.com/<user>/<repo>.git gh-pages
```

Then **Settings → Pages → Source: Deploy from a branch → `gh-pages` / `(root)`**.
With `site/CNAME` present the site lands at that domain; without one, at
`https://<user>.github.io/<repo>/`.

**No `BASE_PATH`, for this project.** `site/CNAME` names a custom domain, so
the site is served from a domain root and the variable must stay unset. It
exists for a project site served from `/<repo>/`, which this is not. Setting it
here prefixes every absolute URL with a path that does not exist.

**The identity lines are not optional.** `assemble-site.mjs` clears everything
in `build/` except `app/` — `.git` included — so the deploy repository is
created fresh by `git init` on every deploy and inherits nothing. Where the
project's git identity is set per-repository rather than globally (which is
what keeps a personal name out of it), a fresh repository has no identity at
all and `git commit` fails with *"Author identity unknown"*. Use the same
pseudonymous identity `main` uses.

**A clean build, and a look at the listing before committing.** `git add -A`
publishes whatever is in `build/` at that moment, unfiltered — the deploy
repository has no `.gitignore`. Two things have reached the live site that way:
`.DS_Store`, now swept by `assemble-site.mjs` itself, and — on a machine
running a sync or backup agent over the project folder — 51 macOS
keep-both duplicates (`404 2.html`, `sqlite3.Con_VOcu 2.wasm`, one per asset),
which roughly doubled the published payload. Neither breaks the site; both are
invisible unless looked for. Build from a cleared `build/` and `.svelte-kit/`,
then check the listing for names ending in `" 2"` before committing.

**`app/build/` is the entire publishable set.** No source, no `node_modules`,
no spec or wireframes. It is self-contained and gitignored on `main`, so it
never appears in the source history. It holds two separable things, and the
distinction matters when judging weight: the **landing page** at the root
(`site/`, plus screenshots) and the **application** under `app/`, which is what
a user installs. Only the second is the PWA.

**Weight** (measured 21 Sep 2026, v0.1.1; re-measure rather than trust this):
the installed application is about **2.2 MB on disk across 42 files, ~960 KB
over the wire**, all of it precached by the service worker on first visit. A
single file, `sqlite3.*.wasm`, is 852 KB of that (407 KB compressed) — roughly
**42% of the download** — and is the SQLite engine behind the PWA's databases.
Since 22 Sep 2026 it loads only in the storage worker (ADR 0005), from
`_app/immutable/workers/`, which SvelteKit doesn't precache on its own:
`scripts/assemble-site.mjs` adds those files to the service worker's install
list (see [Offline behaviour](offline.md)). The landing page's screenshots account for the remainder of the
full tree, and are fetched only by someone visiting the site rather than
installing the app.

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

**What a manual deploy leaves to you.** Nothing gates the deploy on `npm test`,
so run it first. Nothing checks the listing either — see above. And if a
`BASE_PATH` is ever needed again (a move off the custom domain), `npm run
preview` is what catches it being wrong before the push rather than after.

**One caveat worth knowing.** The service worker caches aggressively by design
(§1.1 wants offline-first). After a deploy, an already-installed copy keeps
serving the old `plyvio-<version>` cache until the new worker activates, so a
hard reload — or closing every tab of the app — is what shows a fresh build.

## Desktop release

Built by CI, not by hand: `.github/workflows/release.yml` runs on any pushed
tag matching `v*` (and on `workflow_dispatch`), building through
`tauri-apps/tauri-action` for macOS (universal), Ubuntu 22.04 and Windows. The
version in the release name comes from `app/src-tauri/tauri.conf.json`, so that
and `package.json` are what a version bump changes — the tag follows them.

**The result is a draft.** The workflow sets `releaseDraft: true` and
`prerelease: true`, so a finished run leaves a draft pre-release that nobody
can see until it is published by hand in the GitHub web UI. A run that
"succeeded" with nothing visible on the releases page is this, not a failure.

**Re-releasing an existing version.** Deleting a release does not delete its
tag, and the workflow fires on the tag, so both have to move:

1. Delete the release in the GitHub web UI. (There is no `gh` CLI on the
   project machine, so this step has no command.)
2. Move the tag and push it:

```bash
git push origin :refs/tags/v<version>     # delete the remote tag
git tag -f v<version>                     # re-point it at the new head
git push origin v<version>                # fires the workflow
```

3. Publish the resulting draft.

**What reusing a version costs.** Anyone already holding a build of that
version has different software from anyone who downloads it afterwards, under
the same version string, with nothing to tell them apart. Acceptable for a
Technology Preview and a deliberate choice each time — not a default.

**macOS builds are unsigned.** The release body says so: first launch needs
right-click → Open to get past Gatekeeper.

**Cargo does not run in every environment.** The Rust half of a change can be
written and reviewed without ever being compiled — `npm run tauri dev` on the
project machine is what proves it builds. A Tauri command added but never
compiled is untested, however clean it reads.
