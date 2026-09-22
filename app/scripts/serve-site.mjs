/**
 * Serves `build/` the way GitHub Pages does.
 *
 * `vite preview` cannot do this job any more. It serves the SvelteKit app
 * alone, mounted at `/` — but the deployed site has the project page at `/`
 * and the app at `/app/`, so preview would show neither the layout nor the
 * URLs you are about to publish. This serves the assembled directory instead,
 * which is the actual artefact.
 *
 * Deliberately dependency-free: it exists so that checking a build needs
 * nothing but Node.
 *
 * Pages behaviours reproduced, because each one can hide a bug otherwise:
 *   - a directory serves its index.html
 *   - a directory without the trailing slash redirects to one, so that
 *     relative URLs inside the document resolve against the right base
 *   - anything missing serves the site-root 404.html, with a 404 status
 *
 *   node scripts/serve-site.mjs [port]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('../build', import.meta.url));
const PORT = Number(process.argv[2] ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8',
  // GitHub Pages sends this; without it the browser can't stream-compile
  // sqlite3.wasm and falls back, logging an error.
  '.wasm': 'application/wasm'
};

const typeOf = (f) => TYPES[path.extname(f).toLowerCase()] ?? 'application/octet-stream';

/** Resolve inside ROOT only — a served path must never escape the build. */
function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const full = path.join(ROOT, path.normalize(clean));
  return full.startsWith(ROOT) ? full : null;
}

const server = createServer(async (req, res) => {
  const url = req.url ?? '/';
  const file = resolve(url);

  if (!file) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  const info = await stat(file).catch(() => null);

  // A directory without a trailing slash: redirect, exactly as Pages does.
  // Serving it in place would resolve the page's relative URLs one level too
  // high — the failure mode this whole layout depends on getting right.
  if (info?.isDirectory() && !url.split('?')[0].endsWith('/')) {
    res.writeHead(301, { location: `${url.split('?')[0]}/` }).end();
    return;
  }

  const target = info?.isDirectory() ? path.join(file, 'index.html') : file;
  const body = await readFile(target).catch(() => null);

  if (body) {
    res.writeHead(200, { 'content-type': typeOf(target), 'cache-control': 'no-store' });
    res.end(body);
    return;
  }

  const notFound = await readFile(path.join(ROOT, '404.html')).catch(() => null);
  res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
  res.end(notFound ?? 'Not found');
});

server.listen(PORT, () => {
  console.log(`\n  Serving build/ as GitHub Pages would\n`);
  console.log(`  ➜  Site:  http://localhost:${PORT}/`);
  console.log(`  ➜  App:   http://localhost:${PORT}/app/\n`);
});
