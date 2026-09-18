import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import AppShell from '../src/lib/components/AppShell.svelte';
import { stripTabs, activeId, workspaceState, openSettings } from '../src/lib/stores/tabs.js';
import { locale } from '../src/lib/stores/i18n.js';
import {
  objects, selectSection, resetSettings, resetDatabases, downloads,
  availableEngines, installEngine, renameEngine, setEngineOption, setEngineEnabled
} from '../src/lib/stores/settings.js';
import {
  AVAILABLE_ENGINES, DEFAULT_THREADS, DEFAULT_HASH,
  installedDetail, availableDetail, downloadingDetail, formatBytes
} from '../src/lib/settings/engines.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
const src = readFileSync('src/lib/components/settings/EngineSection.svelte', 'utf8');
const now = (fn) => fn();

const ENGINES = [
  { id: 'engine-1', name: 'Stockfish', version: '17.1', protocol: 'UCI',
    threads: 4, hashMb: 512, status: 'ready', enabled: true },
  { id: 'engine-2', name: 'Torch', version: '3', protocol: 'UCI',
    threads: 2, hashMb: 256, status: 'ready', enabled: false }
];

beforeEach(() => {
  stripTabs.set([]);
  activeId.set('library');
  workspaceState.set({ library: { scratch: '' } });
  locale.set('en');
  resetSettings();
  resetDatabases();
  objects.update((o) => ({ ...o, engines: ENGINES.map((e) => ({ ...e })) }));
});
afterEach(cleanup);

async function renderEngines() {
  const r = render(AppShell);
  openSettings();
  selectSection('engines');
  await tick();
  return r;
}

/* ===================== detail lines ===================== */

describe('§3.4.8.2 detail line', () => {
  /* What the engine is set to run as — the part that differs between two. */
  it('reads protocol · threads · hash', () => {
    expect(installedDetail(ENGINES[0])).toBe('UCI · 4 threads · 512 MB');
  });

  it('says "1 thread", not "1 threads"', () => {
    expect(installedDetail({ ...ENGINES[0], threads: 1 })).toBe('UCI · 1 thread · 512 MB');
  });

  it('reads protocol · download size when available', () => {
    const e = AVAILABLE_ENGINES.find((x) => x.id === 'avail-berserk');
    expect(availableDetail(e)).toBe('UCI · 42 MB download');
  });

  it('reports the transfer while downloading', () => {
    const e = AVAILABLE_ENGINES.find((x) => x.id === 'avail-koivisto');
    expect(downloadingDetail(e, 60)).toBe('Downloading · 21 MB of 35 MB');
  });

  it('rounds engine sizes to whole megabytes', () => {
    expect(formatBytes(42_000_000)).toBe('42 MB');
    expect(formatBytes(71_000_000)).toBe('71 MB');
  });

  /*
    Engine lines are short, which is what leaves room for the version beside
    the name — the difference from §3.4.8.1.
  */
  it('is shorter than a database line, at the window floor', () => {
    const longest = Math.max(...ENGINES.map((e) => installedDetail(e).length));
    expect(longest * 6.6).toBeLessThan(220);
  });
});

/* ===================== the catalogue ===================== */

describe('§3.4.8.2 Available', () => {
  it('offers the curated engines', () => {
    expect(get(availableEngines).map((e) => e.name)).toEqual([
      'Berserk', 'Ethereal', 'Koivisto', 'Leela Chess Zero', 'Rubichess'
    ]);
  });

  it('drops an entry once installed', () => {
    installEngine('avail-berserk', { tick: now });
    expect(get(objects).engines.some((e) => e.name === 'Berserk')).toBe(true);
    expect(get(availableEngines).some((e) => e.name === 'Berserk')).toBe(false);
  });

  /* One phase, as for Databases: a binary downloads and is ready. */
  it('installs ready and enabled, with sane defaults', () => {
    installEngine('avail-ethereal', { tick: now });
    const e = get(objects).engines.find((x) => x.name === 'Ethereal');
    expect(e.status).toBe('ready');
    expect(e.enabled).toBe(true);
    expect(e.version).toBe('14.25');
    expect(e.threads).toBe(DEFAULT_THREADS);
    expect(e.hashMb).toBe(DEFAULT_HASH);
  });

  it('refuses a second transfer of the same entry', () => {
    let pending = null;
    installEngine('avail-lc0', { tick: (fn) => { pending = fn; } });
    expect(installEngine('avail-lc0', { tick: now })).toBe(false);
    expect(pending).toBeTypeOf('function');
  });

  it('ignores an unknown entry', () => {
    expect(installEngine('nope', { tick: now })).toBe(false);
  });

  /* Engines and Databases share one download map; the ids must not collide. */
  it('has ids disjoint from the database catalogue', async () => {
    const { AVAILABLE_DATABASES } = await import('../src/lib/settings/databases.js');
    const a = new Set(AVAILABLE_ENGINES.map((e) => e.id));
    expect(AVAILABLE_DATABASES.some((d) => a.has(d.id))).toBe(false);
  });
});

/* ===================== id collision regression ===================== */

