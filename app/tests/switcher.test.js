import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { get } from 'svelte/store';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import AppShell from '../src/lib/components/AppShell.svelte';
import { stripTabs, activeId, workspaceState } from '../src/lib/stores/tabs.js';
import { locale } from '../src/lib/stores/i18n.js';
import { objects } from '../src/lib/stores/settings.js';
import {
  libraries, activeLibrary, activeLibraryId, selectLibrary, resetLibrarySelection, isSelectable
} from '../src/lib/stores/libraries.js';
import { middleTruncate, ELLIPSIS } from '../src/lib/library/truncate.js';
import {
  SIDEBAR_W, HEAD_PAD_L, HEAD_PAD_R, HEAD_GAP, TOGGLE_W,
  TRIGGER_PAD_L, TRIGGER_PAD_R, TRIGGER_GAP, CHEVRON_W,
  SWITCHER_W, NAME_W, nameWidth
} from '../src/lib/library/switcher.js';
import { games, visibleGames, search, selection, sidebarCollapsed, resetLibrary } from '../src/lib/stores/library.js';
import { makeGames } from '../src/lib/library/mock.js';

const tick = () => new Promise((r) => setTimeout(r, 0));

/** Deterministic stand-in for canvas: every glyph one unit wide. */
const uniform = (s) => s.length;

const DBS = [
  { id: 'db-1', name: 'Master Games', status: 'indexed', enabled: true, meta: '2.4M games' },
  { id: 'db-2', name: 'My Games', status: 'indexed', enabled: true, meta: '812 games' }
];

beforeEach(() => {
  stripTabs.set([]);
  activeId.set('library');
  workspaceState.set({ library: { scratch: '' } });
  locale.set('en');
  sidebarCollapsed.set(false);
  games.set(makeGames());
  resetLibrary();
  objects.update((o) => ({ ...o, databases: DBS.map((d) => ({ ...d })) }));
  resetLibrarySelection();
});
afterEach(cleanup);

/* ===================== Library switcher — middle truncation ====================== */

describe('Library switcher — middle truncation', () => {
  it('returns the text untouched when it fits', () => {
    expect(middleTruncate('My Games', 100, uniform)).toBe('My Games');
  });

  /*
    The reason this exists. End truncation renders both of these as
    "Chessgui Referenc…" — two libraries, one string on screen.
  */
  it('keeps names distinguishable when they differ only at the end', () => {
    const a = middleTruncate('Chessgui Reference 2026', 18, uniform);
    const b = middleTruncate('Chessgui Reference 2025', 18, uniform);
    expect(a).not.toBe(b);
    expect(a.endsWith('2026')).toBe(true);
    expect(b.endsWith('2025')).toBe(true);
  });

  it('never returns a string wider than the budget', () => {
    const names = ['Master Games', 'Chessgui Reference 2026', 'TWIC Complete Archive 1994–2026',
                   'A', 'AB', 'A very very very long library name indeed'];
    for (const n of names) {
      for (let w = 1; w <= 60; w++) {
        expect(uniform(middleTruncate(n, w, uniform))).toBeLessThanOrEqual(w);
      }
    }
  });

  it('puts the ellipsis in the middle, not the end', () => {
    const out = middleTruncate('Chessgui Reference 2026', 16, uniform);
    const at = out.indexOf(ELLIPSIS);
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(out.length - 1);
  });

  it('never keeps more than half the string as tail, so short names keep a head', () => {
    const out = middleTruncate('abcdef', 5, uniform);
    expect(out.startsWith('a')).toBe(true);
  });

  it('degrades to an end truncation rather than showing an ellipsis alone', () => {
    const out = middleTruncate('Chessgui Reference 2026', 5, uniform);
    expect(out).not.toBe(ELLIPSIS);
    expect(out.length).toBeLessThanOrEqual(5);
  });

  it('handles the degenerate cases without throwing', () => {
    expect(middleTruncate('', 100, uniform)).toBe('');
    expect(middleTruncate('abc', 0, uniform)).toBe('');
    expect(middleTruncate('abc', -5, uniform)).toBe('');
  });
});

/* ===================== §3.2.3.10 switcher geometry ===================== */

