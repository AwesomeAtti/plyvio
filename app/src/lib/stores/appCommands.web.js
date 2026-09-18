/**
 * Browser/PWA backend for application-level commands.
 *
 * This is the pre-Tauri behavior, unchanged in substance from before the
 * desktop target existed — only moved out of appCommands.js and reshaped to
 * take the shared stores as arguments instead of owning them (appCommands.js
 * owns isFullscreen/quitBlocked now, so both backends write into the same
 * stores components already subscribe to).
 *
 * Both of these depend on capabilities the host may withhold, so both report
 * their outcome rather than failing silently. See appCommands.tauri.js for
 * the native equivalent used inside the desktop build — the two do not
 * share code because the capabilities themselves work differently (a real
 * OS-owned window close vs. a browser's conditional window.close()).
 */

/* ---------------- Fullscreen ---------------------------------------- */

function syncFullscreen(doc, store) {
  if (!doc) return;
  store.set(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
}

/** Wire up fullscreen state tracking. Returns a teardown function. */
export function watchFullscreen(doc, store) {
  if (!doc?.addEventListener) return () => {};
  const onChange = () => syncFullscreen(doc, store);
  onChange();
  doc.addEventListener('fullscreenchange', onChange);
  doc.addEventListener('webkitfullscreenchange', onChange);
  return () => {
    doc.removeEventListener('fullscreenchange', onChange);
    doc.removeEventListener('webkitfullscreenchange', onChange);
  };
}

export function fullscreenSupported(doc) {
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
export async function toggleFullscreen(doc, store) {
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
  syncFullscreen(doc, store);
  let result;
  store.subscribe((v) => (result = v))();
  return result;
}

/* ---------------- Quit ---------------------------------------------- */

/**
 * Attempt to close the application window.
 *
 * Browsers only reliably permit window.close() on windows opened by script.
 * An installed PWA window generally qualifies in Chrome; a normal browser tab
 * never does, and Safari is inconsistent. We therefore attempt the close and
 * verify shortly afterwards — if we are still running, the host refused, and
 * `quitBlockedStore` is raised so the user is told rather than left guessing.
 */
export function quit(win, { verifyAfter = 250 } = {}, quitBlockedStore) {
  quitBlockedStore.set(false);
  try {
    win.close();
  } catch {
    quitBlockedStore.set(true);
    return;
  }
  // If this timer still runs, the window did not close.
  win.setTimeout(() => {
    if (!win.closed) quitBlockedStore.set(true);
  }, verifyAfter);
}
