# Chessgui — UI Specification

## Application Shell

> **Revision status.** This revision covers §1 Design Overview, §2 Application Shell,
> §3.1 Common Workspace Structure, and the shared systems in §7–§10. It incorporates the
> decisions taken in the wireframe and prototype review of 3 Sep 2026.
>
> The individual workspaces are specified separately: **Library §4**, **Game §5**,
> **Settings §6**. This document defines only what is common to all of them.
>
> A summary of what changed appears in the appendix.

---

# 1. Design Overview

## 1.1 Application

Chessgui is a **cross-platform desktop application** that runs standalone and remains fully usable without Internet access. All core functions described in this specification are available offline.

Where a feature uses an online source, the source is an **optional enrichment and never a dependency**. Removing network access may reduce the information available, but must not make the feature unusable or leave the UI in a broken or incoherent state.

The initial application has two such integrations:

- **Sources** may synchronize games from external providers. Without a network connection, Sources remain visible and selectable, and previously fetched games remain browsable; only synchronization is unavailable.
- **Explorer external databases** are optional and out of scope for the initial release. When introduced, they supplement the user's local libraries rather than replacing them.

The general rule is:

> **The network may add information; it must never be required for the application to function.**

All UI resources required for rendering are distributed with the application. This includes icons, **fonts**, typography definitions, theme tokens, and localized UI text. Components must not depend on remote assets at runtime.

Bundled fonts are not solely an offline concern. Several fixed dimensions in this specification are derived from a known character advance width, and are incorrect against a substituted face. See §7.2.

Application data is stored locally on the user's machine. The storage technology and data model are outside the scope of this document.

## 1.2 Scope

This specification defines the **desktop UI**, including:

- application-shell structure;
- workspace presentation and navigation;
- layout and sizing;
- resizing and scrolling;
- interaction behavior;
- the shared visual system, localization, and accessibility requirements.

Application architecture, persistence implementation, database schema, and other implementation details are outside the scope of this document.

Where the UI displays a value supplied by another part of the application, this specification defines the **value the UI expects**, not how that value is calculated or stored.

## 1.3 Application Model

Chessgui uses a **tabbed workspace model**.

The application consists of a single **Application Window** containing the **Application Shell**. The shell provides persistent application-level navigation and controls. The active tab determines which **Workspace** is presented in the shell's **Workspace Area**.

```text
Application Window
│
└── Application Shell
    ├── Tab Bar
    │   ├── Pinned Tab
    │   ├── Tab Strip
    │   └── Tab Bar Controls
    │       ├── New Tab Button         (hidden — §2.1.2)
    │       ├── Scroll Controls        (overflow only)
    │       ├── Tab List Button        (overflow only)
    │       └── Application Menu Button
    │
    └── Workspace Area
        └── Active Workspace
```

The initial release defines three workspace types:

1. **Library Workspace** — the persistent entry point for searching and managing the game library.
2. **Game Workspace** — the workspace for viewing, playing, and analyzing an individual game.
3. **Settings Workspace** — the application's configuration surface.

The shell defines **how workspaces are presented and managed**. Individual workspace sections define **what each workspace contains and how it behaves within the Workspace Area**.

This distinction is intentional. Workspace types may have very different internal layouts while sharing the same application-level navigation and presentation model.

Chessgui adopts familiar and established UI patterns from other applications, such as **browser-style tabs** and **asset-management sidebars and search toolbars**. These are **interaction references only**, not indications of application functionality or identity.

---

# 2. Application Shell

The **Application Shell** is the persistent UI framework surrounding the active workspace. It is responsible for application-level navigation and controls but does not define the internal layout of any workspace.

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Library │ Game 1 │ Game 2 │ Settings │                     ☰       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                         Workspace Area                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

The shell has two regions:

- **Tab Bar** — persistent application-level navigation and controls.
- **Workspace Area** — presents the active workspace represented by the selected tab.

Workspace content begins below the Tab Bar and does not alter the shell's structure.

**The Application Shell never scrolls.** It has no scrollbars in any state and at any window size. Scrolling is owned entirely by the active workspace, which decides what within it scrolls and how. This is why the shell carries no minimum width or height of its own; see §2.4.

## 2.1 Tab Bar

The Tab Bar is persistent for the lifetime of the Application Window. Its height is **40px**.

It provides navigation between open workspaces and contains application-level controls that are independent of the active workspace.

The Tab Bar consists of:

