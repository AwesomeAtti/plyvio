/**
 * The one entry point for closing a tab — `analysis-board-plan.md`'s
 * Stage 1 close-time confirmation.
 *
 * Lives here rather than in `stores/tabs.js` because `tabs.js` cannot
 * import `stores/game.js` (`game.js` already imports `activeId` FROM
 * `tabs.js`, so the reverse import would cycle) but the guard needs
 * `isDirty`/`saveTab` from `game.js` and `closeTab`/`activeId` from
 * `tabs.js` both. Every way a tab can be closed — the tab strip's ×, the
 * tab-list menu's ×, and `Cmd/Ctrl+W` — routes through `requestCloseTab`
 * so the confirmation cannot be bypassed by using a different control.
 */

import { writable, derived, get } from 'svelte/store';
import { closeTab, activeId, allTabs } from './tabs.js';
import { isDirty, saveTab } from './game.js';

/** The tab id awaiting Save / Don't Save / Cancel, or null. */
export const pendingCloseId = writable(null);

/** The tab itself, for the dialog's title — null when nothing is pending. */
export const pendingCloseTab = derived([pendingCloseId, allTabs], ([$id, $all]) =>
  $all.find((t) => t.id === $id) ?? null
);

/**
 * Close a tab, asking first when it holds unsaved edits (`isDirty`). A tab
 * that isn't dirty — every non-game tab, and a game tab with nothing
 * staged — closes immediately, exactly as `closeTab` always did.
 */
export function requestCloseTab(id) {
  if (isDirty(id)) { pendingCloseId.set(id); return; }
  closeTab(id);
}

/** `Cmd/Ctrl+W`'s target — the active tab, guarded the same way. */
export function requestCloseActiveTab() {
  requestCloseTab(get(activeId));
}

export function cancelClose() {
  pendingCloseId.set(null);
}

export function discardAndClose() {
  const id = get(pendingCloseId);
  pendingCloseId.set(null);
  if (id) closeTab(id);
}

/**
 * Save, then close — but only once the save actually succeeds. `saveTab`
 * already logs a failure to the console (the same "the failure is not
 * silent, but the UI stays quiet" pattern the rest of this store's
 * background writes use); there is no error-surfacing UI to route through
 * yet, so a failed save just leaves the tab open and still dirty rather
 * than closing over a change that was never written.
 */
export async function saveAndClose() {
  const id = get(pendingCloseId);
  if (!id) return;
  try {
    await saveTab(id);
    pendingCloseId.set(null);
    closeTab(id);
  } catch {
    pendingCloseId.set(null);
  }
}
