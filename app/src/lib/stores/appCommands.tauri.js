/**
 * Tauri backend for application-level commands.
 *
 * This is the one file allowed to import '@tauri-apps/api' — mirroring the
 * rule in `data/connection.js` that `data/backends/` is the only place
 * allowed to know a SQLite driver exists. appCommands.js only reaches this
 * module through a dynamic import(), gated on detecting a Tauri host, so a
 * plain browser/PWA visit never fetches this module or the package it pulls
 * in.
 *
 * Unlike the browser backend (appCommands.web.js), Quit here needs no
 * "attempt and verify" dance: a native window close is real and
 * unconditional — the OS owns it — which is the whole reason
 * quitBlocked/QuitNotice.svelte exist on the web side and not here.
 */
import { getCurrentWindow } from '@tauri-apps/api/window';

const win = () => getCurrentWindow();

async function syncFullscreen(store) {
  store.set(await win().isFullscreen());
}

/**
 * Wire up fullscreen state tracking, including changes the user triggers
 * outside the menu (macOS's green traffic-light button, or a keyboard
 * shortcut the OS handles itself). Tauri has no dedicated fullscreen-change
 * event, but entering/exiting fullscreen always resizes the window, so a
 * resize listener plus a state re-read is the native equivalent of the web
 * backend's `fullscreenchange` listener. Returns a teardown function.
 */
export function watchFullscreen(store) {
  let unlisten = null;
  let cancelled = false;
  syncFullscreen(store);
  win()
    .onResized(() => syncFullscreen(store))
    .then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });
  return () => {
    cancelled = true;
    unlisten?.();
  };
}

/** Toggle native fullscreen. Returns a promise resolving to the resulting state. */
export async function toggleFullscreen(store) {
  const w = win();
  const active = await w.isFullscreen();
  const next = !active;
  await w.setFullscreen(next);
  store.set(next);
  return next;
}

/** Close the window. Native close needs no refusal path — see module header. */
export function quit() {
  win().close();
}