1. **Pinned Tab** — fixed at the left.
2. **Tab Strip** — occupies the central area and contains the non-pinned tabs.
3. **Tab Bar Controls** — fixed at the right.

### Normal state

```text
┌─────────┬──────────────────────────────────────┬───┐
│ Library │  Game tabs…  │  Settings            │ ☰ │
└─────────┴──────────────────────────────────────┴───┘
  pinned              tab strip                 menu
  tab
```

### Overflow state

```text
┌─────────┬────────────────────────┬─────┬───┬───┐
│ Library │  Game tabs…            │ ◀ ▶ │ ▾ │ ☰ │
└─────────┴────────────────────────┴─────┴───┴───┘
  pinned         tab strip          scroll list menu
  tab
```

Both diagrams show the **current** state, with the New Tab Button hidden (§2.1.2). Displayed, a `+` precedes the scroll controls in the overflow state and sits after the last tab inside the strip in the normal state.

### 2.1.1 Tabs

Each tab represents one open workspace.

- **Library Tab** is pinned, always present, always first, and cannot be closed.
- **Game Tabs** represent opened games. Multiple Game Tabs may be open simultaneously.
- **Settings Tab** is not pinned. At most one Settings Tab may exist, and when open it occupies the rightmost position in the Tab Strip.
- Opening a workspace does not replace another open workspace.
- The Library Tab remains available regardless of how many other workspaces are open.

| Tab | Pinned | Closable | Instances | Position rule |
| --- | --- | --- | --- | --- |
| Library | Yes | No | Exactly 1 | Always first, outside the Tab Strip |
| Game | No | Yes | 0…n | Appended after the last Game Tab |
| Settings | No | Yes | 0 or 1 | Always last in the Tab Strip |

Because the Library Tab is pinned, it is outside the horizontally scrolling Tab Strip and never scrolls out of view.

A new Game Tab is inserted **after the last Game Tab and before the Settings Tab**, preserving the Settings Tab's rightmost position.

**Closing a tab** activates the right neighbour; if there is none, the left neighbour; ultimately the Library Tab. Closing an inactive tab does not change which tab is active.

Selecting **Settings** from the Application Menu when the Settings Tab already exists activates the existing tab rather than creating another one.

#### Tab anatomy and minimum width

Each tab renders, in order: a type indicator, a label, and — for closable tabs — a close control.

The **minimum tab width is 220px**. The type indicator and the close control are reserved space and never truncate at any width; only the label absorbs the reduction, truncating with a trailing ellipsis. Player-name-led titles front-load their distinguishing information, so trailing truncation preserves identity better than middle truncation.

The **preferred tab width is 300px**.

The Library Tab has no close control, has an intrinsic width determined by its label, and does not participate in shrinking.

### 2.1.2 New Tab Button

The **New Tab Button** (`+`) is a Tab Bar control. **It is not currently displayed.**

The button has one of two positions depending on Tab Strip overflow:

- **No overflow:** immediately after the last tab, inside the Tab Strip.
- **Overflow:** in the Tab Bar Controls, at the start of the control group.

Only one New Tab Button is displayed at any time. It moves; it is not duplicated.

The Tab Strip's width budget is computed with the button's presence as a **parameter**, not an assumption. Hidden, the strip reclaims its 36px in the normal state, so tabs reach their preferred width sooner and overflow later (§2.1.3).

**Its action is unresolved.** The button previously created an **empty Game Workspace**. Empty Game Workspaces have been removed (below), so the control has no action to perform and must be given one before it is displayed again.

#### There is no empty Game Workspace

**Every Game Tab holds a game.** A Game Workspace exists to show a game; one with nothing in it has no content, no title of its own, and nothing for its Sections to report on. The empty variant was a holdover from testing.

A Game Tab is created by **opening a game from the Library** (§3.2.4.3).

Opening a game that is already open activates the existing tab rather than creating a second one. Two tabs on one game would carry identical titles, truncated identically at the 220px minimum, and would let the same game's analysis diverge in two places.

**The Settings Tab** is created from the Application Menu (§2.2), and there is only ever one (§2.3).

### 2.1.3 Tab Overflow

The Tab Strip uses a **two-stage overflow model**.

1. Tabs first shrink from their preferred width toward the **minimum tab width of 220px**.
2. Once the minimum width is reached, tabs stop shrinking and the Tab Strip becomes horizontally scrollable.

The overflow decision is computed from the **normal-state width budget only**. It must not be derived from the width remaining after the overflow controls are introduced: that is a feedback loop, and it oscillates at the boundary, flickering the entire Tab Bar.

