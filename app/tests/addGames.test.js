import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { render, cleanup, fireEvent, screen, within } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import AppShell from '../src/lib/components/AppShell.svelte';
import { stripTabs, activeId, workspaceState } from '../src/lib/stores/tabs.js';
import { locale } from '../src/lib/stores/i18n.js';
import { STRINGS } from '../src/lib/i18n/locales.js';
import {
  games, collections, tags, subscriptions, resetLibrary, selection, offline
} from '../src/lib/stores/library.js';
import { makeGames, makeImportedGames, SUBSCRIPTIONS, COLLECTIONS, TAGS } from '../src/lib/library/mock.js';
import { preferences } from '../src/lib/stores/settings.js';
import {
  OUTCOMES, resolveOutcome, planImport, describeSources, gamesInFile,
  gamesInPaste, formatBytes, outcomeMessage, notAddedCount
} from '../src/lib/library/importJob.js';
import {
  phase, plan, written, notice, running, canStart, canRetry, statusSlot,
  startImport, cancelImport, resetImporter, clearNotice, openReport, reportOpen,
  WRITE_MS, DOWNLOAD_MS, TICK_MS
} from '../src/lib/stores/importer.js';

const readSrc = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const tick = () => new Promise((r) => setTimeout(r, 0));

const fileDraft = (...names) => ({
  files: names.map((n) => ({ name: n, size: 4_100_000 })),
  text: '', source: 'chesscom', username: '', range: 'all'
});
const pasteDraft = (text) => ({ files: [], text, source: 'chesscom', username: '', range: 'all' });
const onlineDraft = (username) => ({ files: [], text: '', source: 'chesscom', username, range: 'all' });

const request = (over = {}) => ({
  tab: 'file',
  draft: fileDraft('twic1600.pgn'),
  outcome: 'clean',
  destination: 'db-1',
  duplicates: 'skip',
  tags: [],
  collections: [],
  ...over
});

beforeEach(() => {
  stripTabs.set([]);
  activeId.set('library');
  workspaceState.set({ library: { scratch: '' } });
  locale.set('en');
  games.set(makeGames());
  subscriptions.set(SUBSCRIPTIONS);
  collections.set(COLLECTIONS);
  tags.set(TAGS);
  preferences.update((p) => ({ ...p, simulatedImport: 'clean' }));
  resetLibrary();
  resetImporter();
});
afterEach(() => { cleanup(); resetImporter(); offline.set(false); vi.useRealTimers(); });

/* ====================== the plan ====================== */

describe('§3.2.4.5 the dialog reads nothing', () => {
  it('describes a file by its name and size, never by its contents', () => {
    const [src] = describeSources('file', fileDraft('twic1600.pgn'));
    expect(src.label).toBe('twic1600.pgn');
    expect(src.detail).toBe('4.1 MB');
  });

  it('gives the same file the same game count every time', () => {
    expect(gamesInFile('twic1600.pgn')).toBe(gamesInFile('twic1600.pgn'));
    expect(gamesInFile('twic1600.pgn')).not.toBe(gamesInFile('twic1599.pgn'));
  });

  it('counts a paste only after the commit, never in the dialog', () => {
    // gamesInPaste exists for the import, not for the source band: nothing in
    // AddGamesDialog.svelte may call it.
    expect(readSrc('../src/lib/components/library/AddGamesDialog.svelte'))
      .not.toContain('gamesInPaste');
    expect(gamesInPaste('[Event "A"] 1. e4 [Event "B"] 1. d4')).toBe(2);
    expect(gamesInPaste('just an email about chess')).toBe(1);
    expect(gamesInPaste('   ')).toBe(0);
  });

  it('formats bytes one way', () => {
    expect(formatBytes(4_100_000)).toBe('4.1 MB');
    expect(formatBytes(1_400_000_000)).toBe('1.4 GB');
    expect(formatBytes(900)).toBe('900 B');
  });
});

describe('§2 one source type per import', () => {
  it('the File tab takes many sources', () => {
    expect(describeSources('file', fileDraft('a.pgn', 'b.pgn', 'c.pgn'))).toHaveLength(3);
  });

  it('Paste and Online take exactly one', () => {
    expect(describeSources('paste', pasteDraft('[Event "A"] [Event "B"]'))).toHaveLength(1);
    expect(describeSources('online', onlineDraft('AwesomeAtti'))).toHaveLength(1);
  });

  it('an empty source is no source, so there is nothing to import', () => {
    expect(describeSources('paste', pasteDraft('  '))).toHaveLength(0);
    expect(describeSources('online', onlineDraft(''))).toHaveLength(0);
    expect(startImport(request({ tab: 'paste', draft: pasteDraft('') }))).toBe(false);
  });
});

