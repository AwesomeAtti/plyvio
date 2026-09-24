/**
 * Prototype feature flags.
 *
 * These are switches for behaviour that is specified but deliberately not
 * shown, so it can be turned back on without reconstructing it. A flag here
 * means "built and tested, currently hidden" — not "unfinished".
 */

/**
 * §2.1.2 — the New Tab Button.
 *
 * Hidden 4 Sep, given an action and unhidden 24 Sep: "New Game" — a blank
 * draft at the standard starting position, unsaved until Save
 * (`analysis-board-plan.md` Stage 3, agreed and built 24 Sep). This
 * reverses the 4 Sep "no empty Game Workspace" removal that took the
 * button's own action away — see `stores/newGame.js`'s `openNewGame` and
 * `TabBar.svelte`'s `onNewTab`.
 */
export const NEW_TAB_BUTTON = true;
