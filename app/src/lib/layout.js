/**
 * Tab Strip geometry — spec §2.1.3, requirement 3.
 *
 * Pure and side-effect free so it can be tested exhaustively without a DOM.
 *
 * Two-stage model:
 *   Stage 1  tabs shrink from TAB_PREF toward TAB_MIN
 *   Stage 2  at TAB_MIN shrinking stops and the strip becomes scrollable,
 *            which moves the New Tab Button into the Tab Bar Controls and
 *            reveals the scroll controls and tab list.
 *
 * The overflow decision is computed from the NORMAL-state budget only. It must
 * not depend on the width of the controls that overflow itself introduces —
 * that feedback loop would oscillate at the boundary.
 */

import { NEW_TAB_BUTTON } from './features.js';

export const TAB_MIN   = 220;   // hard floor (requirement 3)
export const TAB_PREF  = 300;   // preferred width
export const BTN       = 36;    // one control button
export const NEWTAB_W  = BTN;
export const MENU_W    = 40;    // application menu button
export const SCROLL_W  = BTN * 2;   // ◀ ▶
export const TABLIST_W = BTN;       // ▾  (WF-06b)

/**
 * Width the Tab Bar Controls occupy in each state.
 *
 * `newTab` is a parameter rather than a direct read of the flag so the two
 * branches stay independently testable — hiding a control must not make the
 * geometry that reserves space for it untestable.
 */
export function controlsWidth(overflow, newTab = NEW_TAB_BUTTON) {
  const plus = newTab ? NEWTAB_W : 0;
  return overflow ? plus + SCROLL_W + TABLIST_W + MENU_W : MENU_W;
}

/**
 * @param {number} barWidth     total Tab Bar width in px
 * @param {number} pinnedWidth  measured width of the pinned Library tab
 * @param {number} tabCount     number of strip tabs (games + settings)
 * @param {boolean} newTab      whether the New Tab Button is shown
 */
export function computeLayout(barWidth, pinnedWidth, tabCount, newTab = NEW_TAB_BUTTON) {
  const normalAvail = Math.max(0, barWidth - pinnedWidth - MENU_W);
  const plus = newTab ? NEWTAB_W : 0;

  const rawWidth = tabCount > 0
    ? Math.min(TAB_PREF, Math.floor((normalAvail - plus) / tabCount))
    : TAB_PREF;

  const overflow = tabCount > 0 && rawWidth < TAB_MIN;
  const tabWidth = overflow ? TAB_MIN : Math.max(TAB_MIN, rawWidth);

  const stripWidth = Math.max(0, barWidth - pinnedWidth - controlsWidth(overflow, newTab));
  const contentWidth = tabCount * tabWidth + (overflow ? 0 : plus);

  return {
    overflow,
    tabWidth,
    stripWidth,
    contentWidth,
    scrollable: overflow && contentWidth > stripWidth,
    visibleTabs: tabWidth > 0 ? stripWidth / tabWidth : 0
  };
}

/**
 * Which strip tabs sit outside the scroll viewport, for the tab-list
 * dropdown's off-screen markers. All strip tabs share one width, so
 * position is exact without measuring elements.
 * @returns {null|'left'|'right'}
 */
export function offscreenSide(index, tabWidth, scrollLeft, viewportWidth) {
  const left = index * tabWidth;
  const right = left + tabWidth;
  if (right <= scrollLeft + 1) return 'left';
  if (left >= scrollLeft + viewportWidth - 1) return 'right';
  return null;   // fully or partially visible
}