describe('outcomes', () => {
  it('an outcome that cannot happen on this tab falls back to no-games-found', () => {
    expect(resolveOutcome('file', 'network')).toBe('none');
    expect(resolveOutcome('paste', 'file')).toBe('none');
    expect(resolveOutcome('online', 'network')).toBe('network');
    expect(resolveOutcome('file', 'file')).toBe('file');
  });

  it('a clean import adds everything it found', () => {
    const p = planImport(request());
    expect(p.added).toBe(p.total);
    expect(p.failures).toHaveLength(0);
    expect(p.skipped).toBe(0);
  });

  it('a problem import subtracts the duplicates and the failures', () => {
    const p = planImport(request({ outcome: 'problems' }));
    expect(p.failures).toHaveLength(4);
    expect(p.skipped).toBe(8);
    expect(p.added).toBe(p.total - 12);
  });

  it('a whole-source failure adds nothing at all', () => {
    for (const o of ['none', 'file']) {
      const p = planImport(request({ outcome: o }));
      expect(p.added).toBe(0);
      expect(p.total).toBe(0);
      expect(p.failedSources).toHaveLength(1);
    }
  });

  it('only an online import has a download phase', () => {
    expect(planImport(request()).download).toBe(false);
    expect(planImport(request({ tab: 'online', draft: onlineDraft('x') })).download).toBe(true);
  });
});

describe('r5 §3 one outcome, one sentence', () => {
  it('every no-games case gets the same words, differing only in the source named', () => {
    const f = outcomeMessage(planImport(request({ outcome: 'none' })));
    const p = outcomeMessage(planImport({ ...request({ outcome: 'none' }), tab: 'paste', draft: pasteDraft('x') }));
    const o = outcomeMessage(planImport({ ...request({ outcome: 'none' }), tab: 'online', draft: onlineDraft('nobody') }));
    expect([f.key, p.key, o.key]).toEqual(['add.none.file', 'add.none.paste', 'add.none.online']);
    for (const k of [f.key, p.key, o.key]) {
      expect(STRINGS.en[k].startsWith('No games found')).toBe(true);
    }
  });

  it('the two failures where nothing was read are named for what went wrong', () => {
    const file = outcomeMessage(planImport(request({ outcome: 'file' })));
    const net = outcomeMessage(planImport(
      request({ tab: 'online', draft: onlineDraft('x'), outcome: 'network' })
    ));
    expect(STRINGS.en[file.key].startsWith('File error')).toBe(true);
    expect(STRINGS.en[net.key].startsWith('Network error')).toBe(true);
  });

  it('a clean import has no message, because the Library is the receipt', () => {
    expect(outcomeMessage(planImport(request()))).toBeNull();
  });

  it('counts what was not added', () => {
    expect(notAddedCount(planImport(request({ outcome: 'problems' })))).toBe(12);
    expect(notAddedCount(planImport(request({ outcome: 'none' })))).toBeGreaterThan(0);
  });
});

/* ====================== the lane ====================== */

