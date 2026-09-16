/**
 * Library switcher geometry — §3.2.3.10.
 *
 * The switcher middle-truncates its label, and middle truncation needs a pixel
 * budget before it can measure anything. That budget used to be the literal
 * `122` passed as a prop from the Sidebar. It was wrong by 18px — narrow, so
 * names truncated earlier than they had to — and being a literal in two files,
 * nothing would have caught it moving out of step with the CSS.
 *
 * The Sidebar is a fixed 220px and is not user-resizable (§3.2.3.9), so the
 * budget is a derivation rather than a measurement. Deriving it here keeps the
 * arithmetic in one place, under test, next to the numbers it depends on.
 *
 *   ├───────────────────────── 220 ─────────────────────────┤
 *   │ 8 │             switcher 178             │ 8 │ tog 20 │ 6 │
 *            │ 4 │    name 152    │ 4 │ chv 14 │ 4 │
 *
 * If any of these change in LibrarySidebar.svelte or LibrarySwitcher.svelte,
 * change them here too — `switcher.test.js` asserts the total closes.
 */

/** Sidebar, expanded. §3.2.2. */
export const SIDEBAR_W = 220;

/* The header band: `padding: 0 6px 0 8px`, `gap: 8px`, 20px collapse control. */
export const HEAD_PAD_L = 8;
export const HEAD_PAD_R = 6;
export const HEAD_GAP = 8;
export const TOGGLE_W = 20;

/*
 * The trigger: `padding: 0 4px`, `gap: 4px`, 14px chevron.
 *
 * These shrank when the trigger lost its frame (5 Sep). The 8px left padding
 * existed to hold the name off a border that is no longer drawn; at 4px, with
 * the header's own padding down to 8, the name starts at 12px — the Sidebar's
 * left margin, shared with the group headings below.
 */
export const TRIGGER_PAD_L = 4;
export const TRIGGER_PAD_R = 4;
export const TRIGGER_GAP = 4;
export const CHEVRON_W = 14;

/** Width of the switcher control itself, filling the header beside the toggle. */
export const SWITCHER_W =
  SIDEBAR_W - HEAD_PAD_L - HEAD_PAD_R - HEAD_GAP - TOGGLE_W;

/**
 * Pixels available to the library name inside the trigger. This is the budget
 * handed to `middleTruncate`.
 */
export const NAME_W =
  SWITCHER_W - TRIGGER_PAD_L - TRIGGER_PAD_R - TRIGGER_GAP - CHEVRON_W;

/**
 * The same derivation for any sidebar width, so a future resizable Sidebar
 * changes one call rather than a constant.
 * @param {number} sidebarWidth
 * @returns {number} pixels available to the name, never below zero
 */
export function nameWidth(sidebarWidth = SIDEBAR_W) {
  const switcher = sidebarWidth - HEAD_PAD_L - HEAD_PAD_R - HEAD_GAP - TOGGLE_W;
  return Math.max(0, switcher - TRIGGER_PAD_L - TRIGGER_PAD_R - TRIGGER_GAP - CHEVRON_W);
}

/** The font the trigger renders its name in; the measurer must match it. */
export const NAME_FONT = '600 13px "IBM Plex Sans", system-ui, sans-serif';