When the Tab Strip enters its scrolling state:

- the **New Tab Button**, when displayed (§2.1.2), moves from the Tab Strip into the Tab Bar Controls;
- a pair of **scroll controls** (`◀ ▶`) appears immediately to its right;
- the **Tab List Button** (`▾`) appears next; and
- the **Application Menu Button** remains anchored at the far right.

The resulting control order is always:

```text
[ + ] [ ◀ ▶ ] [ ▾ ] [ ☰ ]    button displayed
[ ◀ ▶ ] [ ▾ ] [ ☰ ]          button hidden — current
```

Entering overflow widens the Tab Bar Controls by **144px** with the button displayed, **108px** without it, which narrows the Tab Strip and may push one further tab out of view.

This reflow is accepted. Permanently reserving that space would reduce the usable width of the Tab Strip in the normal case, and the application expects a relatively small number of simultaneously open games.

Tabs are clipped at the Tab Strip edge rather than hidden whole. A partially visible tab signals that more exist.

### 2.1.4 Scrolling the Tab Strip

The Tab Strip can be scrolled horizontally when it is overflowing.

The **mouse wheel and trackpad** scroll the Tab Strip whenever the pointer is over it; a vertical wheel gesture maps to horizontal scrolling. The scroll controls provide an additional explicit navigation mechanism.

The scroll controls are **disabled, not hidden**, at their respective scroll extents, so the control group's width remains stable.

Activating a tab — by click, by keyboard, or by opening a game — scrolls that tab into view.

The following elements never scroll out of view:

- the Library Tab;
- the Application Menu Button; and
- all Tab Bar Controls while the Tab Strip is overflowing.

The scroll controls are grouped at the right of the Tab Bar rather than split across the two ends of the Tab Strip. This keeps the Tab Bar controls together and avoids placing a control immediately beside the Library Tab that could be interpreted as belonging to it.

### 2.1.5 Tab List

The **Tab List Button** (`▾`) opens a dropdown listing every open tab.

It appears **only while the Tab Strip is overflowing**. In the normal state every tab is already visible, so a permanently present control would consume Tab Strip width to no purpose — the same reasoning that justifies reflowing the controls rather than reserving their space (§2.1.3).

The dropdown:

- lists the tabs **in the Tab Strip**, in strip order. The **Library Tab is excluded**: it is pinned outside the strip, is never clipped, and can never be scrolled out of view, so listing it would offer a second route to a tab that is permanently one click away;
- shows each tab's **name only** — no icon, and no label where a label would repeat what the name already says;
- **truncates** a name that does not fit, with the full name available as a hover tooltip;
- marks the active tab;
- marks tabs currently scrolled out of view, and on which side;
- provides a close control per row, except for the Library Tab.

Because the list truncates, it is no longer the answer to "which game is in that half-clipped tab" — the hover tooltip is. The dropdown's purpose is navigation among strip tabs, not disclosure of full titles.

Selecting a row activates that workspace, scrolls its tab into view, and dismisses the dropdown. Closing a row leaves the dropdown open so that several tabs can be closed in one pass; the dropdown dismisses itself if the Tab Strip stops overflowing.

The dropdown is dismissed by selection, by clicking outside it, or by `Esc`.

## 2.2 Application Menu

The **Application Menu Button** (`☰`) is part of the Application Shell and remains available regardless of the active workspace. It is anchored at the far right of the Tab Bar and does not scroll with the tabs.

The menu contains, in this order:

| Item | Behavior |
| --- | --- |
| **Language** | Opens a submenu of bundled locales. Selection applies immediately to all shell and workspace text, and persists. Marks the active locale. |
| **Theme** | Toggles Light ⇄ Dark directly. No submenu, no confirmation. |
| **Full Screen** | Toggles full-screen presentation. The label reflects the current state. |
| **Settings** | Opens the Settings Tab, or activates it if one already exists. |
| **About** | Opens or activates the Settings Tab **and** selects its About section. |
| **Quit** | Closes the application. |

The Application Menu carries **no workspace-specific commands**. It is identical regardless of which tab is active.

The menu anchors to the button's right edge and opens downward. It is dismissed by selection, by clicking outside it, or by `Esc`.

### 2.2.1 Full Screen

Full Screen toggles the application into and out of full-screen presentation.

The menu item's trailing value states the action available — entering or exiting — so that the current state is legible without opening a submenu.

