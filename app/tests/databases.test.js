import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import AppShell from '../src/lib/components/AppShell.svelte';
import { stripTabs, activeId, workspaceState, openSettings } from '../src/lib/stores/tabs.js';
import { locale } from '../src/lib/stores/i18n.js';
import {
  objects, selectSection, resetSettings, resetDatabases,
  downloads, availableDatabases, installDatabase, renameDatabase, setDatabaseEnabled
} from '../src/lib/stores/settings.js';
import {
  AVAILABLE_DATABASES, formatCount, formatBytes, installedDetail, downloadingDetail
} from '../src/lib/settings/databases.js';
import { libraries, activeLibrary, resetLibrarySelection } from '../src/lib/stores/libraries.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
const src = readFileSync('src/lib/components/settings/DatabaseSection.svelte', 'utf8');

/** Drives a download to completion without timers. */
const now = (fn) => fn();

const DBS = [
  { id: 'db-1', name: 'Master Games', status: 'indexed', version: '2.1',
    games: 2_400_000, players: 198_000, bytes: 1_000_000_000, enabled: true },
  { id: 'db-2', name: 'My Games', status: 'indexed', version: '1.0',
    games: 812, players: 24, bytes: 2_400_000, enabled: true }
];

beforeEach(() => {
  stripTabs.set([]);
  activeId.set('library');
  workspaceState.set({ library: { scratch: '' } });
  locale.set('en');
  resetSettings();
  resetDatabases();
  objects.update((o) => ({ ...o, databases: DBS.map((d) => ({ ...d })) }));
  resetLibrarySelection();
});
afterEach(cleanup);

async function renderDatabases() {
  const r = render(AppShell);
  openSettings();
  selectSection('databases');
  await tick();
  return r;
}

/* ===================== formatting ===================== */

describe('§3.4.8 detail line', () => {
  /*
    9,570,000 in a 44px row is noise. 9.57M is the figure someone compares
    against another database.
  */
  it('compacts counts', () => {
    expect(formatCount(9_570_000)).toBe('9.57M');
    expect(formatCount(5_400_000)).toBe('5.4M');
    expect(formatCount(526_000)).toBe('526k');
    expect(formatCount(812)).toBe('812');
    expect(formatCount(24)).toBe('24');
  });

  /* Sizes span four orders of magnitude, so the unit is chosen per value. */
  it('chooses the size unit per value', () => {
    expect(formatBytes(4_100_000_000)).toBe('4.1 GB');
    expect(formatBytes(1_000_000_000)).toBe('1.0 GB');
    expect(formatBytes(2_400_000)).toBe('2.4 MB');
  });

  it('reads games · size', () => {
    expect(installedDetail(DBS[0])).toBe('2.4M games · 1.0 GB');
    expect(installedDetail(DBS[1])).toBe('812 games · 2.4 MB');
  });

  /* Mid-transfer the line reports the transfer, not the catalogue entry. */
  it('reports progress in bytes while downloading', () => {
    const db = AVAILABLE_DATABASES.find((d) => d.id === 'avail-ajedrez');
    expect(downloadingDetail(db, 50)).toBe('Downloading · 900.0 MB of 1.8 GB');
  });

  /* The longest line must not crowd the name at the 800px window floor. */
  it('stays within the row budget at the window floor', () => {
    const longest = Math.max(...AVAILABLE_DATABASES.map((d) => installedDetail(d).length));
    expect(longest * 6.6).toBeLessThan(418);
  });
});

/* ===================== the catalogue ===================== */

