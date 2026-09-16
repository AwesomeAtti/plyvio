import { writable, derived, get } from 'svelte/store';
import { objects } from './settings.js';

/**
 * Library switcher — §3.2.3.10.
 *
 * A Library IS a database file; the two words name the same object, and the
 * Settings Workspace configures them under "Databases" (§3.4.8). This store
 * does not own that list — it reads it, so a database added or renamed in
 * Settings appears here without a second source of truth.
 *
 * PRESENTATIONAL ONLY, deliberately. Selecting a library changes the name in
 * the header and nothing else: the same games stay on screen, search is
 * untouched, and no filter is applied. The prototype exists to validate the
 * control, not to implement multi-database scoping — and a switcher that
 * appeared to work while silently doing nothing would be worse than one that
 * is documented as inert.
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
  return true;
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
