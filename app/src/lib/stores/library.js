import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { SUBSCRIPTIONS } from '$lib/library/mock.js';
import {
  readGames, readFavoriteIds, readTrashedIds, readTags, readCollections,
  readTagIdsByGame, readCollectionIdsByGame
} from '$lib/data/games.js';
import { libraryConnection } from '$lib/data/session.js';
import { objects } from './settings.js';
import { activeLibraryId } from './libraries.js';

/**
 * Library Workspace state. §3.2
 *
 * The two filtering inputs — the Sidebar selection and the search term — are
 * composable and independent (§3.2.4.1, §3.2.4.3): search applies *within* the
 * current Sidebar selection, and changing the selection does not clear the
 * search. They are therefore separate stores combined in one derived view.
 */

/**
 * The Content Table's rows.
 *
 * Starts empty and is filled by `loadGames()` — see there for why this is a
 * single generous fetch rather than true incremental paging. Every per-user
 * mark (`trashed`, `favorite`, `tags`, `collections`) is filled by
 * `loadGames()`, from its own tables — `subscription` is the one field
 * still unfilled (see there). `createdAt` comes straight off the real
 * `games.created_at` column and is what `recentlyAdded()` (below) uses.
 *
 * Tests set this directly (`games.set(makeGames())`) and are unaffected by
 * `loadGames()`, which they never call.
 */
export const games = writable([]);
export const subscriptions = writable(SUBSCRIPTIONS);
/** Filled by `loadGames()`, from the real database's `collections` table (§7.3). */
export const collections = writable([]);
/** Filled by `loadGames()`, from the real database's `tags` table (§7.2). */
export const tags = writable([]);

/**
 * Whatever database backs library `id` — `null` when nothing matches, OR
 * when the row has no real database behind it — a still-mock/seeded row
 * (`'location' in db` is `false`: no key at all, not even `null`) that
 * predates a real library ever being created for it, e.g. the two sample
 * rows the PWA still seeds (`Master Games`, `My Games` — its `libraries`
 * table has no real counterpart for them; see `data/session.js`'s own
 * comment). Resolving one of those is deliberately inert for now: there is
 * nothing real to open, so this resolves `null` and every caller's own
 * null-connection handling takes over from there, same as it always has for
 * "no connection at all."
 */
export async function connectionForLibrary(id) {
  const db = get(objects).databases.find((d) => d.id === id);
  if (!db || !('location' in db)) return null;
  return libraryConnection(id);
}

/**
 * `connectionForLibrary()` for whichever library the switcher currently has
 * active (`stores/libraries.js`'s `activeLibraryId`) — the one connection
 * `loadGames()` below and a Game tab's own movetext fetch (`stores/
 * game.js`'s `loadRealGame`) both use, so switching libraries changes what
 * either of them reads. A real import's write path (`stores/importer.js`'s
 * `runRealWrite`) does NOT use this — it writes to the request's own chosen
 * `destination` via `connectionForLibrary()` directly, which may be a
 * different library than whichever one is active.
 */
export async function activeLibraryConnection() {
  return connectionForLibrary(get(activeLibraryId));
}

/**
 * `loadGames()`'s own call sequence — bumped at the start of every call, so
 * a call can tell whether it is still the most recent one once its awaits
 * resolve. This is what makes it safe to call `loadGames()` from more than
 * one trigger (a library switch, or a write that lands on the active
 * library) without the two racing each other: whichever call started LAST
 * wins, regardless of which one's reads happen to resolve last. Module-level
 * rather than per-call state on purpose — every caller shares one sequence.
 */
let loadGamesSequence = 0;

/**
 * Replace `games` with rows read from the active library's game database,
 * through the seam in `$lib/data`.
 *
 * A generous single page, not true incremental fetching: `readGames` is
 * already query-shaped for `limit`/`offset`, but `ContentTable.svelte`
 * still virtualises DOM rows over an already-loaded array — it does not yet
 * fetch on scroll. Swapping that is a separate change; this one proves the
 * read path without it, which is why `limit` defaults well above the
 * sample database's size rather than to `readGames`'s own default page.
 *
 * Runs on mount and again every time `activeLibraryId` changes (see the
 * subscribe below), and again whenever a write lands on a Library-view field
 * of the active library (`stores/importer.js`'s `runRealWrite` — a real
 * import's rows; a future favorite/trash/tag/collection write follows the
 * same rule). It deliberately does NOT run for a write that touches only
 * fields this query never reads — movetext, comments, engine data — since
 * `readGames()` below has nothing to show differently for those.
 *
 * STALE RESULTS ARE DISCARDED, NOT APPLIED. Two callers can legitimately
 * overlap — a switch's reload still in flight when an import's reload
 * starts, say — and without a guard, whichever one's reads happen to
 * resolve last would win even if it started first, silently reverting a
 * newer, correct write. `loadGamesSequence` (above) fixes that: each call
 * captures the sequence number current when IT started, and only applies
 * its result if nothing newer has started in the meantime. A no-op when
 * `activeLibraryConnection()` resolves `null` (no library selected, no real
 * backend available, or a still-mock row with nothing to open) — `games` is
 * left exactly as whatever set it last, same as before this was wired up.
 */