describe('§3.2.4.5 one import at a time', () => {
  it('refuses a second import while one is running', () => {
    vi.useFakeTimers();
    expect(startImport(request())).toBe(true);
    expect(get(running)).toBe(true);
    expect(get(canStart)).toBe(false);
    expect(startImport(request())).toBe(false);
  });

  it('writes games into the library as it goes, and finishes on the total', () => {
    vi.useFakeTimers();
    const before = get(games).length;
    startImport(request());
    vi.advanceTimersByTime(TICK_MS * 4);
    const partway = get(games).length;
    expect(partway).toBeGreaterThan(before);

    vi.advanceTimersByTime(WRITE_MS);
    expect(get(phase)).toBe('done');
    expect(get(written)).toBe(get(plan).added);
    expect(get(games).length).toBe(before + get(plan).added);
  });

  it('an online import downloads first, then writes', () => {
    vi.useFakeTimers();
    startImport(request({ tab: 'online', draft: onlineDraft('AwesomeAtti') }));
    expect(get(phase)).toBe('downloading');
    vi.advanceTimersByTime(DOWNLOAD_MS);
    expect(get(phase)).toBe('writing');
    vi.advanceTimersByTime(WRITE_MS);
    expect(get(phase)).toBe('done');
  });

  it('cancelling keeps what was already written and says how many', () => {
    vi.useFakeTimers();
    const before = get(games).length;
    startImport(request());
    vi.advanceTimersByTime(TICK_MS * 6);
    const kept = get(written);
    expect(kept).toBeGreaterThan(0);

    cancelImport();
    vi.advanceTimersByTime(WRITE_MS);
    expect(get(phase)).toBe('done');
    expect(get(games).length).toBe(before + kept);
    expect(get(notice).kind).toBe('cancelled');
    expect(get(notice).kept).toBe(kept);
  });

  it('a network failure writes nothing and offers a retry', () => {
    vi.useFakeTimers();
    const before = get(games).length;
    startImport(request({ tab: 'online', draft: onlineDraft('x'), outcome: 'network' }));
    vi.advanceTimersByTime(DOWNLOAD_MS + WRITE_MS);
    expect(get(games).length).toBe(before);
    expect(get(canRetry)).toBe(true);
  });

  it('no other failure offers a retry, because the request has to change first', () => {
    vi.useFakeTimers();
    startImport(request({ outcome: 'none' }));
    vi.advanceTimersByTime(WRITE_MS);
    expect(get(canRetry)).toBe(false);
  });
});

describe('r5 §4 the Status Bar carries the result', () => {
  const finish = (over) => {
    vi.useFakeTimers();
    startImport(request(over));
    vi.advanceTimersByTime(DOWNLOAD_MS + WRITE_MS);
  };

  it('reports determinate progress while writing', () => {
    vi.useFakeTimers();
    startImport(request());
    vi.advanceTimersByTime(TICK_MS * 4);
    const slot = get(statusSlot);
    expect(slot.kind).toBe('writing');
    expect(slot.total).toBe(get(plan).added);
    expect(slot.fraction).toBeGreaterThan(0);
    expect(slot.cancellable).toBe(true);
  });

  it('states a clean result, then removes itself', () => {
    finish();
    expect(get(statusSlot).kind).toBe('added');
    vi.advanceTimersByTime(9000);
    expect(get(notice)).toBeNull();
    expect(get(statusSlot)).toBeNull();
  });

  it('a problem result persists until it is answered', () => {
    finish({ outcome: 'problems' });
    expect(get(statusSlot).kind).toBe('attention');
    vi.advanceTimersByTime(60_000);
    expect(get(statusSlot).kind).toBe('attention');

    clearNotice();
    expect(get(statusSlot)).toBeNull();
  });

  it('a whole-source failure carries its own sentence, not a count of games', () => {
    finish({ outcome: 'none' });
    expect(get(statusSlot).message.key).toBe('add.none.file');
    resetImporter();

    finish({ outcome: 'file' });
    expect(get(statusSlot).message.key).toBe('add.err.file');
    resetImporter();

    finish({ tab: 'online', draft: onlineDraft('someone'), outcome: 'network' });
    expect(get(statusSlot).message.key).toBe('add.err.network');
  });

  it('an import with problems is counted, not described', () => {
    finish({ outcome: 'problems' });
    expect(get(statusSlot).message).toBeNull();
    expect(get(statusSlot).count).toBe(12);
  });

  it('a running import outranks offline in the Status Bar (§3.2.4.4)', async () => {
    const { container } = render(AppShell);
    offline.set(true);
    await tick();
    const right = () => container.querySelectorAll('.sbar span')[1].textContent;
    expect(right()).toContain('Offline — sync paused');

    startImport(request());
    await new Promise((r) => setTimeout(r, TICK_MS * 3));
    expect(right()).toContain('Adding games');
    expect(right()).not.toContain('Offline');
    cancelImport();
  });

  it('opening the report and closing it answers the notice', () => {
    finish({ outcome: 'problems' });
    openReport();
    expect(get(reportOpen)).toBe(true);
    clearNotice();
    expect(get(reportOpen)).toBe(false);
    expect(get(notice)).toBeNull();
  });
});

