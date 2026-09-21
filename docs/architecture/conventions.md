# Conventions

## Svelte 5

Components use runes throughout — no legacy idioms:

| Legacy | Used here |
|---|---|
| `export let` | `$props()` with destructured defaults |
| `$:` | `$derived` for values, `$effect` for side effects |
| `createEventDispatcher` | callback props (`onselect`, `onclose`, `ondismiss`) |
| `<slot />` | snippets — `{@render children?.()}` |
| `on:click`, `on:click\|stopPropagation` | `onclick`; modifiers were removed, so `e.stopPropagation()` is called explicitly |
| `new Component({ target })` | `mount()` from `svelte` |

**Stores are kept deliberately.** `tabs.js`, `i18n.js` and `theme.js` remain
Svelte stores rather than `$state` in `.svelte.js` modules. Stores are not
deprecated in Svelte 5, and they suit this case: the state is global, shared
across unrelated components, and read synchronously via `get()` in tests
without a component or effect root. Runes would buy nothing here and would make
`tests/tabs.test.js` harder to write.

`$derived` in `TabBar.svelte` is a real improvement over `$:` — the geometry
recomputes only when `barW`, `pinnedW` or the tab count actually change, rather
than on every invalidation of any dependency in the component.

## Icons

**Lucide 1.41.0** (`@lucide/svelte`, ISC), imported through the
`@lucide/svelte/icons/*` subpath so only what is used reaches the bundle. The
concept-to-glyph mapping lives in one file, `src/lib/icons.js`, rather than
being scattered across components.

**Why an icon set at all, rather than taste.** The prototype used Unicode
characters as icons. Thirteen of them are absent from the bundled IBM Plex
faces:

```
⏮ ⏭ ◀ ▶ ⏸ ⏻ ⋯ ˄ ˅ ⟳ ⚠ ▾ ☰
```

Every one was being drawn by whatever the operating system fell back to —
different on every platform, colour emoji on some, and not offline at all,
which quietly contradicted §1.1. The bundle now contains none of them.

**Cost: about 8KB** for 46 icons. Verified by fragment-matching path data
against the built output: imported icons are present, non-imported ones
(`anchor`, `rocket`, `castle`, …) are absent, so the subpath tree-shaking works
as intended rather than as advertised.

**Sizing.** Lucide is drawn on a 24px grid with a 2px stroke, and this UI
renders at 12–18px where that reads heavy. `Icon.svelte` sets `strokeWidth`
1.5 with `absoluteStrokeWidth`, which holds the stroke at a true 1.5px at every
size — without it a 13px icon comes out hairline-thin beside an 18px one.
Lucide has a context provider for these defaults, but `@lucide/svelte` 1.41.0
does not re-export `setLucideProps` from the package root, so one wrapper
component does the job instead.

**Eight hand-drawn shapes were removed** from the Library Sidebar. They were
`border-radius` approximations of a star, a clock, a folder and so on — fine at
a glance, wrong under inspection.

### Source marks — §3.2.3.3

Subscriptions carry a **source**, and there are exactly two: `chesscom` and
`lichess`. A subscription is an account or feed *on* a source, so several rows
share one — which is what makes the mark worth showing, since a name like
"Titled Tuesday" does not say where its games came from.

The marks are from **Simple Icons** (CC0 1.0), inlined as two small components
in `src/lib/components/icons/`. They are **filled, not stroked**, so they read
as brands beside Lucide's stroked interface icons rather than as more
furniture. Lichess's mark is its knight, complete; Chess.com's is the pawn
silhouette without the brand's green tile.

CC0 covers the artwork data. The marks themselves remain the respective
owners' trademarks.

At 16px the mark costs the name column 3px: the 220px sidebar gives 200px of
content, less 16 icon + 8 gap + 34 count slot leaves **142px for the name**.

## Adding a locale

Add an entry to `LOCALES` and a matching block to `STRINGS` in
`src/lib/i18n/locales.js`. Missing keys fall back to English, then to the key
itself, so a partial translation degrades rather than breaking. No RTL locale is
included — adding one requires mirroring the whole shell and should be scoped
separately.

## Writes commit; `loadGames()` is the only writer of `games`

A write path's job ends at the database commit. It never patches the Library
Workspace's `games` store (`stores/library.js`) directly — it asks for a
reload instead, and only `loadGames()` itself calls `games.set(...)`.

This came out of a real bug (20 Sep 2026): a real Paste import used to splice
its inserted rows straight into `games` for an instant-feedback effect. That
optimistic splice raced the `loadGames()` already in flight from the library
switch that got the user there — whichever one's reads resolved last won,
even if it started first, so a correct write could be silently reverted back
to an empty list moments after it landed. `loadGames()` now carries its own
call sequence and discards a result if a newer call has started since (see
its own comment) — but the deeper fix is that nothing else is allowed to
write to `games` at all, so there is nothing left to race.

Two rules follow for every future write path (File/Online import once real,
favorites, trash, tags, collections, subscription sync):

1. **Commit to the database, then call `loadGames()`** — never touch `games`
   by hand. `stores/importer.js`'s `runRealWrite()` is the reference: it
   calls `loadGames()` only when the write's destination is the library
   currently on screen (`p.destination === get(activeLibraryId)`); a write to
   a library you're not looking at needs no reload — switching to it later
   already reloads correctly.
2. **Only reload for a field the Library view actually reads.** `loadGames()`
   (via `readGames()`) reads the games table's own columns plus the
   favorite/trashed/tags/collections overlays — never `movetext`/PGN,
   comments, or engine data. A write to those (a Game Workspace comment, an
   engine line) has nothing for the Library view to show differently and
   must NOT trigger `loadGames()`. Loading an individual game already
   follows the equivalent rule the other way: `stores/game.js`'s
   `loadRealGame()` queries the database directly for that one game's
   movetext, rather than reading it out of `games`, which never carries it.

A bulk import (once File/Online write for real) should call `loadGames()`
once per completed batch, not once per row — the read is a full re-fetch of
the active library (`loadGames()`'s own comment: "a generous single page, not
true incremental fetching"), so its cost scales with the library's size, not
the import's, and firing it per-row would make a large import into a large
library needlessly expensive.

The one deliberate exception is `appendGames()` in `stores/importer.js`, the
simulated-import lane (`preferences.simulatedImport`): it has no real
database commit to reload from, so it still writes `games` directly. That is
a property of it being a presentational demo/test harness, not a gap to
close — see its own header comment.
