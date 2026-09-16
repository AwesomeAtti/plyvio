import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import AppShell from '../src/lib/components/AppShell.svelte';
import { stripTabs, activeId, workspaceState, openSettings } from '../src/lib/stores/tabs.js';
import { locale } from '../src/lib/stores/i18n.js';
import {
  objects, selectSection, resetSettings,
  renameSubscription, setSubscriptionInterval, setSubscriptionEnabled, syncSubscription
} from '../src/lib/stores/settings.js';
import { statusOf, SOURCES, INTERVALS } from '../src/lib/settings/subscriptions.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
const src = readFileSync('src/lib/components/settings/SubscriptionSection.svelte', 'utf8');
const now = (fn) => fn();

const SUBS = [
  { id: 'sub-1', name: 'Hikaru', source: 'chesscom', state: 'idle',
    interval: 'Hourly', lastSynced: '12 min ago', newGames: 0, enabled: true },
  { id: 'sub-2', name: 'AwesomeAtti', source: 'lichess', state: 'idle',
    interval: 'Daily', lastSynced: '2 h ago', newGames: 12, enabled: true },
  { id: 'sub-3', name: 'DrNykterstein', source: 'lichess', state: 'syncing',
    interval: 'Hourly', lastSynced: '1 h ago', newGames: 0, enabled: true },
  { id: 'sub-4', name: 'MagnusCarlsen', source: 'chesscom', state: 'error',
    interval: 'Weekly', lastSynced: null, newGames: 0, enabled: false }
];

beforeEach(() => {
  stripTabs.set([]);
  activeId.set('library');
  workspaceState.set({ library: { scratch: '' } });
  locale.set('en');
  resetSettings();
  objects.update((o) => ({ ...o, subscriptions: SUBS.map((s) => ({ ...s })) }));
});
afterEach(cleanup);

async function renderSubs() {
  const r = render(AppShell);
  openSettings();
  selectSection('subscriptions');
  await tick();
  return r;
}

/* ===================== the status slot ===================== */

describe('SU-A status priority', () => {
  /*
    §3.2.3.3 already ranks these for the Library Sidebar. Settings reuses that
    ranking so one subscription cannot read differently in two places.
  */
  it('ranks error above everything', () => {
    expect(statusOf({ state: 'error', newGames: 99 }).kind).toBe('error');
  });

  it('ranks syncing above a new-game count', () => {
    expect(statusOf({ state: 'syncing', newGames: 12 }).kind).toBe('syncing');
  });

  it('shows a new-game count when there is nothing louder', () => {
    const st = statusOf({ state: 'idle', newGames: 12 });
    expect(st.kind).toBe('new');
    expect(st.n).toBe(12);
  });

  it('shows nothing when a count would be zero', () => {
    expect(statusOf({ state: 'idle', newGames: 0 })).toBeNull();
  });
});

/* ===================== the two sources ===================== */

describe('SU-A sources', () => {
  it('offers exactly two, matching §3.2.3.3', () => {
    expect(Object.keys(SOURCES)).toEqual(['chesscom', 'lichess']);
  });

  it('every seeded subscription belongs to one of them', () => {
    for (const s of get(objects).subscriptions) {
      expect(SOURCES[s.source]).toBeTruthy();
    }
  });
});

/* ===================== mutations ===================== */

describe('SU-A the expander fields', () => {
  it('renames', () => {
    expect(renameSubscription('sub-1', 'Hikaru Nakamura')).toBeNull();
    expect(get(objects).subscriptions.find((s) => s.id === 'sub-1').name)
      .toBe('Hikaru Nakamura');
  });

  it('refuses an empty name rather than committing it', () => {
    expect(renameSubscription('sub-1', '   ')).toBe('validation.required');
    expect(get(objects).subscriptions.find((s) => s.id === 'sub-1').name).toBe('Hikaru');
  });

  it('sets the interval from the established options', () => {
    setSubscriptionInterval('sub-1', 'Manual');
    expect(get(objects).subscriptions.find((s) => s.id === 'sub-1').interval).toBe('Manual');
    expect(INTERVALS).toContain('Manual');
  });

  it('enables and disables', () => {
    setSubscriptionEnabled('sub-4', true);
    expect(get(objects).subscriptions.find((s) => s.id === 'sub-4').enabled).toBe(true);
  });
});

describe('SU-A sync now', () => {
  it('syncs, then reports just now with the count cleared', () => {
    expect(syncSubscription('sub-2', { tick: now })).toBe(true);
    const s = get(objects).subscriptions.find((x) => x.id === 'sub-2');
    expect(s.state).toBe('idle');
    expect(s.lastSynced).toBe('just now');
    expect(s.newGames).toBe(0);
  });

  it('passes through the syncing state on the way', () => {
    let pending = null;
    syncSubscription('sub-2', { tick: (fn) => { pending = fn; } });
    expect(get(objects).subscriptions.find((x) => x.id === 'sub-2').state).toBe('syncing');
    pending();
    expect(get(objects).subscriptions.find((x) => x.id === 'sub-2').state).toBe('idle');
  });

  /* A disabled subscription does not sync — that is what disabling means. */
  it('refuses a disabled subscription', () => {
    expect(syncSubscription('sub-4', { tick: now })).toBe(false);
  });

  it('refuses one already syncing', () => {
    expect(syncSubscription('sub-3', { tick: now })).toBe(false);
  });
});

/* ===================== rendering ===================== */

