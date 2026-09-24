/**
 * The one entry point for a Game Workspace tab that starts from nothing —
 * `analysis-board-plan.md`'s Stage 3. Two callers: the New Tab Button
 * (`TabBar.svelte`'s `+`, `Ctrl/Cmd+T`) opens a blank draft; a board paste
 * of a FEN or single-game PGN (`pgn/pasteDetect.js`) either opens one too
 * or replaces the active tab's game, after confirming.
 *
 * Lives here rather than in `stores/game.js` for the same reason
 * `closeGuard.js` does: `game.js` already imports `activeId` FROM
 * `tabs.js`, so `tabs.js` importing `game.js` back would cycle. This module
 * sits above both, the same shape `closeGuard.js` already established.
 */

import { writable, get } from 'svelte/store';
import { openGame, activeId, allTabs } from './tabs.js';
import { seedDraftGame, replaceTabWithDraft, isPristineDraft } from './game.js';
import { detectPaste } from '$lib/pgn/pasteDetect.js';
import { t } from './i18n.js';

/** The + button / `Ctrl/Cmd+T` — a blank draft at the standard starting
 *  position, unsaved until Save. */
export function openNewGame() {
  return openGame(get(t)('game.newGame'), seedDraftGame());
}

/**
 * A detected paste awaiting confirmation — `{ tabId, seed, kind }`, or
 * `null`. `ConfirmPasteImport.svelte` reads this; `AppShell.svelte` shows
 * it whenever it isn't null.
 */
export const pendingPaste = writable(null);

/** `seedDraftGame`'s own seed shape, from what `detectPaste` found. */
function seedFor(detected) {
  return detected.type === 'fen'
    ? { fen: detected.fen }
    : { movetext: detected.movetext, fen: detected.fen, fields: detected.fields };
}

/**
 * Handle a paste that reaches the shell — `AppShell.svelte`'s own window
 * listener already filters out an editable field's paste (that one always
 * wins) and a tab that isn't a Game Workspace before calling this.
 *
 * A multi-game paste and anything that isn't a FEN or single-game PGN are
 * silent no-ops for now — the board paste target is for one position/game,
 * not a batch; a multi-game paste pointing at Add Games instead is tracked
 * in `working/ACTIONS.md` rather than built here, alongside a feedback
 * mechanism for a paste that matches nothing at all (there is no toast/
 * notice primitive in the shell yet to hang either on).
 */
export function handlePaste(rawText) {
  const tabId = get(activeId);
  const tab = get(allTabs).find((tb) => tb.id === tabId);
  if (!tab || tab.kind !== 'game') return;

  const detected = detectPaste(rawText);
  if (detected.type === 'none' || detected.type === 'multi') return;

  const seed = seedFor(detected);

  // Nothing to lose — the current tab is a draft nobody has touched yet
  // (most commonly: paste immediately after opening New Game) — load
  // straight in rather than asking to confirm a no-op choice.
  if (isPristineDraft(tabId)) {
    replaceTabWithDraft(tabId, seed);
    return;
  }

  pendingPaste.set({ tabId, seed, kind: detected.type });
}

/** "Open in New Tab" — the confirm dialog's default action. */
export function confirmPasteNewTab() {
  const pending = get(pendingPaste);
  if (!pending) return;
  pendingPaste.set(null);
  openGame(get(t)('game.newGame'), seedDraftGame(pending.seed));
}

/** "Replace This Game" — detaches the tab into its own new draft; see
 *  `game.js`'s `replaceTabWithDraft` for why the game it replaces is never
 *  written to. */
export function confirmPasteReplace() {
  const pending = get(pendingPaste);
  if (!pending) return;
  pendingPaste.set(null);
  replaceTabWithDraft(pending.tabId, pending.seed);
}

export function cancelPaste() {
  pendingPaste.set(null);
}
