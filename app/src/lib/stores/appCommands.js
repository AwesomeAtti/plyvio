import { writable, get } from 'svelte/store';

/**
 * Application-level commands surfaced in the Application Menu.
 *
 * Both of these depend on capabilities the host may withhold, so both report
 * their outcome rather than failing silently.
 */

/* ---------------- Fullscreen ---------------------------------------- */

export const isFullscreen = writable(false);

function syncFullscreen(doc = globalThis.document) {
  if (!doc) return;
  isFullscreen.set(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
}

/** Wire up fullscreen state tracking. Returns a teardown function. */
export function watchFullscreen(doc = globalThis.document) {
  if (!doc?.addEventListener) return () => {};
  const onChange = () => syncFullscreen(doc);
  onChange();
  doc.addEventListener('fullscreenchange', onChange);
  doc.addEventListener('webkitfullscreenchange', onChange);
  return () => {
    doc.removeEventListener('fullscreenchange', onChange);
    doc.removeEventListener('webkitfullscreenchange', onChange);
  };
}

export function fullscreenSupported(doc = globalThis.document) {
  if (!doc) return false;
  const el = doc.documentElement;
  return Boolean(
    doc.fullscreenEnabled ||
    doc.webkitFullscreenEnabled ||
    el?.requestFullscreen ||
    el?.webkitRequestFullscreen
  );
}

/**
 * Toggle fullscreen. Must be called from a user gesture — a menu click
 * qualifies. Returns a promise resolving to the resulting state.
 */
export async function toggleFullscreen(doc = globalThis.document) {
  const el = doc.documentElement;
  const active = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
  try {
    if (active) {
      await (doc.exitFullscreen?.call(doc) ?? doc.webkitExitFullscreen?.call(doc));
    } else {
      await (el.requestFullscreen?.call(el) ?? el.webkitRequestFullscreen?.call(el));
    }
  } catch {
    // Rejected (no gesture, or the host forbids it). State stays as it was.
  }
  syncFullscreen(doc);
  return get(isFullscreen);
}

/* ---------------- Quit ---------------------------------------------- */

/**
 * Set when Quit could not close the window, so the UI can say so instead of
 * appearing to do nothing.
 */
export const quitBlocked = writable(false);

/**
 * Attempt to close the application window.
 *
 * Browsers only reliably permit window.close() on windows opened by script.
 * An installed PWA window generally qualifies in Chrome; a normal browser tab
 * never does, and Safari is inconsistent. We therefore attempt the close and
 * verify shortly afterwards — if we are still running, the host refused, and
 * `quitBlocked` is raised so the user is told rather than left guessing.
 */
export function quit(win = globalThis, { verifyAfter = 250 } = {}) {
  quitBlocked.set(false);
  try {
    win.close();
  } catch {
    quitBlocked.set(true);
    return;
  }
  // If this timer still runs, the window did not close.
  win.setTimeout(() => {
    if (!win.closed) quitBlocked.set(true);
  }, verifyAfter);
}

export function dismissQuitNotice() {
  quitBlocked.set(false);
}
