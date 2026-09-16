import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

/*
  The published site has two levels:

    /        the project page   (../site/, a sibling of app/ at the project root)
    /app/    the application    (build/app, written by the adapter)

  Everything here guards the seam between them. It is all source-level, so it
  runs without a build.
*/

const read = (p) => readFileSync(p, 'utf8');
const page = () => read('../site/index.html');

describe('the project page', () => {
  it('exists at the site root, not inside the app', () => {
    expect(existsSync('../site/index.html')).toBe(true);
  });

  /*
    `.nojekyll` has to sit at the SITE root. In static/ it would be copied
    into build/app/ and Pages would go on ignoring _app/ — the exact failure
    that served a blank page.
  */
  it('keeps .nojekyll at the site root, where Pages honours it', () => {
    expect(existsSync('../site/.nojekyll')).toBe(true);
    expect(existsSync('static/.nojekyll')).toBe(false);
  });

  it('opens with a call to action pointing at the app', () => {
    const m = page().match(/class="cta"\s+href="([^"]+)"/);
    expect(m?.[1]).toBe('./app/');
  });

  it('puts that call to action above everything it describes', () => {
    const src = page();
    expect(src.indexOf('class="cta"')).toBeLessThan(src.indexOf('What it is made of'));
    expect(src.indexOf('class="cta"')).toBeLessThan(src.indexOf('class="install"'));
  });

  /*
    Three cards, one per desktop browser. The application window's 800 x 600
    floor rules out a phone, so there is no mobile card to write.
  */
  it('tells the reader how to install on each desktop browser', () => {
    const src = page();
    expect([...src.matchAll(/class="os"/g)]).toHaveLength(3);
    for (const browser of ['Chrome', 'Safari', 'Edge']) {
      expect(src).toContain(`<div class="n">${browser}</div>`);
    }
  });

  /*
    §1.1 — nothing is fetched at runtime. The page borrows the app's bundled
    faces rather than reaching for a font CDN, so it stays as offline-capable
    as the thing it is advertising.
  */
  it('requests nothing from the network', () => {
    const src = page();
    expect(src).not.toMatch(/https?:\/\//);
    expect(src).not.toMatch(/fonts\.googleapis|cdn\./);
  });

  /*
    Every URL it names is relative. The page has to work at a domain root, at
    /chessgui-pwa/, and from the build/ folder on disk.
  */
  it('names no absolute path', () => {
    for (const m of page().matchAll(/(?:href|src)="([^"]+)"/g)) {
      expect(m[1].startsWith('/')).toBe(false);
    }
  });

  it('reaches the app’s own assets, so nothing is duplicated', () => {
    expect(page()).toMatch(/\.\/app\/fonts\/ibm-plex-sans-latin-400-normal\.woff2/);
    expect(page()).toMatch(/\.\/app\/icon-192\.png/);
  });
});

describe('the project page’s theme tokens', () => {
  /*
    The page cannot import the app's stylesheet — it lives outside the bundle
    and outside the service worker's scope — so the tokens are duplicated.
    Duplication that nothing checks is duplication that drifts.
  */
  const tokensFrom = (css, selector) => {
    const block = css.slice(css.indexOf(selector) + selector.length);
    const body = block.slice(0, block.indexOf('}'));
    const out = {};
    for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
    return out;
  };

  const appCss = () => read('src/lib/styles/app.css');

  it('matches the app in light', () => {
    const app = tokensFrom(appCss(), ':root {');
    const site = tokensFrom(page(), ':root {');
    for (const [k, v] of Object.entries(site)) {
      if (app[k]) expect(`${k}:${v}`).toBe(`${k}:${app[k]}`);
    }
  });

  it('matches the app in dark', () => {
    const app = tokensFrom(appCss(), ':root[data-theme="dark"] {');
    const site = tokensFrom(page(), ':root[data-theme="dark"] {');
    for (const [k, v] of Object.entries(site)) {
      if (app[k]) expect(`${k}:${v}`).toBe(`${k}:${app[k]}`);
    }
  });

  it('reads the same stored theme key the app writes', () => {
    expect(page()).toContain("localStorage.getItem('chessgui.theme')");
  });
});

describe('the build is configured for the two-level layout', () => {
  it('sends the adapter’s output to build/app', () => {
    const cfg = read('svelte.config.js');
    expect(cfg).toMatch(/pages:\s*'build\/app'/);
    expect(cfg).toMatch(/assets:\s*'build\/app'/);
  });

  it('assembles the site root after building', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts.build).toMatch(/vite build.*assemble-site\.mjs/);
  });

  /*
    `vite preview` serves the app alone at '/', which is neither the layout
    nor the URLs that get published. Previewing has to serve build/.
  */
  it('previews the assembled site, not the app on its own', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts.preview).toMatch(/serve-site\.mjs/);
    expect(pkg.scripts.preview).not.toMatch(/vite preview/);
  });

  it('keeps the app’s own paths relative, so the whole tree can move', () => {
    expect(read('svelte.config.js')).toMatch(/relative:\s*true/);
  });
});
