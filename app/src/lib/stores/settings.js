import { writable, derived, get } from 'svelte/store';
import { SECTIONS, DEFAULT_SECTION, isSection, OBJECT_TYPES, validateField } from '$lib/settings/schema.js';
import { AVAILABLE_DATABASES } from '$lib/settings/databases.js';
import { AVAILABLE_ENGINES, DEFAULT_THREADS, DEFAULT_HASH } from '$lib/settings/engines.js';

/**
 * Settings Workspace state. §3.4
 *
 * Auto-apply (SW-06, approved 3 Sep): every mutation here commits immediately.
 * There is no draft, no Save and no Cancel, so no exit route can strand
 * unsaved work — which is why leaving via the Sidebar needs no prompt.
 * The corollary is that validation happens BEFORE the commit, not at save
 * time, and that destructive actions carry their own confirmation.
 */

/** Active section per Settings tab. §3.4.3 — reopening restores the last one. */
export const activeSection = writable(DEFAULT_SECTION);

/** Object currently open in the Detail/Edit View, or null for the collection. */
export const openObject = writable(null);      // { section, id } | null

/** Set briefly after a successful commit, to drive the "applied" indicator. */
export const lastApplied = writable(0);

let seq = 0;
/**
 * Generated ids carry an `n` marker so they cannot collide with the seeded
 * sample ids below (`db-1`, `engine-2`, …).
 *
 * They could, and did: `seq` starts at 0, so the first generated database id
 * was `db-1` — already taken. Svelte throws on duplicate keys in a keyed
 * {#each}, so installing anything broke the section the next time it mounted,
 * which looked like "the section will not display" rather than like an id bug.
 */
const nextId = (p) => `${p}-n${++seq}`;

/** Sample objects so the prototype opens in a working state rather than empty. */
export const objects = writable({
  engines: [
    { id: 'engine-1', name: 'Stockfish', version: '17.1', status: 'ready', protocol: 'UCI',
      binary_path: '/usr/local/bin/stockfish', hash_mb: 512, threads: 4, enabled: true },
    { id: 'engine-2', name: 'Torch', version: '3', status: 'ready', protocol: 'UCI',
      binary_path: '/usr/local/bin/torch', hash_mb: 256, threads: 2, enabled: false }
  ],
  subscriptions: [
    { id: 'sub-1', name: 'Hikaru', source: 'chesscom', state: 'idle',
      interval: 'Hourly', lastSynced: '12 min ago', newGames: 0, enabled: true },
    { id: 'sub-2', name: 'AwesomeAtti', source: 'lichess', state: 'idle',
      interval: 'Daily', lastSynced: '2 h ago', newGames: 12, enabled: true },
    { id: 'sub-3', name: 'DrNykterstein', source: 'lichess', state: 'syncing',
      interval: 'Hourly', lastSynced: '1 h ago', newGames: 0, enabled: true },
    { id: 'sub-4', name: 'MagnusCarlsen', source: 'chesscom', state: 'error',
      interval: 'Weekly', lastSynced: null, newGames: 0, enabled: false }
  ],
  databases: [
    { id: 'db-1', name: 'Master Games', status: 'indexed', version: '2.1',
      games: 2_400_000, players: 198_000, bytes: 1_000_000_000, enabled: true },
    { id: 'db-2', name: 'My Games', status: 'indexed', version: '1.0',
      games: 812, players: 24, bytes: 2_400_000, enabled: true }
  ]
});

/** Conventional settings controls for General and Appearance. §3.4.6, §3.4.7 */
export const preferences = writable({
  /*
    Keys are `config.db`'s own (§5): a preference is spelled here the way the
    table spells it. `libraryLocation` is the exception and deliberately still
    camelCase — §3.4.6 specifies the setting and `preferences` has no key for it,
    so it is not a field yet and does not get a field's spelling.
  */
  restore_open_games: true,
  libraryLocation: '~/Documents/Chessgui',
  board_style: 'Default',
  piece_set: 'Merida',
  /*
    PROTOTYPE ONLY, and not specified.

    A real importer derives its result from the PGN. This one reads no PGN, so
    something has to choose, and the alternative to a visible control is a
    hidden convention — file names that trigger errors — which makes half of
    §3.2.4.5 unreachable unless you know the trick. See `OUTCOMES` in
    library/importJob.js.
  */
  simulatedImport: 'clean'
});

/* ---------------- navigation ---------------------------------------- */

export function selectSection(id) {
  if (!isSection(id)) return;
  activeSection.set(id);
  openObject.set(null);          // leaving a Detail view is always safe
}

export function openDetail(section, id) {
  if (!OBJECT_TYPES[section]) return;
  openObject.set({ section, id });
}

export function closeDetail() {
  openObject.set(null);
}

export function findObject(section, id) {
  return (get(objects)[section] || []).find((o) => o.id === id) || null;
}

/* ---------------- auto-apply mutations ------------------------------ */

/**
 * Commit one field. Returns null on success, or a validation message key —
 * in which case NOTHING is written and the object keeps its last good value.
 */
