# Plyvio — a chess library and analysis tool

[![License: GPL v3](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://awesomeatti.github.io/plyvio/)
[![Last Commit](https://img.shields.io/github/last-commit/AwesomeAtti/plyvio)](https://github.com/AwesomeAtti/plyvio/commits)
[![Svelte](https://img.shields.io/badge/svelte-5.57.0-ff3e00)](https://svelte.dev)

Plyvio is a cross-platform chess application for browsing and analyzing your
games. It's available today as an installable Progressive Web App (PWA),
with a native desktop version currently under development.

**Try it now:** [awesomeatti.github.io/plyvio](https://awesomeatti.github.io/plyvio/)
— runs and installs straight from your browser, works offline, and needs no
signup.

This build implements the Application Shell (§1.3, §2), the Library
Workspace (§3.2), the Settings Workspace (§3.4) and the Game Workspace (§5).

Built on **Svelte 5** with runes. Every dependency is pinned to an exact
version rather than a caret range, so a fresh `npm install` reproduces the tree
these tests were run against:

| | |
|---|---|
| svelte | 5.57.0 |
| @sveltejs/kit | 2.70.3 |
| @sveltejs/vite-plugin-svelte | 7.3.0 |
| @sveltejs/adapter-static | 3.0.10 |
| vite | 8.2.2 |
| vitest | 5.0.0 |
| jsdom | 30.0.1 |
| @testing-library/svelte | 5.4.2 |

See `docs/architecture/` for how the app is built, `docs/spec/` for what it
implements, and `docs/decisions/` for why the project is laid out as it is.

## Run it from source

For most people, the browser install above is all you need. This is for
building and running the app from source — for development, or to try
changes before they're deployed.

**Easiest way to run Plyvio:** install it straight from your browser — no
build required. Works in Chrome, Edge, or Safari, on macOS, Windows, or
Linux.

**Launch it:** [awesomeatti.github.io/plyvio](https://awesomeatti.github.io/plyvio/)

From `app/`:

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # vite build, then scripts/assemble-site.mjs assembles
                    # build/ to match the deployed layout: the project page
                    # (from ../site/) at the root, the app nested under build/app/
npm run preview     # serves build/ via scripts/serve-site.mjs, reproducing
                    # GitHub Pages' behaviour (directory index files, trailing-
                    # slash redirects, site-root 404.html) — http://localhost:4173
npm test            # vitest, 16 files
```

`build/` is gitignored: it is a build artifact, not a source, and is
regenerated in seconds.
