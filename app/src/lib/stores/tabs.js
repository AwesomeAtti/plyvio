import { writable, derived, get } from 'svelte/store';

/**
 * Workspace / tab model — spec §1.3, §2.1.1, §2.3.
 *
 * Invariants enforced here, not in the view:
 *   1. Exactly one Library tab. Pinned, index 0, never closable.
 *   2. Zero or one Settings tab. Never pinned. Always LAST in the strip.
 *   3. Game tabs are appended after the last Game tab — i.e. before Settings.
 *   4. Opening a workspace never replaces another; each keeps its own state.
 */

const LIBRARY = { id: 'library', kind: 'library', titleKey: 'tab.library', pinned: true, closable: false };

let seq = 0;
const nextId = () => `game-${++seq}`;

/** Strip tabs only — the Library tab lives outside the scrolling strip. */
export const stripTabs = writable([]);
export const activeId = writable(LIBRARY.id);

/** Per-workspace state, keyed by tab id. Proves §2.3: state survives tab switches. */
export const workspaceState = writable({ [LIBRARY.id]: { scratch: '' } });

export const libraryTab = LIBRARY;

/** Library first, then the strip — the order used by Ctrl+1…9 and the tab list. */
export const allTabs = derived(stripTabs, ($s) => [LIBRARY, ...$s]);

export const activeTab = derived([allTabs, activeId], ([$all, $id]) =>
  $all.find((t) => t.id === $id) || LIBRARY
);

function ensureState(id) {
  workspaceState.update((s) => (id in s ? s : { ...s, [id]: { scratch: '' } }));
}

/**
 * §3.2.4.3 — open a game from the Library.
 *
 * If a tab already shows this game, that tab is activated rather than a
 * second one created. Two tabs on one game would carry identical titles —
 * truncated identically at the 220px tab minimum — and would let the same
 * game's analysis diverge in two places.
 */
export function activateGameFor(gameId, title) {
  const existing = get(stripTabs).find((t) => t.kind === 'game' && t.gameId === gameId);
  if (existing) { activeId.set(existing.id); return existing.id; }
  return openGame(title, gameId);
}

/**
 * §2.1.2 — open a Game Tab on a game.
 *
 * A Game Tab always holds a game. There is no empty Game Workspace: the only
 * thing that ever produced one was the New Tab Button, which was a testing
 * holdover and has been removed. A title is therefore required, and a tab
 * with nothing in it cannot be constructed.
 */
export function openGame(title, gameId = null) {
  if (!title) throw new Error('openGame requires a title — there is no empty Game Workspace');
  const id = nextId();
  const tab = { id, kind: 'game', title, gameId, pinned: false, closable: true };
  stripTabs.update(($s) => {
    const idx = $s.findIndex((t) => t.kind === 'settings');
    const at = idx === -1 ? $s.length : idx;     // insert before Settings — rule 2 + 3
    return [...$s.slice(0, at), tab, ...$s.slice(at)];
  });
  ensureState(id);
  activeId.set(id);
  return id;
}

/** §2.2 — opens the single Settings tab, or activates the existing one. */
export function openSettings() {
  const existing = get(stripTabs).find((t) => t.kind === 'settings');
  if (existing) { activeId.set(existing.id); return existing.id; }
  const tab = { id: 'settings', kind: 'settings', titleKey: 'tab.settings', pinned: false, closable: true };
  stripTabs.update(($s) => [...$s, tab]);        // always last — rule 2
  ensureState('settings');
  activeId.set('settings');
  return 'settings';
}

/** §2.1.1 — closing activates the right neighbour, else the left, else Library. */
export function closeTab(id) {
  if (id === LIBRARY.id) return;
  const strip = get(stripTabs);
  const i = strip.findIndex((t) => t.id === id);
  if (i === -1) return;

  const wasActive = get(activeId) === id;
  const next = strip[i + 1] || strip[i - 1] || LIBRARY;

  stripTabs.set(strip.filter((t) => t.id !== id));
  workspaceState.update((s) => { const c = { ...s }; delete c[id]; return c; });
  if (wasActive) activeId.set(next.id);
}

export function activate(id) {
  if (get(allTabs).some((t) => t.id === id)) activeId.set(id);
}

export function activateByOffset(delta) {
  const all = get(allTabs);
  const i = all.findIndex((t) => t.id === get(activeId));
  const n = all.length;
  activeId.set(all[((i + delta) % n + n) % n].id);   // wraps, includes Library
}

export function activateIndex(n) {
  const all = get(allTabs);
  if (n >= 1 && n <= all.length) activeId.set(all[n - 1].id);
}

export function activateLast() {
  const all = get(allTabs);
  activeId.set(all[all.length - 1].id);
}

export function closeActive() {
  const id = get(activeId);
  if (id !== LIBRARY.id) closeTab(id);
}