describe('organising on import', () => {
  it('a new tag and collection become Sidebar rows', () => {
    vi.useFakeTimers();
    startImport(request({
      tags: [{ id: -991, name: 'TWIC 1600' }],
      collections: [{ id: -992, name: 'Weekly' }]
    }));
    vi.advanceTimersByTime(WRITE_MS);
    expect(get(tags).some((t) => t.name === 'TWIC 1600')).toBe(true);
    expect(get(collections).some((c) => c.name === 'Weekly')).toBe(true);
  });

  it('a failed import registers nothing, because nothing was added', () => {
    vi.useFakeTimers();
    const before = get(tags).length;
    startImport(request({ outcome: 'none', tags: [{ id: -993, name: 'Nope' }] }));
    vi.advanceTimersByTime(WRITE_MS);
    expect(get(tags).length).toBe(before);
  });

  it('imported games are recent, so Recently Added is the view that fills', () => {
    const batch = makeImportedGames(3, { tags: [1], collections: [0] });
    // One import call shares a single `createdAt` across every row (mirroring
    // the real import path) -- that shared value is what makes the whole
    // batch the "last import" `recentlyAdded()` (library.js) returns.
    expect(new Set(batch.map((g) => g.createdAt)).size).toBe(1);
    expect(batch.every((g) => g.tags.includes(1) && g.collections.includes(0))).toBe(true);
  });
});

/* ====================== the dialog ====================== */

describe('the Add Games dialog', () => {
  const openDialog = async () => {
    render(AppShell);
    await tick();
    await fireEvent.click(screen.getAllByRole('button', { name: 'Add Games' })[0]);
    await tick();
    return screen.getByRole('dialog');
  };

  it('opens from the Content Toolbar', async () => {
    expect(await openDialog()).toBeTruthy();
  });

  it('offers the three sources in the order File · Online · Paste', async () => {
    // Scoped to the dialog: the shell's own tab strip also exposes role="tab",
    // which is exactly the collision AG‑D‑5 was drawn to keep visually apart.
    const dlg = await openDialog();
    const names = within(dlg).getAllByRole('tab').map((el) => el.textContent.trim());
    expect(names).toEqual(['File', 'Online', 'Paste']);
  });

  it('shows the Chess.com and Lichess brand marks, not text monograms (§4.3.3)', async () => {
    // A plain-text "cc"/"li" abbreviation is exactly the treatment §7.4's
    // implementation summary calls a rejected defect for source marks
    // elsewhere -- the Online tab's Source menu must use the same
    // ChessComMark/LichessMark svg components as Subscriptions rows do.
    const dlg = await openDialog();
    await fireEvent.click(within(dlg).getAllByRole('tab')[1]);      // Online
    await tick();

    const trigger = within(dlg).getByLabelText('Source');
    const triggerMark = trigger.querySelector('svg.brand');
    expect(triggerMark).toBeTruthy();
    expect(trigger.textContent).not.toMatch(/\bcc\b|\bli\b/);

    await fireEvent.click(trigger);
    await tick();
    const menu = within(dlg).getByRole('menu', { name: 'Source' });
    const items = within(menu).getAllByRole('menuitemradio');
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item.querySelector('svg.brand')).toBeTruthy();
    }
  });

  it("the trigger's trailing-icon rule never reaches into the nested source mark", () => {
    // Regression for the follow-up bug: the mark renders (previous test), but
    // .trigger's old `.trigger :global(svg:last-child)` selector -- meant only
    // for the trailing chevron -- is a descendant selector, so it ALSO matched
    // the brand mark's own <svg> one level down inside <span class="mark">
    // (itself a :last-child, of that span), overriding it from --ink to the
    // barely-visible --faint. The fix scopes both trailing-icon rules to a
    // direct child ('>'), so this asserts the source still says so and can't
    // silently regress to a bare descendant selector.
    const src = readFileSync('src/lib/components/library/SelectField.svelte', 'utf8');
    expect(src).toMatch(/\.trigger\s*>\s*:global\(svg:last-child\)/);
    expect(src).toMatch(/\.item\s*>\s*:global\(svg:last-child\)/);
    expect(src).not.toMatch(/\.trigger\s+:global\(svg:last-child\)/);
    expect(src).not.toMatch(/\.item\s+:global\(svg:last-child\)/);
  });

  it('cannot commit until a source exists — presence, not validity', async () => {
    const dlg = await openDialog();
    const submit = () => within(dlg).getByRole('button', { name: 'Add Games' });
    expect(submit().disabled).toBe(true);

    await fireEvent.click(within(dlg).getAllByRole('tab')[1]);      // Online
    await tick();
    await fireEvent.input(within(dlg).getByLabelText('Username'), {
      target: { value: 'AwesomeAtti' }
    });
    await tick();
    expect(submit().disabled).toBe(false);
  });

  it('a paste needs only text, and is never judged for containing chess', async () => {
    const dlg = await openDialog();
    await fireEvent.click(within(dlg).getAllByRole('tab')[2]);      // Paste
    await tick();
    await fireEvent.input(within(dlg).getByLabelText('Paste'), {
      target: { value: 'this is not chess at all' }
    });
    await tick();
    expect(within(dlg).getByRole('button', { name: 'Add Games' }).disabled).toBe(false);
  });

  it('never reads or verifies anything — no fetch, no await, no validation', () => {
    const src = readSrc('../src/lib/components/library/AddGamesDialog.svelte');
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/\bawait\b/);
    expect(src).not.toMatch(/notFound|verifying|isValid/i);
  });

  it('omits Smart Collections, which a game cannot be put into', async () => {
    const dlg = await openDialog();
    const field = within(dlg).getByLabelText('Collections');
    await fireEvent.focus(field);
    await tick();
    // Scoped to the dialog: the Sidebar lists smart collections too, and it
    // should — they simply cannot receive an import.
    const smart = COLLECTIONS.find((c) => c.smart).name;
    const plain = COLLECTIONS.find((c) => !c.smart).name;
    expect(within(dlg).queryByText(smart)).toBeNull();
    expect(within(dlg).getByText(plain)).toBeTruthy();
  });

  it('Escape closes it', async () => {
    const dlg = await openDialog();
    await fireEvent.keyDown(dlg, { key: 'Escape' });
    await tick();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the entry point closes while an import runs', async () => {
    render(AppShell);
    await tick();
    const button = () => screen.getAllByRole('button', { name: 'Add Games' })[0];
    expect(button().disabled).toBe(false);

    startImport(request());
    await tick();
    expect(button().disabled).toBe(true);
    cancelImport();
  });
});