describe('§3.2.3.10 the truncation budget', () => {
  /*
    The budget used to be the literal 122, passed as a prop. It was 18px short,
    so names truncated earlier than they needed to and nothing was watching.
  */
  it('closes across the header: switcher + gap + toggle + padding = 220', () => {
    expect(HEAD_PAD_L + SWITCHER_W + HEAD_GAP + TOGGLE_W + HEAD_PAD_R).toBe(SIDEBAR_W);
  });

  it('closes inside the trigger: padding + name + gap + chevron = the switcher', () => {
    expect(TRIGGER_PAD_L + NAME_W + TRIGGER_GAP + CHEVRON_W + TRIGGER_PAD_R).toBe(SWITCHER_W);
  });

  /*
    Was 140 against a framed trigger. Losing the frame (5 Sep) returned the
    padding that held the name off a border nobody draws any more, so the
    budget grew again — the number is asserted so it cannot drift back.
  */
  it('is 152px at the specified 220px sidebar, not the 122 it started as', () => {
    expect(SWITCHER_W).toBe(178);
    expect(NAME_W).toBe(152);
    expect(NAME_W).toBeGreaterThan(140);
  });

  it('derives the same number from the sidebar width it is given', () => {
    expect(nameWidth(SIDEBAR_W)).toBe(NAME_W);
    expect(nameWidth(300)).toBe(NAME_W + 80);
  });

  /*
    The name is meant to sit on the Sidebar's 12px left margin, level with the
    group headings below it. That alignment is two paddings in two files, so
    it is asserted rather than eyeballed.
  */
  it('starts the name on the sidebar left margin', () => {
    expect(HEAD_PAD_L + TRIGGER_PAD_L).toBe(12);
  });

  /* A narrow sidebar must not hand middleTruncate a negative budget. */
  it('never goes negative, however narrow the sidebar', () => {
    for (let w = 0; w <= 220; w++) expect(nameWidth(w)).toBeGreaterThanOrEqual(0);
  });

  it('is the number the component actually defaults to', () => {
    const src = readFileSync('src/lib/components/library/LibrarySwitcher.svelte', 'utf8');
    expect(src).toMatch(/width = NAME_W/);
    expect(src).not.toMatch(/width = 122/);
    const side = readFileSync('src/lib/components/library/LibrarySidebar.svelte', 'utf8');
    expect(side).not.toMatch(/LibrarySwitcher width=/);
  });
});

/* ========================= the libraries store ========================= */

describe('Library switcher — the library list', () => {
  it('comes from Settings → Databases, not a second source', () => {
    expect(get(libraries).map((l) => l.name)).toEqual(['Master Games', 'My Games']);
    objects.update((o) => ({
      ...o,
      databases: [...o.databases, { id: 'db-3', name: 'Added Later', status: 'indexed', enabled: true, meta: '5 games' }]
    }));
    expect(get(libraries).map((l) => l.name)).toContain('Added Later');
  });

  it('lists unavailable and indexing databases but does not offer them', () => {
    objects.update((o) => ({
      ...o,
      databases: [...DBS,
        { id: 'db-x', name: 'Indexing One', status: 'indexing', enabled: true, meta: '' },
        { id: 'db-y', name: 'Broken One', status: 'not configured', enabled: true, meta: '' }]
    }));
    const list = get(libraries);
    expect(list.map((l) => l.name)).toContain('Broken One');       // listed
    expect(list.find((l) => l.name === 'Broken One').selectable).toBe(false);
    expect(list.find((l) => l.name === 'Indexing One').selectable).toBe(false);
    expect(selectLibrary('db-y')).toBe(false);
    expect(get(activeLibraryId)).toBe('db-1');
  });

  it('treats disabled as not selectable', () => {
    expect(isSelectable({ status: 'indexed', enabled: false })).toBe(false);
    expect(isSelectable({ status: 'indexed', enabled: true })).toBe(true);
  });

  it('switches between selectable libraries', () => {
    expect(get(activeLibrary).name).toBe('Master Games');
    expect(selectLibrary('db-2')).toBe(true);
    expect(get(activeLibrary).name).toBe('My Games');
  });

  /*
    §3.4.8 lets a database be deleted or disabled at any moment, and auto-apply
    means there is no Save step to intercept it. The header must not go on
    naming something that is gone.
  */
  it('falls back when the active library is removed in Settings', () => {
    selectLibrary('db-2');
    expect(get(activeLibraryId)).toBe('db-2');
    objects.update((o) => ({ ...o, databases: o.databases.filter((d) => d.id !== 'db-2') }));
    expect(get(activeLibraryId)).toBe('db-1');
  });

  it('falls back when the active library is disabled in Settings', () => {
    selectLibrary('db-2');
    objects.update((o) => ({
      ...o, databases: o.databases.map((d) => (d.id === 'db-2' ? { ...d, enabled: false } : d))
    }));
    expect(get(activeLibraryId)).toBe('db-1');
  });
});

