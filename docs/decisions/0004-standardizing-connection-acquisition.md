# 0004 — Standardizing connection acquisition: one composition root for opening database connections

## Status

Accepted — 2026-09-22, by AwesomeAtti.

## Context

`data/connection.js` already establishes the port this application is built
on: the `Connection` interface (`all`/`get`/`value`/`run`/`close`), and the
stated rule that `data/backends/` is the only directory allowed to import a
SQLite package or know how a database is opened. That rule holds today,
confirmed by grep rather than assumed — `tauri.js`, `pwa.js`, `memory.js`
and the shared `sqlite-engine.js` are the only files that import
`@tauri-apps/plugin-sql` or `@sqlite.org/sqlite-wasm`. `data/games.js` and
`data/config.js` sit above that seam as a single, backend-agnostic
repository — one set of SQL statements, read by whichever adapter is
underneath. This half of Ports and Adapters (the port, the adapters, the
repository) is already in place and is not what this ADR changes.

What is not yet consistent is *acquiring* a connection — deciding which
adapter backs it in the first place. `data/session.js` makes that decision
three separate times: `configConnection()` (line 180), `libraryConnection()`
(line 215), and `explorerConnection()` (line 251) each independently call
`isTauri()` to choose between `backends/tauri.js` and `backends/pwa.js`,
the same two-way decision made three times over. `stores/settings.js`'s
`createDatabase()` makes it a fourth time (lines 402 and 426) — and, unlike
every other caller in the app, does not go through `data/session.js` at
all. It imports `backends/tauri.js` (twice, for directory listing and for
opening the new file) and `backends/pwa.js` (once, for opening the new
IndexedDB-backed library) directly, at four separate dynamic `import()`
sites. Every other consumer of the data layer — `stores/game.js`,
`stores/libraries.js`, `stores/library.js`, `DatabaseSection.svelte` —
reaches a connection exclusively through `data/session.js`'s three getters.
`createDatabase()` is the one place in the codebase that mixes methods:
a second, parallel path into the adapters that nothing else uses.

Separately, three other `isTauri()` checks are not resolution duplication
and are explicitly out of scope here: `explorerConnection()`'s own
Tauri-only gate, and `loadLibraries()`/`loadEngines()` in
`stores/settings.js` (lines 141 and 179). These exist because the PWA has
no real `libraries`/`engines` registry yet — a genuine capability gap, not
an inconsistency in how connections are opened. Collapsing them into the
same resolution logic as the four sites above would misrepresent a
capability the PWA does not have.

`createDatabase()`'s PWA branch also has a real, previously-identified bug
that this ADR's implementation closes as a side effect: it creates the new
library's physical database but never registers it anywhere durable, unlike
the Tauri branch, which calls `createLibrary()` against `config.db`'s
`libraries` table. This was blocked until now because the PWA had no real
`config.db` connection to register into — `configConnection()` resolving a
real PWA connection removed that blocker without anyone building toward it
directly.

## Decision

Introduce one memoized resolver in `data/session.js` — `getBackend()` — as
the sole place `isTauri()` is evaluated for the purpose of choosing which
adapter backs a connection. `configConnection()`, `libraryConnection()`,
`explorerConnection()`, and `createDatabase()` all call it instead of
`isTauri()` directly for that decision.

`createDatabase()` stops importing `backends/tauri.js`/`backends/pwa.js`
directly. It acquires the new database's connection the same way every
other caller in the app does, through `data/session.js` — which gains a new
export for opening a brand-new, not-yet-registered connection, since the
three existing getters all assume an already-known id (a config connection,
or a library id already present in `config.db`).

The three genuine-capability gates (`explorerConnection()`'s Tauri-only
condition, `loadLibraries()`, `loadEngines()`) keep their current behavior
unchanged, but read their condition from `getBackend()` rather than a second,
independent `isTauri()` call — one source of truth for "which backend is
this," even in the places where the two backends legitimately behave
differently.

As part of the same change, `createDatabase()`'s PWA branch is extended to
register the new database into a real registry the same way the Tauri
branch already does, via `createLibrary()` against the now-real PWA
`config.db` connection.

## Consequences

- The number of places that decide which backend a connection uses drops
  from four to one. `data/session.js` becomes the sole caller of
  `data/backends/` outside the backends' own tests, matching
  `data/connection.js`'s existing rule in spirit as well as letter — it was
  already true that only `backends/` may import a driver; this makes it
  also true that only `data/session.js` may import a backend module.
- Closes one leg of the Explorer three-layer gap already tracked in
  `ACTIONS.md` (a PWA-created library never appearing in `config.db`'s
  `libraries` table) as a consequence of this refactor, not as separate
  work — the fix in `createDatabase()` is the same fix either way.
- This is folded into the existing PWA-storage row in `ACTIONS.md` rather
  than tracked as a second, separate effort, since the two overlap in the
  same files and the same migration.
- Explicitly out of scope: `stores/library.js`'s `isSeededSampleGames`
  branch and `stores/game.js`'s `isRealGameId()`/`mockLibraryGame()` are
  mock-data stopgaps, not connection-acquisition inconsistency — they are
  already tracked as their own rows in `ACTIONS.md` and disappear as a
  side effect of the storage migration, not of this decision.
  `appCommands.js`'s four `isTauri()` checks are a different concern
  (fullscreen/quit, not data access) and are already correctly
  adapter-shaped; this decision does not touch them.