The displayed state must track the **actual** presentation state, including changes the user makes outside the menu, such as pressing `Esc` or a platform full-screen key. The menu is a view of the state, not the sole owner of it.

Where the host does not permit programmatic full-screen presentation, the item is omitted rather than shown inert.

### 2.2.2 Quit

Quit closes the application window.

**Quit is a request the host may refuse.** Where the application runs in an environment that does not permit it to close its own window, the request will fail. In that case the application must **say so** rather than appear to do nothing: it displays a dismissible notice stating that the window cannot be closed by the application and naming the platform action that will close it.

Silently ignoring a failed Quit is not acceptable. A command that appears to do nothing is indistinguishable from a defect.

## 2.3 Workspace Navigation

Navigation **between workspaces** is performed through the Tab Bar.

The shell maintains the distinction between **open workspaces** and the **active workspace**:

```text
Tab Bar
   │
   ├── Library Tab       ──► Library Workspace
   ├── Game Tab A        ──► Game Workspace
   ├── Game Tab B        ──► Game Workspace
   └── Settings Tab      ──► Settings Workspace
```

Selecting a tab makes its workspace the **active workspace** and presents it in the Workspace Area.

Opening a workspace does not replace another open workspace. **Each open workspace retains its own state** — selection, scroll position, search text, and any internal navigation — for as long as its tab remains open. Returning to a workspace restores exactly what was left.

For example:

1. Search for a game in the Library Workspace.
2. Open the game in a Game Tab.
3. Return to the Library Tab — the same filter, search, scroll position, and selected row.
4. Search for another game.
5. Open the second game.
6. Move between the open Game Tabs and the Library Tab without losing their respective state.

The shell is responsible only for **navigation between workspaces**. Navigation within a workspace is defined by that workspace's own Navigation section.

## 2.4 Application Window

The Application Window is the outermost container for the Application Shell.

Its minimum size is **800 × 600 pixels**. The window is not resized below 800 pixels in width or 600 pixels in height.

All workspaces inherit this minimum. Workspace specifications therefore do not define behavior for dimensions below 800 × 600.

### 2.4.1 Enforcing the minimum

How strictly this minimum can be enforced depends on the host:

| Host | Enforcement |
| --- | --- |
| **Native shell** | The window manager refuses the resize. This is the only true enforcement. |
| **Installed web application** | Where the host permits a window to resize itself, the application returns the window to the minimum. The user may begin a resize below the minimum but cannot complete one. |
| **Browser tab** | No enforcement is possible. The user agent owns the window and a page cannot veto a resize. |

Because enforcement cannot be guaranteed, the application must additionally guarantee that **the shell is never presented at a size below the minimum**.

Below 800 × 600 the shell is covered entirely by a **window-size notice** stating the current size, the required minimum, and which dimension is short. The shell remains mounted beneath it, so no workspace state is lost, and the notice withdraws as soon as the window is large enough.

This is enforcement of the presentation rather than of the window. It is what allows the shell to require no degraded sub-minimum layout and no scrollbars of its own (§2), and it holds on every host.

## 2.5 Keyboard

The shell defines the following application-level keyboard behavior. Workspaces define their own keyboard behavior within the Workspace Area.

| Input | Result |
| --- | --- |
| `Ctrl/⌘ + W` | Close the active tab; no effect on the Library Tab |
| `Ctrl/⌘ + Tab` | Next tab, wrapping, including the Library Tab |
| `Ctrl/⌘ + Shift + Tab` | Previous tab, wrapping |
| `Ctrl/⌘ + 1…8` | Activate the nth tab; `1` is always the Library Tab |
| `Ctrl/⌘ + 9` | Activate the last tab |
| `←` `→` in the Tab Strip | Move focus between tabs; `Enter` activates |
| `Esc` | Dismiss the Application Menu or the Tab List |

Middle-clicking a tab closes it, except the Library Tab.

**Tab reordering by drag is not provided.** The ordering rules in §2.1.1 — Settings always rightmost, Game Tabs appended — would need reconciling with free reordering first.

**There is no `Ctrl/⌘ + T`.** It created an empty Game Workspace, which no longer exists (§2.1.2). Games are opened from the Library. If the New Tab Button is given a new action, this binding should be reconsidered alongside it.

Some of these bindings are reserved by the host in some environments. Where a binding cannot reach the application, the corresponding on-screen control remains the primary route; no function is available only by keyboard.

---

# 3. Workspaces

A **Workspace** is the content presented in the Workspace Area for a particular tab.

The Application Shell provides the common presentation and management model. Workspace specifications define the content and behavior within the Workspace Area.