describe('§3.4.8 Available', () => {
  it('offers the five curated databases', () => {
    expect(get(availableDatabases).map((d) => d.name)).toEqual([
      "Lumbra's Gigabase", 'Caissabase 2024', 'Ajedrez Data — OTB',
      'MillionBase', 'Ajedrez Data — Correspondence'
    ]);
  });

  it('drops an entry once it is installed', () => {
    installDatabase('avail-million', { tick: now });
    expect(get(objects).databases.some((d) => d.name === 'MillionBase')).toBe(true);
    expect(get(availableDatabases).some((d) => d.name === 'MillionBase')).toBe(false);
  });

  /*
    A distributed database arrives ready, so it is enabled on arrival — a
    deliberate departure from §3.4.8's rule for objects that still need
    configuring.
  */
  it('installs enabled and usable, with no indexing state', () => {
    installDatabase('avail-caissa', { tick: now });
    const db = get(objects).databases.find((d) => d.name === 'Caissabase 2024');
    expect(db.enabled).toBe(true);
    expect(db.status).toBe('indexed');
    expect(db.version).toBe('2024');
  });

  it('carries the catalogue figures onto the installed object', () => {
    installDatabase('avail-lumbra', { tick: now });
    const db = get(objects).databases.find((d) => d.name === "Lumbra's Gigabase");
    expect(installedDetail(db)).toBe('9.57M games · 4.1 GB');
  });

  it('refuses a second transfer of the same entry', () => {
    let pending = null;
    installDatabase('avail-lumbra', { tick: (fn) => { pending = fn; } });
    expect(installDatabase('avail-lumbra', { tick: now })).toBe(false);
    expect(pending).toBeTypeOf('function');
  });

  it('ignores an unknown entry', () => {
    expect(installDatabase('nope', { tick: now })).toBe(false);
  });

  /* An installed database becomes selectable in the Library switcher. */
  it('reaches the Library switcher once installed', () => {
    expect(get(libraries).some((l) => l.name === 'MillionBase')).toBe(false);
    installDatabase('avail-million', { tick: now });
    const lib = get(libraries).find((l) => l.name === 'MillionBase');
    expect(lib.selectable).toBe(true);
  });
});

/* ===================== id collision regression ===================== */

