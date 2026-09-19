/**
 * Middle truncation — Library switcher. Unnumbered until the switcher is
 * specified: see STATUS.md.
 *
 * CSS `text-overflow: ellipsis` only truncates at the end, which is the wrong
 * end for library names. Libraries are files, and files get versioned by year:
 *
 *   "Plyvio Reference 2026"  ─end─►  "Plyvio Referenc…"
 *   "Plyvio Reference 2025"  ─end─►  "Plyvio Referenc…"
 *
 * Two different libraries, one string on screen. Middle truncation keeps the
 * tail, which is where the distinguishing part lives — the same reason macOS
 * truncates filenames in the middle.
 *
 * The measuring function is a parameter rather than a canvas call so the
 * algorithm stays pure and can be swept in tests; the DOM measurer lives in
 * `measureText` below and is used only by components.
 */

export const ELLIPSIS = '…';

/**
 * @param {string} text
 * @param {number} maxPx      space available
 * @param {(s: string) => number} measure
 * @param {{tail?: number}} [opts]  characters to preserve at the end
 * @returns {string}
 */
export function middleTruncate(text, maxPx, measure, { tail = 6 } = {}) {
  if (!text) return '';
  if (maxPx <= 0) return '';
  if (measure(text) <= maxPx) return text;

  const ell = measure(ELLIPSIS);

  // The tail is what makes two similar names distinguishable, so it is kept
  // whole — but never more than half the string, or short names lose their head.
  const keep = Math.min(tail, Math.floor(text.length / 2));
  const tailStr = keep > 0 ? text.slice(-keep) : '';
  const budget = maxPx - ell - measure(tailStr);

  if (budget <= 0) {
    // Not even the tail fits. Fall back to an end truncation, which at least
    // shows something rather than an ellipsis alone.
    for (let i = text.length; i > 0; i--) {
      if (measure(text.slice(0, i)) + ell <= maxPx) return text.slice(0, i).trimEnd() + ELLIPSIS;
    }
    return ELLIPSIS;
  }

  for (let i = text.length - keep; i > 0; i--) {
    if (measure(text.slice(0, i)) <= budget) {
      return text.slice(0, i).trimEnd() + ELLIPSIS + tailStr;
    }
  }
  return ELLIPSIS + tailStr;
}

/**
 * Canvas text measurement for the real UI.
 *
 * jsdom returns 0 for every width, so this is never the measurer under test —
 * `middleTruncate` takes the function precisely so the two can be separated.
 * Returns null where no canvas is available, and callers fall back to CSS
 * end-truncation rather than truncating wrongly.
 */
export function measureText(font) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return null;
  ctx.font = font;
  // A zero width means the environment is not really measuring (jsdom).
  if (ctx.measureText('M').width === 0) return null;
  return (s) => ctx.measureText(s).width;
}