| Tab | Workspace | Persistent | Pinned | Multiple instances | Specified in |
| --- | --- | --- | --- | --- | --- |
| Library | Library Workspace | Yes | Yes | No | §4 |
| Game | Game Workspace | No | No | Yes | §5 |
| Settings | Settings Workspace | No | No | No | §6 |

## 3.1 Common Workspace Structure

Every workspace specification begins with an **Overview** that identifies its purpose and relationship to the application. Where applicable, it then defines:

- **Layout** — the workspace's overall spatial structure.
- **Navigation** — navigation within the workspace.
- **Regions** — the individual functional areas.
- **Resizing and Scrolling** — how the workspace responds to the available space.

These sections describe the workspace **inside the Workspace Area**. They do not repeat shell behavior such as tab creation, tab closing, tab overflow, application-level menus, or Application Window minimum size.

Workspace-specific regions may use terminology appropriate to their purpose. For example, the Library Workspace uses structural terms such as **Sidebar** and **Content Area**, while the Game Workspace may use semantic terms such as **Game View** and **Game Details**.

### 3.1.1 Obligations of every workspace

A workspace:

1. **Fills the Workspace Area** and inherits its box from the shell. It declares no minimum or maximum size of its own.
2. **Owns all of its own scrolling.** The shell contributes none. A workspace that needs scrolling provides it in a specific region and states which.
3. **Never requires a page-level scrollbar.** Flexible containers between the Application Window and the workspace's controls must be permitted to shrink below their children's natural content width, so that no control can force the workspace beyond the window.
4. **Retains its state** for as long as its tab is open (§2.3).
5. **Uses the shared visual system** in §7 rather than defining its own colors, type scale, or spacing.
6. **Creates no tabs through its internal navigation.** Only the shell opens and closes tabs.

---

# 7. Visual System

The visual system is shared by the shell and every workspace. Workspaces do not define their own colors, typefaces, or type scale.

## 7.1 Theme

The application provides **Light** and **Dark** themes.

The theme is selected from the Application Menu (§2.2), applies immediately, and persists across sessions. On first run the application follows the operating system preference.

All color is expressed as **semantic tokens** rather than literal values. A component references a token; the theme supplies the value. Defining a color only within one theme's block is a defect: it produces one theme's text on the other theme's background.

The token set distinguishes:

| Role | Purpose |
| --- | --- |
| Ground | Page and workspace backgrounds |
| Surface | Raised or active surfaces — the active tab, popovers, content areas |
| Chrome | Application furniture — tab bar, toolbars, status bars, sidebars |
| Ink | Primary, secondary, muted, and faint text |
| Rule | Separators, at two weights |
| Focus | Keyboard focus indication |
| Danger | Destructive actions and error states |

The theme must remain coherent under the operating system's forced-colors or high-contrast mode: any state conveyed by fill alone must also be conveyed by another means (§9).

## 7.2 Typography

Two typefaces are bundled with the application and self-hosted. Nothing is fetched at runtime.

| Role | Typeface |
| --- | --- |
| Interface, labels, names, prose | **IBM Plex Sans**, weights 400 and 600 |
| Dates, ratings, results, counts and other tabular data | **IBM Plex Mono**, weights 400 and 600 |

**The monospace advance width is 0.600em, and this value is load-bearing.** Several fixed dimensions elsewhere in this specification are derived from it. A substituted face of different metrics makes those dimensions wrong — text is clipped or columns no longer align.

Consequently:

- fonts are subset to Latin-1 and Latin Extended-A — player names carry diacritics — together with `½`;
- the regular weights are preloaded, and all faces are declared so that text does not render in a fallback while they load. A fallback rendering even briefly would alter measured widths and reflow content;
- any change of typeface requires the derived dimensions to be re-derived, not merely re-checked.

Numerals use tabular figures wherever they appear in a column.

## 7.3 Density and metrics

The application is a **pointer-driven desktop application** and is dense accordingly. It is not optimized for touch input; see §9.

| Element | Height |
| --- | --- |
| Tab Bar | 40px |
| Tab Bar control button | 36px (Application Menu 40px) |
| Workspace toolbar | 40px |
| Workspace sidebar header | 40px — equal to the workspace toolbar beside it, which is what lets the icon rail align with the content (§3.2.3.8) |
| Workspace status bar | 24px |
| Sidebar navigation row | 26px |
| Icon rail item | 34px |
| Data table row | 30px |
| Data table header row | 28px |

