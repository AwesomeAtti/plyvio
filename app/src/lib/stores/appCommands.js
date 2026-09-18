import { writable } from 'svelte/store';
import * as web from './appCommands.web.js';

/**
 * Application-level commands surfaced in the Application Menu.
 *
 * One codebase serves two targets — a browser/PWA build and a Tauri desktop
 * build — and these commands are the one place that genuinely behaves
 * differently between them: Fullscreen and Quit are host capabilities, not
 * application logic, so what "toggle fullscreen" or "quit" actually does is
 * a property of the window they're running in.
 *
 * This file is the single import point. It owns the reactive state
 * (isFullscreen, quitBlocked) so every component subscribes to the same
 * stores regardless of which backend is answering calls, and it dispatches
 * each function to the backend that matches the host:
 *
 *   - appCommands.web.js   — the original Fullscreen API / window.close()
 *     behavior, imported statically (it has no dependency worth
 *     code-splitting away, and toggleFullscreen's user-gesture requirement
 *     needs to stay synchronous with the click that triggered it).
 *   - appCommands.tauri.js — native Tauri window APIs, reached only through
 *     a dynamic import(). A plain browser/PWA visit never evaluates
 *     `isTauri()` as true, so that import() is never issued and '@tauri-apps/api'
 *     is never fetched — it exists in the build output but nothing in the
 *     browser build path ever requests it over the wire.
 *
 * This mirrors `data/connection.js` + `data/backends/`: a shared contract,
 * with everything that knows a specific host living in its own file.
 */

export const isFullscreen = writable(false);
export const quitBlocked = writable(false);

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

let tauriPromise = null;
const tauri = () => (tauriPromise ??= import('./appCommands.tauri.js'));

/** Wire up fullscreen state tracking. Returns a teardown function. */
export function watchFullscreen(doc = globalThis.document) {
  if (!isTauri()) return web.watchFullscreen(doc, isFullscreen);

  let cancelled = false;
  let teardown = () => {};
  tauri().then((mod) => {
    if (cancelled) return;
    teardown = mod.watchFullscreen(isFullscreen);
  });
  return () => {
    cancelled = true;
    teardown();
  };
}

export function fullscreenSupported(doc = globalThis.document) {
  // Every Tauri window supports native fullscreen; no capability check needed.
  return isTauri() ? true : web.fullscreenSupported(doc);
}

/**
 * Toggle fullscreen. On the web backend this must be called from a user
 * gesture — a menu click qualifies. Returns a promise resolving to the
 * resulting state.
 */
export async function toggleFullscreen(doc = globalThis.document) {
  if (!isTauri()) return web.toggleFullscreen(doc, isFullscreen);
  const mod = await tauri();
  return mod.toggleFullscreen(isFullscreen);
}

/**
 * Set when Quit could not close the window, so the UI can say so instead of
 * appearing to do nothing. Only ever raised by the web backend — a native
 * Tauri close is unconditional, so this stays false throughout the Tauri
 * build and QuitNotice.svelte never has anything to show there.
 */
export function quit(win = globalThis, opts = {}) {
  if (!isTauri()) return web.quit(win, opts, quitBlocked);
  tauri().then((mod) => mod.quit());
}

export function dismissQuitNotice() {
  quitBlocked.set(false);
}