/* ====================== house rules ====================== */

describe('house rules', () => {
  const SOURCES = [
    '../src/lib/components/library/AddGamesDialog.svelte',
    '../src/lib/components/library/ImportReport.svelte',
    '../src/lib/components/library/SelectField.svelte',
    '../src/lib/components/library/TokenField.svelte',
    '../src/lib/components/library/LibraryWorkspace.svelte'
  ];

  it('uses no character as an icon', () => {
    // The prototype previously drew icons with Unicode characters absent from
    // the bundled IBM Plex faces. Everything here is a bundled Lucide SVG.
    const banned = /[✓✔✕✖×＋✚→←↑↓⚠♞⟳…]/u;
    for (const p of SOURCES) {
      const src = readSrc(p).replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, '');
      expect({ file: p, hit: banned.test(src) }).toEqual({ file: p, hit: false });
    }
  });

  it('builds no message by concatenating onto a localised string (§8)', () => {
    for (const p of SOURCES) {
      expect(readSrc(p)).not.toMatch(/\$t\([^)]*\)\s*\+/);
    }
  });

  it('every new string exists in all three locales', () => {
    const en = Object.keys(STRINGS.en).filter((k) => k.startsWith('add.') || k.startsWith('proto.'));
    expect(en.length).toBeGreaterThan(60);
    for (const code of ['de', 'fr']) {
      for (const k of en) {
        expect({ code, k, has: k in STRINGS[code] }).toEqual({ code, k, has: true });
      }
    }
  });

  it('the outcome list and its labels stay in step', () => {
    for (const code of ['en', 'de', 'fr']) {
      for (const o of OUTCOMES) expect(STRINGS[code][`proto.${o}`]).toBeTruthy();
    }
  });

  it('no banner is rendered between the toolbar and the table', () => {
    // r5 §4 — an inserted banner shifts the table twice, in a region the user
    // may be scrolled in. The Status Bar carries the result instead.
    const src = readSrc('../src/lib/components/library/LibraryWorkspace.svelte');
    expect(src).not.toMatch(/class="banner"|\.banner\s*\{/);
  });
});