| Measure | Value |
| --- | --- |
| Minimum tab width | 220px |
| Preferred tab width | 300px |
| Expanded workspace sidebar | 220px |
| Collapsed workspace sidebar — icon rail | 56px |
| Data table cell padding | 6px left, 6px right |
| Base type size, interface | 12–13px |
| Data table type size | 12px |

The **collapsed sidebar width of 56px is a shell-level value**, so that any workspace adopting an icon rail uses the same measure. The expanded sidebar width of 220px is likewise shared.

## 7.4 Iconography

**Lucide is the application's icon set** (ISC licence), bundled with the application. Every icon in every workspace is a Lucide glyph unless it appears in the register of exceptions below, and that register is exhaustive: an icon that is neither Lucide nor listed there is a defect. No icon is loaded at runtime and none is drawn by the host.

Icons are imported individually, so that only those actually used reach the bundle. Importing the set as a whole would pull in more than two thousand.

**Icons are never Unicode characters.** An earlier revision used characters such as `⏮ ⏭ ◀ ▶ ⏸ ⏻ ⋯ ⟳ ⚠ ▾ ☰` as icons. Thirteen of the seventeen in use are absent from the bundled IBM Plex faces, so they were rendered by whatever the operating system substituted: different on every platform, occasionally colour emoji, and not offline in any meaningful sense (§1.1). Every icon is bundled SVG.

The bundled faces are the **latin** and **latin-ext** subsets of IBM Plex Sans and Mono. A character outside those subsets has no bundled glyph whatever it looks like in an editor, so coverage is not a matter of judgement: it is checked against the font files.

**One concept, one glyph.** The mapping from concept to icon is defined once, in `lib/icons.js`, and shared; two names for the same object take the same icon, and two different objects never take the same one. A Library and a database are the same object and share a glyph (§3.2.3.10); an unfiltered *view* of the library is a different thing and does not. A Feed in the Library Sidebar and a Subscription in Settings are the same object and share `rss` (§3.4.4).

### 7.4.1 Rendering

Lucide is drawn on a 24px grid with a 2px stroke. This interface renders icons at 12–18px, where that stroke is optically heavy, so the application renders at **stroke 1.5 at every size**, held constant rather than scaled with the glyph — otherwise a 12px status glyph comes out hairline beside an 18px row glyph.

**Size is a property of the role, not a single default.** `ICON_SIZE` is the fallback for a call site that names no size; the roles below name one.

| Role | Drawn at | Slot | Where |
| --- | :-: | :-: | --- |
| Object row glyph | 18px | 18px | The leading slot of a row in an object section (§3.4.8) |
| Sidebar section glyph | 18px | 18px | The Settings Sidebar (§3.4.4) |
| Brand mark | 16px | 18px | A subscription's source (§3.2.3.3, §3.4.8.3) |
| Disclosure chevron | 15px | 20px | The expander control on a row (§3.4.8) |
| Button glyph | 13px | — | Inside a button, beside its label |
| Status glyph | 12px | — | Beside status text |

**The slot and the drawing are different measurements.** A row's leading slot is 18px in every section so that the name column starts at the same offset throughout — 14px padding + 18px slot + 12px gap = 44px, which is also the expander's indent. What is drawn inside the slot varies by icon set.

A 16px brand mark and an 18px Lucide glyph have **the same visual height**, to within half a pixel. Lucide reserves a margin inside its 24-unit grid and renders at about 92% of nominal size; Simple Icons take the full grid and render at 100%. The two sizes are equal, not different, and the difference in the number exists only to cancel the difference in built-in padding.

**Weight is not equalised, and deliberately so.** A filled brand mark carries more ink than a stroked glyph of the same visual height. A source mark should read as a brand rather than as another piece of interface furniture.

### 7.4.2 Register of exceptions

Three kinds of image are not Lucide. Nothing else is exempt.

| # | Exception | What | Why Lucide cannot serve |
| :-: | --- | --- | --- |
| 1 | **Brand marks** | chess.com and lichess, from **Simple Icons** (CC0), 16px, monochrome, inheriting the row's colour. `ChessComMark.svelte`, `LichessMark.svelte` | Lucide contains no brand marks and correctly never will. A brand mark is only ever used to denote that brand. CC0 covers the artwork; each mark remains its owner's trademark |
| 2 | **Bespoke illustration** | The undersized-window drawing in `WindowFloorGate.svelte` (§2.4.1) | It illustrates a specific condition rather than naming a concept. No icon set contains a glyph for "this window is too small" |
| 3 | **Board pieces** | Chess pieces on the board, from Chessground's own asset set (§5.4.1) | Board content, not interface iconography. The pieces are the application's subject matter |

