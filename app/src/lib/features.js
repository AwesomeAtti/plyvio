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
 * Hidden on request, 4 Sep. The button and its geometry are intact: the strip
 * layout still knows how to reserve space for it, and both branches are
 * tested, so restoring it is this one line.
 *
 * With it hidden the strip reclaims 36px in the normal state, so tabs reach
 * their preferred width slightly sooner and overflow slightly later.
 *
 * ITS ACTION IS UNRESOLVED. The button used to create an empty Game
 * Workspace, and empty Game Workspaces were removed on 4 Sep as a testing
 * holdover. The control therefore currently has nothing to do, which is
 * invisible only because it is hidden. `onNewTab` throws rather than guessing
 * — see TabBar.svelte. Unhiding it requires deciding what it does first.
 */
export const NEW_TAB_BUTTON = false;