export function applyField(section, id, fieldId, value) {
  const type = OBJECT_TYPES[section];
  if (!type) return 'validation.unknown';
  const field = type.fields.find((f) => f.id === fieldId);
  if (!field) return 'validation.unknown';

  const error = validateField(field, value);
  if (error) return error;                      // rejected before commit

  objects.update((all) => ({
    ...all,
    [section]: all[section].map((o) => (o.id === id ? { ...o, [fieldId]: value } : o))
  }));
  lastApplied.set(Date.now());
  return null;
}

export function applyPreference(key, value) {
  preferences.update((p) => ({ ...p, [key]: value }));
  lastApplied.set(Date.now());
}

/* ---------------- create / destroy ---------------------------------- */

const NEW_DEFAULTS = {
  engines:       { name: 'New Engine',       status: 'not configured', binary_path: '', hash_mb: 256, threads: 4, enabled: false },
  subscriptions: { name: 'New Subscription', status: 'not configured', url: '',  interval: 'Daily', enabled: false },
  databases:     { name: 'New Database',     status: 'not configured', location: '', format: 'PGN', enabled: false }
};

/** §3.4.8 — the Add action creates the object and opens its configuration. */
export function addObject(section) {
  const base = NEW_DEFAULTS[section];
  if (!base) return null;
  const id = nextId(section.slice(0, -1));
  objects.update((all) => ({ ...all, [section]: [...all[section], { ...base, id }] }));
  openObject.set({ section, id });
  return id;
}

/**
 * Remove an object. Destructive and NOT undoable — with auto-apply there is no
 * Cancel to walk back, so callers must confirm first (see ConfirmRemove).
 */
export function removeObject(section, id) {
  objects.update((all) => ({
    ...all,
    [section]: (all[section] || []).filter((o) => o.id !== id)
  }));
  const open = get(openObject);
  if (open && open.section === section && open.id === id) openObject.set(null);
}

/* ---------------- databases: available and install (§3.4.8) ---------- */

/**
 * Downloads in flight, keyed by the Available entry's id: { pct, done }.
 * `done` marks the brief "Installed" state before the row leaves Available,
 * so the transition is visible rather than the row vanishing under the cursor.
 */
export const downloads = writable({});

/** The Available list, minus anything already installed by name. */
export const availableDatabases = derived([objects, downloads], ([$o, $d]) => {
  const installed = new Set(($o.databases ?? []).map((db) => db.name));
  return AVAILABLE_DATABASES
    .filter((db) => !installed.has(db.name) || $d[db.id]?.done)
    .map((db) => ({ ...db, progress: $d[db.id] ?? null }));
});

/**
 * Install a database from the catalogue.
 *
 * A distributed database is a Chessgui database file that arrives ready, so
 * there is no indexing phase: the object is created enabled, unlike §3.4.8's
 * default for objects that still need configuring. `tick` is injected so the
 * transfer can be driven deterministically in tests.
 */
export function installDatabase(id, { tick = (fn) => setTimeout(fn, 260) } = {}) {
  const entry = AVAILABLE_DATABASES.find((d) => d.id === id);
  if (!entry) return false;
  if (get(downloads)[id]) return false;          // already in flight

  downloads.update((d) => ({ ...d, [id]: { pct: 0, done: false } }));

  const step = () => {
    const cur = get(downloads)[id];
    if (!cur || cur.done) return;
    const pct = Math.min(100, cur.pct + 20);
    if (pct < 100) {
      downloads.update((d) => ({ ...d, [id]: { pct, done: false } }));
      tick(step);
      return;
    }
    // Transfer complete: the file is on disk and usable.
    objects.update((all) => ({
      ...all,
      databases: [...all.databases, {
        id: nextId('db'),
        name: entry.name,
        version: entry.version,
        games: entry.games,
        players: entry.players,
        bytes: entry.bytes,
        status: 'indexed',
        enabled: true
      }]
    }));
    downloads.update((d) => ({ ...d, [id]: { pct: 100, done: true } }));
    lastApplied.set(Date.now());
    tick(() => downloads.update((d) => {
      const { [id]: _gone, ...rest } = d;
      return rest;
    }));
  };
  tick(step);
  return true;
}

/** Rename a database. The name is what the Library switcher shows (§3.2.3.10). */
export function renameDatabase(id, name) {
  const clean = String(name ?? '').trim();
  if (!clean) return 'validation.required';
  objects.update((all) => ({
    ...all,
    databases: all.databases.map((db) => (db.id === id ? { ...db, name: clean } : db))
  }));
  lastApplied.set(Date.now());
  return null;
}

/** Enable or disable a database. Disabled databases leave the switcher's offer. */
export function setDatabaseEnabled(id, enabled) {
  objects.update((all) => ({
    ...all,
    databases: all.databases.map((db) => (db.id === id ? { ...db, enabled } : db))
  }));
  lastApplied.set(Date.now());
}

/* ---------------- subscriptions: SU-A rows --------------------------- */

/** Rename a subscription. Empty names are refused rather than committed. */
export function renameSubscription(id, name) {
  const clean = String(name ?? '').trim();
  if (!clean) return 'validation.required';
  objects.update((all) => ({
    ...all,
    subscriptions: all.subscriptions.map((s) => (s.id === id ? { ...s, name: clean } : s))
  }));
  lastApplied.set(Date.now());
  return null;
}