describe('SU-A the section', () => {
  /* One group. There is no catalogue, so there is nothing for a second to hold. */
  it('renders exactly one boxed group', async () => {
    const { container } = await renderSubs();
    expect(container.querySelectorAll('#settings-content .box').length).toBe(1);
    const labels = [...container.querySelectorAll('#settings-content .glab')]
      .map((e) => e.textContent.trim());
    expect(labels).toEqual(['Subscriptions']);
  });

  it('lists subscriptions alphabetically', async () => {
    const { container } = await renderSubs();
    const names = [...container.querySelectorAll('#settings-content .box .r .nm')]
      .map((e) => e.textContent.trim());
    expect(names).toEqual(['AwesomeAtti', 'DrNykterstein', 'Hikaru', 'MagnusCarlsen']);
  });

  /* The label is the source mark plus the subscription's own name. */
  it('leads with the source mark, then the name', async () => {
    const { container } = await renderSubs();
    const rows = [...container.querySelectorAll('#settings-content .box .r')];
    for (const row of rows) {
      const kids = [...row.children].map((e) => e.className.split(' ')[0]);
      expect(kids[0]).toBe('mk');
      expect(kids[1]).toBe('nm');
      expect(row.querySelector('.mk svg')).toBeTruthy();
    }
  });

  it('draws a chess.com mark for a chess.com subscription', async () => {
    const { container } = await renderSubs();
    const hikaru = [...container.querySelectorAll('#settings-content .box .r')]
      .find((r) => r.querySelector('.nm').textContent.trim() === 'Hikaru');
    expect(hikaru.querySelector('.mk svg')).toBeTruthy();
    expect(src).toMatch(/chesscom:\s*ChessComMark/);
  });

  it('shows interval and last synced in the detail line', async () => {
    const { container } = await renderSubs();
    const hikaru = [...container.querySelectorAll('#settings-content .box .r')]
      .find((r) => r.querySelector('.nm').textContent.trim() === 'Hikaru');
    expect(hikaru.querySelector('.dt').textContent.trim())
      .toBe('Hourly · last synced 12 min ago');
  });

  it('says never synced rather than leaving it blank', async () => {
    const { container } = await renderSubs();
    const magnus = [...container.querySelectorAll('#settings-content .box .r')]
      .find((r) => r.querySelector('.nm').textContent.trim() === 'MagnusCarlsen');
    expect(magnus.querySelector('.dt').textContent).toContain('never synced');
  });

  it('renders the status slot only when a state applies', async () => {
    const { container } = await renderSubs();
    const rowOf = (name) => [...container.querySelectorAll('#settings-content .box .r')]
      .find((r) => r.querySelector('.nm').textContent.trim() === name);
    expect(rowOf('Hikaru').querySelector('.st')).toBeNull();          // idle, no new games
    expect(rowOf('AwesomeAtti').querySelector('.st').textContent.trim()).toBe('12 new');
    expect(rowOf('DrNykterstein').querySelector('.st').textContent).toContain('Syncing');
    expect(rowOf('MagnusCarlsen').querySelector('.st').textContent).toContain('Error');
  });

  /* §9.3 — state is never carried by colour alone. */
  it('gives error and syncing an icon as well as a colour', async () => {
    const { container } = await renderSubs();
    const rowOf = (name) => [...container.querySelectorAll('#settings-content .box .r')]
      .find((r) => r.querySelector('.nm').textContent.trim() === name);
    expect(rowOf('MagnusCarlsen').querySelector('.st svg')).toBeTruthy();
    expect(rowOf('DrNykterstein').querySelector('.st svg')).toBeTruthy();
  });

  it('carries toggle then chevron', async () => {
    const { container } = await renderSubs();
    const row = container.querySelector('#settings-content .box .r');
    const kids = [...row.children].map((e) => e.className.split(' ')[0]);
    expect(kids.indexOf('tg')).toBeLessThan(kids.indexOf('cv'));
  });

  it('expands name, source and interval, plus Sync and Remove', async () => {
    const { container } = await renderSubs();
    await fireEvent.click(container.querySelector('#settings-content .box .r .cv'));
    const exp = container.querySelector('#settings-content .exp');
    expect(exp.textContent).toContain('Name');
    expect(exp.textContent).toContain('Source');
    expect(exp.textContent).toContain('Sync interval');
    expect(exp.textContent).toContain('Sync now');
    expect(exp.textContent).toContain('Remove subscription');
  });

  /*
    SU-D was rejected: Sync is not a third trailing control on the row. The row
    is mark · name · detail · [status] · toggle · chevron — six at most, and
    the status slot is the only optional one.
  */
  it('keeps Sync out of the row', async () => {
    const { container } = await renderSubs();
    for (const row of container.querySelectorAll('#settings-content .box .r')) {
      expect(row.textContent).not.toContain('Sync now');
      expect(row.querySelector('.inst')).toBeNull();
      expect([...row.children].length).toBeLessThanOrEqual(6);
    }
    // the one without a status slot proves the slot is what varies
    const hikaru = [...container.querySelectorAll('#settings-content .box .r')]
      .find((r) => r.querySelector('.nm').textContent.trim() === 'Hikaru');
    expect([...hikaru.children].length).toBe(5);
  });

  it('has no version field — a subscription has no version', () => {
    expect(src).not.toMatch(/field\.version/);
  });

  it('the Add action sits in the section heading', async () => {
    const { container } = await renderSubs();
    expect(container.querySelector('#settings-content .chead .add').textContent.trim())
      .toBe('Add subscription');
  });
});
