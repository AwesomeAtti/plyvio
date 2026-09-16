import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { makeGames, SUBSCRIPTIONS, COLLECTIONS, TAGS } from '$lib/library/mock.js';

/**
 * Library Workspace state. §3.2
 *
 * The two filtering inputs — the Sidebar selection and the search term — are
 * composable and independent (§3.2.4.1, §3.2.4.3): search applies *within* the
 * current Sidebar selection, and changing the selection does not clear the
 * search. They are therefore separate stores combined in one derived view.
 */

export const games = writable(makeGames());
export const subscriptions = writable(SUBSCRIPTIONS);
export const collections = writable(COLLECTIONS);
export const tags = writable(TAGS);

/** { kind: 'all'|'favorites'|'recent'|'trash'|'subscription'|'collection'|'tag', id?: number } */
export const selection = writable({ kind: 'all' });
export const search = writable('');
export const selectedGameId = writable(null);
export const offline = writable(false);

/* ---------------- sidebar collapse (§3.2.3.8) ----------------------- */

const COLLAPSE_KEY = 'chessgui.library.sidebar';

function initialCollapsed() {
  if (!browser) return false;
  try { return localStorage.getItem(COLLAPSE_KEY) === 'collapsed'; } catch { return false; }
}

export const sidebarCollapsed = writable(initialCollapsed());

sidebarCollapsed.subscribe((v) => {
  if (!browser) return;
  try { localStorage.setItem(COLLAPSE_KEY, v ? 'collapsed' : 'expanded'); } catch { /* ignore */ }
});

export function toggleSidebar() {
  sidebarCollapsed.update((v) => !v);
}

/* ---------------- section collapse (§3.2.3.1) ----------------------- */

/**
 * The three unbounded groups fold away; the Library views do not.
 *
 * Subscriptions, Collections and Tags grow without bound, so a library with
 * forty tags pushes everything else off the panel. Folding is how the user
 * gets that space back. The Library views are three fixed rows that never
 * grow — folding them would save 78px and cost the one group that is always
 * worth seeing, which is why they lost their heading rather than gained a
 * disclosure (§3.2.3.1).
 *
 * Trash is not in this set either: it is anchored outside the scrolling flow.
 */
export const SECTIONS = ['subscriptions', 'collections', 'tags'];

const SECTIONS_KEY = 'chessgui.library.sections';

function initialSections() {
  const none = { subscriptions: false, collections: false, tags: false };
  if (!browser) return none;
  try {
    const raw = localStorage.getItem(SECTIONS_KEY);
    if (!raw) return none;
    const saved = JSON.parse(raw);
    // Read defensively: a key added later must not inherit `undefined`, and a
    // key removed later must not linger.
    return Object.fromEntries(SECTIONS.map((s) => [s, saved[s] === true]));
  } catch { return none; }
}

/** { subscriptions: boolean, collections: boolean, tags: boolean } — true is folded. */
export const sectionCollapsed = writable(initialSections());

sectionCollapsed.subscribe((v) => {
  if (!browser) return;
  try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(v)); } catch { /* ignore */ }
});

export function toggleSection(name) {
  if (!SECTIONS.includes(name)) return;
  sectionCollapsed.update((v) => ({ ...v, [name]: !v[name] }));
}

export function expandSection(name) {
  if (!SECTIONS.includes(name)) return;
  sectionCollapsed.update((v) => (v[name] ? { ...v, [name]: false } : v));
}

/* ---------------- Recently Added (§3.2.3.2) ------------------------- */

/**
 * "Recently" is the last 30 days, or the last 100 games added, whichever is
 * the smaller set. Bounding on both sides keeps the view useful on a sparsely
 * used library and on a bulk import alike.
 */
export const RECENT_DAYS = 30;
export const RECENT_MAX = 100;

export function recentlyAdded(all) {
  const within = all.filter((g) => !g.trashed && g.addedDaysAgo <= RECENT_DAYS);
  const sorted = [...within].sort((a, b) => a.addedDaysAgo - b.addedDaysAgo);
  return sorted.slice(0, RECENT_MAX);
}

/* ---------------- filtering ----------------------------------------- */

export function applySelection(all, sel) {
  switch (sel.kind) {
    case 'trash':        return all.filter((g) => g.trashed);
    case 'favorites':    return all.filter((g) => !g.trashed && g.favorite);
    case 'recent':       return recentlyAdded(all);
    case 'subscription': return all.filter((g) => !g.trashed && g.subscription === sel.id);
    case 'collection':   return all.filter((g) => !g.trashed && g.collection === sel.id);
    case 'tag':          return all.filter((g) => !g.trashed && g.tags.includes(sel.id));
    case 'all':
    default:             return all.filter((g) => !g.trashed);
  }
}