describe('generated ids never collide with the seeded ones', () => {
  /*
    REGRESSION. `nextId` started at 0, so the first generated database id was
    `db-1` — already used by the sample data. Svelte throws on duplicate keys
    in a keyed {#each}, so the section rendered once and then failed to mount
    again: it read as "Databases will not display" rather than as an id bug.
  */
  it('stays unique across installs', () => {
    installDatabase('avail-million', { tick: now });
    installDatabase('avail-caissa', { tick: now });
    const ids = get(objects).databases.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stays unique across Add too', async () => {
    const { addObject } = await import('../src/lib/stores/settings.js');
    addObject('databases');
    addObject('databases');
    const ids = get(objects).databases.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /* The section must survive being left and returned to after an install. */
  it('re-renders after navigating away and back', async () => {
    const { container, unmount } = await renderDatabases();
    installDatabase('avail-million', { tick: now });
    await tick();
    selectSection('general');
    await tick();
    selectSection('databases');
    await tick();
    const names = [...container.querySelectorAll('#settings-content .box .r .nm')]
      .map((e) => e.textContent.trim());
    expect(names).toContain('MillionBase');
    unmount();
  });
});

/* ===================== rename and enable ===================== */

describe('§3.4.8 the expander fields', () => {
  it('renames, and the Library switcher follows', () => {
    expect(renameDatabase('db-1', 'Master Games 2026')).toBeNull();
    expect(get(activeLibrary).name).toBe('Master Games 2026');
  });

  it('refuses an empty name rather than committing it', () => {
    expect(renameDatabase('db-1', '   ')).toBe('validation.required');
    expect(get(objects).databases.find((d) => d.id === 'db-1').name).toBe('Master Games');
  });

  it('disabling removes it from the switcher’s offer', () => {
    setDatabaseEnabled('db-2', false);
    expect(get(libraries).find((l) => l.name === 'My Games').selectable).toBe(false);
  });
});

/* ===================== rendering ===================== */

describe('§3.4.8 the section', () => {
  it('renders two boxed groups, Installed and Available', async () => {
    const { container } = await renderDatabases();
    const labels = [...container.querySelectorAll('#settings-content .glab')]
      .map((e) => e.textContent.trim());
    expect(labels).toEqual(['Installed', 'Available']);
    expect(container.querySelectorAll('#settings-content .box').length).toBe(2);
  });

  it('lists installed databases alphabetically', async () => {
    const { container } = await renderDatabases();
    const names = [...container.querySelectorAll('#settings-content .box')][0]
      .querySelectorAll('.nm');
    expect([...names].map((e) => e.textContent.trim())).toEqual(['Master Games', 'My Games']);
  });

  it('shows counts and size on every installed row', async () => {
    const { container } = await renderDatabases();
    const first = container.querySelector('#settings-content .box .r .dt');
    expect(first.textContent.trim()).toBe('2.4M games · 1.0 GB');
  });

  it('carries a toggle and a chevron, in that order', async () => {
    const { container } = await renderDatabases();
    const row = container.querySelector('#settings-content .box .r');
    const kids = [...row.children].map((e) => e.className.split(' ')[0]);
    expect(kids.indexOf('tg')).toBeLessThan(kids.indexOf('cv'));
  });

  /* The chevron expands in place; nothing navigates. */
  it('expands settings beneath the row rather than opening a page', async () => {
    const { container } = await renderDatabases();
    expect(container.querySelector('#settings-content .exp')).toBeNull();
    await fireEvent.click(container.querySelector('#settings-content .box .r .cv'));
    const exp = container.querySelector('#settings-content .exp');
    expect(exp).toBeTruthy();
    expect(exp.textContent).toContain('Name');
    expect(exp.textContent).toContain('Version');
    // still in the Settings tab, still on the collection
    expect(container.querySelectorAll('#settings-content .box').length).toBe(2);
  });

  it('expands one row at a time', async () => {
    const { container } = await renderDatabases();
    const chevrons = container.querySelectorAll('#settings-content .box .r .cv');
    await fireEvent.click(chevrons[0]);
    await fireEvent.click(chevrons[1]);
    expect(container.querySelectorAll('#settings-content .exp').length).toBe(1);
  });

  it('the toggle switches the database', async () => {
    const { container } = await renderDatabases();
    const tg = container.querySelector('#settings-content .box .r .tg');
    expect(tg.getAttribute('aria-checked')).toBe('true');
    await fireEvent.click(tg);
    expect(get(objects).databases.find((d) => d.id === 'db-1').enabled).toBe(false);
  });

  it('offers Install on every available row', async () => {
    const { container } = await renderDatabases();
    const boxes = container.querySelectorAll('#settings-content .box');
    const buttons = boxes[1].querySelectorAll('.inst');
    expect(buttons.length).toBe(5);
    expect(buttons[0].textContent.trim()).toBe('Install');
  });

  it('the Install button becomes the progress indicator', async () => {
    const { container } = await renderDatabases();
    downloads.set({ 'avail-lumbra': { pct: 62, done: false } });
    await tick();
    const btn = container.querySelector('#settings-content .box:last-of-type .inst');
    expect(btn.textContent.trim()).toBe('62%');
    expect(btn.querySelector('.bar')).toBeTruthy();
    expect(btn.getAttribute('style')).toContain('62%');
  });

  it('the Add action sits in the section heading', async () => {
    const { container } = await renderDatabases();
    const add = container.querySelector('#settings-content .chead .add');
    expect(add.textContent.trim()).toBe('Add database');
  });

  /*
    REGRESSION — Add used to swap the whole Content Area to a Detail/Edit
    View (ObjectDetail, driven by the now-deleted openObject store). That
    view is gone; Add must expand the new row in place, on the same
    row+expander pattern the chevron already uses, per ACTIONS.md.
  */
  it('Add expands the new row in place, on the same collection', async () => {
    const { container } = await renderDatabases();
    expect(container.querySelector('#settings-content .exp')).toBeNull();
    await fireEvent.click(container.querySelector('#settings-content .chead .add'));
    await tick();
    // still the collection — two boxed groups, not a Detail/Edit View
    expect(container.querySelectorAll('#settings-content .box').length).toBe(2);
    expect(container.querySelector('.crumb')).toBeNull();
    const exp = container.querySelector('#settings-content .exp');
    expect(exp).toBeTruthy();
    expect(exp.textContent).toContain('Name');
    const names = [...container.querySelectorAll('#settings-content .box .r .nm')]
      .map((e) => e.textContent.trim());
    expect(names).toContain('New Database');
  });
});

/* ===================== the pattern itself ===================== */

describe('§3.4.8 row geometry', () => {
  it('rows are 44px', () => {
    expect(src).toMatch(/\.r\s*\{[^}]*height:\s*44px/);
  });

  it('groups are boxed, with the label outside the box', () => {
    expect(src).toMatch(/\.box\s*\{[^}]*border:\s*1px solid/);
    expect(src).toMatch(/\.box\s*\{[^}]*border-radius:\s*9px/);
  });

  it('the Install pill takes the app’s 5px radius, not a store pill', () => {
    expect(src).toMatch(/\.inst\s*\{[^}]*border-radius:\s*5px/);
  });

  it('states that Engines and Subscriptions still use cards', () => {
    expect(src).toMatch(/card pattern/);
  });
});
