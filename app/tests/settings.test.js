import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import AppShell from '../src/lib/components/AppShell.svelte';
import { stripTabs, activeId, workspaceState, openSettings } from '../src/lib/stores/tabs.js';
import { locale } from '../src/lib/stores/i18n.js';
import { theme } from '../src/lib/stores/theme.js';
import {
  activeSection, objects, preferences,
  selectSection, addObject, removeObject, resetSettings
} from '../src/lib/stores/settings.js';
import { SECTIONS, DEFAULT_SECTION, validateField, OBJECT_TYPES } from '../src/lib/settings/schema.js';
import {
  SIDEBAR_WIDTH, CARD_MIN, cardColumns, windowWidthFor, contentWidth
} from '../src/lib/settings/layout.js';
import { readFileSync } from 'node:fs';

/**
 * vitest renders Svelte components into jsdom WITHOUT injecting their scoped
 * CSS — document.styleSheets is empty — so getComputedStyle reports initial
 * values for everything and any assertion based on it passes or fails for the
 * wrong reason. Style invariants are therefore asserted against the source,
 * which verifies the rule exists rather than that a browser applied it.
 */
const readSrc = (rel) => readFileSync(new URL('../src/' + rel, import.meta.url), 'utf8');

const tick = () => new Promise((r) => setTimeout(r, 0));

const BASE_OBJECTS = {
  engines: [
    { id: 'engine-1', name: 'Stockfish 16.1', status: 'ready', binaryPath: '/bin/sf',
      hashMb: 256, threads: 8, enabled: true },
    { id: 'engine-2', name: 'Leela Chess Zero', status: 'ready', binaryPath: '/bin/lc0',
      hashMb: 512, threads: 4, enabled: true }
  ],
  subscriptions: [
    { id: 'sub-1', name: 'Lichess Broadcasts', status: 'syncing',
      url: 'https://lichess.org', interval: 'Hourly', enabled: true, meta: 'lichess.org' },
    { id: 'sub-2', name: 'TWIC Weekly', status: 'offline',
      url: 'https://theweekinchess.com', interval: 'Weekly', enabled: false, meta: 'theweekinchess.com' }
  ],
  databases: [
    { id: 'db-1', name: 'Master Games', status: 'indexed',
      location: '~/master.pgn', format: 'PGN', enabled: true, meta: '2.4M games' }
  ]
};

beforeEach(() => {
  stripTabs.set([]);
  activeId.set('library');
  workspaceState.set({ library: { scratch: '' } });
  locale.set('en');
  theme.set('light');
  resetSettings();
  objects.set(structuredClone(BASE_OBJECTS));
  preferences.set({
    restoreOpenGames: true, libraryLocation: '~/Documents/Plyvio',
    boardStyle: 'Default', pieceSet: 'Merida'
  });
});
afterEach(cleanup);

async function renderSettings() {
  const out = render(AppShell);
  openSettings();
  await tick();
  return out;
}