/**
 * Search covers the indexed fields named in §3.2.4.1 — players, event, site
 * and other metadata. Case- and diacritic-insensitive, so "polgar" finds
 * "Polgár"; a database of chess names is unusable otherwise.
 */
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function applySearch(list, term) {
  const q = fold(term.trim());
  if (!q) return list;
  return list.filter((g) =>
    fold(g.white).includes(q) ||
    fold(g.black).includes(q) ||
    fold(g.event).includes(q) ||
    g.date.includes(q) ||
    g.result.includes(q)
  );
}

/** The rows the Content Table shows: Sidebar selection, then search within it. */
export const visibleGames = derived(
  [games, selection, search],
  ([$games, $sel, $q]) => applySearch(applySelection($games, $sel), $q)
);

/** Counts for the Sidebar trailing slots. */
export const counts = derived([games, subscriptions], ([$games, $subs]) => {
  const live = $games.filter((g) => !g.trashed);
  const byCollection = {}, byTag = {};
  for (const g of live) {
    if (g.collection !== null) byCollection[g.collection] = (byCollection[g.collection] || 0) + 1;
    for (const t of g.tags) byTag[t] = (byTag[t] || 0) + 1;
  }
  return {
    all: live.length,
    favorites: live.filter((g) => g.favorite).length,
    recent: recentlyAdded($games).length,
    trash: $games.filter((g) => g.trashed).length,
    collection: byCollection,
    tag: byTag
  };
});

/* ---------------- selection and navigation --------------------------- */

/** Which foldable group a destination lives in, or null for the ungrouped ones. */
const SECTION_OF = {
  subscription: 'subscriptions',
  collection: 'collections',
  tag: 'tags'
};

export function selectSidebar(sel) {
  selection.set(sel);
  // A selection made from the rail flyout or the More… popover can land inside
  // a folded group. Unfolding it keeps the selected row visible, so the
  // Sidebar never shows a selection the user cannot see.
  const section = SECTION_OF[sel.kind];
  if (section) expandSection(section);
  // §3.2.4.3 — the search is NOT cleared; the two are independent.
}

export function selectGame(id) { selectedGameId.set(id); }
export function clearSearch() { search.set(''); }

export function findGame(id) {
  return get(games).find((g) => g.id === id) || null;
}

/** Label of the active Sidebar selection, for the scoped search placeholder. */
export function selectionLabel(sel, t, subs, colls, tgs) {
  switch (sel.kind) {
    case 'all':          return t('lib.allGames');
    case 'favorites':    return t('lib.favorites');
    case 'recent':       return t('lib.recentlyAdded');
    case 'trash':        return t('lib.trash');
    case 'subscription': return (subs.find((s) => s.id === sel.id) || {}).name || '';
    case 'collection':   return (colls.find((c) => c.id === sel.id) || {}).name || '';
    case 'tag':          return (tgs.find((x) => x.id === sel.id) || {}).name || '';
    default:             return '';
  }
}

/** §3.2.3.3 — the five shown are the most recently synchronized. */
export const SUBS_SHOWN = 5;

export const pinnedExtra = writable([]);   // ids surfaced from the More… popover

export const visibleSubscriptions = derived(
  [subscriptions, pinnedExtra],
  ([$subs, $pinned]) => {
    const byRecency = [...$subs].sort((a, b) => a.syncedDaysAgo - b.syncedDaysAgo);
    const top = byRecency.slice(0, SUBS_SHOWN);
    const extra = $pinned
      .map((id) => $subs.find((s) => s.id === id))
      .filter((s) => s && !top.includes(s));
    return [...top, ...extra];
  }
);

export const overflowSubscriptions = derived(
  [subscriptions, visibleSubscriptions],
  ([$subs, $vis]) => $subs.filter((s) => !$vis.includes(s))
);

/** Selecting from More… pins it into the visible set for this session. */
export function pinSubscription(id) {
  pinnedExtra.update((p) => (p.includes(id) ? p : [...p, id]));
  selectSidebar({ kind: 'subscription', id });
}

export function resetLibrary() {
  selection.set({ kind: 'all' });
  search.set('');
  selectedGameId.set(null);
  pinnedExtra.set([]);
  offline.set(false);
  sectionCollapsed.set({ subscriptions: false, collections: false, tags: false });
}