export async function loadGames({ limit = 5000 } = {}) {
  const sequence = ++loadGamesSequence;

  const connection = await activeLibraryConnection();
  if (!connection) return;

  const [rows, favoriteIds, trashedIds, tagRows, collectionRows, tagsByGame, collectionsByGame] =
    await Promise.all([
      readGames(connection, { limit }),
      readFavoriteIds(connection),
      readTrashedIds(connection),
      readTags(connection),
      readCollections(connection),
      readTagIdsByGame(connection),
      readCollectionIdsByGame(connection)
    ]);

  // A newer call has started since this one began — its result, once it
  // lands, is the authoritative one. Applying this older result now would
  // silently undo whatever the newer call already found or is about to.
  if (sequence !== loadGamesSequence) return;

  const favorite = new Set(favoriteIds);
  const trashed = new Set(trashedIds);

  games.set(rows.map((g) => ({
    ...g,
    trashed: trashed.has(g.id),
    favorite: favorite.has(g.id),
    tags: tagsByGame[g.id] ?? [],
    // §7.3's membership is many-to-many, same as tags — a game can carry
    // several Collections at once, so this is an array, not a single id.
    collections: collectionsByGame[g.id] ?? [],
    // subscription_games (§8) records which subscription a game arrived
    // through, in this same database — read path not added yet.
    subscription: null
    // games.created_at (§1) may legitimately be NULL — "a database populated
    // outside the application's import process... may have no created_at" —
    // `recentlyAdded()` (below) already treats a falsy `createdAt` as
    // ineligible, so nothing extra is derived here for it.
  })));

  tags.set(tagRows);
  collections.set(collectionRows);
}

/** { kind: 'all'|'favorites'|'recent'|'trash'|'subscription'|'collection'|'tag', id?: number } */
export const selection = writable({ kind: 'all' });
export const search = writable('');
export const selectedGameId = writable(null);
export const offline = writable(false);

/* ---------------- sidebar collapse (§3.2.3.8) ----------------------- */

const COLLAPSE_KEY = 'plyvio.library.sidebar';

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

const SECTIONS_KEY = 'plyvio.library.sections';

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

/* ---------------- Recently Added (§4.3.2) ------------------------- */

/**
 * "Recently Added" means the last import, not a time window — revised
 * 20 Sep 2026, on request. Every row from one `gameRowsFromPgnText()` call
 * shares a single `created_at` (see `pgn/importPgn.js`), so the games from
 * the most recent import are exactly the ones whose `createdAt` equals the
 * library's max `createdAt`. A game with no `createdAt` (a database
 * populated outside the application's import process, per §1) is never
 * eligible.
 */
export function recentlyAdded(all) {
  const eligible = all.filter((g) => !g.trashed && g.createdAt);
  if (!eligible.length) return [];
  const latest = eligible.reduce(
    (max, g) => (g.createdAt > max ? g.createdAt : max),
    eligible[0].createdAt
  );
  return eligible.filter((g) => g.createdAt === latest);
}

/* ---------------- filtering ----------------------------------------- */

export function applySelection(all, sel) {
  switch (sel.kind) {
    case 'trash':        return all.filter((g) => g.trashed);
    case 'favorites':    return all.filter((g) => !g.trashed && g.favorite);
    case 'recent':       return recentlyAdded(all);
    case 'subscription': return all.filter((g) => !g.trashed && g.subscription === sel.id);
    case 'collection':   return all.filter((g) => !g.trashed && g.collections.includes(sel.id));
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
    for (const c of g.collections) byCollection[c] = (byCollection[c] || 0) + 1;
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

/*
 * Reload on every switch, not just on mount — 20 Sep 2026, the switcher's
 * first real wiring (`stores/libraries.js`'s own header comment previously
 * called this "presentational only, deliberately"; that was never an
 * approved decision, just a comment, and it undersold what was actually
 * built here — see that file). `activeLibraryId` starts at whatever
 * `firstSelectable()` picks from the seeded/mock rows before `config.db`'s
 * real ones have loaded (`stores/settings.js`'s `loadLibraries()`, called
 * separately on mount); `loadGames()` no-ops for those (no `location`), so
 * this fires again, harmlessly, once the real list replaces them and
 * `libraries.js`'s own fallback subscribe repicks a real id.
 *
 * Also runs `resetLibrary()` on every switch (added the same day, on
 * request) — a still-selected tag/collection filter, a search term, or a
 * highlighted row from the PREVIOUS library carries no meaning in the new
 * one, so the Sidebar returns to All, search clears, and the collapsed
 * Subscriptions/Collections/Tags sections re-expand. This has to be defined
 * down here, after `resetLibrary()` and every store it touches
 * (`selection`/`search`/`selectedGameId`/`offline`/`sectionCollapsed`/
 * `pinnedExtra`) — `subscribe()` fires its callback immediately and
 * synchronously, and those are `const` bindings still in their temporal
 * dead zone at the top of the file where this subscribe used to live.
 */
activeLibraryId.subscribe(() => { resetLibrary(); loadGames(); });