**Adding a fourth exception is a specification change.** A concept with no Lucide glyph is resolved by choosing the nearest Lucide glyph or by reconsidering the concept — not by reaching for a second icon set.

Icons are never the sole carrier of state; see §9.3.

## 7.5 Motion

Motion is functional rather than decorative. It is confined to state transitions that would otherwise be abrupt — a control changing state, a transient notice appearing.

All motion respects the operating system's reduced-motion preference, under which transitions are removed rather than shortened.

---

# 8. Localization

All user-facing text is localized. No string is hard-coded in a component.

Locale files are **bundled with the application** (§1.1). Changing locale from the Application Menu applies immediately to every open workspace and persists across sessions.

On first run the application selects a bundled locale matching the operating system preference, falling back to English.

Resolution order for a string is: the active locale, then English, then the key itself. A partially translated locale therefore degrades to English rather than to blank text.

Text must not be assembled from concatenated fragments. Where a value appears inside a sentence, the whole sentence is a single localizable string with a named placeholder, so that translators control word order.

Layout must tolerate text expansion. Labels that are short in English are frequently 30–50% longer in German; no layout may depend on a specific string length.

**No right-to-left locale is included in this release.** Adding one requires the entire shell and every workspace to mirror, and is a layout change that must be scoped separately rather than treated as an additional translation.

---

# 9. Accessibility

## 9.1 Structure

The Tab Bar is exposed as a tab list, each tab controlling the Workspace Area. A workspace whose internal navigation is a set of mutually exclusive sections may expose its own nested tab list; where it does, both the outer and inner panels are labelled.

Lists of thousands of rows are virtualised. Where they are, the accessible row count must state the **true total**, not the number of rows present in the document.

Any control that expands or collapses a region reports its state. Any control whose only visible content is an icon carries a text label naming the action, not the glyph.

**Selection is reported by role, not by the glyph that draws it.** A control that is one of a mutually exclusive set, or an independent toggle, takes the role that says so and carries the corresponding state — `menuitemradio` / `menuitemcheckbox` with `aria-checked` in a menu, and the equivalent elsewhere. An unselected member of a group still takes the role and reports `false`: that is what tells assistive technology the group exists and that this member is not the chosen one.

Once the state is on the element, the tick or dot that renders it is **decorative and correctly hidden**. This cuts both ways, and neither half is safe alone: hiding a glyph that duplicates a reported state is right, and hiding a glyph that is the only evidence of that state removes the state entirely. §2.2's requirement that the menu "marks the active locale" is satisfied by the role, and only illustrated by the tick.

## 9.2 Keyboard

Every function is reachable by keyboard. A long list or table is a **single tab stop** with roving focus inside it, not one stop per row.

Focus is always visible. The focus indicator is a token in the visual system (§7.1), not a per-component decision, and is never removed without replacement.

Actions available only by double-click must have a single-key equivalent — conventionally `Enter` on the focused item.

## 9.3 Non-colour state

**No state is conveyed by colour alone.** Selected, active, error and synchronizing states each carry at least one non-colour cue: position, weight, shape, or text.

This holds under forced-colors mode, where the application's own palette is replaced by the operating system's.

## 9.4 Target size

Interactive targets meet the 24 × 24 CSS pixel minimum. Rows in lists and tables are full-width targets and satisfy this comfortably at the densities in §7.3.

The application does **not** meet the 44 × 44 guidance intended for touch input. This is a deliberate consequence of being a dense pointer-driven application, and it is the correct trade for the intended input device.

**If touch input is brought into scope**, the resolution is a user-selectable density setting with a comfortable mode at 40–44px rows, rather than relaxing the default density. This specification does not currently define touch behavior.

---

# 10. Platform

The application is distributed as a self-contained application whose entire UI — code, styles, icons, fonts, and localized text — is installed locally and available offline (§1.1).

Two shell behaviors depend on capabilities the host may withhold:

| Behavior | Requirement | Where unavailable |
| --- | --- | --- |
| Enforcing the window minimum (§2.4) | The application may resize its own window | The window-size notice guarantees the presentation regardless |
| Quit (§2.2.2) | The application may close its own window | A dismissible notice states the platform action instead |

Where a capability is unavailable, the application states the limitation plainly. It does not present a control that silently does nothing.