/* ================= the presentational-only guarantee ================== */

describe('Library switcher — presentational only', () => {
  it('does not change the visible games', () => {
    const before = get(visibleGames).map((g) => g.id);
    selectLibrary('db-2');
    expect(get(visibleGames).map((g) => g.id)).toEqual(before);
  });

  it('does not touch the search term or the sidebar selection', () => {
    search.set('carlsen');
    const sel = get(selection);
    const hits = get(visibleGames).length;
    selectLibrary('db-2');
    expect(get(search)).toBe('carlsen');
    expect(get(selection)).toEqual(sel);
    expect(get(visibleGames).length).toBe(hits);
    search.set('');
  });

  it('is stated in the source, so nobody wires it up by accident', () => {
    const src = readFileSync('src/lib/stores/libraries.js', 'utf8');
    expect(src).toMatch(/PRESENTATIONAL ONLY/);
  });
});

/* ============================== rendering ============================= */

describe('the switcher in the sidebar', () => {
  it('sits in the header with the collapse control trailing it (Option A)', () => {
    const { container } = render(AppShell);
    const head = container.querySelector('.side .head');
    const kids = [...head.children];
    expect(kids.length).toBe(2);
    expect(kids[0].querySelector('.trigger')).toBeTruthy();
    expect(kids[1].classList.contains('tog')).toBe(true);
  });

  it('shows the active library name and carries the full name as a title', () => {
    const { container } = render(AppShell);
    const trigger = container.querySelector('.side .head .trigger');
    expect(trigger.getAttribute('title')).toBe('Master Games');
    expect(trigger.textContent.trim()).toContain('Master Games');
  });

  it('carries no icon — a Library is the database, so one glyph would be two names', () => {
    const { container } = render(AppShell);
    const trigger = container.querySelector('.side .head .trigger');
    // only the chevron
    expect(trigger.querySelectorAll('svg').length).toBe(1);
  });

  it('opens a menu listing every database', async () => {
    const { container } = render(AppShell);
    await fireEvent.click(container.querySelector('.side .head .trigger'));
    const names = [...container.querySelectorAll('.side .menu .mrow .nm')].map((e) => e.textContent.trim());
    expect(names).toContain('Master Games');
    expect(names).toContain('My Games');
    expect(names).toContain('Manage databases…');
  });

  it('switches from the menu and closes it', async () => {
    const { container } = render(AppShell);
    await fireEvent.click(container.querySelector('.side .head .trigger'));
    const row = [...container.querySelectorAll('.side .menu .mrow')]
      .find((b) => b.textContent.includes('My Games'));
    await fireEvent.click(row);
    await tick();
    expect(get(activeLibrary).name).toBe('My Games');
    expect(container.querySelector('.side .menu')).toBeNull();
  });

  /*
    §3.2.3.10 — the switcher does NOT appear in the collapsed rail.

    A single `database` glyph is identical for every library, so a rail icon
    could offer a way to CHANGE the library while being unable to SHOW which
    one is open — the wrong half of what a collapsed switcher is for. The rail
    carries filters within the current library; switching expands first.
  */
  it('has no library entry point in the collapsed rail', async () => {
    const { container } = render(AppShell);
    sidebarCollapsed.set(true);
    await tick();
    expect(container.querySelector('.side .rail-it.lib')).toBeNull();
    const labels = [...container.querySelectorAll('.side .rail-it')]
      .map((b) => b.getAttribute('aria-label'));
    expect(labels.some((l) => /Library|Switch library/i.test(l))).toBe(false);
  });

  it('leaves no library flyout reachable while collapsed', async () => {
    const { container } = render(AppShell);
    sidebarCollapsed.set(true);
    await tick();
    for (const b of container.querySelectorAll('.side .rail-it')) {
      await fireEvent.click(b);
      const fly = container.querySelector('.side .fly');
      if (fly) expect(fly.textContent).not.toContain('Manage databases');
    }
  });

  it('still switches from the expanded header', async () => {
    const { container } = render(AppShell);
    sidebarCollapsed.set(false);
    await tick();
    await fireEvent.click(container.querySelector('.side .head .trigger'));
    expect(container.querySelector('.side .menu')).toBeTruthy();
  });
});