describe('generated engine ids never collide with the seeded ones', () => {
  it('stays unique across installs', () => {
    installEngine('avail-berserk', { tick: now });
    installEngine('avail-ethereal', { tick: now });
    const ids = get(objects).engines.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('re-renders after navigating away and back', async () => {
    const { container } = await renderEngines();
    installEngine('avail-berserk', { tick: now });
    await tick();
    selectSection('general');
    await tick();
    selectSection('engines');
    await tick();
    const names = [...container.querySelectorAll('#settings-content .box .r .nm')]
      .map((e) => e.textContent.trim());
    expect(names).toContain('Berserk');
  });
});

/* ===================== expander fields ===================== */

describe('§3.4.8.2 the expander fields', () => {
  it('renames', () => {
    expect(renameEngine('engine-1', 'Stockfish dev')).toBeNull();
    expect(get(objects).engines.find((e) => e.id === 'engine-1').name).toBe('Stockfish dev');
  });

  it('refuses an empty name rather than committing it', () => {
    expect(renameEngine('engine-1', '  ')).toBe('validation.required');
    expect(get(objects).engines.find((e) => e.id === 'engine-1').name).toBe('Stockfish');
  });

  it('commits threads and hash', () => {
    expect(setEngineOption('engine-1', 'threads', 16)).toBe(true);
    expect(setEngineOption('engine-1', 'hashMb', 1024)).toBe(true);
    const e = get(objects).engines.find((x) => x.id === 'engine-1');
    expect(e.threads).toBe(16);
    expect(e.hashMb).toBe(1024);
  });

  /* Only the two options the application itself sets are writable here. */
  it('refuses any other field', () => {
    expect(setEngineOption('engine-1', 'version', '99')).toBe(false);
    expect(get(objects).engines.find((e) => e.id === 'engine-1').version).toBe('17.1');
  });

  it('enables and disables', () => {
    setEngineEnabled('engine-2', true);
    expect(get(objects).engines.find((e) => e.id === 'engine-2').enabled).toBe(true);
  });
});

/* ===================== rendering ===================== */

describe('§3.4.8.2 the section', () => {
  it('renders two boxed groups', async () => {
    const { container } = await renderEngines();
    const labels = [...container.querySelectorAll('#settings-content .glab')]
      .map((e) => e.textContent.trim());
    expect(labels).toEqual(['Installed', 'Available']);
    expect(container.querySelectorAll('#settings-content .box').length).toBe(2);
  });

  it('lists installed engines alphabetically', async () => {
    const { container } = await renderEngines();
    const names = [...container.querySelectorAll('#settings-content .box')][0]
      .querySelectorAll('.nm');
    expect([...names].map((e) => e.textContent.trim())).toEqual(['Stockfish', 'Torch']);
  });

  /* The difference from Databases: the version rides beside the name. */
  it('shows the version beside the name, not in the detail line', async () => {
    const { container } = await renderEngines();
    const row = container.querySelector('#settings-content .box .r');
    expect(row.querySelector('.ver').textContent.trim()).toBe('17.1');
    expect(row.querySelector('.dt').textContent.trim()).toBe('UCI · 4 threads · 512 MB');
    expect(row.querySelector('.dt').textContent).not.toContain('17.1');
  });

  it('the version precedes the detail line', async () => {
    const { container } = await renderEngines();
    const row = container.querySelector('#settings-content .box .r');
    const kids = [...row.children].map((e) => e.className.split(' ')[0]);
    expect(kids.indexOf('ver')).toBeLessThan(kids.indexOf('dt'));
    expect(kids.indexOf('tg')).toBeLessThan(kids.indexOf('cv'));
  });

  it('expands controls, not just facts', async () => {
    const { container } = await renderEngines();
    await fireEvent.click(container.querySelector('#settings-content .box .r .cv'));
    const exp = container.querySelector('#settings-content .exp');
    expect(exp.textContent).toContain('Threads');
    expect(exp.textContent).toContain('Hash');
    expect(exp.querySelectorAll('select').length).toBe(2);
  });

  it('expands one row at a time', async () => {
    const { container } = await renderEngines();
    const chevrons = container.querySelectorAll('#settings-content .box .r .cv');
    await fireEvent.click(chevrons[0]);
    await fireEvent.click(chevrons[1]);
    expect(container.querySelectorAll('#settings-content .exp').length).toBe(1);
  });

  it('the toggle switches the engine', async () => {
    const { container } = await renderEngines();
    const tg = container.querySelector('#settings-content .box .r .tg');
    expect(tg.getAttribute('aria-checked')).toBe('true');
    await fireEvent.click(tg);
    expect(get(objects).engines.find((e) => e.id === 'engine-1').enabled).toBe(false);
  });

  it('the Install button becomes the progress indicator', async () => {
    const { container } = await renderEngines();
    downloads.set({ 'avail-berserk': { pct: 40, done: false } });
    await tick();
    const btn = container.querySelector('#settings-content .box:last-of-type .inst');
    expect(btn.textContent.trim()).toBe('40%');
    expect(btn.querySelector('.bar')).toBeTruthy();
  });

  it('the Add action sits in the section heading', async () => {
    const { container } = await renderEngines();
    expect(container.querySelector('#settings-content .chead .add').textContent.trim())
      .toBe('Add engine');
  });
});

/* ===================== the pattern ===================== */

describe('§3.4.8.2 row geometry', () => {
  it('rows are 44px', () => {
    expect(src).toMatch(/\.r\s*\{[^}]*height:\s*44px/);
  });

  it('groups are boxed at 9px', () => {
    expect(src).toMatch(/\.box\s*\{[^}]*border-radius:\s*9px/);
  });

  it('the Install pill takes the app’s 5px radius', () => {
    expect(src).toMatch(/\.inst\s*\{[^}]*border-radius:\s*5px/);
  });

  it('the version is set in the mono face so releases line up', () => {
    expect(src).toMatch(/\.r \.ver\s*\{[^}]*var\(--mono\)/);
  });
});