Only a **native shell** enforces §2.4 at the window-manager level. If a strict reading of that clause is required for acceptance, native packaging is the means; it changes no part of this specification.

---

# Appendix — decisions incorporated in this revision

| § | Previous | This revision |
| --- | --- | --- |
| 2.1 | Tab Bar height unstated | 40px |
| 2.1.1 | Minimum tab width "TBD" | **220px**, with the close control and type indicator as reserved space |
| 2.1.1 | Preferred tab width unstated | 300px |
| 2.1.1 | Close-tab activation order unstated | Right neighbour, then left, then Library |
| 2.1.2 | New Tab Button "visible but inactive" | Superseded by the reconciliation below — the button is **hidden**, and the empty Game Workspace it created is **removed** |
| 2.1.3 | Overflow decision basis unstated | Computed from the normal-state budget only, to prevent boundary oscillation |
| 2.1.3 | Control order `[+] [◀▶] [☰]` | `[+] [◀▶] [▾] [☰]` |
| 2.1.4 | Scroll control behavior at extents unstated | Disabled, not hidden |
| 2.1.5 | Tab list deferred to a future release | **Included**, shown only while overflowing |
| 2.2 | Menu: Language, Theme, Settings, About | **Full Screen** and **Quit** added |
| 2.2.1 | — | New: Full Screen, with state tracked from the host |
| 2.2.2 | — | New: Quit, with an explicit notice when the host refuses |
| 2.3 | State retention implied | Stated explicitly as a workspace obligation |
| 2.4 | "Hard minimum", enforcement unstated | Enforcement tiered by host, plus a window-size notice that holds everywhere |
| 2.5 | No keyboard specification | New section |
| 3.1.1 | — | New: the six obligations common to every workspace |
| 7 | No visual system section | New: theme tokens, bundled typefaces, density scale, motion |
| 7.2 | Fonts mentioned only as bundled assets | **IBM Plex Sans + IBM Plex Mono**; the 0.600em advance declared load-bearing |
| 7.3 | Individual metrics scattered or unstated | Consolidated; collapsed sidebar rail defined as a shell-level 56px |
| 8 | Localization implied by the Language menu | New section, including expansion tolerance and the RTL exclusion |
| 9 | No accessibility section | New: structure, keyboard, non-colour state, target size |
| 10 | — | New: capability-dependent behavior stated plainly |

**Reconciled with the prototype, 4 Sep 2026.** A one-time sweep aligning this document with what the prototype actually does. See the note below.

| § | Document said | Prototype does — now specified |
| --- | --- | --- |
| 1.3, 2.1.2, 2.1.3 | New Tab Button present, in one of two positions | **Hidden.** Behaviour and geometry retained against its return; the width budget is computed with it absent |
| 2.1.5 | Tab list carries *all* tabs "including the Library Tab", at "full, untruncated title" | **Excludes the Library Tab**; **name only**, **truncated**, full name on hover |
| 2.5 | `Ctrl/⌘ + T` "equivalent to the New Tab Button" | **Removed.** It created an empty Game Workspace, which no longer exists |
| 7.3 | Workspace sidebar header **30px** | **40px**, matching the workspace toolbar |
| 7.4 | Iconography unspecified | **New subsection** — Lucide, bundled, stroke 1.5 at 16px; Simple Icons for brand marks; the former Unicode glyphs explicitly rejected |
| 7.5 | Was §7.4 | Renumbered by the insertion of Iconography |

**Notes for the editor.**

1. §2.1.2 has changed three times: inert, then active, then hidden. This revision keeps the button and removes the empty Game Workspace it used to create — which leaves the control built, positioned, and **without an action**. That gap is deliberate and recorded rather than filled by guesswork; it is the one thing §2.1.2 does not answer.
2. §7.2's advance-width requirement ties the visual system to the fixed dimensions in the workspace specifications. A future change of typeface is not a cosmetic change.
3. §9.4 records that touch input is out of scope. If that changes, it is a density decision rather than a per-component one.
4. The keyboard map in §2.5 is new to the specification. Workspace-level keyboard behavior is specified per workspace and should be checked for collisions with these bindings.
5. Removing the empty Game Workspace also closed the keyboard-only gap that hiding the button had opened: the function that had no pointer route no longer exists, so §2.5's guarantee holds again.
6. The reconciliation above records the prototype as built. It is **not** a licence to treat the prototype as the specification in general — the grant was explicitly one-time. Clauses this document specifies but the prototype does not yet implement remain requirements, not errors.
