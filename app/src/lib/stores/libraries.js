import { writable, derived, get } from 'svelte/store';
import { objects } from './settings.js';
import { configConnection } from '$lib/data/session.js';
import { readUiState, writeUiState } from '$lib/data/config.js';

/**
 * Library switcher — §3.2.3.10.
 *
 * A Library IS a database file; the two words name the same object, and the
 * Settings Workspace configures them under "Databases" (§3.4.8). This store
 * does not own that list — it reads it, so a database added or renamed in
 * Settings appears here without a second source of truth.
 *
 * Selecting a library changes `activeLibraryId`, which `stores/library.js`'s
 * `loadGames()` now reloads from (20 Sep 2026) — a real library switch, not
 * a cosmetic one. It was inert before that: this file's own comment used to
 * call that "deliberate," which wasn't accurate — it was an unfinished
 * seam, not an approved scope decision, and describing it that way glossed
 * over a real gap instead of flagging it.
 *
 * `stores/library.js`'s own `activeLibraryId.subscribe` also resets
 * `selection`/`search`/`selectedGameId`/the Sidebar's collapsed sections on
 * every switch (added 20 Sep 2026, on request).
 *
 * The selection also PERSISTS (same day): `selectLibrary()` writes the
 * chosen id to `config.db`'s `ui_state` table (key `activeLibraryId`,
 * `data/config.js`'s `writeUiState()` — free-form key/value, unlike
 * `preferences`' fixed schema, and that table's own doc comment already
 * names exactly this kind of thing: "sidebar, folded groups, open tabs").
 * `loadActiveLibrarySelection()` reads it back on mount, after
 * `stores/settings.js`'s `loadLibraries()` has loaded the real rows in
 * (a full replace on Tauri, a merge alongside the seeded rows on PWA since
 * 22 Sep 2026) — see that function's own comment for why the order matters.
 */

/** A database is offerable when it has finished indexing and is enabled. */
export const isSelectable = (db) => db.status === 'indexed' && db.enabled !== false;

/**
 * The switcher's list. Unavailable and indexing databases are LISTED but not
 * selectable: hiding a configured database would make it look deleted.
 */
export const libraries = derived(objects, ($o) =>
  ($o.databases ?? []).map((db) => ({
    id: db.id,
    name: db.name,
    status: db.status,
    meta: db.meta,
    enabled: db.enabled !== false,
    selectable: isSelectable(db)
  }))
);

function firstSelectable(list) {
  return list.find((l) => l.selectable)?.id ?? list[0]?.id ?? null;
}

export const activeLibraryId = writable(firstSelectable(get(libraries)));

export const activeLibrary = derived(
  [libraries, activeLibraryId],
  ([$libs, $id]) => $libs.find((l) => l.id === $id) ?? $libs[0] ?? null
);

/** Selecting a non-selectable entry is a no-op rather than an error. */
export function selectLibrary(id) {
  const lib = get(libraries).find((l) => l.id === id);
  if (!lib || !lib.selectable) return false;
  activeLibraryId.set(id);
  persistActiveLibraryId(id);
  return true;
}

/**
 * `selectLibrary()`'s own persistence — a user's explicit pick, not the
 * fallback subscribe below or the startup restore, both of which set
 * `activeLibraryId` too but shouldn't re-write the same value they just
 * read (harmless, but pointless I/O on every launch).
 */
async function persistActiveLibraryId(id) {
  try {
    const connection = await configConnection();
    if (connection) await writeUiState(connection, 'activeLibraryId', id);
  } catch (err) {
    console.error('Plyvio: failed to remember the active library', err);
  }
}

/**
 * Restore the last-selected library, once, on mount (`AppShell.svelte`,
 * chained after `loadLibraries()` resolves — calling this any earlier would
 * race the fallback subscribe below: it fires on every `libraries` change,
 * including `loadLibraries()`'s own update (a full replace on Tauri, a
 * merge alongside the seeded rows on PWA), and would immediately override a
 * persisted id that isn't in the list yet with `firstSelectable()`). A
 * no-op if nothing was
 * ever persisted, or if the persisted id no longer names a selectable
 * library (deleted or disabled since) — `activeLibraryId`'s own default
 * already covers that case.
 */
export async function loadActiveLibrarySelection() {
  try {
    const connection = await configConnection();
    if (!connection) return;
    const { activeLibraryId: savedId } = await readUiState(connection);
    if (savedId == null) return;
    const lib = get(libraries).find((l) => l.id === savedId);
    if (lib && lib.selectable) activeLibraryId.set(savedId);
  } catch (err) {
    console.error('Plyvio: failed to restore the active library', err);
  }
}

/**
 * If the active library is deleted or disabled in Settings while the Library
 * Workspace is open, fall back rather than showing a name that no longer
 * exists. §3.4.8 lets both happen at any time, and auto-apply means there is
 * no Save step to intercept it.
 */
libraries.subscribe(($libs) => {
  const id = get(activeLibraryId);
  if (id && $libs.some((l) => l.id === id && l.selectable)) return;
  const next = firstSelectable($libs);
  if (next !== id) activeLibraryId.set(next);
});

export function resetLibrarySelection() {
  activeLibraryId.set(firstSelectable(get(libraries)));
}
