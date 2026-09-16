/**
 * Settings Workspace geometry. §3.4.4, §3.4.10, §3.4.12
 *
 * Pure, so the column-count claims in the wireframes can be verified without
 * a browser — jsdom applies no stylesheets, so computed styles cannot.
 */

export const SIDEBAR_WIDTH = 220;   // fixed, approved 3 Sep
export const CARD_MIN = 210;        // grid floor
export const CARD_GAP = 12;
export const CONTENT_PAD = 44;      // 22px each side

/** Width available to the Content Area for a given window width. */
export function contentWidth(windowWidth) {
  return Math.max(0, windowWidth - SIDEBAR_WIDTH);
}

/** Usable width once the Content Area's own padding is removed. */
export function usableWidth(windowWidth) {
  return Math.max(0, contentWidth(windowWidth) - CONTENT_PAD);
}

/**
 * How many card columns fit. n columns need n*CARD_MIN + (n-1)*CARD_GAP.
 * Never returns 0 — a single column always renders, wrapping rather than
 * introducing horizontal scrolling. (§3.4.10)
 */
export function cardColumns(windowWidth) {
  const usable = usableWidth(windowWidth);
  const n = Math.floor((usable + CARD_GAP) / (CARD_MIN + CARD_GAP));
  return Math.max(1, n);
}

/** Smallest window width that fits n columns. */
export function windowWidthFor(columns) {
  const usable = columns * CARD_MIN + (columns - 1) * CARD_GAP;
  return usable + CONTENT_PAD + SIDEBAR_WIDTH;
}
