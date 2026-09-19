import adapter from '@sveltejs/adapter-static';

/**
 * GitHub Pages serves a project site from a subpath — https://user.github.io/<repo>/
 * — so every absolute URL the build emits has to be prefixed. `BASE_PATH` does
 * that; it is empty for local dev and preview, where the app is at the root.
 *
 *   BASE_PATH=/plyvio npm run build
 *
 * The deploy workflow sets it from the repository name, so it cannot drift.
 */
const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
export default {
  kit: {
    adapter: adapter({
      /*
        The app is published UNDER the site root, not at it:

          build/            ← the project page (see `../site/`, assembled after —
                                it lives at the project root, a sibling of `app/`)
          build/app/        ← this, the application

        so that the landing page owns the entry URL and the app has its own.
        Nothing inside the app needs to know: `paths.relative` already makes
        every emitted URL relative to the document, so the whole tree moves as
        one — including the font URLs in the bundled CSS and the service
        worker's scope, which it derives from its own location.
      */
      pages: 'build/app',
      assets: 'build/app',
      // 404.html, not index.html: GitHub Pages serves 404.html for any path it
      // does not have a file for, which is what turns it into an SPA fallback.
      // index.html is still written, by prerendering the one route.
      fallback: '404.html',
      precompress: false,
      strict: false
    }),
    paths: {
      base,
      // Emit relative asset URLs, so a build is not welded to the path it was
      // built for. Harmless at the root, load-bearing under a subpath.
      relative: true
    },
    serviceWorker: { register: true },
    prerender: { entries: ['*'] }
  }
};
