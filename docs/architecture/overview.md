# Architecture overview

## What is implemented

| Spec | Feature |
|---|---|
| §1.3 | Tabbed workspace model; one window, one shell, one active workspace |
| §2 | Shell with exactly two regions: Tab Bar and Workspace Area |
| §2.1.1 | Library pinned/unclosable/always-first; Game tabs; Settings singleton always rightmost |
| §2.1.2 | New Tab Button, repositioning between strip and controls |
| §2.1.3 | Two-stage overflow — shrink to a 220px floor, then scroll |
| §2.1.4 | Wheel/trackpad strip scrolling; scroll controls; anchored elements never scroll away |
| §2.2 | Application menu — Language, Theme, Full Screen, Settings, About, Quit |
| §2.3 | Open vs. active workspace; per-workspace state survives navigation |
| §2.4 | 800 × 600 minimum — snap-back where possible, window-floor gate everywhere (see below) |
| §2 | The shell itself never scrolls; scrolling is a workspace concern |
| WF-06b | Tab-list dropdown (pulled forward from §2.1.4's future-release note) |
| §3.4.2 | Settings Workspace — fixed 220px Sidebar + scrolling Content Area |
| §3.4.3 | Six sections, one active, last section restored on reopen, no new tabs |
| §3.4.4 | Active state via rail + weight + fill — never colour alone |
| §3.4.6–7 | General and Appearance as conventional controls, not cards |
| §3.4.8–10 | Object management for Engines/Subscriptions/Databases; responsive grid; empty state |
| §3.4.9 | Detail/Edit View replaces the collection, Sidebar stays live |
| §3.4.11 | About as an informational layout |
| §3.2.2–3 | Library — 220px sidebar / 56px rail, groups, filters composable with search |
| §3.2.3.3 | Five most-recent subscriptions, More… popover, trailing-slot priority, offline handling |
| §3.2.3.6–8 | 34px trailing slot with `9k+`, collapsed rail with group flyouts, header collapse control |
| §3.2.4.1–4 | Scoped search with debounce, virtualised table, single selection, four empty states, status bar with a four-claimant right slot |
| §3.2.4.5 | Add Games — 600 × 400 File · Online · Paste dialog that reads nothing, one background import lane, five outcomes in the Status Bar, Import report |
| req. 1 | PWA — manifest, service worker, offline-first |
| req. 3 | 220px minimum tab width |
| req. 4 | Language toggle in the application menu |
| req. 5 | New Tab Button creates a Game workspace |

## Where things live

See also: [Application Shell](application-shell.md) · [Library Workspace](library-workspace.md) ·
[Game Workspace](game-workspace.md) · [Settings Workspace](settings-workspace.md) ·
[Conventions](conventions.md) · [Layout and window floor](layout.md) ·
[Offline behaviour](offline.md) · [Testing notes](testing.md) ·
[Deviations from the specification](deviations.md) · [Build and release](build-and-release.md)

```
src/lib/layout.js              tab overflow geometry (pure, exhaustively tested)
src/lib/library/mock.js        deterministic 1,248-game corpus
src/lib/library/columns.js     Content Table column model (pure)
src/lib/library/importJob.js   §3.2.4.5 import plan, outcomes and messages (pure)
src/lib/stores/importer.js     §3.2.4.5 the single import lane and Status Bar slot
src/lib/stores/library.js      Library filters, search, selection, sidebar state
src/lib/settings/schema.js     settings sections, object fields, validation
src/lib/settings/layout.js     settings grid geometry (pure)
src/lib/stores/settings.js     settings state; every mutation auto-applies
src/lib/windowFloor.js         §2.4 best-effort window snap-back
src/lib/stores/tabs.js         workspace model and its invariants
src/lib/stores/i18n.js         locale store + t()
src/lib/stores/theme.js        light/dark, persisted
src/lib/stores/appCommands.js  fullscreen toggle + quit, both fail loudly
src/lib/i18n/locales.js        bundled UI strings (en, de, fr)
src/lib/data/session.js        the one place a connection is acquired (ADR 0004)
src/lib/data/backends/         everything that knows SQLite: tauri.js (desktop),
                               pwa.js + worker-client.js (PWA, main thread),
                               sqlite-worker.js + sqlite-host.js (PWA storage
                               worker, OPFS, ADR 0005), sqlite-engine.js,
                               memory.js (tests)
src/lib/components/
  AppShell.svelte              shell root + keyboard map
  TabBar.svelte                tab bar, overflow, scrolling, controls
  Tab.svelte                   one tab at any width
  TabListMenu.svelte           tab-list dropdown (WF-06b)
  AppMenu.svelte               application menu
  Popover.svelte               dismiss-on-outside-click / Escape
  WindowFloorGate.svelte       §2.4 cover shown below 800 x 600
  QuitNotice.svelte            shown when the host refuses window.close()
  library/                     the Library Workspace (§3.2)
  settings/                    the Settings Workspace (§3.4)
  WorkspaceArea.svelte         stubbed workspaces + state probe
tests/                         vitest suites
e2e/                           Playwright: PWA storage in real browsers
standalone/                    single-file demo build (not the app)
```