describe('§3.4.2 layout', () => {
  it('has exactly two regions: sidebar and content area', async () => {
    const { container } = await renderSettings();
    expect(container.querySelector('.sidebar')).toBeTruthy();
    expect(container.querySelector('#settings-content')).toBeTruthy();
  });

  it('the sidebar is a fixed 220px', () => {
    expect(SIDEBAR_WIDTH).toBe(220);
    // the component sizes from the token, and the token carries the value
    expect(readSrc('lib/components/settings/SettingsSidebar.svelte'))
      .toMatch(/width:\s*var\(--settings-sidebar-w\)/);
    expect(readSrc('lib/styles/app.css')).toMatch(/--settings-sidebar-w:\s*220px/);
  });

  it('the sidebar does not shrink or grow', () => {
    expect(readSrc('lib/components/settings/SettingsSidebar.svelte')).toMatch(/flex:\s*none/);
  });

  it('adds no second top-level navigation bar', async () => {
    const { container } = await renderSettings();
    // The shell's own tab bar is the only tablist with a horizontal orientation.
    const bars = [...container.querySelectorAll('[role="tablist"]')];
    expect(bars.length).toBe(2);                              // shell tabs + settings sidebar
    expect(container.querySelector('.sidebar').getAttribute('aria-orientation')).toBe('vertical');
  });

  it('the content area scrolls vertically only — cards wrap, never scroll sideways', () => {
    // §3.4.12 — the scrolling region is BENEATH the heading, not the Content
    // Area as a whole. .content was the scroller until 10 Sep, which meant the
    // Section Heading scrolled away with its content, taking the Add action
    // with it. The vertical-only guarantee is unchanged; it moved to .scroll.
    const css = readSrc('lib/components/settings/SettingsWorkspace.svelte');

    const content = css.slice(css.indexOf('.content {'), css.indexOf('.chead {'));
    expect(content).not.toMatch(/overflow-y:\s*auto/);

    const scroll = css.slice(css.indexOf('.scroll {'), css.indexOf('.glab {'));
    expect(scroll).toMatch(/overflow-y:\s*auto/);
    expect(scroll).toMatch(/overflow-x:\s*hidden/);
  });

  it('the section heading is pinned in every section', () => {
    // §3.4.12 — a header button that scrolls away is unreachable with a dozen
    // engines installed, which is why the Add action sits in the heading.
    for (const c of ['SettingsWorkspace', 'EngineSection', 'DatabaseSection',
                     'SubscriptionSection']) {
      const css = readSrc(`lib/components/settings/${c}.svelte`);
      const chead = css.slice(css.indexOf('.chead {'), css.indexOf('}', css.indexOf('.chead {')));
      expect(chead, c).toMatch(/flex:\s*none/);
      const scroll = css.slice(css.indexOf('.scroll {'), css.indexOf('}', css.indexOf('.scroll {')));
      expect(scroll, c).toMatch(/overflow-y:\s*auto/);
    }
  });

  it('one toggle across the workspace — SettingRow uses the object sections’', () => {
    // §3.4.13. SettingRow carried 34×19 · r99 · bordered · --ink while the three
    // object sections used 34×20 · r10 · --ok: two switches for one control.
    const row = readSrc('lib/components/settings/SettingRow.svelte');
    const tog = row.slice(row.indexOf('.tog {'), row.indexOf('}', row.indexOf('.tog {')));
    expect(tog).toMatch(/width:\s*34px;\s*height:\s*20px/);
    expect(tog).toMatch(/border-radius:\s*10px/);
    expect(row).toMatch(/\.tog\.on\s*\{\s*background:\s*var\(--ok/);
  });

  it('a Setting Row has a 44px floor, not a fixed height', () => {
    // §3.4.13 — an object row is always one line; a Setting Row carrying a
    // description is two, and 44px would clip it.
    const row = readSrc('lib/components/settings/SettingRow.svelte');
    const rule = row.slice(row.indexOf('.row {'), row.indexOf('}', row.indexOf('.row {')));
    expect(rule).toMatch(/min-height:\s*44px/);
    expect(rule).not.toMatch(/[^-]height:\s*44px/);
  });
});

describe('§3.4.10 / §3.4.12 grid geometry', () => {
  it('two columns at the 800x600 minimum window', () => {
    expect(contentWidth(800)).toBe(580);
    expect(cardColumns(800)).toBe(2);
  });

  it('three columns from 918px, not before', () => {
    expect(windowWidthFor(3)).toBe(918);
    expect(cardColumns(917)).toBe(2);
    expect(cardColumns(918)).toBe(3);
  });

  it('never drops below one column, however narrow', () => {
    for (let w = 200; w <= 1600; w += 1) {
      expect(cardColumns(w)).toBeGreaterThanOrEqual(1);
    }
  });

  it('column count never decreases as the window widens', () => {
    let last = 0;
    for (let w = 400; w <= 2400; w += 1) {
      const n = cardColumns(w);
      expect(n).toBeGreaterThanOrEqual(last);
      last = n;
    }
  });

  it('cards never render below their 210px floor', () => {
    for (let w = 700; w <= 2000; w += 7) {
      const n = cardColumns(w);
      const usable = contentWidth(w) - 44;
      if (n > 1) expect(usable).toBeGreaterThanOrEqual(n * CARD_MIN + (n - 1) * 12);
    }
  });
});

describe('§3.4.3 / §3.4.4 navigation', () => {
  it('lists the six sections in the specified order', async () => {
    const { container } = await renderSettings();
    const labels = [...container.querySelectorAll('.sidebar .nav .lbl')].map((e) => e.textContent.trim());
    expect(labels).toEqual(['General', 'Appearance', 'Engines', 'Subscriptions', 'Databases', 'About']);
  });

  it('opens on General when nothing was selected before', async () => {
    const { container } = await renderSettings();
    expect(get(activeSection)).toBe(DEFAULT_SECTION);
    expect(container.querySelector('.sidebar .nav.on .lbl').textContent.trim()).toBe('General');
  });

  it('marks exactly one section active', async () => {
    const { container } = await renderSettings();
    selectSection('databases');
    await tick();
    const on = container.querySelectorAll('.sidebar .nav.on');
    expect(on.length).toBe(1);
    expect(on[0].textContent).toContain('Databases');
  });

  it('selecting a section replaces the content area', async () => {
    const { container } = await renderSettings();
    selectSection('engines');
    await tick();
    expect(container.querySelector('#settings-content h2').textContent.trim()).toBe('Engines');
    selectSection('about');
    await tick();
    expect(container.querySelector('#settings-content h2').textContent.trim()).toBe('About');
  });

  it('creates no additional tabs — all navigation stays in the Settings tab', async () => {
    await renderSettings();
    const before = get(stripTabs).length;
    for (const s of SECTIONS) selectSection(s.id);
    await tick();
    expect(get(stripTabs).length).toBe(before);
    expect(get(stripTabs).filter((t) => t.kind === 'settings').length).toBe(1);
  });

  it('restores the last selected section when reopened', async () => {
    await renderSettings();
    selectSection('subscriptions');
    activeId.set('library');
    await tick();
    openSettings();                       // activates the existing tab
    await tick();
    expect(get(activeSection)).toBe('subscriptions');
  });

  it('does not rely on colour alone for the active state', () => {
    // §3.4.4 — three redundant cues. Two of them survive monochrome and
    // forced-colours mode, so neither may be dropped without failing here.
    const css = readSrc('lib/components/settings/SettingsSidebar.svelte');
    const block = css.slice(css.indexOf('.nav.on {'), css.indexOf('.ic {'));
    expect(block).toMatch(/font-weight:\s*700/);          // weight cue
    expect(block).toMatch(/\.nav\.on::before/);            // positional rail
  });

  it('marks the active item in the accessibility tree, not just visually', async () => {
    const { container } = await renderSettings();
    selectSection('engines');
    await tick();
    const selected = [...container.querySelectorAll('.sidebar [role="tab"]')]
      .filter((t) => t.getAttribute('aria-selected') === 'true');
    expect(selected.length).toBe(1);
    expect(selected[0].textContent).toContain('Engines');
  });

  it('exposes the sidebar as a vertical tablist controlling the content', async () => {
    const { container } = await renderSettings();
    const tab = container.querySelector('.sidebar [role="tab"]');
    expect(tab.getAttribute('aria-controls')).toBe('settings-content');
  });
});

describe('§3.4.8 object-management sections', () => {
  /*
    All three object sections now use rows: Databases (§3.4.8.1), Engines
    (§3.4.8.2) and Subscriptions (SU-A, accepted but not yet specified).

    The Card pattern of §3.4.8 and §3.4.10 is retired, not just unreachable:
    ObjectSection, ObjectCard and ObjectDetail were deleted 20 Sep 2026 (see
    CLOSED.md) once every object section had its own row+expander. Add now
    expands the new row in place instead of opening a Detail/Edit View — see
    databases.test.js's "Add expands the new row in place" regression test.
  */
  it('every object section shows its own Add action, in its heading', async () => {
    const { container } = await renderSettings();
    for (const [section, label] of [
      ['engines', 'Add engine'],
      ['subscriptions', 'Add subscription'],
      ['databases', 'Add database']
    ]) {
      selectSection(section);
      await tick();
      expect(container.querySelector('#settings-content .chead .add').textContent.trim())
        .toBe(label);
    }
  });

  it('renders rows in boxed groups, not a card grid', async () => {
    const { container } = await renderSettings();
    for (const section of ['engines', 'subscriptions', 'databases']) {
      selectSection(section);
      await tick();
      expect(container.querySelectorAll('#settings-content .box').length).toBeGreaterThan(0);
      expect(container.querySelector('#settings-content .card')).toBeNull();
      expect(container.querySelector('#settings-content .grid')).toBeNull();
    }
  });

  it('every row is 44px in every object section', async () => {
    for (const file of ['DatabaseSection', 'EngineSection', 'SubscriptionSection']) {
      const css = readSrc(`lib/components/settings/${file}.svelte`);
      expect(css).toMatch(/\.r\s*\{[^}]*height:\s*44px/);
    }
  });

  it('Add creates an object', async () => {
    await renderSettings();
    selectSection('engines');
    const id = addObject('engines');
    await tick();
    expect(get(objects).engines.length).toBe(3);
    expect(id).toBeTruthy();
  });
});

describe('§3.4.10 the Card pattern is unused', () => {
  /*
    Kept as a marker, not as coverage: if a section returns to Cards this
    fails and someone re-reads §3.4.8.
  */
  it('no section renders a card or an empty-state grid', async () => {
    const { container } = await renderSettings();
    for (const section of SECTIONS.map((x) => x.id)) {
      selectSection(section);
      await tick();
      expect(container.querySelector('#settings-content .card')).toBeNull();
      expect(container.querySelector('#settings-content .empty')).toBeNull();
    }
  });
});

describe('§3.4.6 / §3.4.7 conventional controls', () => {
  it('General uses control rows, not cards', async () => {
    const { container } = await renderSettings();
    selectSection('general');
    await tick();
    expect(container.querySelector('#settings-content .row')).toBeTruthy();
    expect(container.querySelector('#settings-content .card')).toBeNull();
    expect(container.querySelector('#settings-content .add')).toBeNull();
  });

  it('Appearance uses control rows, not cards', async () => {
    const { container } = await renderSettings();
    selectSection('appearance');
    await tick();
    expect(container.querySelector('#settings-content .row')).toBeTruthy();
    expect(container.querySelector('#settings-content .card')).toBeNull();
  });

  it('a toggle applies immediately', async () => {
    const { container } = await renderSettings();
    selectSection('general');
    await tick();
    expect(get(preferences).restoreOpenGames).toBe(true);
    await fireEvent.click(container.querySelector('#settings-content [role="switch"]'));
    expect(get(preferences).restoreOpenGames).toBe(false);
  });

  it('Appearance theme control drives the same store as the Application Menu', async () => {
    const { container } = await renderSettings();
    selectSection('appearance');
    await tick();
    const sel = container.querySelector('#settings-content select');
    await fireEvent.change(sel, { target: { value: 'Dark' } });
    expect(get(theme)).toBe('dark');
  });

  it('General language control drives the same store as the Application Menu', async () => {
    const { container } = await renderSettings();
    selectSection('general');
    await tick();
    const sel = container.querySelector('#settings-content select');
    await fireEvent.change(sel, { target: { value: 'Deutsch' } });
    expect(get(locale)).toBe('de');
  });
});

describe('§3.4.11 About', () => {
  it('uses an informational layout, not cards', async () => {
    const { container } = await renderSettings();
    selectSection('about');
    await tick();
    expect(container.querySelector('#settings-content dl')).toBeTruthy();
    // §3.4.11 — three boxed groups: Application, Third party, Plyvio Credits.
    expect(container.querySelectorAll('#settings-content .box').length).toBe(3);
    // No control on any row: informational, so the Card pattern does not apply.
    expect(container.querySelector('#settings-content [role="switch"]')).toBeFalsy();
    expect(container.querySelector('#settings-content .card')).toBeFalsy();
  });

  it('shows the package version in the specified format', async () => {
    // §3.4.11. This checks the WIRING and the format, not drift: the displayed
    // version is injected from package.json by vite.config.js, so both sides of
    // this assertion read the same file and drift is impossible by
    // construction. What could still break is the injection itself — an
    // undefined __APP_VERSION__, or the string assembled without its
    // placeholder — and that is what this catches.
    //
    // It is deliberately NOT SvelteKit's kit.version.name: the service worker
    // names its cache with that, and it must change on every deploy or users
    // are served stale assets offline.
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const { container } = await renderSettings();
    selectSection('about');
    await tick();
    const rows = [...container.querySelectorAll('#settings-content .arow')];
    const version = rows.find((r) => r.querySelector('dt').textContent.trim() === 'Version');
    expect(version.querySelector('dd').textContent.trim())
      .toBe(`Technology Preview (v${pkg.version})`);
    expect(container.querySelector('#settings-content .card')).toBeNull();
    expect(container.querySelector('#settings-content .add')).toBeNull();
  });

  /**
   * The Third party group is the screen's half of a licence obligation: what it
   * lists has to be what actually ships. NOTICES.md is the other half, and the two
   * were written by hand at different times, so this is the thing that keeps them
   * from drifting apart.
   */
  it('lists every redistributed component that NOTICES.md does, with the same licence', async () => {
    const notices = readFileSync('../NOTICES.md', 'utf8');
    const table = notices
      .split('\n')
      .filter((l) => /^\| .+ \| .+ \| .+ \| .+ \|$/.test(l) && !/^\| Component |^\| ---/.test(l))
      .map((l) => l.split('|').map((c) => c.trim()).filter(Boolean))
      .map(([component, , licence]) => ({ component, licence }));

    expect(table.length).toBeGreaterThan(0);

    const { container } = await renderSettings();
    selectSection('about');
    await tick();
    const shown = [...container.querySelectorAll('#settings-content .arow')]
      .map((r) => ({
        component: r.querySelector('dt').textContent.trim(),
        licence: r.querySelector('dd').textContent.trim()
      }));

    for (const { component, licence } of table) {
      // IBM Plex is one row on screen and one line in the table, spelled slightly
      // differently because the table names both families.
      const name = component.startsWith('IBM Plex') ? 'IBM Plex' : component;
      const row = shown.find((r) => r.component === name);
      expect(row, `${name} is redistributed but the About screen does not list it`).toBeTruthy();
      expect(row.licence).toBe(licence);
    }
  });

  it('the Application Menu About item lands on this section', async () => {
    const { container } = render(AppShell);
    await fireEvent.click(container.querySelector('[aria-label="Application menu"]'));
    const about = [...container.querySelectorAll('.pop button.mi')]
      .find((b) => b.textContent.includes('About'));
    await fireEvent.click(about);
    await tick();
    expect(get(activeId)).toBe('settings');
    expect(get(activeSection)).toBe('about');
  });
});

describe('localization', () => {
  it('translates the whole workspace', async () => {
    const { container } = await renderSettings();
    selectSection('databases');
    locale.set('fr');
    await tick();
    const labels = [...container.querySelectorAll('.sidebar .nav .lbl')].map((e) => e.textContent.trim());
    expect(labels).toEqual(['Général', 'Apparence', 'Moteurs', 'Abonnements', 'Bases de données', 'À propos']);
    expect(container.querySelector('#settings-content .add').textContent.trim()).toBe('Ajouter une base');
  });
});
