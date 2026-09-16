/**
 * §2.4 — "Its minimum size is 800 × 600 pixels. This is a hard minimum: the
 * window cannot be resized below 800 pixels in width or 600 pixels in height."
 *
 * How hard this can actually be depends on where the app is running:
 *
 *   Browser tab      The user agent owns the window; nothing in the page can
 *                    veto a resize. CSS keeps the shell coherent instead
 *                    (#app-root has min-width/min-height, so the viewport
 *                    scrolls rather than the layout collapsing).
 *
 *   Installed PWA    A standalone PWA window may call window.resizeTo(), so
 *                    the floor is enforced by snapping the window back. The
 *                    user can still start a drag below the floor; they cannot
 *                    finish one.
 *
 *   Native shell     Tauri/Electron set minWidth/minHeight on the window and
 *                    the OS refuses the drag outright. That is the only truly
 *                    hard version of this clause.
 *
 * This module implements the middle case and degrades safely in the first.
 */

export const MIN_WIDTH = 800;
export const MIN_HEIGHT = 600;

/**
 * Pure geometry: given the current viewport and window box, return the outer
 * size the window must be resized to, or null if it already satisfies the floor.
 *
 * The floor applies to the *viewport* — the shell's usable area — so the window
 * chrome (title bar, borders) is added back on top of the minimum.
 */
export function computeClamp(
  { innerWidth, innerHeight, outerWidth, outerHeight },
  min = { width: MIN_WIDTH, height: MIN_HEIGHT }
) {
  // Window chrome is whatever the outer box has that the viewport doesn't.
  const chromeW = Math.max(0, outerWidth - innerWidth);
  const chromeH = Math.max(0, outerHeight - innerHeight);

  const needW = min.width + chromeW;
  const needH = min.height + chromeH;

  const short = innerWidth < min.width || innerHeight < min.height;
  if (!short) return null;

  return {
    width: Math.max(outerWidth, needW),
    height: Math.max(outerHeight, needH)
  };
}

/** True when the app owns its window and may therefore resize it. */
export function ownsWindow(win = globalThis) {
  const mm = win.matchMedia;
  if (typeof mm !== 'function') return false;
  return (
    mm.call(win, '(display-mode: standalone)').matches ||
    mm.call(win, '(display-mode: window-controls-overlay)').matches ||
    mm.call(win, '(display-mode: fullscreen)').matches ||
    win.navigator?.standalone === true      // iOS/macOS Safari home-screen apps
  );
}

/**
 * Enforce the floor. Returns a teardown function.
 *
 * Gives up after `maxFailures` consecutive ineffective attempts so that a
 * browser which silently ignores resizeTo() doesn't get fought on every
 * resize event for the lifetime of the session.
 */
export function enforceWindowFloor(win = globalThis, { maxFailures = 3 } = {}) {
  const noop = () => {};
  if (typeof win.addEventListener !== 'function') return noop;
  if (!ownsWindow(win)) return noop;              // browser tab: CSS handles it
  if (typeof win.resizeTo !== 'function') return noop;

  let handle = 0;
  let pending = false;
  let failures = 0;
  let disabled = false;

  // `pending` is raised BEFORE scheduling and lowered inside the callback, so
  // the guard stays correct whether the scheduler runs sync or async. Deriving
  // it from the frame handle instead would go stale under a synchronous
  // requestAnimationFrame and silently ignore every later resize.
  const schedule = (fn) =>
    typeof win.requestAnimationFrame === 'function'
      ? win.requestAnimationFrame(fn)
      : setTimeout(fn, 16);

  const attempt = () => {
    if (disabled) return;

    const target = computeClamp(win);
    if (!target) { failures = 0; return; }

    try {
      win.resizeTo(target.width, target.height);
    } catch {
      disabled = true;                       // refused outright
      return;
    }

    // Resizes are NOT applied synchronously, so the result cannot be read back
    // on this tick — doing so reports a false failure on platforms where the
    // call actually worked. Verify on the following frame instead.
    schedule(() => {
      if (computeClamp(win)) {
        if (++failures >= maxFailures) disabled = true;   // being ignored
      } else {
        failures = 0;
      }
    });
  };

  const onResize = () => {
    if (pending || disabled) return;
    pending = true;
    handle = schedule(() => { pending = false; attempt(); });
  };

  win.addEventListener('resize', onResize);
  attempt();                                      // enforce on launch too

  return () => {
    win.removeEventListener('resize', onResize);
    if (handle && typeof win.cancelAnimationFrame === 'function') win.cancelAnimationFrame(handle);
  };
}
