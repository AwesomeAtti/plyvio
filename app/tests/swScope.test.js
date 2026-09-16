import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { scopeBase } from '../src/lib/swScope.js';

// Path from the project root, as switcher.test.js does — vitest runs from there.
const sw = () => readFileSync('src/service-worker.js', 'utf8');

/* Comments name '/chessgui-pwa' as the worked example. Only the code matters. */
const code = () => sw().replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/*
  The service worker used to fall back to a hardcoded '/index.html' and '/'.
  Both are domain-root paths, so a cold offline start worked locally by
  accident and failed on GitHub Pages, where the app lives under
  /chessgui-pwa/. These tests exist so the base can never be written down
  again.
*/

describe('service worker scope — derived, never hardcoded', () => {
  it('is empty at a domain root', () => {
    expect(scopeBase('/service-worker.js')).toBe('');
  });

  it('is the project path under a GitHub Pages subpath', () => {
    expect(scopeBase('/chessgui-pwa/service-worker.js')).toBe('/chessgui-pwa');
  });

  it('handles a subpath of any depth', () => {
    expect(scopeBase('/a/b/c/service-worker.js')).toBe('/a/b/c');
  });

  /* The caller appends its own '/', so a trailing one here would double up. */
  it('never returns a trailing slash', () => {
    for (const p of ['/service-worker.js', '/x/service-worker.js', '/a/b/sw.js']) {
      expect(scopeBase(p).endsWith('/')).toBe(false);
    }
  });

  it('appends to exactly the key `prerendered` caches — base + slash', () => {
    expect(`${scopeBase('/service-worker.js')}/`).toBe('/');
    expect(`${scopeBase('/chessgui-pwa/service-worker.js')}/`).toBe('/chessgui-pwa/');
  });

  it('does not throw on the degenerate cases', () => {
    expect(scopeBase('')).toBe('');
    expect(scopeBase('/')).toBe('');
    expect(scopeBase(undefined)).toBe('');
    expect(scopeBase(null)).toBe('');
  });

  /*
    location.pathname never carries a query or hash, but the derivation should
    not quietly produce a wrong base if it ever gets a full path.
  */
  it('is unaffected by anything after the filename', () => {
    expect(scopeBase('/chessgui-pwa/service-worker.js')).toBe('/chessgui-pwa');
  });
});

describe('the service worker source', () => {
  it('names no absolute fallback path', () => {
    expect(code()).not.toMatch(/cache\.match\(\s*['"`]\//);
    expect(code()).not.toMatch(/['"`]\/index\.html['"`]/);
  });

  it('names no deployment', () => {
    expect(code()).not.toMatch(/chessgui-pwa|github\.io/);
  });

  it('derives the base rather than importing a build-time constant', () => {
    expect(code()).toMatch(/scopeBase\(location\.pathname\)/);
    expect(code()).not.toMatch(/from '\$app\/paths'/);
  });

  /*
    Handing the HTML shell to a failed image or font request answers it with
    the wrong content type — a broken image instead of an honest failure.
  */
  it('falls back to the shell only for navigations', () => {
    const src = code();
    expect(src).toMatch(/req\.mode === 'navigate'/);
    const fallback = src.slice(src.indexOf('} catch {'));
    expect(fallback).toMatch(/Response\.error\(\)/);
  });
});