/** The update interval. Commits on change, per §3.4.9. */
export function setSubscriptionInterval(id, interval) {
  objects.update((all) => ({
    ...all,
    subscriptions: all.subscriptions.map((s) => (s.id === id ? { ...s, interval } : s))
  }));
  lastApplied.set(Date.now());
}

export function setSubscriptionEnabled(id, enabled) {
  objects.update((all) => ({
    ...all,
    subscriptions: all.subscriptions.map((s) => (s.id === id ? { ...s, enabled } : s))
  }));
  lastApplied.set(Date.now());
}

/**
 * Sync now — the manual action no other object type has. It lives in the
 * expander rather than on the row (SU‑D was rejected): the row already carries
 * two trailing controls, and a subscription's whole point is that it syncs by
 * itself, so this is a rare action.
 *
 * A disabled subscription does not sync. `tick` is injected for tests.
 */
export function syncSubscription(id, { tick = (fn) => setTimeout(fn, 700) } = {}) {
  const sub = get(objects).subscriptions.find((s) => s.id === id);
  if (!sub || sub.enabled === false || sub.state === 'syncing') return false;
  objects.update((all) => ({
    ...all,
    subscriptions: all.subscriptions.map((s) => (s.id === id ? { ...s, state: 'syncing' } : s))
  }));
  tick(() => objects.update((all) => ({
    ...all,
    subscriptions: all.subscriptions.map((s) =>
      (s.id === id ? { ...s, state: 'idle', lastSynced: 'just now', newGames: 0 } : s))
  })));
  return true;
}

export function resetDatabases() {
  downloads.set({});
}

/* ---------------- engines: available and install (§3.4.8.2) ---------- */

/**
 * Engines and Databases share one download map, keyed by catalogue id. The two
 * catalogues have disjoint ids, and one map means one progress model rather
 * than two that could drift.
 */
export const availableEngines = derived([objects, downloads], ([$o, $d]) => {
  const installed = new Set(($o.engines ?? []).map((e) => e.name));
  return AVAILABLE_ENGINES
    .filter((e) => !installed.has(e.name) || $d[e.id]?.done)
    .map((e) => ({ ...e, progress: $d[e.id] ?? null }));
});

/**
 * Install an engine from the catalogue. One phase, as for Databases: a binary
 * downloads and is ready.
 *
 * Unlike a downloaded database, a downloaded engine arrives **enabled** too —
 * it needs no path supplying, which is the reason §3.4.8 disables new objects.
 */
export function installEngine(id, { tick = (fn) => setTimeout(fn, 260) } = {}) {
  const entry = AVAILABLE_ENGINES.find((e) => e.id === id);
  if (!entry) return false;
  if (get(downloads)[id]) return false;

  downloads.update((d) => ({ ...d, [id]: { pct: 0, done: false } }));

  const step = () => {
    const cur = get(downloads)[id];
    if (!cur || cur.done) return;
    const pct = Math.min(100, cur.pct + 20);
    if (pct < 100) {
      downloads.update((d) => ({ ...d, [id]: { pct, done: false } }));
      tick(step);
      return;
    }
    objects.update((all) => ({
      ...all,
      engines: [...all.engines, {
        id: nextId('engine'),
        name: entry.name,
        version: entry.version,
        protocol: entry.protocol,
        bytes: entry.bytes,
        threads: DEFAULT_THREADS,
        hash_mb: DEFAULT_HASH,
        status: 'ready',
        enabled: true
      }]
    }));
    downloads.update((d) => ({ ...d, [id]: { pct: 100, done: true } }));
    lastApplied.set(Date.now());
    tick(() => downloads.update((d) => {
      const { [id]: _gone, ...rest } = d;
      return rest;
    }));
  };
  tick(step);
  return true;
}

/** Rename an engine. Empty names are refused rather than committed (§3.4.1). */
export function renameEngine(id, name) {
  const clean = String(name ?? '').trim();
  if (!clean) return 'validation.required';
  objects.update((all) => ({
    ...all,
    engines: all.engines.map((e) => (e.id === id ? { ...e, name: clean } : e))
  }));
  lastApplied.set(Date.now());
  return null;
}

/** Threads and Hash commit on change, per §3.4.9. */
export function setEngineOption(id, key, value) {
  if (key !== 'threads' && key !== 'hash_mb') return false;
  objects.update((all) => ({
    ...all,
    engines: all.engines.map((e) => (e.id === id ? { ...e, [key]: value } : e))
  }));
  lastApplied.set(Date.now());
  return true;
}

export function setEngineEnabled(id, enabled) {
  objects.update((all) => ({
    ...all,
    engines: all.engines.map((e) => (e.id === id ? { ...e, enabled } : e))
  }));
  lastApplied.set(Date.now());
}

export function resetSettings() {
  activeSection.set(DEFAULT_SECTION);
  openObject.set(null);
  lastApplied.set(0);
}

export { SECTIONS, OBJECT_TYPES, DEFAULT_SECTION };
