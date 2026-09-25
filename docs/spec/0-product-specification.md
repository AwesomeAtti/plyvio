# Plyvio — Product Specification

> **Product name: Plyvio.** Everywhere else in this document the product is referred to as "the app" or "the application" rather than by name, so that a future rename touches only this line.

> **About this document.** This is the merged, reconciled product specification for the application, combining four previously separate documents — Application Shell, Library Workspace, Settings Workspace, and Game Workspace — into one, with consistent numbering and a single set of shared systems. It supersedes those four documents, which are retained on disk for history but should no longer be edited or cited.
>
> This merge is an editorial reconciliation, not a redesign: it does not change application behavior or introduce new architecture beyond the explicit resolutions listed in §11.1. Where the four source documents disagreed, this document states the resolution and records the "before" in §11.1 Revision Notes. Unresolved questions are collected in §11.2 Open Decisions, for the product owner to decide later — they are not resolved here.
>
> Old-to-new section mapping: Design Overview §1 ← Shell §1. Application Shell §2 ← Shell §2. Workspace Common Structure §3 ← Shell §3.1. Library Workspace §4 ← 3.2-library-workspace.md (§3.2.x → §4.x). Game Workspace §5 ← 5-game-workspace.md (§5.x, unchanged). Settings Workspace §6 ← 3.4-settings-workspace.md (§3.4.x → §6.x). Visual System §7 ← Shell §7. Localization §8 ← Shell §8. Accessibility §9 ← Shell §9. Platform §10 ← Shell §10. Open Decisions and Revision Notes §11 ← new, consolidating all four appendices.

---

# 1 Design Overview

## 1.1 Application

The application is a **cross-platform desktop application** that runs standalone and remains fully usable without Internet access. All core functions described in this specification are available offline.

Where a feature uses an online source, the source is an **optional enrichment and never a dependency**. Removing network access may reduce the information available, but must not make the feature unusable or leave the UI in a broken or incoherent state.

The initial application has two such integrations:

- **Subscriptions** may synchronize games from external providers. Without a network connection, Subscriptions remain visible and selectable, and previously fetched games remain browsable; only synchronization is unavailable.
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

The application uses a **tabbed workspace model**.

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

1. **Library Workspace** (§4) — the persistent entry point for searching and managing the game library.
2. **Game Workspace** (§5) — the workspace for viewing, playing, and analyzing an individual game.
3. **Settings Workspace** (§6) — the application's configuration surface.

The shell defines **how workspaces are presented and managed**. Individual workspace chapters define **what each workspace contains and how it behaves within the Workspace Area**.

This distinction is intentional. Workspace types may have very different internal layouts while sharing the same application-level navigation and presentation model.

The application adopts familiar and established UI patterns from other applications, such as **browser-style tabs** and **asset-management sidebars and search toolbars**. These are **interaction references only**, not indications of application functionality or identity.

---

# 2 Application Shell

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

1. **Pinned Tab** — fixed at the left, its width equal to the Sidebar's expanded width (220px, the shared `SIDEBAR_W` token), independent of the Sidebar's own collapsed/expanded state.
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

The **New Tab Button** (`+`) is a Tab Bar control.

The button has one of two positions depending on Tab Strip overflow:

- **No overflow:** immediately after the last tab, inside the Tab Strip.
- **Overflow:** in the Tab Bar Controls, at the start of the control group.

Only one New Tab Button is displayed at any time. It moves; it is not duplicated.

The Tab Strip's width budget is computed with the button's presence as a **parameter**, not an assumption. Hidden, the strip reclaims its 36px in the normal state, so tabs reach their preferred width sooner and overflow later (§2.1.3).

**Its action is "New Game"** (agreed and built 24 Sep): a blank Game Workspace at the standard starting position, held only in the tab itself — a **draft** — until the user explicitly saves it. This reverses the button's own earlier removal, below, on different terms: the workspace it opens is never *empty* (it always shows a position and a Game Info card, exactly like any other Game Tab), and it never lingers unsaved-and-forgotten the way the old one did, because Stage 1's save/dirty machinery (§2.3) flags it dirty the moment it exists and the close-time confirmation (§2.3) catches an attempt to discard it.

`Ctrl/⌘ + T` opens one the same way (§2.5) — the New Tab Button's own binding, restored alongside its action.

#### A Game Tab holds a game, real or draft

A Game Workspace exists to show a game; the empty variant removed 4 Sep — no content, no title of its own, nothing for its Sections to report on — was a testing holdover and stays gone. A Game Tab is created one of three ways:

- **opening a game from the Library** (§4.4.3) — opening a game that is already open activates the existing tab rather than creating a second one, since two tabs on one game would carry identical titles, truncated identically at the 220px minimum, and would let the same game's analysis diverge in two places;
- **the New Tab Button, or `Ctrl/⌘ + T`** — a blank draft, above;
- **pasting a FEN or a single-game PGN onto the board** (§5.4.1) — a draft seeded with the pasted content, after confirming, unless the active tab is already an untouched draft with nothing to lose.

A draft is a real Game Tab throughout — it has a position, a Game Info card, and a title — the only thing distinguishing it from an opened library game is that saving it inserts a new game rather than updating an existing row.

**The Settings Tab** is created from the Application Menu (§2.2), and there is only ever one (§2.1.1).

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
| **About** | Opens or activates the Settings Tab **and** selects its About section (§6.11). |
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
| `Ctrl/⌘ + T` | Open a new, blank draft Game Tab — the New Tab Button's own action (§2.1.2) |
| `Ctrl/⌘ + Tab` | Next tab, wrapping, including the Library Tab |
| `Ctrl/⌘ + Shift + Tab` | Previous tab, wrapping |
| `Ctrl/⌘ + 1…8` | Activate the nth tab; `1` is always the Library Tab |
| `Ctrl/⌘ + 9` | Activate the last tab |
| `←` `→` in the Tab Strip | Move focus between tabs; `Enter` activates |
| `Esc` | Dismiss the Application Menu or the Tab List |

Middle-clicking a tab closes it, except the Library Tab.

**Tab reordering by drag is not provided.** The ordering rules in §2.1.1 — Settings always rightmost, Game Tabs appended — would need reconciling with free reordering first.

`Ctrl/⌘ + T` opens a new draft Game Tab, the same as the New Tab Button (§2.1.2) — restored 24 Sep alongside the button's own new action, replacing the earlier empty-Game-Workspace binding this removed.

Some of these bindings are reserved by the host in some environments. Where a binding cannot reach the application, the corresponding on-screen control remains the primary route; no function is available only by keyboard.

---

# 3 Workspace Common Structure

A **Workspace** is the content presented in the Workspace Area for a particular tab.

The Application Shell provides the common presentation and management model. Workspace chapters define the content and behavior within the Workspace Area.

| Tab | Workspace | Persistent | Pinned | Multiple instances | Specified in |
| --- | --- | --- | --- | --- | --- |
| Library | Library Workspace | Yes | Yes | No | §4 |
| Game | Game Workspace | No | No | Yes | §5 |
| Settings | Settings Workspace | No | No | No | §6 |

Every workspace chapter begins with an **Overview** that identifies its purpose and relationship to the application. Where applicable, it then defines:

- **Layout** — the workspace's overall spatial structure.
- **Navigation** — navigation within the workspace.
- **Regions** — the individual functional areas.
- **Resizing and Scrolling** — how the workspace responds to the available space.

These sections describe the workspace **inside the Workspace Area**. They do not repeat shell behavior such as tab creation, tab closing, tab overflow, application-level menus, or Application Window minimum size.

Workspace-specific regions may use terminology appropriate to their purpose. For example, the Library Workspace uses structural terms such as **Sidebar** and **Content Area**, while the Game Workspace uses semantic terms such as **Game View** and **Game Details**.

## 3.1 Obligations of every workspace

A workspace:

1. **Fills the Workspace Area** and inherits its box from the shell. It declares no minimum or maximum size of its own.
2. **Owns all of its own scrolling.** The shell contributes none. A workspace that needs scrolling provides it in a specific region and states which.
3. **Never requires a page-level scrollbar.** Flexible containers between the Application Window and the workspace's controls must be permitted to shrink below their children's natural content width, so that no control can force the workspace beyond the window.
4. **Retains its state** for as long as its tab is open (§2.3).
5. **Uses the shared visual system** in §7 rather than defining its own colors, type scale, or spacing.
6. **Creates no tabs through its internal navigation.** Only the shell opens and closes tabs.

---

# 4 Library Workspace

## 4.1 Overview

The Library Workspace is the application's primary game-discovery and game-management view. It is the persistent, pinned entry point to the user's game library and remains available regardless of how many Game tabs, or a Settings tab, are open.

The Library Workspace follows the interaction model of a digital asset management application. Users browse, search, filter, and organize a large collection of games.

The workspace consists of two primary regions:

```text
Library Workspace
├── Sidebar
└── Content Area
```

The **Sidebar** provides high-level navigation and filtering within the Library.

The **Content Area** is the primary working region and displays the controls and game list associated with the current Library selection.

The Library tab is persistent and pinned.

Selecting a game selects and highlights it in the Content Table. Double-clicking a game opens it in a Game tab.

There is no multi-selection.

## 4.2 Layout

The Library Workspace is divided horizontally into two regions:

```text
┌──────────────────────┬──────────────────────────────────────────────┐
│                      │                                              │
│                      │                                              │
│       Sidebar        │                 Content Area                  │
│                      │                                              │
│                      │                                              │
│                      │                                              │
└──────────────────────┴──────────────────────────────────────────────┘
```

The **Sidebar** occupies the left side of the workspace.

The **Content Area** occupies all remaining horizontal space to the right of the Sidebar.

The Sidebar is collapsible.

The expanded Sidebar has a fixed width of **220px**.

The collapsed Sidebar has a fixed width of **56px**. This value is an application-shell token (`--rail-w`, §7.3) rather than a Library-specific dimension, so that other workspaces adopting an icon rail use the same measure.

The Sidebar is not user-resizable.

The Content Area has no workspace-specific minimum or maximum dimensions. Its available size is determined by the application shell and the current Sidebar state.

The Library Workspace does not include the Application Window, Tab Bar, application menu, or other application-shell elements. Those elements are defined in §2.

## 4.3 Navigation

The Library Workspace's internal navigation is its Sidebar, a collapsible region on the left.

The Sidebar provides high-level Library navigation and filtering. It does not duplicate the Content Area's search or game-management controls.

Selecting an item in the Sidebar changes the games displayed in the Content Table.

The Sidebar is intentionally focused on the primary ways users navigate a game library:

- Library views
- Subscriptions
- Collections
- Tags
- Trash

The Sidebar does not become a second, competing information architecture.

### 4.3.1 Sidebar Contents

The Sidebar contains the following groups and items, in this order:

```text
┌─────────────────────────────┐
│ Master Games ⌄         ‹    │   ← header: Library switcher, collapse control
├─────────────────────────────┤
│   All Games           1,248 │
│   Favorites              36 │
│   Recently Added         18 │
│                             │
│ ⌃ SUBSCRIPTIONS             │
│   [mark] <subscription>  12 │
│   [mark] <subscription>   ⟳ │
│   [mark] <subscription>   ⚠ │
│   More…                     │
│   Add subscription…         │
│                             │
│ ⌄ COLLECTIONS             3 │   ← folded: chevron down, group total
│                             │
│ ⌃ TAGS                      │
│   <tag>                     │
├─────────────────────────────┤
│   Trash                   4 │
└─────────────────────────────┘
```

#### No "Library" heading

The three Library views are **unlabelled**. They open the panel directly, under the switcher.

The heading that used to sit above them said "Library" inside a tab called Library, in a panel whose header names the library. It repeated its own container, which is what a heading is supposed to avoid, and it was the only heading with nothing to distinguish — the other three name kinds of thing the user has created. Its removal also settles which group is the fallback: the one that is always there.

#### Folding

**Subscriptions**, **Collections** and **Tags** fold. The Library views do not.

The distinction is boundedness. Those three grow with use — a library with forty tags pushes everything else off the panel — so folding is how the space comes back. The Library views are three fixed rows that never grow; folding them would save 78px and cost the group most likely to be wanted. Trash is not foldable either, being anchored outside the scrolling flow.

The **heading is the control**. The whole row is the click target, not the chevron alone. The chevron sits at the head of the label and is nearly invisible until the pointer arrives, so a panel at rest reads as labels rather than as controls; it stays at full size in every state, so nothing shifts as the pointer crosses it.

A folded group shows a **group total** in the trailing slot — the number of items hidden, not a game count. An open group shows nothing there, because the counts are on the rows one line below.

Folding must not hide a fault. A folded **Subscriptions** heading inherits the row precedence of §4.3.3 — **error ▸ syncing ▸ item count** — so a sync error is still reported by the only row still on screen. Collections and Tags have no states and fall straight through to the count.

The fold state **persists across sessions**, like the Sidebar's own collapse (§4.3.8). Selecting a destination inside a folded group — from the rail flyout (§4.3.7) or the More… popover — **unfolds that group**, since a selection the user cannot see is worse than an open group.

Every item carries a leading icon at 16px, from the vocabulary in §7.4:

| Item | Icon |
| --- | --- |
| All Games | `list` — a view of the library, deliberately **not** the library glyph, which denotes the database file itself (§4.3.10) |
| Favorites | `star` |
| Recently Added | `clock` |
| Subscription | the **source's own brand mark** (§4.3.3), not a generic feed icon |
| `More…` | `ellipsis` |
| `Add subscription…` | `plus` |
| Collection | `folder` |
| Smart Collection | `folder-search-2` — a folder that finds its own contents, which is what a Smart Collection is |
| Tag | `tag` |
| Trash | `trash-2` |

Trash is anchored to the bottom of the Sidebar and separated from the normal navigation flow. It does not scroll with the navigation groups above it.

Group headings are labels rather than destinations. Selecting one folds or unfolds its group; it never changes what the Content Table shows.

Selecting any Sidebar destination applies a filter to the Content Table.

**The Subscriptions group heading and the collapsed rail's group icon use `rss`** (§7.4). This is a distinct usage from an individual Subscription's own row, which never uses `rss` — see §4.3.3.

### 4.3.2 Library Views

**All Games** displays all games in the local library.

**Favorites** displays games marked as favorites.

**Recently Added** displays games that were recently added to the library. It is a Library filter rather than a separate collection.

"Recently" is **the most recent import**, not a time window: every game whose `created_at` equals the library's latest `created_at`. A single import call gives every one of its rows the same timestamp, so the view is exactly the batch that just landed, however large or small — there is no day or count bound to fall outside of. A game with no `created_at` (a database populated outside the application's import process) is never eligible.

### 4.3.3 Subscriptions

A Subscription represents an external source of games to which the user has subscribed.

The concept is similar to an RSS news feed: the user subscribes to an online source, the application periodically checks it for new games, and newly discovered games are added to the local library.

The same Subscription resources are managed in the **Subscriptions** section of the Settings Workspace (§6.8.3). The Library Sidebar provides a navigation-oriented view of those resources.

Selecting a Subscription applies a filter to the Content Table, displaying only games associated with that Subscription. The Subscription association is a searchable field of the game's underlying data.

```text
Settings
   │
   └── Subscriptions
          ├── Chess.com — User
          └── Lichess — User
Library
   │
   └── Subscriptions
          ├── Chess.com — User
          └── Lichess — User
```

#### Source marks

A Subscription renders as its **source's brand mark** followed by its name:

```text
[mark] <name>                    <trailing slot>
```

The mark is 16px, monochrome, and inherits the row's colour, so it darkens with selection like the text beside it. It is drawn from Simple Icons (§7.4) and bundled.

**A generic feed icon (`rss`) is not used for an individual Subscription row.** Every Subscription would carry the same one, which distinguishes nothing; the source is the single most useful fact about a Subscription at a glance, and the brand mark carries it in less space than a word would. The category-vs-instance distinction this reflects — `rss` for the Subscriptions group, a brand mark for each row — is the general icon-vocabulary rule; see §7.4.

**There are exactly two sources: Chess.com and Lichess.** No other source is offered, and the mark is never used for anything but its own brand. A third source is a specification change, not a configuration option, because it requires a mark.

The Library does not provide Subscription configuration controls.

`Add subscription…` navigates to the Subscriptions section of the Settings Workspace (§6.8.3).

#### Subscription display limit

The Sidebar displays up to **five Subscriptions**. The five displayed are the **five most recently synchronized**, so that the visible set remains useful rather than arbitrary.

If more than five Subscriptions exist, a `More…` item appears after the five displayed Subscriptions.

Selecting `More…` opens a **popover** listing the remaining Subscriptions. The popover does not alter the height of the Sidebar and does not navigate away from the Library.

A Subscription selected from the `More…` popover is temporarily pinned into the visible five for the remainder of the session, so that the user can return to it without reopening the popover.

`Add subscription…` follows the Subscription list and is always present.

#### Subscription state

A Subscription can report:

- New games
- Synchronization in progress
- Synchronization error

Each Subscription has one trailing Sidebar slot. When multiple states apply simultaneously, the displayed state follows this priority:

1. Error
2. Synchronization activity
3. New-game count
4. Nothing

A new-game count represents the number of games added since the user last viewed that Subscription. The count is displayed only when non-zero.

The Subscription's total number of associated games is available in the Status Bar when the Subscription is selected.

#### Offline behavior

Subscriptions are optional enrichment and are never required to browse the local Library.

When the application is offline:

- Subscriptions remain visible.
- Previously downloaded games remain available.
- Subscriptions remain selectable.
- Previously known state remains visible, including new-game counts established while online.
- Synchronization is unavailable.
- The lack of a network connection does not make the local Library unavailable.

**Offline is not an error state.** A Subscription that failed to synchronize while online retains its error indicator. A Subscription that merely cannot synchronize while offline does not acquire one. Marking every Subscription as errored while offline would train users to disregard the error indicator.

**The offline condition is global, and is indicated once, at workspace level, never per Subscription.** This is confirmed by the implementation: `offline` is a single application-wide store, read by the Sidebar (to suppress the "new games" dot and retain — not error — a Subscription's prior state) and by the Status Bar; there is no per-Subscription `offline` status value anywhere in the code. The Status Bar displays `Offline — sync paused` in its right-hand slot, below a running or unanswered import (§4.4.4). See also §6.8's corrected status vocabulary, which does not list `offline` as a per-Subscription value, for the same reason.

The detailed synchronization workflow, provider-specific behavior, scheduling, and error handling are outside this revision.

### 4.3.4 Collections

The Collections group contains user-created collections of games.

A Collection is analogous to an album in a photo-management application or a playlist in an audio application.

A regular Collection is a static set of games. The user decides which games belong to it, and membership remains unchanged until the user modifies the Collection.

A Smart Collection behaves like a Collection in the Library interface, but its membership is automatically computed from a saved search. For example:

```text
All Hikaru games as White
```

could be a Smart Collection whose membership automatically includes newly added games matching its criteria.

Regular Collections and Smart Collections appear together in the Sidebar. They are visually distinguished by icon:

```text
Collection        folder
Smart Collection  folder-search-2
```

Both are folders. A Smart Collection is a folder that finds its own contents, and the shared base shape says the two are the same kind of thing before the difference says how they differ — which a `bolt`, the earlier choice, did not.

Otherwise they have identical navigation behavior.

`New collection…` is always present as the final item in the Collections group.

The workflows for creating, editing, deleting, and defining Smart Collection criteria are outside this revision.

### 4.3.5 Tags

Tags provide user-defined labels that can be applied to games.

A game may have one or more Tags.

Selecting a Tag applies a filter to the Content Table and displays games carrying that Tag.

Tags follow the same general interaction model used by tags in digital asset management applications.

The detailed Tag creation, editing, deletion, organization, and management workflows are outside this revision.

### 4.3.6 Item Rendering and Truncation

Every Sidebar item renders on a single line. Items never wrap.

Text that exceeds the available width truncates with an ellipsis at the end. The item's full text is available as a hover tooltip.

The Library switcher in the Sidebar header is the single exception: it truncates in the **middle**, for the reason given in §4.3.10. The rule here governs Sidebar *items*, and the switcher is a control rather than a destination.

Counts appear only in the expanded Sidebar. They are right-aligned and occupy a fixed-width trailing area of **34px**.

A count never truncates. When space is limited, the item name truncates to make room for the count.

A count of five or more digits renders in abbreviated form — `9k+` — rather than widening the trailing area. Widening the trailing area would reduce the space available to every item name in the Sidebar.

Each Sidebar item has exactly one trailing slot.

For ordinary items, the trailing slot may contain a count.

For Subscriptions, the trailing slot contains the highest-priority applicable state:

```text
error
  ↓
synchronizing
  ↓
new-game count
  ↓
nothing
```

Sidebar contents never affect the width of the Content Area.

### 4.3.7 Collapsed Sidebar

The Sidebar can collapse to an icon-only rail of **56px**.

The collapsed Sidebar retains recognizable icons and high-level navigation affordances.

The **Library switcher does not appear** in the collapsed rail. A single icon is indistinguishable from one Library to the next, so it cannot answer the one question a collapsed switcher exists to answer — which Library is open — and a control that can change scope without being able to show it is the wrong half of the feature. Switching Libraries expands the Sidebar first.

Bounded Library destinations — All Games, Favorites, Recently Added, and Trash — have individual icons.

Unbounded user-created groups are represented by a single group icon:

```text
Collections    → one Collections icon
Subscriptions  → one Subscriptions icon (rss, §4.3.1)
Tags           → one Tags icon
```

Individual members of these groups are not represented as individual icons in the collapsed rail.

Selecting a group icon opens a **flyout** containing its members. The flyout provides the names and relevant state or icons that cannot reasonably fit in the collapsed rail.

Flyout behavior:

- The flyout opens **on click, not on hover**. The rail sits immediately beside the primary work surface, and a hover-triggered flyout would fire while the pointer is merely travelling to the Content Table.
- The flyout is dismissed by selecting a member, by clicking outside it, or by pressing `Esc`.
- Selecting a member applies its filter and closes the flyout. It does not expand the Sidebar.
- The flyout contains **the same list as the corresponding expanded group**, including `More…` and `Add subscription…`, so that nothing is reachable in only one Sidebar state.
- A group icon displays an active state when the current filter belongs to that group, so that the user's location remains visible while collapsed.

For Subscriptions, the group icon displays an indicator when any Subscription has new games. The indicator denotes presence only and is not a count; counts appear only in the expanded Sidebar (§4.3.6), and a numeral would not be legible at rail width. Consistent with §4.3.3, the indicator is suppressed while offline.

### 4.3.8 Sidebar Collapse Control

The Sidebar has a header row of **40px** containing the Library switcher (§4.3.10) and the collapse control.

The header carries **no title**. "Library" names the tab and heads the first group; a third instance labels nothing new. Group headings do the labelling.

The header's 40px matches the Content Toolbar (§4.4.1). Equal bands are what let the rail's icons align with the content beside them.

The collapse control is positioned at the **right of the Sidebar header**, within the Sidebar it controls. It is not placed in the Content Toolbar, which belongs to the Content Area.

The control renders as a chevron indicating the direction the Sidebar will move:

```text
expanded   ‹     collapse
collapsed  ›     expand
```

The header retains its 40px band when collapsed and centres the chevron, so that the control occupies the same position in both states and repeated toggling requires no pointer movement.

The control exposes `aria-expanded` and an accessible label naming the resulting action, so that assistive technology announces "Collapse sidebar" rather than a bare glyph.

The keyboard equivalent is `Ctrl/⌘ + \`.

The collapsed or expanded state persists across sessions. It is an application-level state rather than a per-tab state, as the Library tab is a singleton.

### 4.3.9 Sidebar Resizing

The Sidebar toggles between its fixed expanded and collapsed widths (§4.2) and is not user-resizable.

### 4.3.10 Library Switcher

A **Library** is a SQLite database file. "Library" is the user-facing term and "database" the implementation term; they name the same object. The Settings Workspace configures them under **Databases** (§6.8.1).

The Sidebar header contains a **Library switcher** naming the Library the workspace is currently showing.

#### Placement

The switcher fills the Sidebar header, with the collapse control trailing it:

```text
┌─────────────────────────────┐
│ Master Games ⌄         ‹    │
└─────────────────────────────┘
  └───── switcher ─────┘ └ §4.3.8 ┘
```

The switcher is in the Sidebar rather than the Content Toolbar because it names what the Sidebar is listing. Its width is what remains of the Sidebar's 220px after the header padding, the gap, and the 20px collapse control: **178px**, of which **152px** is available to the name.

The switcher carries **no icon**. A Library *is* a database, so a glyph beside the name in a panel that is unambiguously the library would be a second name for the same thing. The 24px this returns goes to the name.

#### No frame

The switcher draws **no border and no fill at rest** — the name, then a chevron.

A framed control reads as a text field, and nothing is typed here. The box also competed with the collapse control beside it, which is the one thing in this header that should look like a button. Without it the library name reads as what it is: the panel's title, the largest and darkest text in the Sidebar, starting on the Sidebar's own 12px left margin, level with the group headings below.

The affordance survives in the chevron, and in a rounded hover fill behind the text — the same treatment the menu's own rows use — which is also held while the menu is open.

#### The list

The switcher's list is the list of databases configured in Settings (§6.8.1). The Library Workspace does not maintain a second list, and a database added, renamed, disabled, or deleted in Settings appears or disappears here without further action.

Every configured database is **listed**. A database is **selectable** only when it has finished indexing and is enabled.

Databases that are not selectable remain visible, shown with their state in the trailing position:

```text
indexed, enabled     → its game count
indexed, disabled    → "Disabled"
indexing             → "Indexing…"      with a progress icon
otherwise            → "Unavailable"    with an error icon
```

Hiding a configured database would make it look deleted. Listing it and refusing to select it says what is true.

Selecting a non-selectable entry does nothing. It is not an error.

The list ends with a separator and **Manage databases…**, which opens the Settings Workspace at the Databases section. This is the only route from the switcher to changing the list, which preserves §4.3.3's rule that the Sidebar carries no configuration controls.

#### Truncation

The switcher's name truncates in the **middle**, not at the end — the single exception to §4.3.6.

Libraries are files, and files are versioned by year. End truncation renders two different libraries as one string:

```text
"Master Games Reference 2026"   end  →  "Master Games Referenc…"
"Master Games Reference 2025"   end  →  "Master Games Referenc…"

                          middle  →  "Master Games R…ce 2026"
                          middle  →  "Master Games R…ce 2025"
```

The distinguishing part of a library name is at its end, so the end is what is preserved. macOS truncates filenames in the middle for the same reason.

The tail preserved is **6 characters**, but never more than half the name, so short names keep a head. Where not even the tail fits, the name falls back to end truncation rather than rendering an ellipsis alone.

The full name is available as a hover tooltip in both the trigger and the list, so a truncated name is always recoverable.

Where text measurement is unavailable, the name falls back to end truncation rather than truncating at a guessed position.

#### Behaviour

Selecting a Library changes **which Library the workspace is showing**. It does not alter the active Sidebar filter, the search term, the sort order, or the selection.

Search remains scoped to one Library. Selecting a Library does not search across Libraries, and the Library Workspace has no multi-Library scope.

If the active Library is deleted or disabled in Settings while the Library Workspace is open, the switcher falls back to the first selectable Library. Settings applies changes immediately (§6.1), so there is no Save step at which this could be intercepted, and a header naming a Library that no longer exists is worse than a silent fallback.

#### Accessibility

The trigger exposes `aria-haspopup="menu"` and `aria-expanded`, and an accessible label naming the current Library and the action — "Library: Master Games. Switch library" — so the control is not announced as a bare name.

List entries are `menuitemradio` with `aria-checked` on the active Library, and `aria-disabled` on entries that are not selectable.

The list is dismissed by selecting an entry, by clicking outside it, or by pressing `Esc`.

> **Implementation note.** The prototype's switcher is presentational: selecting a Library changes the name in the header and leaves the games on screen unchanged. Multi-Library data scoping is not implemented in the prototype. This note describes the prototype, not the product; the behaviour specified above is the requirement.

## 4.4 Regions

The Content Area is the primary working region of the Library Workspace.

The Content Area is divided vertically into three regions:

```text
┌──────────────────────────────────────────────────────────────┐
│                      Content Toolbar                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                                                              │
│                       Content Table                          │
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                        Status Bar                            │
└──────────────────────────────────────────────────────────────┘
```

The **Content Toolbar** provides controls for searching and adding games.

The **Content Table** displays the games belonging to the current Sidebar selection and matching the active search. It occupies the available space between the Content Toolbar and Status Bar.

The **Status Bar** is anchored to the bottom of the workspace and provides contextual information about the current Content Table.

The Content Toolbar and Status Bar remain fixed while the Content Table occupies the remaining vertical space.

```text
Content Area
├── Content Toolbar
├── Content Table
└── Status Bar
```

### 4.4.1 Content Toolbar

The Content Toolbar provides controls for searching and adding games. It remains fixed while the Content Table scrolls.

The Library toolbar contains:

- **Search** — a prominent search field at the start of the toolbar.
- **Add Games** — the primary entry point for adding games to the Library (§4.4.5). It is disabled while an import runs, with the tooltip *An import is already running*.

The search field searches indexed game information, including player names, games, events, sites, and other searchable game metadata.

Search results update the Content Table directly. Search does not navigate to a separate page.

The search field grows and shrinks with the available width. It may shrink below the width of its own placeholder text. The Add Games control does not shrink; a primary action never truncates.

Sidebar filters and Search are composable. The active search is applied to the games represented by the current Sidebar selection.

Filtering and sorting controls are not part of the current Library Toolbar specification.

#### Search behavior

**Scope is stated in the placeholder.** When no Sidebar filter is active, the placeholder reads:

```text
Search players, games, events, sites…
```

When a Sidebar filter is active, the placeholder names it:

```text
Search in Favorites…
```

Without this, a user cannot distinguish "no such game" from "no such game *within the current filter*".

**Clearing.** A clear affordance appears within the field once it contains text. Pressing `Esc` while the field is focused clears it.

**Query timing.** Input is debounced by approximately 150ms before the query is re-run. The Content Table is specified for libraries of thousands of games, and re-querying on every keystroke does not scale.

**Persistence.** Changing the Sidebar selection does not clear the search. Search state and Sidebar selection are independent (§4.4.3); the scoped placeholder above is what makes the retained search visible.

**Focus.** `Ctrl/⌘ + F` focuses the search field.

### 4.4.2 Content Table

The Content Table displays games belonging to the current Sidebar selection and matching the active search.

The Content Table is the primary game-browsing interface. It is designed for browsing large game libraries in the same general interaction model as a digital asset management application's media browser.

The table is:

- Dense
- Vertically scrollable
- Searchable
- Clickable
- Suitable for thousands of games

The Content Table does **not** provide column sorting. Column headers are labels, not controls: they take no keyboard focus and display no sort affordance.

A single click selects a game and highlights its row. There is no multi-selection. Double-clicking a game opens that game in a Game tab.

Rows are virtualised. `aria-rowcount` states the true total while only a window of rows exists in the document.

#### Typography

All rendering resources are distributed with the application (§1.1, §7.2). For the Content Table this is not solely an offline concern: **a fixed column width is only meaningful if the typeface's advance width is known.** The column widths in this section are derived from a bundled monospace face with a 0.600em advance, and would be incorrect against a system font of different metrics.

| Property | Value |
| --- | --- |
| Interface, names, headers | IBM Plex Sans 400 / 600, bundled |
| Date, Elo, Result, Moves | IBM Plex Mono 400 / 600, bundled, 0.600em advance |
| Row font size | 12px |
| Header font size | 12px |
| Cell padding | 6px left / 6px right between columns; **12px** at the table's outer edges — before the first column and after the last |
| Row height | 30px |
| Header row height | 28px |
| Numerals | `tabular-nums`, set explicitly |

Font subsetting and loading follow §7.2. For the Content Table specifically, a fallback face rendering even briefly would alter every column width and reflow the table — the reason `font-display: block` and preloading are non-negotiable here.

#### Column sizing model

Every column is either **Fixed** or **Flexible**.

A Fixed column's width is the wider of its longest possible displayed value or its header, plus horizontal cell padding. It never changes.

**Outer edges.** Between columns a cell carries 6px a side, so values in adjacent columns sit 12px apart. The first column's leading padding and the last column's trailing padding are **12px** instead. The first value therefore does not start against the table's edge — and clears the 3px selection bar drawn inside the first cell — and the last does not end against the scrollbar. The extra 6px belongs to those two columns' widths. The header and the rows use identical padding, so every label stays over its column.

A Flexible column has a minimum and, optionally, a maximum.

Surplus width is distributed as follows:

```text
surplus = available − 516                             516 = 246 fixed + 3 × 90 minimum

White = Black = 90 + min( ⌊surplus ÷ 2⌋, 90 )         capped at 180
Event         = 90 + ( surplus − 2 × name growth )    no maximum
```

White and Black are always identical by construction, and their Minimum and Maximum values must remain identical in all future revisions.

Event has no maximum and absorbs all width the name columns do not take. The columns therefore always sum exactly to the available width, and **trailing whitespace does not occur**.

There are no ratios, weights, or priority orderings beyond the two-stage rule above.

#### Default columns

| # | Column | Header | Face | Type | Min | Max | Resize behavior |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Date | `Date` | mono | Fixed | 90 | 90 | Never changes |
| 2 | White | `White` | sans | Flexible | 90 | 180 | Takes half the surplus until 180, then stops |
| 3 | Elo | `Elo` | mono | Fixed | 41 | 41 | Never changes |
| 4 | Black | `Black` | sans | Flexible | 90 | 180 | Always identical to White |
| 5 | Elo | `Elo` | mono | Fixed | 41 | 41 | Never changes |
| 6 | Event | `Event` | sans | Flexible | 90 | none | Absorbs all width the names do not take |
| 7 | Result | `Res` | mono | Fixed | 34 | 34 | Never changes |
| 8 | Moves | `Mvs` | mono | Fixed | 40 | 40 | Never changes |

| | Width |
| --- | --- |
| Fixed columns | 246px |
| Flexible minimums | 270px |
| **Content Table minimum** | **516px** |

These eight columns constitute the complete default column set.

At the Application Window minimum of 800 × 600 with the Sidebar expanded, the Content Area is 580px, leaving 64px above the table minimum.

| Window | Available | White = Black | Event |
| --- | --- | --- | --- |
| 736 | 516 | 90 | 90 |
| 800 | 580 | 122 | 90 |
| 916 | 696 | 180 | 90 |
| 1000 | 780 | 180 | 174 |
| 1440 | 1220 | 180 | 614 |
| 2560 | 2340 | 180 | 1734 |

#### Date

Date renders using:

```text
YYYY.MM.DD
```

and uses the monospace typeface. An unknown date renders as `????.??.??`, which occupies the same width.

Width derivation: 10 characters × 7.2px + 6px + 12px leading edge = **90px**.

#### White and Black

White and Black always render at identical widths.

The 90px minimum guarantees a surname and initial — the point at which a row still identifies the game. The 180px maximum accommodates the longest names found in practice; beyond it, additional width is of no use to a name column and is given to Event instead.

#### Elo

The two rating columns are both headed `Elo`. Their position immediately following White or Black establishes which player the rating belongs to.

Position does not convey this to assistive technology. Each header therefore carries a visually-hidden qualifier — "White Elo", "Black Elo" — so that the accessible table does not present two columns with the same name.

Width derivation: 4 characters × 7.2px + 12px padding = **41px**.

#### Result

Result displays:

```text
1-0
0-1
½-½
*
```

`*` denotes an unfinished or ongoing game.

**A draw is always drawn `½-½`** (U+00BD), whatever spelling the game record holds. PGN's own form, `1/2-1/2`, is seven characters and does not fit the column; the substitution is made when the cell is drawn and never written back to the record. It is the Content Table's alone — the Game Info card shows the plain PGN form (§5.6.5).

The header is condensed to `Res`. Both the values and the condensed header fit within 34px, so the column is declared as **34px fixed** with "the header must fit within 34px" as the constraint. Stating it this way means no column width depends on the sans typeface.

#### Moves

Moves represents the number of full moves in the game. It does not represent plies and does not display movetext. For example:

```text
40
```

represents a game lasting 40 full moves. The maximum displayed value is three digits.

The value is supplied as a queryable game field so it can be displayed directly.

The header is condensed to `Mvs`. Width: **40px fixed** — the 34px basis of Result, plus the 6px of the table's trailing edge.

#### Condensed headers

`Res` and `Mvs` are condensed labels, not names. Each header carries its full name — "Result", "Moves" — as a visually-hidden label, and the condensed label is hidden from assistive technology so the name is not read twice. The two Elo headers follow the same rule with their qualified names.

A translation supplies its own condensed label, and it is held to the same constraint as the English: it must fit the column's text width, **22px**, which in the monospace face is three characters. The current translations are German `Erg` · `Zg` and French `Rés` · `Cps`.

#### Fields not displayed

The default Content Table does not display:

- Site
- Round
- ECO
- Time Control
- Termination
- Opening
- Variation
- Annotator

The absence of a field from the Content Table does not imply its absence from the underlying game schema. The UI specification does not define the underlying data model.

#### Empty states

When the Content Table has no rows to display, the table body is replaced by an empty state. The Content Toolbar and Status Bar remain. Four cases are distinguished, because each has a different cause and a different remedy:

| Case | Message | Action offered |
| --- | --- | --- |
| Library contains no games | "No games in your library" with a short explanation of how games are added | **Add Games** |
| Search returned nothing | "No games match *<term>*", naming the active filter | **Search all games** · **Clear search** |
| Filter is empty, library is not | "No games in *<collection>*", with a note on how games are added to it | — |
| Trash is empty | "Trash is empty" | — |

The empty-search state names the scope because the scope is usually the reason the result is empty, and offers a single action to escape the filter.

### 4.4.3 Game Selection and Opening

The Content Table supports single selection.

A single click selects a game and highlights its row. Only one game can be selected at a time. There is no multi-selection behavior.

Double-clicking a game opens that game in a Game tab.

If the game is **not already open**, a new Game tab is created and appended after the existing Game tabs. If the game is **already open in a Game tab**, that existing tab is activated rather than a second tab being created. This matches the singleton behavior of the Settings tab, and avoids two identically titled tabs presenting the same game with independently diverging analysis.

The Library tab remains open and pinned.

Selecting or opening a game does not change the current Sidebar selection, search state, or Content Table scroll position. Returning to the Library tab restores the same filter, search, scroll position, and selected row.

#### Keyboard

| Input | Result |
| --- | --- |
| `↑` `↓` | Move selection one row; the table scrolls to keep it in view |
| `Home` / `End` | First / last row |
| `Page Up` / `Page Down` | Move by one viewport of rows |
| `Enter` | Open the selected game — the double-click equivalent |
| `Ctrl/⌘ + F` | Focus the search field |
| `Esc` | Clear the search when focused; dismiss a flyout |
| `Ctrl/⌘ + \` | Toggle the Sidebar |
| Type-ahead | Typing letters with the table focused jumps to the next matching White player |

The Content Table is exposed as a `grid` with `aria-selected` on the current row and a roving `tabindex`, so that the table is a single tab stop rather than one per row.

### 4.4.4 Status Bar

The Status Bar is persistent at the bottom of the Content Area. It does not scroll with the Content Table.

The Status Bar states **the number of games currently displayed**:

```text
1,248 games
```

This single form applies in all cases. The count reflects the current Sidebar selection and active search combined.

The filter name and search term are deliberately **not** restated. The Sidebar already shows the active filter as a highlighted row, and the search field already shows the term; repeating them adds a clause per condition and stops the Status Bar being scannable.

When a Subscription is selected, the displayed count is that Subscription's total, satisfying §4.3.3. Its new-game count remains in the Sidebar trailing slot and is not repeated here.

The count is always on the left. A right-aligned **slot** shows at most one other fact. It has four claimants, in this order of precedence:

| Rank | Claimant | Shows | Why it outranks the next |
| --- | --- | --- | --- |
| 1 | Import running | `Downloading — 212 games`, or `Adding games — 1,887 of 3,012` with a progress bar; and a cancel control | Nothing else on screen represents it |
| 2 | Import outcome not yet answered | The outcome line of §4.4.5, or `Import cancelled — 1,887 games kept` | The user has not seen it yet |
| 3 | Offline | `Offline — sync paused` (§4.3.3) | A standing condition; nothing is waiting on the user |
| 4 | Row selected | `1 selected` | Already visible as a highlighted row |

The slot is empty when none of them applies. A file or paste import does not need the network, so an import running while offline still shows its progress.

### 4.4.5 Adding Games

The **Add Games** control in the Content Toolbar is the primary entry point for adding games to a Library. It opens the **Add Games dialog**. The dialog collects a source and some options, hands them to the **import**, and closes. The import runs in the background and reports through the Status Bar (§4.4.4).

```text
Add Games
├── Add Games dialog   — a form: source + options, then commit
├── Import             — one at a time, in the background
├── Status Bar line    — progress, then the outcome
└── Import report      — opened only from the Status Bar
```

#### The dialog reads nothing

The dialog never opens, parses or fetches a source. There is no game count, no duplicate check, no username verification and no check that pasted text contains chess before the commit. Everything that requires reading a game happens during the import, and everything that can go wrong with a source is an import outcome.

Consequently **Add Games is enabled by presence, not validity**:

| Tab | Enabled when |
| --- | --- |
| File | At least one file is listed |
| Online | The username field is not empty |
| Paste | The text area is not empty |

#### Container

The dialog is a modal over the Library Workspace. Its scrim covers the workspace and nothing else; the Tab Bar stays visible. It follows the modal already established by Settings (`ConfirmRemove`, §6.8): `role="dialog"`, `aria-modal="true"`, labelled by its title. (A shared, formally specified modal primitive is not yet defined at the shell level — see §11.2.)

The dialog is a **fixed 600 × 400px** on every tab and in every state, capped by the workspace less 16px on each side. It does not resize when a tab is selected, so the commit buttons never move.

| Band | Height | Contents |
| --- | --- | --- |
| Header | 38px | Title **Add Games** and a close control |
| Tabs | 34px | **File · Online · Paste**, in that order |
| Source | remaining (164px at 400px) | The only band that differs between tabs |
| Options | 3 × 40px | **Add to** + **Duplicates** · **Tags** · **Collections** |
| Commit | 42px | Summary, **Cancel**, **Add Games** |

The dialog's tabs are flat and underlined. They are modes of one form, not documents, and deliberately share no visual treatment with the Tab Bar's tabs.

Opening the dialog moves focus to the selected tab. `Esc`, the close control and **Cancel** all dismiss it without importing, and focus returns to the Add Games control. While the dialog is open it owns the keyboard; the Library's shortcuts (§4.4.3) do not fire.

#### One source type per import

Each import takes **one type of source**: any number of files, or one paste, or one online source — never a mixture. Each tab keeps its own draft, so switching tabs loses nothing. **Add Games** imports the draft of the selected tab, and the commit summary names it.

#### File tab

- A **Choose files…** control opens the operating system's file picker, filtered to PGN. The picker allows several files.
- Dropping files anywhere on the dialog selects the File tab and adds them.
- With no files, the source band shows a drop zone.
- With files, the source band lists them, one row per file: name (end-truncated) · size · a remove control. The list scrolls. It has **no column header and no total row**; the total is in the commit summary.
- A file already in the list (same name and size) is not added twice.

#### Online tab

The source is one line — **Source**, **Username** and **From** — and a checkbox:

| Control | Behaviour |
| --- | --- |
| **Source** | A menu of the two sources, each with its source mark (§4.3.3): Chess.com · Lichess |
| **Username** | A plain text field. It is not verified; a username that does not exist is an import outcome, not a field error |
| **From** | A date-range control. Its options and what it limits are not yet specified (§11.2) |
| **Keep checking for new games** | Unticked by default. When ticked, committing also adds a Subscription for this source and username (§4.3.3) |

The Online tab does **not** list existing Subscriptions. The rest of the source band is empty.

#### Paste tab

The source band is a single text area with a placeholder. A **Clear** control appears at the start of the commit band on this tab only. The text is not judged: any text at all enables Add Games.

#### Options

The three option rows are identical on every tab and in every state. Each row is labelled with the name of what it holds.

| Row | Control | Behaviour |
| --- | --- | --- |
| **Add to** | Menu | Every configured Library (§6.8.1). One that is indexing or disabled is listed but cannot be selected (§4.3.10). Defaults to the active Library |
| **Duplicates** | Menu | **Skip** (default) · **Import anyway** |
| **Tags** | Token field | Tags to apply to every game this import adds |
| **Collections** | Token field | Collections to put every game this import adds into. **Smart Collections are not offered**: a game cannot be put into a collection that finds its own contents |

A token field filters its list as the user types and shows at most eight matches. `Enter` adds the first match, or creates a new tag or collection when nothing matches exactly. The last row of the list offers **Create "<text>"** under the same condition. `Backspace` in an empty field removes the last token, and each token has its own remove control. Creating in place exists because the import is the only moment the new games are a distinct set; afterwards they cannot be told apart from the rest of the Library.

A new tag or collection becomes a Sidebar row when the import adds at least one game. Tags and collections are applied only to games that were actually added — not to skipped duplicates or unreadable games.

Menus in the **option rows open upward**, inside the dialog, and scroll when they hold more than eight entries. The option rows are pinned to the bottom of the dialog, so a downward menu would be cut off at its edge. Menus in the source band (Source, From) open downward. All menus dismiss on `Esc` or an outside click, and single-choice menus use `menuitemradio` with `aria-checked`, as the Library switcher does (§4.3.10).

#### Commit band

| Tab | Summary |
| --- | --- |
| File | `3 files · 1.4 GB` (`1 file` for one) |
| Online | `Chess.com · <range>` |
| Paste | `Pasted text` |

The summary is empty while the tab's draft is empty. The primary button always reads **Add Games**; it never states a count, because nothing has been counted.

#### The import

**One import at a time.** There is no queue and no parallelism. While an import runs, **Add Games is disabled** — in the Content Toolbar and in the empty-Library state — with the tooltip *An import is already running*.

On commit the dialog closes and the import starts:

| Source | Phases |
| --- | --- |
| File, Paste | **Adding** — determinate: the total is known from the start |
| Online | **Downloading** — indeterminate: a count that climbs with no total — then **Adding** |

Rows appear in the Content Table as they are written.

**Cancelling** is available from the Status Bar line for the whole import. Cancelling during a download leaves nothing behind. Cancelling while adding **keeps the games already written** and says how many — `Import cancelled — 1,887 games kept`, until dismissed. Nothing is rolled back.

**Failure scope.** An unreadable game is skipped and the import continues, through the rest of that file and on to the next. A file is never rejected because of the games inside it: PGN is a concatenation of games, not a container. An import fails as a whole only when every source failed.

When an import finishes having added at least one game, the Sidebar selects **Recently Added** (§4.3.2). There is **no banner**: the table filling, the counts changing and the new tag and collection rows are the confirmation. A banner between the Content Toolbar and the Content Table would move the table twice, in a region the user may be scrolled in.

#### Outcomes

An import ends in one of five outcomes.

| Outcome | Status Bar | Lifetime | Action |
| --- | --- | --- | --- |
| Clean | `3,012 games added` | About 8 seconds, then clears itself | — |
| With problems | `12 games were not added — Review` | Until answered | Opens the Import report |
| No games found | `No games found in notes.pgn` | Until answered | Opens the Import report |
| File error | `File error — twic1600.pgn could not be opened` | Until answered | Opens the Import report |
| Network error | `Network error — download did not complete` | Until answered | **Try again** |

*With problems* counts every game from the sources that was not added: unreadable games and skipped duplicates together.

**No games found** is one outcome with one sentence, whatever the cause. A misspelled username, an empty account, a paste that was an email and a `.pgn` holding only comments are indistinguishable to the import and call for the same response, so they get the same words. The source is still named:

| Source | Message |
| --- | --- |
| File | `No games found in <file name>` |
| Paste | `No games found in the pasted text` |
| Online | `No games found for <source> — <username>` |

**File error** and **Network error** are the two cases where the source was never read, so "no games found" would describe a search that never happened. Each is named for what went wrong. Only Network error offers a direct remedy — nothing was written and the request was sound, so **Try again** repeats the same import.

An outcome that is "until answered" persists through Sidebar changes, searches and switching tabs, and is answered by dismissing it or by closing the Import report.

#### Import report

The Import report is a separate modal, opened **only** by clicking the Status Bar line. It never opens itself.

| Part | Contents |
| --- | --- |
| Header | **Import report** and a close control |
| Summary | The source name, then either the counts — `3,000 added` · `8 duplicates skipped` · `4 could not be read` — or, for a whole-source failure, its one sentence |
| Failures | One row per unreadable game: **Where** (`line 19,077`) · **Why** (`illegal move at 24…Nxe4`) · **Copy** |
| Footer | `4 of 3,012 games needed attention` · **Copy all** · **Done** |

When nothing needed attention the report says so; after a whole-source failure it says *No games were added*. `Esc`, the close control and **Done** close it. Closing the report answers the Status Bar notice, so both clear together.

Copy is the recovery path in this revision: take the text, fix it, and paste it back through the Paste tab.

## 4.5 Resizing and Scrolling

The Library Workspace occupies the available application area below the Tab Bar.

The Sidebar and Content Area share the workspace horizontally, at the fixed widths §4.2 defines. The Content Area absorbs all remaining horizontal space.

Collapsing the Sidebar increases the available width of the Content Area by 164px.

The Content Area has no workspace-specific minimum or maximum dimensions (§4.2).

Within the Content Area:

- The Content Toolbar remains fixed.
- The Status Bar remains fixed.
- The Content Table occupies the remaining vertical space.
- The Content Table provides vertical scrolling when required.
- The Sidebar independently provides vertical scrolling when required.

The Library Workspace itself never requires a page-level scrollbar.

Flexible containers between the Application Window and Content Area controls must be allowed to shrink below their children's natural content width. This prevents the Search field or Content Table from forcing the Content Area beyond the application window.

Scrolling is owned by the appropriate region:

```text
Sidebar       → Sidebar scrolling
Content Table → Game-table scrolling
Workspace     → no page-level scrolling
```

The Sidebar's scroll position is independent of the Content Table's scroll position.

Collapsing the Sidebar changes the available horizontal space but does not change the Content Table's content, selection, search state, or scroll position.

The Content Table's columns respond to the available width according to the column sizing model defined in §4.4.2.

Horizontal scrolling is never introduced in the Content Table. The Content Table minimum of 516px is reachable within the Application Window minimum of 800 × 600 in either Sidebar state, so no degraded behavior below that minimum requires specification.

---

# 5 Game Workspace

> Assumptions still to confirm are marked **[A]**; see §11.2.

## 5.1 Overview

The Game Workspace presents a single game for viewing, playing and analysis. It is the application's counterpart to a media library's viewer: where the Library Workspace searches and manages a collection, this workspace opens one item from it.

A Game Workspace always has a game. It is created by opening a game from the Library, and there is no empty state.

The workspace has two regions:

```text
Game Workspace
├── Game View          flexible — the board and its evaluation bar
└── Game Details       fixed    — a shell of Sections, plus the Game Controls Toolbar
```

**Game View** is the primary visual representation of the game. **Game Details** is the supporting information and analysis, and the controls for moving through the game.

The two names describe purpose rather than implementation, in keeping with §3.

The **Evaluation Bar is not a third region.** It is board furniture, in the same sense as coordinates, highlighting and arrows, and it lives inside the Game View. Its two ends mean *White* and *Black* — a statement about the board's top and bottom edges, not the window's — so a bar spanning the full window height would be wrong on its own terms.

## 5.2 Layout

The workspace is divided horizontally into two regions:

```text
┌──────────────────────────────────────────┬────────────────────────────┐
│  GAME VIEW                               │  GAME DETAILS              │
│                                          │                            │
│        ┌──┬──────────────────────┐       │  ┌──────────────────────┐  │
│        │  │                      │       │  │      Sections        │  │
│        │E │                      │       │  │                      │  │
│        │V │     CHESS BOARD      │       │  │                      │  │
│        │A │                      │       │  │                      │  │
│        │L │                      │       │  └──────────────────────┘  │
│        └──┴──────────────────────┘       │  ┌──────────────────────┐  │
│                                          │  │ Game Controls        │  │
│                                          │  └──────────────────────┘  │
└──────────────────────────────────────────┴────────────────────────────┘
   flexible, minimum 427px                        fixed 360px
```

| Region | Width |
| --- | --- |
| Game View | Flexible. **Floor 427px.** Receives all additional width as the window grows. |
| Game Details | **Fixed 360px.** Does not change with window size. |

**Derived constraint.** `427 + 360 = 787` against the Application Window's 800px minimum (§2.4) leaves **13px of slack**. A fixed Game Details can therefore never exceed **373px** without violating the Game View's floor — a change that would fail only at the minimum window size, and so is stated here rather than left to be discovered.

## 5.3 Navigation

The Game Workspace has no view-navigation. It presents one game, and "navigation" means **moving through that game's plies** — a cursor, not a change of view.

The current ply is the workspace's primary state. Everything else follows it: the board, the Evaluation Bar, and every Section that reports on a position.

Ply navigation is driven from three places, all equivalent:

- the **Game Controls Toolbar** (§5.4.2), which is where the controls physically live;
- the **keyboard**, per the map below;
- any Section that offers position navigation of its own.

| Input | Result |
| --- | --- |
| `←` | Previous ply |
| `→` | Next ply |
| `Home` | First ply |
| `End` | Last ply |
| `Space` | Play / pause automatic advance |
| `F` | Flip board orientation |

These are unmodified keys and do not collide with the shell's modified bindings (§2.5).

## 5.4 Regions

### 5.4.1 Game View

The Game View contains the Chess Board and the Evaluation Bar. It does not scroll.

It exists to solve one problem: the Evaluation Bar must be exactly as tall as the *rendered* board, and the board sizes itself to its container. One component must compute the board's rendered size and hand it to both children. That is the Game View's responsibility.

**Responsibilities**

1. Compute the board's rendered square size and overall pixel size from the space available.
2. Size the Evaluation Bar to the board's height exactly, top and bottom aligned.
3. Own board orientation, so board and bar flip together as one.
4. Reserve the Evaluation Bar's layout slot permanently.

#### Sizing

| Part | Value |
| --- | --- |
| Padding | **16px on all four sides** **[A]** |
| Evaluation Bar width | 27px |
| Gap, bar to board | 8px |
| Chess Board floor | 360px — approximately 45px squares |
| **Game View floor** | **427px** = 16 + 27 + 8 + 360 + 16 |

The Chess Board is square. Its rendered size is:

```text
board = min( gameViewWidth − 67 , gameViewHeight − 32 )
```

where 67 is the bar, gap and horizontal padding (16 + 27 + 8 + 16), and 32 is the vertical padding.

**The board has no maximum.** It is the focus of the workspace, and on a large display a large board is the intent rather than an accident.

The board therefore consumes one axis completely and leaves slack on the other. The crossover is `W = H + 355`: narrower windows are width-constrained, wider ones height-constrained.

| Window | Game View | Board | Constrained by |
| --- | --- | --- | --- |
| 800 × 600 | 440 | 373 | width |
| 1024 × 768 | 664 | 597 | width |
| 1280 × 800 | 920 | 728 | height |
| 1440 × 900 | 1080 | 828 | height |
| 1920 × 1080 | 1560 | 1008 | height |
| 2560 × 1440 | 2200 | 1368 | height |

**The bar-and-board assembly is centred in the Game View, on both axes.** Slack on the unconstrained axis becomes symmetric margin. At 1920 × 1080 that is roughly 242px either side of the assembly.

#### Chess Board

The board is rendered by a board component that owns board rendering, pieces, dragging, animation, **coordinates**, highlighting, arrows and user interaction.

The application does not draw its own coordinate labels in any layout — not overlaid, not in a margin. Coordinate placement and orientation-flipping belong to the board component.

File letters are **lowercase** (`a`–`h`) and ranks numeric (`1`–`8`), wherever the application displays a square name.

Because the Evaluation Bar sits to the board's left, coordinates render **inside** the squares. Were coordinates ever placed outside the board on the left, the bar would move to the board's right and every rule here would apply mirrored.

#### Playing moves

The board accepts moves from **any position**, not only the mainline's own last ply: dragging or clicking a piece to a legal destination plays it wherever the cursor currently is.

Two outcomes follow, depending on what the position already holds:

- **The move already exists there** — on the mainline, or in a variation already begun this session — nothing new is created. The cursor simply steps onto it, the same as clicking that move in the Moves Section (§5.6.1) would.
- **It doesn't** — a new **variation** starts at that position, entered exactly as deep as the position it was played from. Nesting is not capped: a variation can itself hold a variation (§5.6.1, "Variations").

A pawn reaching the last rank asks which piece it becomes before anything is recorded: a small picker appears over the destination square, and dismissing it without a choice returns the board to the position it was in before the drop.

A move played this way is unsaved, exactly like a header edit or a drawn annotation (§2.1.2) — it exists only in the tab until the tab is saved, and is discarded with it if the tab is closed without saving. There is no way to remove a played-but-unsaved move short of that (§11.2, item 26).

#### Paste target

Pasting (`Ctrl/⌘ + V`) while a Game Workspace tab is active and the target isn't an editable control elsewhere in the shell (a text field, the Add Games Paste tab's own textarea) is read as either a **FEN** or a **single-game PGN**. Anything else — plain text, more than one game — is ignored; a multi-game paste belongs in Add Games (§4.4.5), not on the board.

A recognised paste asks for confirmation before doing anything, with two outcomes:

- **Open in New Tab** (the default) — a new draft Game Tab (§2.1.2), seeded with the pasted position or game.
- **Replace This Game** — the active tab is detached into its own new draft seeded the same way. The game it replaces, if it was a saved one, is never written to; only the tab's own display changes, exactly as opening a different game in it would.

The confirmation is skipped, and the paste loads straight in, only when the active tab is already an untouched draft (opened via the New Tab Button or `Ctrl/⌘ + T` and not yet touched) — there is nothing there to lose.

#### Evaluation Bar

The bar shows the engine's assessment of the **current position** as a single vertical quantity, readable without moving the eye to Game Details.

**Geometry**

- Width **fixed at 27px**. It does not scale with the board, the window, or anything else. The value is derived from the label's fit (below), not chosen for proportion.
- **8px** between the bar and the board edge.
- Height exactly equal to the rendered board height; **top and bottom always aligned with the board's**.
- Positioned immediately left of the board.
- **Additional space benefits the board, never the bar.** The bar's width is the one dimension in this region that never changes.

**Orientation.** The bar flips with the board. Whoever is at the bottom of the board keeps their end of the bar at the bottom, so "my colour is down here" holds in both orientations.

**Scale.** Centipawn evaluations are mapped non-linearly, so that most of the bar's travel sits near equality where the difference matters. Values beyond a ceiling are clamped; mate pegs the bar fully. A dashed line marks dead even, so distance from equality is readable without the number. *This clause describes the mapping in general terms only; see §11.2 for the open question about which specific scale is current.*

**The numeric label carries one decimal. Negative values are signed; positive values are not.** The label rides the advantaged end, so for a positive value the position already states which side is ahead and a plus adds nothing. A minus is different: it is the only thing distinguishing a value from its mirror when the label is read on its own, so it is kept.

The sign is the **hyphen-minus** (`-`, U+002D), not the typographic minus (`−`, U+2212). The two are 0.399 em and 0.600 em respectively, and the difference is load-bearing — see below.

**The label is set in the proportional sans at 10px, not the monospace.** This is a deliberate exception to the visual system's rule that numeric values take the monospace face (§7.2). That rule exists so numbers stacked in columns align; this label aligns with nothing.

Measured advance widths from the bundled IBM Plex faces:

| Glyph | Plex Sans | Plex Mono | |
| --- | --- | --- | --- |
| `0`–`9` | 0.600 em | 0.600 em | identical — the sans saves nothing on digits |
| `.` | **0.272 em** | 0.600 em | the saving is here |
| `-` | **0.399 em** | 0.600 em | and here |
| `−` | 0.600 em | 0.600 em | U+2212 — 0.2 em dearer than the hyphen |
| `M` | 0.812 em | 0.600 em | wider in the sans |

**Dropping the plus moves the binding case off the numbers entirely.** The widest label is no longer an evaluation but `M12`, at **2.012 em**, because `M` is 0.812 em. Mate notation, not evaluation magnitude, sets the bar's width.

| Label | Width at 10px | Clearance each side of 27px |
| --- | --- | --- |
| `9.9` | 14.72px | 6.14px |
| `-9.9` | 18.71px | 4.14px |
| `M12` | 20.12px | 3.44px — **binding case** |
| `-M12` | 24.11px | 1.45px |
| `-12.5` | 24.71px | 1.15px |
| `−M12` | 26.12px | 0.44px — U+2212, too tight |

**The bar is 27px and the label is 10px.** The ceiling for a 27px column at the binding case is 13.4px, so 10px is comfortable rather than marginal. The headroom is deliberate: it is what would allow mate to be signed later without redrawing the region, since `-M12` still fits with 1.45px a side.

Two consequences follow from the table rather than from preference:

- **Mate renders `M<n>`.** The side is carried by the end the label sits at. Signing it is possible at this width but not currently done.
- **The clamp below 10 is a display choice, not a fit constraint.** `-12.5` fits with 1.15px a side. It is retained because two decimal places of integer precision are not meaningful at this scale, not because the column is too narrow.

`tabular-nums` is not applied. It would force the digits back to a uniform advance and gain nothing, because the label is never stacked against another.

**The slot is permanently reserved.** The Game View holds the bar's 27px and its 8px gap regardless of whether an engine is configured, whether an evaluation is available, or whether the user has hidden the bar. **The board never moves or resizes because of the bar.** Hiding the bar renders nothing into the slot; it does not reclaim the space.

**Content**, when the bar is displayed, has two states:

| State | Bar shows |
| --- | --- |
| An evaluation is available | The evaluation, drawn normally |
| No evaluation available | A single neutral fill — no divider, no number |

A 50/50 split reading `0.00` would be a claim the application has not earned. The bar does not indicate which source produced a value; its claim is about the position, not about the search.

The bar's source priority, its retention behaviour when an engine stops, and its relationship to a Section reporting evaluations are specified with the Engine Section, **§5.6.4**.

**Motion.** The divider animates between positions when stepping through moves; a hard snap reads as a rendering fault. The transition is short enough not to lag behind held arrow keys.

### 5.4.2 Game Details

Game Details is the **fixed 360px** region holding information and analysis for the game, and the controls for moving through it. Its width does not change as the window resizes.

It is a **shell**. The shell provides a frame; Sections plug into it; each Section is constrained by the shell rather than negotiating with the workspace.

```text
┌──────────────────────────────┐
│  Section                     │
│  Section                     │   ← the stack, top-aligned
│  Section                     │
│                              │
├──────────────────────────────┤
│  Anchored Section            │   ← below the stack, outside it
├──────────────────────────────┤
│  Game Controls Toolbar       │   ← anchored, never scrolls away
└──────────────────────────────┘
```

**The anchored slot holds one Section and is not part of the stack.** In the initial composition it is the Evaluation Timeline, which is there because it is a transport control and belongs against the transport it drives (§5.6.2). A Section in it takes no part in the stack's height allocation and cannot be scrolled by it.

#### What the shell provides

1. A fixed-width column, floor-to-ceiling within the Workspace Area.
2. A **Game Controls Toolbar** anchored to the bottom, which no Section can displace or scroll away.
3. A vertical stack above it that Sections occupy in a fixed order, and an **anchored slot** between the two.
4. A **common Section Header** (below), which Sections fill in rather than reinvent.
5. Collapse and visibility management, and **displacement** — which is the shell's, not the user's.
6. Height allocation, including which Section absorbs surplus.

#### What each Section declares

| Property | Meaning |
| --- | --- |
| **Floor** | Minimum rendered height. Content is never drawn below it. |
| **Height behaviour** | Fixed, sized to content, or absorbing. Exactly one Section in a composition absorbs. |
| **Ceiling** | Maximum rendered height. Optional, and only a Section sized to content can want one. |
| **Anchored** | Whether it sits below the stack rather than in it. Optional. An anchored Section takes no part in the stack's allocation and cannot be scrolled by it. |
| **Scrolling** | Whether it scrolls internally. **Default: no.** |
| **Header slots** | Title, and optionally source, status and a control. |
| **States** | Including unavailable, empty, and loading where they apply. |
| **Hideable** | Whether the user may remove it from the panel. |

#### The row grid

**Every height in this panel is `30 + 6 + n × 24`** — the Section Header, 6px of body padding, and *n* rows of 24.

It is written here rather than in each Section because it was already true in three of them before it was stated anywhere. The Explorer and the Engine both compose their heights this way and §5.6.4 says the agreement between them is deliberate; Game Info and the Move List now join them. Four Sections agreeing by construction is a grid, and four Sections agreeing by coincidence is four numbers that will drift.

| Rows | Height | Used by |
| --- | --- | --- |
| 1 | 60 | Engine floor, Explorer floor |
| 3 | 108 | Game Info floor, Move List floor, both ceilings, the Timeline |
| 4 | 132 | Game Info ceiling |

**The 6px of body padding includes the Section's 1px bottom rule**, which sits inside the Section's height. A body that must show exactly *n* rows is therefore padded 3px above its rows and 2px below them, with the rule as the last pixel. Padded 3px and 3px, the rows are 1px taller than the body, and a Section that scrolls draws a scrollbar even when every row fits.

**A Section may not declare a height off the grid.** The value of saying so is what it prevents: the Engine once declared a fixed 104px, which is not a height that Section can ever want — it sits between two principal variations and three. A number between two rows is a number nobody chose.

#### Height, floors and scrolling

Sections are laid out top-down. Fixed and content-sized Sections take what they need; the absorbing Section takes the remainder.

**Content is never rendered below its floor.**

**A Section sized to content may also declare a ceiling**, above which it stops growing and begins to scroll instead. The floor protects the Section from the shell; the ceiling protects the composition from the Section. Without one, a Section whose height follows a query could grow until it pushed the absorbing Section off the screen, and the panel's behaviour would depend on data rather than on layout. A capped Section is predictable in a way an absorbing one cannot be: however deep the position, it is never taller than its ceiling.

**Game Details does not scroll.** An earlier revision said it scrolled when the floors could not all be honoured, and called that a normal state rather than an error. It was reachable: at the Application Window's minimum, with a full composition expanded, the floors overran the panel and the line fell inside the Move List — the absorbing Section, the one the reader uses on every move, rendered at a fraction of its height inside a panel that was itself scrolling.

What replaced it is not a compression rule but a **yielding** one, and it is stated as a guarantee about the Move List rather than as a rule about scrolling:

> **The Move List never renders fewer than three moves. The Evaluation Timeline is displayed only where the composition can honour that, and displaced where it cannot.**

The Timeline is the only lever, and it is sufficient. Engine and Explorer are sized to content and cannot be asked to yield; the Timeline is fixed, anchored, and worth 108px in one piece. With it displaced, the remaining floors fit the minimum window with room over — so the condition terminates, and one conditional on one Section replaces a priority order that would otherwise have to be specified and argued.

Scroll ownership is therefore three-tiered and, now, unambiguous in the strong sense:

```text
Game Workspace    never scrolls
Game Details      never scrolls
Section           scrolls internally only if its own specification opts in
```

**Displacement is not hiding.** Hiding is the user's, persists, and survives a resize. Displacement is the layout's, is never written to the user's stored visibility, and reverses itself when the window grows. The two are reported apart — see the Game Controls Toolbar's Sections menu below.

#### Collapse and visibility

**Collapsing** reduces a Section to its header and leaves it in the panel. **Hiding** removes it entirely. They are different operations and a Section may permit one without the other.

Space released by either goes to the absorbing Section. This is what allows the composition to change without the shell needing to scroll.

Collapsed and hidden state persist.

#### Section Header

Every Section has a header, and all headers follow one pattern. This is a property of the shell; Sections fill the slots.

```text
[Title] · [source ▾] ·········· [status] [control] [⋯] [˄]
└─ left cluster, truncates ─┘   └──── right cluster, fixed ────┘
```

| Slot | Rule |
| --- | --- |
| **Title** | The Section's identity. Never truncates before the source does. |
| **Source** | Optional. Where the Section reads from something the user can change. Absorbs truncation, with a tooltip. |
| **Status** | Optional. A live value describing current state. In the right cluster so it can never be truncated away. |
| **Control** | Optional. A single Section-specific control, only where it must be operated more urgently than an options menu allows. |
| **Options** (`⋯`) | Only on Sections that have options. |
| **Collapse** (`˄`) | Always present, always rightmost. |

The right cluster is fixed-width and right-anchored, so controls sit at the same horizontal position in every Section. Nothing in it truncates.

**Sections fill the header in; they do not reinvent it.** Which slots a Section uses varies — source, status and control are each optional — but the widget in a slot is the shell's, so that one shape keeps one meaning down the panel.

**There are no exceptions.** Every Section fills the control slot with the shared icon button, the Engine included.

There was one. The Engine's control sets a state the user then watches rather than firing an action, and a power glyph says what pressing it will do while saying nothing about what it is doing now — so the slot held a switch instead. That objection was to the **glyph**, not to the button, and it is answered by a toggle: the knob's position *is* the state, drawn rather than described, which is the one thing a power symbol could not do. The exception therefore closes on its own argument rather than against it, and the reasoning survives as *why that Section's glyph is a toggle* (§5.6.4).

**A control that reports a state uses `role="switch"` and `aria-checked`.** The shared button is a picture, not a semantic claim; what the control does still has to be stated to assistive technology.

**Degradation order.** When a header cannot fit, it yields in this order:

1. The source truncates, with a tooltip carrying the full value.
2. Units drop from the status, leaving the bare value.
3. The title falls back to a defined short form — a separate label token, not a string the application shortens itself.

Step 3 exists for languages where a title translates long (§8). It is not a responsive behaviour: a title does not change as the window is resized.

**Source selectors** follow one shape — the current source with a disclosure indicator, a list with the current one marked, and a **footer** stating what the list does not say for itself. The footer is part of the pattern, not a per-Section addition.

**A Section's menu hangs from the header it opens from** — flush beneath it, aligned to the cluster its control sits in — and closes on `Esc` or on a press outside it. One is open at a time: a Section's menus overlap each other's controls, so opening the second closes the first.

**A menu is drawn above the panel, not inside it.** It may extend past the bottom of its own Section, across the Sections below it and over the anchored Timeline, and nothing clips it. Drawn inside the stack, a menu hung from the lowest Section lost its last item at the stack's edge — the Explorer's source menu could not show its footer. It stays on its header while anything scrolls, and a menu that would run past the bottom of the window is lifted to end 8px above that edge.

#### Game Controls Toolbar

Anchored to the bottom of Game Details, always visible, never scrolled away by Section content.

```text
◀◀    ◀    ▶    ▶    ▶▶                              ⇅      ⋯
first prev play next last                          flip   more
└──────────── transport ────────────┘              └── trailing ──┘
```

| Control | Action |
| --- | --- |
| First | Jump to the first ply |
| Previous | Step back one ply |
| Play | Start and stop automatic advance |
| Next | Step forward one ply |
| Last | Jump to the last ply |
| Flip | Change board orientation |
| More | Secondary game and analysis commands, and **which Sections are displayed** |

The toolbar stays compact; secondary commands go under **More** rather than widening it. Its keyboard equivalents are in §5.3, which specifies all seven.

**Section visibility lives in the More menu.** It is the composition's one user control (below), and composition is a property of the panel rather than of any Section in it — a control that puts a Section back cannot live inside the Section it would put back.

The menu lists every Section in panel order, with a tick, and a Section reads in one of **four** states:

| State | Means |
| --- | --- |
| **Ticked** | The user wants it, and it is on screen. |
| **Unticked** | The user removed it. Persists across sessions *and* window sizes. |
| **Ticked, dimmed, with a reason** | The user wants it; the layout has displaced it for space. Never written to the user's stored visibility, so it returns on its own when the window grows. |
| **Ticked, locked** | Not hideable. |

**The third state is the one that has to exist.** A displaced Section shown ticked would claim it is on screen; shown unticked it would misreport the user's own choice. Without a third presentation the menu tells one of two lies.

A **footer** states what the list cannot say for itself — the window height at which the displaced Section returns. This is the footer §5.4.2 already gives a source selector, reused rather than a second way of explaining a menu being invented.

**Every control is a symbol without a text label.** A label beside a symbol reads as one combined control rather than two, and two labelled controls in a row run together; the toolbar has no room to buy that back with separating space. Meaning is carried by the symbol and by the accessible name.

The toolbar is **40px** tall. Its controls are **26 × 26px** with **8px** between them — above §9.4's 24 × 24 CSS pixel minimum, and spaced rather than merely sized, spacing being the thing a row of small controls usually lacks.

#### The trailing edge clears the window

**The toolbar is inset 8px at its leading edge and 16px at its trailing one.**

The asymmetry is not a mistake. This bar runs along the bottom of the window and its trailing end *is* the window's bottom-right corner — where the rounded corner clips content, and where the bottom and right resize edges meet. A control placed at the same 8px both sides ends up inside that curve, competing with the resize affordance and looking unplanned, because nothing placed it there: it was simply last in the row.

A native bottom bar is part of the window frame and the system insets it. This one is drawn inside the application's own content, so it insets itself. 16px clears the curve at the height the controls occupy.

**The trailing-most control should be the most forgiving one available**, for the same reason: whatever sits closest to the corner is what a mis-aimed press finds. *This is a stated preference the current arrangement (More trailing-most) does not yet follow — see §11.2.*

The toolbar belongs to Game Details rather than to the Game View or the workspace: it is part of this region's shell, and it is adjacent to the Sections that report on the position it changes.

#### Composition

The shell is populated by a **composition** — an ordered set of Sections, with one designated as absorbing.

The initial release ships **one composition**. Section order is fixed and not user-adjustable in this revision; ordering interacts with height allocation and with which Section absorbs, and is deferred.

The user controls **which Sections are displayed**, where a Section permits hiding — from the Game Controls Toolbar's More menu, above. Composition therefore has exactly one user control in this revision.

The Sections of the initial composition, in panel order:

| # | Section | Height | Specified in |
| --- | --- | --- | --- |
| 1 | Game Info | 3 rows, or 4 with the chip rail | §5.6.5 |
| 2 | Engine | 1–3 rows | §5.6.4 |
| 3 | Move List | 3 rows minimum, **absorbing** | §5.6.1 |
| 4 | Explorer | 1–3 rows | §5.6.3 |
| — | Evaluation Timeline | 3 rows, **anchored** | §5.6.2 |

Each Section's floor, height behaviour, scrolling, header slots and states are defined in its own specification.

**The Evaluation Timeline is not in the stack.** It is anchored between the stack and the toolbar, so it is listed last and numbered not at all: it has no position in the order, because the order governs the stack and it is not in it.

**The Move List absorbs surplus.** It is the only Section whose usefulness scales with height — every other one shows a fixed quantity of information, and two of them are capped — so it is the only sensible candidate. Its floor is therefore the panel's invariant rather than merely its own minimum: it is what decides whether the Timeline is displayed.

Future compositions may differ in Sections, order, proportion and internal navigation. They are out of scope for this revision.

## 5.5 Resizing and Scrolling

The Game Workspace fills the Workspace Area and inherits its minimum from the Application Window (§2.4).

**Horizontally**, Game Details holds 360px and the Game View absorbs all remaining width. The Game View's 427px floor cannot be violated, because the window cannot be made small enough to violate it (§5.2).

**Vertically**, the Game View sizes the board to the available height, and Game Details fills the full height with the Evaluation Timeline and the Game Controls Toolbar anchored at the bottom, in that order, and the Section stack above them.

**Neither the workspace nor Game Details scrolls.** Only a Section does, and only if its own specification opts in:

| | Scrolling |
| --- | --- |
| Game Workspace | Never |
| Game View | Never — responds to resize by scaling the board |
| Game Details | **Never** — the Timeline yields instead (§5.4.2) |
| Section | Only if its own specification opts in |

Game Details scrolled in an earlier revision, when the Section floors could not all be honoured. That state has been removed rather than accommodated: the Move List's three-move floor is honoured at every permitted window size because the Evaluation Timeline is displaced before it can be broken. The panel therefore has one fewer state than it used to, which is the direction a specification should move in.

Every flexible container between the Application Window and these regions permits shrinking below its children's natural width, so that no control can force a region beyond the window.

## 5.6 Sections

§5.4.2 defines the shell and the contract a Section fills. This section defines the Sections that fill it.

Each states what it declares to the shell, what it draws, and what it does when it has nothing to draw. Where a Section repeats a rule the shell already gives it, the shell's statement governs.

### 5.6.1 Move List

The moves of the game, in two columns with a number gutter.

| Property | Value |
| --- | --- |
| Floor | **108px** — three moves |
| Height behaviour | **Absorbing** — it takes the surplus (§5.4.2) |
| Scrolling | Yes |
| Header slots | Title, options |
| Hideable | No |

**The floor is stated in moves, not in pixels.** Three rows is `30 + 6 + 3 × 24` = 108px on the panel's grid (§5.4.2). It was 110 — a figure, chosen before the grid was written down, and 2px off it.

**A row is 24px**, the same row the Explorer and the Engine use. This was never stated: the row's *widths* are specified in detail below, and its height was left to the implementation.

**This floor is the panel's invariant.** It is what the Evaluation Timeline is displayed or displaced against (§5.4.2), so it is no longer a statement about this Section alone. Three moves is thin — the current move with about one either side — which is the point: it is a floor that is almost never reached, not a target. At the Application Window's minimum with everything else expanded, the Timeline yields and this Section renders five moves rather than three.

The layout is scannable rather than dense on purpose: the eye finds move 24 by counting down a column, not by reading a paragraph.

#### Row geometry

Every row uses the full 360px: **12px** of air on the leading side, a **36px** number gutter, two move columns, and a **40px** trailing track holding the comment control.

**The trailing track is 40px: a 30px control and 10px of air.** The control sits flush to the track's leading side, which puts its chevron on the same vertical line as the chevron of the Section Header's collapse control. At 36px it sat 4px to the right of it.

The gutter is 36px because `136…` is 28.8px at 12px mono — move 136 is the longest number a 271-ply game produces — and it needs its 6px of trailing padding as well. A gutter sized on the number alone is wrong from move 10, where the number begins to eat its own leading inset, and broken from move 100.

**The scrollbar is the platform's, as in the Explorer.** The two scrolling Sections look and behave the same. An earlier revision hid the bar entirely, which left no thumb to show where in the game the list was. **No scrollbar lane is reserved**: a reserved gutter inside the scroll container is a strip nothing can paint into, and it stops every tint and rule short of the Section's edge. Where the platform draws overlay scrollbars they take no width and the comment control keeps its alignment; where it draws classic ones, the rows narrow by the bar's width, as the Explorer's do.

#### A row is a move, which is two plies

The comment control belongs to the **row**, not to either ply: one glyph says this move carries commentary — White's, Black's or both — and opening it shows everything the move has to say. A control per ply would put two of them on most annotated rows and make the reader work out which half each belonged to.

**Opening splits the move.** A comment belongs under the ply that earned it, and it cannot sit under one of two plies sharing a row. So when White's comment opens, the move breaks across two rows: White keeps the first with Black's cell empty, the comment follows, and Black's ply starts a new row carrying the same number. When only Black has a comment nothing has to break — the comment already follows both moves — so the pair stays whole. **The trigger is a comment on White's ply, not a comment anywhere.**

The empty **cell** is left empty rather than filled with an ellipsis: the columns already say which side moved. The **number** is a different question and does take one — a row carrying only Black's ply is numbered `1…`, not `1.`, because `1.` announces White's move and the split leaves two rows under one number. In the mono face `…` is one cell, so correct notation costs nothing.

A comment is **not labelled with the move it belongs to.** It sits directly beneath that ply, which is the statement.

#### Grouping without boxes

**Nothing is boxed and nothing is inset.** An open move in a bordered box makes its rows narrower than every other row and has to give that back through a compensating grid — arithmetic no rendering test can check.

Grouping is carried by ground and rules: the comment region is tinted, a hairline separates it from the move above and another closes the group, and a **3px rule** runs down its leading edge marking where the comment starts and ends. Every row then uses one grid, so the gutter and the control line up by construction rather than by compensation.

**The leading rule is painted inside the box**, not as a border. A border moves the comment's contents 3px right and puts them out of line with the move text above, which is the thing this arrangement exists to fix.

**What is boxed:** a box is a discrete statement, so the move row and each banner get one. A container and free text do not. Four nested levels, two treatments to learn.

#### Comments

A comment is **a banner and a remainder**. Commands the application understands are drawn as banners and removed from the text, so nothing is shown twice; everything else stays as written. Which commands those are is a property of the movetext reader, not of this Section.

**Comments are collapsed by default.** This is what makes the layout survive real data: in a fully annotated game every ply carries one, so showing them all costs a row each and leaves three moves on screen. Collapsed, the cost is a glyph at the row's trailing edge and the list stays a move list.

#### Current ply

**Ply 0 marks nothing.** The starting position was produced by no move, so no move can be current there. Marking move 1 would be a claim the position does not support.

**Scrolling follows the current ply by the shortest distance that reveals it, never by re-centring.** Re-centring moves the whole list under the reader on every arrow key. Scrolling by hand does not navigate: reading ahead is normal, and the next key press returns to wherever the game actually is.

#### Variations

A position is addressed by **path** — which child, at every branch, was taken to reach it — not by a flat ply count. A mainline position and a variation position can share a depth without being confused for each other; this is what makes a variation possible to represent at all.

**Nesting is arbitrary.** A variation can itself hold a variation, to any depth; nothing in this Section caps it. This, and the path-addressed position it depends on, follow Lichess's own model — chosen after reviewing how Chess.com, Lichess, ChessBase and En Croissant each handle it (25 Sep).

A variation is entered as its **own indented sub-list**, nested inside the row it branches from: its own number gutter, its own two move columns, its own comment handling — everything above in this section applies inside a variation exactly as it does on the mainline, one indent step per level of nesting. A small header (a branch glyph and the word "variation") marks where each one starts. The rail marking a variation is the same colour at every depth; depth is read from the indentation, not the colour.

**Playing a move away from wherever it already goes starts a variation there** (§5.4.1's "Playing moves"), so this Section is also how a variation, once started, stays visible and navigable rather than existing only as an entry in `pendingMoves` until save.

**The keyboard follows the line currently on screen, not the mainline.** Stepping forward from a position inside a variation continues that variation; it does not jump back to the mainline's own next move. Chosen to match Lichess (and En Croissant); Chess.com's own behaviour here is inconsistent enough, by its own users' report, not to be worth matching.

#### Promoting a variation

Any move not already on the mainline all the way up to the root opens a **right-click context menu**, offering two commands, matching Lichess and En Croissant exactly (both implement the identical algorithm, read from their own source 25 Sep) rather than ChessBase's or Chess.com's single, always-cascading command:

- **Promote Variation** — moves the line up exactly one branch point. Useful for reordering several variations at the same point without touching the mainline above it.
- **Make Main Line** — cascades all the way to the root, so the clicked line becomes the game's own actual mainline in one command, whatever it was nested inside.

Promoting reorders the branch point's children (the promoted line moves to the front; everything between the old front and its own old slot shifts back by one to make room) but changes no move, comment or annotation — the position on the board does not move, only its address does. The cursor, drawn shapes and a held Engine Section result all follow the promoted line to its new address, so nothing already on screen appears to jump to a different position. A promotion is staged the same way a played move is (§5.4.1) — visible and navigable immediately, written into the game's own movetext only on save.

### 5.6.2 Evaluation Timeline

The evaluation across the whole game, and the control that moves through it.

| Property | Value |
| --- | --- |
| Floor | **108px** — three rows |
| Height behaviour | **Fixed** — 30px of header and 78px of chart |
| Anchored | **Yes** — below the stack, above the toolbar |
| Scrolling | No |
| Header slots | Title, status |
| Hideable | Yes |

**It is a transport control that is also a chart, and the two cannot be designed apart.** Press anywhere and the board goes there; hold and move and it follows. The chart is what makes the transport worth having: the reader seeks by the shape of the game, the way a video scrubber is seeked by the shape of the picture.

#### It is anchored, not stacked

**The Section sits between the Section stack and the Game Controls Toolbar**, outside the stack and outside the stack's allocation.

That follows from the sentence above it. If it is a transport control, it belongs against the transport it drives: scrubber and buttons read as one group of navigation rather than as a chart that happens to be last in a list. Being anchored also means no Section can scroll it away, which is the same guarantee the toolbar has and for the same reason.

**It keeps the common Section Header.** The alternative considered was to drop it to furniture, as the Evaluation Bar is furniture within the Game View — which would have saved the header's 30px but left the playhead evaluation, which lives in the status slot, and the collapse control without homes. Not taken.

Its 108px is the grid's three rows rather than the 110 it declared before, spent as 30px of header and **78px** of chart. The chart is 2px shorter than it was; nothing in §5.4.1's mapping depends on the chart's pixel height, which is a scale and not a count.

#### Displayed only where there is room

**The Section is displayed when the composition can honour the Move List's three-move floor, and displaced when it cannot** (§5.4.2). It is the only Section the layout displaces, and displacement is sufficient: Engine and Explorer are sized to content and cannot yield, and with this Section's 108px released the remaining floors fit the minimum window with room over.

Three properties make the rule predictable rather than merely automatic.

**It is measured against each Section's maximum, never its current content.** Otherwise adding a tag to a game, or an engine finding a third principal variation, would make the Timeline vanish — composition would depend on data, which is the one thing §5.4.2 says it must not do. The threshold is therefore a single window height for a given composition, not a moving one.

**It has a dead band.** The Section is displaced below the threshold and does not return until the window is **16px** taller. A single threshold pops a 108px block in and out on the pixel while a window is being dragged, relaying the panel each time; two transitions that do not share a pixel cannot oscillate.

**Displacement is never written to the user's stored visibility.** `Hidden` stays the user's word and the layout has no vote in it, which is what lets the Section return on its own when the window grows. The two are told apart in the Sections menu (§5.4.2).

For the initial composition the threshold is a **644px window** — 132 + 108 + 108 + 108 for the stack at its maximum, 108 for this Section, and 80 for the Tab Bar and toolbar. It is computed from the composition rather than written down, so it moves when a Section's height does. Below it, at the 800 × 600 minimum, the Move List renders five moves rather than the three it is guaranteed.

#### The horizontal axis

**The track is the whole game: 0 to however many plies it has.** Nothing scrolls and nothing zooms, and the scale is not shared between games — a twenty-move game and a hundred-move game both fill the same width.

Writing it as 0 to N rather than 1 to N carries two consequences. The axis has **N + 1 stops**, because the starting position is one of them. And the first and last stops sit **flush against the edges** rather than inset half a step, so the playhead reaches the frame at both ends.

A long game gives each step less than 2px, so **the control cannot be aimed at a ply and is not designed as though it can.** The timeline is coarse navigation and the Move List is fine navigation: scrub to the region, then step. Because it cannot land exactly, **it states where it will land before it lands** — which is what the hover preview is for, rather than decoration.

**Nothing in the plot is drawn per-ply.** At the short end of a step no marker or dot is legible; the curve is a shape.

#### The vertical axis

**The chart is the Evaluation Bar laid on its side and swept through the game.** It uses §5.4.1's mapping — the same function, not a second one tuned to look similar. At the playhead the boundary here and the divider there describe one number, and both are on screen at once; two mappings would put two answers to one question in front of the reader.

**It flips with the board**, for the same reason. The bar flips (§5.4.1), and a timeline that did not would disagree with the bar about which end is White's the moment the board turned.

Where the value moves between the mapping's discrete levels, the transition is drawn as a **vertical riser** — along to the ply, then straight up — never as a slope. Nothing renders in the band a slope would cross, so the slope would be ink over a gap in the scale.

**The chart takes the whole content height.** There is no axis strip beneath it; move numbers are available from the header and from the preview.

#### Analysed and not analysed

Evaluation data is optional: a game carries it once it has been analysed and not before. **The Section therefore has two normal states, and neither is an error.**

Where there is no evaluation, the Section is **the track without the chart** — the scrub, the playhead, the regions and the preview all survive, and only the curve is absent. **A flat line at dead even is never drawn**; that would assert a level game, which is the claim §5.4.1 refuses for the bar.

Where a game is analysed in part, the curve ends where the data ends and the rest is plain track. **Nothing is interpolated across a gap.** The one exception is the interval before the first evaluated ply: an evaluation describes the position its move led to, so the strip between the starting position and the first evaluated ply belongs to that move and is drawn at its height. The exception is that interval alone.

#### Regions

The chart may be divided into **Opening, Middle and End**. The two ends carry an overlay and the middle keeps the undimmed ground — the middlegame is where a game is usually decided and where the curve does most of its work. All three are labelled on the chart, since there is no strip to label them in. The overlay is neutral rather than tinted, because it sits over both halves of a two-tone chart and a hue would lighten one and muddy the other.

**The Section reads the two ply numbers that place the boundaries; it does not compute them.** Where they come from is not specified here — see §11.2. Given both, the regions are drawn; given neither, they are not, and **there is no fallback to equal thirds** — thirds would be the application asserting a phase boundary it has not earned.

#### Interaction and status

Press or drag anywhere in the chart. **The whole content box is the target**, not the curve and not the playhead, and the region labels do not intercept the press.

**The Section takes no focus and binds no keys.** Arrow keys already step the game (§5.3), and a focusable control here would put a second owner on the same keys for the same state.

The **status slot** carries the evaluation at the playhead.

**The hover preview names the stop under the pointer, and nothing else**: the move number and the move played, White's written `12.e4` and Black's `12…Nf6` — the single ellipsis character, as the Move List numbers Black's ply — and `Start` at the starting position. **It carries no evaluation**; the curve under the pointer already is the evaluation, and the status slot carries the exact value at the playhead.

The preview is centred on the hovered stop and **held 4px inside the Section's edges** — the same inset it keeps from the top — so a stop near either end moves the plate inward rather than cutting it off.

**The Section hides itself when the game has fewer than two positions.** A game with no moves has one stop and no track to divide; there is nothing to scrub through and no shape to draw.

That is a **content** reason and is not the same as displacement: there is genuinely nothing to draw, rather than nowhere to draw it. So the Section can be absent for three distinct reasons — the user hid it, the game is too short, or the window is too short — and the Sections menu reports the user's apart from the other two (§5.4.2).

### 5.6.3 Explorer

What has been played before from the position on the board, and how those games ended.

| Property | Value |
| --- | --- |
| Title | **`Explorer`** |
| Floor | **60px** |
| Ceiling | **108px** |
| Height behaviour | **Sized to content** — one to three moves |
| Scrolling | Yes, from the fourth move — never while every move fits |
| Header slots | Title, source, status, options |
| Hideable | Yes |

Its figures are position statistics held by the game database — one row per position per distinct move played from it, with the games that played it and how they ended. The table and its position key are specified in the database schema, which is outside this document; this Section reads them and does not derive them.

One row per distinct legal move played from the position, ordered by share descending. Fixed ordering: the share column then reads as a decreasing list and needs no explanation, and a sort by result would put one-game rows in the only three slots the Section has.

**The Section reports; it does not navigate.** No row is clickable, the played move included. Playing a move from here would let the board show a position the game never reached, at which point the workspace's primary state — the current ply — stops describing it. That is an interactive analysis board and arrives with its own specification. The played move is not made the exception: a list where one row of three answers a press teaches that rows are clickable, and the others then read as broken.

#### Height

| Part | Height | Composed as |
| --- | --- | --- |
| Section header | 30 | The shell's |
| Body padding | 6 | 3px above the rows, 2px below them, and the Section's 1px bottom rule (§5.4.2) |
| Row | 24 | A 16px bar with 4px of air either side |
| Floor | **60** | 30 + 6 + 24 — one move, the least a position with any games can have |
| Ceiling | **108** | 30 + 6 + 72 — three moves; nothing taller |

A fourth move does not make the Section taller; it makes it scroll.

#### Row geometry

The bar is the only elastic cell, so every other width is spent directly out of it.

| Part | Width | Why that value |
| --- | --- | --- |
| Row padding | −20 | 10px each side |
| Move cell | 84 | Binding case `12… Qxf7+`; truncates with an ellipsis rather than wrapping |
| Share cell | 34 | Binding case `100%` at 11px mono, tabular, right-aligned so the digits form a column |
| Gaps | −16 | 8px between cells, twice |
| Results bar | **the remainder** | Budgeted at 201px |

**Every number in a row is a percentage of something different** — share of the position, then share of that move's decided games. Exactly one absolute number is on screen and it is in the header.

#### The results bar

One track, three segments — White, draw, Black — each carrying its own percentage inside it. **The segment's colour is its label**, so the three numbers need no key.

**A label is drawn inside its own segment or not at all.** Never clipped, never moved outside, never shrunk. Drawn only where the segment holds the label plus 8px of clearance; below that the reader loses a number, not the shape. The label is the bare integer — a bar in three parts is self-evidently proportional, and the `%` costs width in every segment, which is the difference between a label and no label in the cases that matter.

**A dropped label has no fallback.** The rule's defence is that a segment too small to hold two digits is a result too rare for its exact value to matter.

**A zero result draws no segment** — not a hairline. A non-zero one is never drawn below 2px. "Never happened" and "happened rarely" have to stay distinguishable.

The split is computed against **decided games**, not against all of them: a game with no recorded result was played, so it counts toward how often a move was chosen and toward no side's score. The three displayed percentages total 100 exactly.

**The bar's three colours do not follow the theme.** They are adjusted for each ground but never swapped, and the order — White, draw, Black — is fixed and does not follow board orientation. Flipping the board must not reorder a statistic. The track keeps a 1px border: in a dark ground White's fill is the lightest thing in the panel and would otherwise bleed, and in a light one Black's needs the same containment.

**A bar is drawn the same way at every sample size.** The Section states the number of games and leaves the judgement to the reader.

#### Header and tooltip

**The Section is named Explorer**, in its header and wherever the application lists it. It was called the *Move Explorer* until it was renamed; the header had already dropped "Move", because the source beside the title names the library and the rows are self-evidently moves, and the Section's name now follows its title rather than the reverse.

The **source** slot carries the library being explored — the one thing in this Section the user changes. The list offers `None`, then the installed libraries, each with its own size, and ends with a footer shortcut, `Settings ›`, which opens the **Databases** section of Settings (§6.8.1), where libraries are managed. It names that section rather than Settings itself; there is only one place in Settings this list could mean. `None` leads because it is the absence of a selection rather than one of the things being selected between. **The library explored need not be the one the game came from**: reading your own game against a master library is the Section's most useful case.

The **status** slot carries the games that contain this position — the size of the sample every row is drawn from, and the number that says whether the Section is worth reading at all.

Hovering a row grounds it and opens a tooltip carrying **the game count for that move, and nothing else**. The row already shows the move, the share and the results; a tooltip repeating them would be a second copy of the row.

The whole row is the target, but **the tooltip is centred over the row's share**, because the count is the number that share is a percentage of. It sits above the row and **flips below it wherever the list's top edge would clip it** — the first row, and any row scrolled up to the top. The test is the row's place in the visible list, not its index.

#### States

Each state replaces the body entirely, every message is one line, and every message sits at the Section's floor — so a state is never taller than the row it replaced.

| State | Body |
| --- | --- |
| The position is not in the library | `No games reached this position` |
| No library selected | `No library selected` |
| Querying | Holds its previous height; the status empties rather than showing a stale count |

A small library is **not a state**. A position with three games is drawn exactly as one with three thousand.

### 5.6.4 Engine

What an engine makes of the position on the board, while it is running.

| Property | Value |
| --- | --- |
| Floor | **60px** |
| Ceiling | **108px** |
| Height behaviour | **Sized to content** — one to three principal variations |
| Scrolling | **No** |
| Header slots | Title, source, control, options |
| Hideable | Yes |

A **principal variation** is one line the engine considers best, given as a score and the moves it expects to follow. The Section shows between one and three of them, ranked, for the position currently on the board.

**It is a live view of the current position and nothing else.** It runs against the position the board is showing, for as long as it is switched on. It does not read the game's stored evaluations to decide what to show, it does not produce one, and it does not walk the game. A feature that computes or rewrites evaluations across a whole game is a different feature with its own specification; this Section's design does not assume it exists.

**It reports; it does not navigate.** No row is clickable and the cursor does not change over one — the same rule §5.6.3 states, and for the same reason. Playing a line onto the board would let the board show a position the game never reached, which belongs with interactive analysis.

#### Height

| Part | Height | Composed as |
| --- | --- | --- |
| Section header | 30 | The shell's |
| Body padding | 6 | 3px top and bottom |
| Row | 24 | §5.6.3's row height — one grid for both Sections' rows |
| Floor | **60** | 30 + 6 + 24 — one line, the least a running search can show |
| Ceiling | **108** | 30 + 6 + 72 — three lines; nothing taller |

The floor and the ceiling land on §5.6.3's exactly. That is the same header, the same padding and rows on the same grid rather than a number copied across, but the agreement is deliberate: two capped Sections in one panel that stopped at different heights would read as an accident.

**The Section does not scroll.** Its height follows the line count, so it shows exactly the lines chosen and there is nothing to scroll to. It used to permit scrolling, and the 1px rules between rows made the lines a few pixels taller than their body, which drew a scrollbar with nothing behind it.

The line count is the reader's, within those bounds — see the options menu below. Three is the maximum the Section will show, so the ceiling is a height it can reach rather than one it is held back by.

#### Row geometry

The variation is the only elastic cell; every other width is spent out of it.

| Part | Width | Why that value |
| --- | --- | --- |
| Row padding | −20 | 10px each side |
| Rank | 20 | A plain number, not a badge. It is context, and a coloured chip per row would compete with the score |
| Score | 46 | Binding case `−12.34` at 12px mono, tabular |
| Depth | 34 | Binding case `d100` |
| Variation | **the remainder** | Truncates with an ellipsis rather than wrapping |

**The variation truncates and never wraps.** The Section's height is allocated from the line count, so a wrapped line would make a row taller than the height the panel gave it.

**The score is the two-decimal signed form**, the one the comment banner uses — not §5.4.1's one-decimal label, which is short because it lives in 27px and nothing here does. Negatives take the typographic minus (`−`, U+2212) for the same reason: the fit constraint that forces the hyphen-minus in the bar does not apply in a 360px panel.

**The depth on a row is the depth reached**, live and read-only. The depth *limit* is a setting and sits in the options menu. The two are the same word for different things and are labelled apart wherever both can be seen.

#### Header

The **source** slot carries the engine in use, and follows §5.4.2's source-selector shape: the current engine, then the engines Settings offers — installed and enabled — then a footer shortcut. The footer names the Engines section of Settings (§6.8.2) rather than Settings itself; there is only one place in Settings this list could mean.

The **control** slot carries the **shared icon button**, like every other Section's. It is **disabled when no engine is selected**: the Section cannot run without one, and a disabled control states that before it is pressed rather than after.

**Its glyph is a toggle** — the knob left for stopped, right for running. That is what lets this Section use the shared button at all. The control sets a state the reader then watches rather than firing an action, and a power symbol shows what pressing it will do while showing nothing about what it is doing now; a toggle draws the state instead of describing it. The Section Header therefore has no exception to carry (§5.4.2).

**Its state is carried by the knob's position, not by its colour** (§9.3). Running is additionally drawn in the affirmative colour, which is reinforcement and never the only signal.

**The glyph is drawn at 20px where the header's other icons are 13.** Not because it fails small — at 13px the knob's position is distinguishable, and the colour carries it besides. Because this is the only control in the panel that reports an *ongoing* state: the options and collapse controls are read when the reader goes looking for them, and this one is read while a search is running, at a glance, from wherever the eye happens to be. Legibility at a glance is worth more here than uniformity with glyphs that are only ever read on purpose. **The button is unchanged at 26px**, so the control column does not move and the target matches its neighbours; what differs is the mark inside it.

It carries `role="switch"` and `aria-checked`, per §5.4.2.

There is **no status slot**. The depth reached is per row, which leaves the slot with nothing to say, and a slot kept against a future use is a slot the next passing value fills.

The **options** menu carries exactly two settings — the **number of lines** (one to three) and the **depth limit**. Engine configuration belongs in Settings and is not duplicated here; these two are surfaced because they are worth reaching while watching the Section itself. Threads, hash and the rest are not here and do not come here.

**Neither setting is persisted in this revision.** They last as long as the tab, like the ply and the board orientation (§5.3). Where a per-engine setting would be stored is a database question and is open — see §11.2.

#### The Evaluation Bar

This answers the three questions §5.4.1 defers.

**While this Section is running for the position on the board, the Evaluation Bar shows its top line**, and follows it as the search changes its mind. Otherwise the bar shows the position's stored evaluation, or nothing at all.

**Never both at once.** Two numbers for one position, a thousand pixels apart, is the failure the rule exists to prevent — a live search and a stored evaluation disagree routinely, and neither is wrong.

**The relationship is loose and one-way.** The Section is a source the bar may read; it is not the bar's owner, and the bar does not become a second reporting surface for it. Nothing is written back into the game: this Section never produces a stored evaluation.

#### Retention and navigation

**Switching off does not clear the Section.** The lines stay exactly as last drawn and are dimmed to read as stopped. The toggle's position is the primary cue and the dimming is the secondary one.

**Leaving the position clears it**, on or off alike — and returning to that position does not bring it back. What an engine said about a position it is no longer searching is not a fact about the game, and a stale line that reappeared on a round trip would be indistinguishable from a live one.

**Live analysis is not persisted.** It does not survive navigation and it is not written to storage.

#### States

Each state replaces the body entirely, every message is one line, and every message sits at the Section's floor.

| State | Body |
| --- | --- |
| Running | The lines, ranked |
| Off, after a search on this position | The last lines, dimmed |
| Off, nothing computed here | `Off · press the toggle to analyse this position` |
| No engine configured | `No engine configured`, with a shortcut to Settings |
| The position has no legal moves | `Nothing to analyse · the game ends here` |

The last is reachable at the final ply of any game ending in mate or stalemate. A toggle reading *running* over an empty body would read as a fault.

### 5.6.5 Game Info

The game's own record — who played, what happened, when and where — and the user's marks on their copy of it.

| Property | Value |
| --- | --- |
| Floor | **108px** — three rows |
| Ceiling | **132px** — four rows, with the chip rail |
| Height behaviour | **Sized to content**, and it has exactly two heights |
| Scrolling | No |
| Header slots | Title, status, options |
| Hideable | **No** **[A]** |

**It has two heights, not a range.** The chip rail is one line that scrolls sideways, so a game with one tag and a game with nine are the same height, and nothing between 108 and 132 is reachable. The floor and ceiling sit one row apart and describe a boolean rather than a range — which is why the pair is stated here rather than the Section being called sized-to-content and left at that.

#### What the card says, and how loudly

Every field is a column the database already stores (outside this document). What this Section decides is which of them earns a place and at what weight.

| Rank | Field | Drawn as |
| --- | --- | --- |
| 1 | Player names | Row 1, alone, at the card's largest size |
| 2 | Result | Row 2, centred |
| 3 | Date played | Row 3 |
| 4 | Location played | Row 3 |
| — | Ratings | Row 2, flanking the result, quieter than any ranked field |
| — | Event, Round | Editable, not displayed |

The row order **is** the ranking, read down the card. That is the whole layout argument: a reader looking for who played finds it first because it is first.

**Ratings sit beside the name they belong to, never as a fifth row.** A rating is a property of a player rather than an independent fact about the game, and a rating drawn at the weight of a ranked field would outrank the result it sits next to.

**Row 2 is an equal `1fr · auto · 1fr` grid** so the result sits on the card's centre line whatever the two ratings measure. Centring by flow would let a four-digit rating opposite a blank pull it off-centre, which is invisible on one card and obvious across two.

**Names truncate independently, with the full value in a tooltip** — the Section Header's own degradation rule (§5.4.2) applied to content. The layout cannot assume a comma: an online source gives a handle where a classical record gives `Lastname, Firstname`, and the schema accepts both.

#### Absent values

**A PGN placeholder is never shown verbatim.** `?` and `*` are the format's way of writing "not recorded"; drawn as themselves they read as a fourth kind of data. Each becomes a plain-language absence, dimmed, so a missing value reads as missing.

| Value | Card shows |
| --- | --- |
| `Result` is `*` | `Result unknown`, dimmed |
| `Date` is `????.??.??` | `Date unknown`, dimmed |
| `Date` is `2026.??.??` | `2026` — whatever part is known |
| `Site` or a player is `?` | The corresponding absence, dimmed |

**A partial date degrades rather than collapsing.** A game whose year is recorded knows more than one whose date is absent, and the card says so.

#### The result and the date

**The result is drawn in its plain PGN form** — `1-0`, `0-1`, `1/2-1/2`, no spaces. Deliberately **not** §5.4.1's `½-½` substitution, which the application uses elsewhere (§4.4.2): this card is a reading of the game's record, and the record says `1/2-1/2`.

**The date is one fixed form** — `30 Aug 2026` — and not locale-dependent formatting. A locale formatter reorders the fields, so the same game would read `Aug 30, 2026` for one reader and `30 Aug 2026` for another. The order is fixed everywhere; the month **word** is translated, which is vocabulary rather than format.

#### Favourite, tags and collections

These are the user's marks on their copy of the game rather than facts about the game, and they are stored with the library row rather than with the game. A game opened from no library has none, and the card draws the record alone.

**The favourite is the leading mark on row 3, and is mirrored into the header's status slot.** A collapsed Game Info is a header and nothing else, and whether this game is a favourite is the one thing on the card worth knowing without expanding it. An unfavourited game renders nothing there; a hollow mark in every header would be noise four times out of five.

**Tags and collections share one horizontally scrolling rail** — a fourth row, real chips, one line.

The alternatives were to wrap, to cap at a count, or to scroll vertically in a boxed tray. Wrapping makes the Section's height follow the data. Capping hides how many there are. A tray is a second scrolling region inside a panel that has just been designed not to scroll. Sideways is the one that leaves the Section a fixed pair of heights, and it is precedented: the Tab Strip overflows the same way (§2.1.3–§2.1.4), and like it the rail has no `◀ ▶` controls — wheel and trackpad only, with the trailing edge faded to say there is more.

**Pressing the rail opens the Edit dialog at Tags and Collections.** The rail reports; it does not edit.

#### The Edit dialog

Opened from the Section's options menu at the top, or from the chip rail scrolled to the marks. Arriving at the top when the tags were pressed is not the dialog that was asked for.

It reuses the modal chrome and the token field the Add Games dialog established (§4.4.5) rather than inventing a second modal and a second way to pick a tag.

Field order is **the card's ranking, not PGN's export order**:

```text
White + rating
Black + rating
Result
Event · Site · Date · Round
Favourite · Collections · Tags
```

The Seven Tag Roster opens with Event, Site, Date and Round and reaches the players fifth. A form that disagreed with the card above it would teach two orders for one game, so the players lead here as they lead there.

**Result is a closed set of four**, because the standard defines four values and there is nothing a reader could type that it would accept and the buttons would not offer. `*` is one of the four and is a real value — a game not yet decided — so it is labelled rather than printed bare.

**The date is validated, not reformatted under the user.** `YYYY.MM.DD` with `?` permitted for parts that are not known, since a partial date is valid input rather than an error. What is flagged is a value that is neither.

**Editing writes to the lifted columns, never to `pgn`.** The document is kept byte-for-byte as received and the columns are the editable copies (outside this document), so a column and its tag pair can legitimately disagree after an edit. That is the intended relationship rather than a defect.

**[A] Hideable is provisional.** Game Info is the game's identity and sits first in the panel, which argues for locking it; the counter-argument is that a reader who knows the game does not need it, and every other reporting Section can be removed. Locked is the reversible half of the choice.

---

# 6 Settings Workspace

## 6.1 Overview

The Settings Workspace is the application's configuration surface. It presents application preferences and the three collections of user-configured objects — Engines, Subscriptions and Databases — that the rest of the application draws on.

It is a workspace like any other (§3) and occupies the Workspace Area when the Settings Tab is active.

**Settings auto-apply.** Every change commits the moment it is made. There is **no Save button, no Cancel, and no draft state**, and consequently no exit route that can strand unsaved work.

Four requirements follow from auto-apply, and none is optional:

1. **Validation happens before the commit**, not at a save step, because there is no save step to fail at.
2. **Destructive actions carry their own confirmation**, because there is no Cancel to walk them back.
3. **Leaving a section, or closing the tab, needs no prompt.** Nothing is pending.
4. **A free-text field commits on blur, not per keystroke.** Per-keystroke commit would apply every half-typed value; a field that fails validation is not committed and reports why, in place.

**Free text is otherwise avoided.** A select, a toggle, or a reported value with a button beside it (as General's Library location does, §6.6) needs no such rule, which is why the workspace prefers those controls wherever a value has a fixed set of options or an external source of truth. The exception is the Name field on every Object row (§6.8.1–§6.8.3) and a Subscription's identifying value (§11.2, item 13), which remain free text because no structured alternative has been designed for them. Whether that exception is warranted, or whether Object rows could adopt General's reported-value pattern instead, is unreviewed — see §11.2.

Settings changes take effect immediately throughout the application. A database disabled here disappears from the Library switcher at once (§4.3.10), with no intervening step.

## 6.2 Layout

The Settings Workspace is divided horizontally into two regions:

```text
┌──────────────────────┬──────────────────────────────────────────────┐
│                      │                                              │
│  Settings Sidebar    │                Content Area                  │
│                      │                                              │
└──────────────────────┴──────────────────────────────────────────────┘
```

The **Settings Sidebar** occupies the left side at a fixed **220px**, matching the Library Workspace's expanded Sidebar (§4.2) so that switching tabs does not shift the boundary between navigation and content.

The **Content Area** occupies all remaining horizontal space.

**The Content Area is the only scrolling region.** The Sidebar does not scroll; see §6.4.

Unlike the Library Sidebar, **the Settings Sidebar does not collapse**. It carries a short, fixed list that always fits, so a collapse control would offer a state with no benefit, and an icon rail would drop labels the sections need.

## 6.3 Navigation

**There is at most one Settings Tab** (§2.1.1). Nothing in this workspace opens a second tab: object rows, their expanders, confirmations and object creation all happen inside the one tab.

Selecting a section in the Sidebar changes the Content Area. It does not navigate the shell.

**The active section is remembered.** Closing the Settings Tab and reopening it returns to the section last viewed rather than resetting. The default on first open is **General**.

The active section is indicated **without relying on colour alone** (§9.3): the active row carries a leading rail and a heavier weight in addition to its fill.

## 6.4 Settings Sidebar

The Sidebar lists the workspace's sections, in this fixed order:

```text
┌─────────────────────────────┐
│   General                   │
│   Appearance                │
│   Engines                   │
│   Subscriptions             │
│   Databases                 │
│   About                     │
└─────────────────────────────┘
```

**The order is fixed and is not reordered by use, recency or alphabet.** Two conventional preference sections come first, the three object-management sections follow as a group, and About sits last. A settings list whose order moves is a settings list that cannot be learned.

The list is **flat**. There are no groups, no headings and no nesting: six items do not need an information architecture.

Each item renders on a single line with a leading icon, following §4.3.6's rendering rules and §7.4's icon vocabulary. The glyph is bound to the section rather than to the component, so a section cannot be added without being given one:

| Section | Glyph | |
| --- | --- | --- |
| General | `sliders-horizontal` | The gear is **not** used here. §2.2's Application Menu already spends `settings` on the Settings Tab itself, so the gear denotes the workspace, not a section within it |
| Appearance | `palette` | `sun` and `moon` are the menu's theme items, so `sun-moon` would half-collide |
| Engines | `cpu` | |
| Subscriptions | `rss` | This is the **section-level** glyph — the Subscriptions category as a whole, exactly as the Library Sidebar's Subscriptions group heading and collapsed-rail icon use `rss` (§4.3.1, §4.3.7). It is **not** used for an individual Subscription row: every Subscription row, here and in the Library, shows the source's own brand mark instead (§4.3.3, §6.8.3) |
| Databases | `database` | Shared with the Library (§4.3.10). The same object |
| About | `info` | Shared with the Application Menu's About item (§2.2) |

The glyph is drawn at **18px in an 18px slot** (§7.4.1), matching an object row's leading glyph — both sit on a 44px row, and a Sidebar at a different size would put the two regions out of step.

The Sidebar carries **no counts**. The number of configured engines is not navigational information.

**The Sidebar does not scroll in practice.** Six 44px items occupy 285px against the 560px available at the 600px window floor, and the list is fixed — a seventh section is a specification change, at which point this clause is revisited.

The component nevertheless sets `overflow-y: auto` as a defensive fallback, so that a height the list cannot fit degrades to a scrollbar rather than to clipped items. This is deliberate and is **not** a licence to grow the list: the clause above governs, and the fallback exists only so that an unforeseen height fails safely.

## 6.5 Content Area

The Content Area presents the active section.

It begins with a **Section Heading** naming the section. For object sections the heading also carries the section's **Add action** (§6.9).

Below the heading, the section's content is one of three kinds:

| Kind | Sections | Presentation |
| --- | --- | --- |
| Controls | General, Appearance | Setting Rows (§6.12) |
| Objects | Databases, Engines, Subscriptions | Rows in boxed groups (§6.8.1, §6.8.2, §6.8.3) |
| Informational | About | Static content (§6.10) |

The Content Area has **22px padding on each side**.

**The Content Area is the workspace's only scrolling region** (§6.11).

## 6.6 General

General carries application-level preferences that belong to no other section.

Established settings:

| Setting | Control | Notes |
| --- | --- | --- |
| Language | Select | Applies immediately to every open workspace and persists (§8). Also on the Application Menu, as a shortcut to this setting — see §6.7 |
| Restore open games on launch | Toggle | Whether Game Tabs reopen with the application |
| Library location | Path | Where the application keeps its data |

*The Notes column above is specification prose. It is **not** rendered: no Setting Row carries a description (§6.12).*

The section presents **three boxed groups**, each a rounded, bordered container with its label above it — the same treatment §6.8 gives the object sections:

```text
STARTUP
┌──────────────────────────────────────────────────────────┐
│ Restore open games on launch                        ( ●) │
└──────────────────────────────────────────────────────────┘

LANGUAGE
┌──────────────────────────────────────────────────────────┐
│ Language                                    [ English ⌄] │
└──────────────────────────────────────────────────────────┘

STORAGE
┌──────────────────────────────────────────────────────────┐
│ Library location          ~/Library         [ Change… ]  │
└──────────────────────────────────────────────────────────┘
```

Each setting renders as a **Setting Row** (§6.12). Controls commit on interaction, per §6.1.

**Library location is reported, not typed.** It shows the current path in the monospace face with a **Change…** button beside it. A free-text path invites one that does not exist, and §6.1's auto-apply means there is no Save at which to validate it. This is the shape §6.8.2's expander already uses for an engine's `Location`.

## 6.7 Appearance

Appearance carries presentation preferences, in **two boxed groups** — *Theme*, then *Board* — on the pattern of §6.6.

| Setting | Control |
| --- | --- |
| Theme | Select |
| Board style | Select |
| Piece set | Select |

**Settings is where a preference lives. The Application Menu is a shortcut to it.**

Theme appears here and in the menu; Language appears in General (§6.6) and in the menu (§2.2). This is deliberate. The menu carries the two preferences worth changing without leaving a workspace; Settings is where a user looks for a preference by name, and it is the canonical home of both.

**Both controls write the same value.** There is one preference reachable two ways, not two preferences. A change made in either place is immediately reflected in the other, and neither is a copy of the other's state.

## 6.8 Object Sections

Engines, Subscriptions and Databases share one object model — a name, a status, an enabled flag, and type-specific fields. **All three use rows** — Databases §6.8.1, Engines §6.8.2, Subscriptions §6.8.3.

An **object** is a user-configured resource that the application uses elsewhere: an engine to analyse with, a subscription to fetch games from, a database to read games out of.

Each object has:

| Property | Meaning |
| --- | --- |
| **Name** | User-facing label. Shown wherever the object appears in the application |
| **Status** | What the application currently makes of it — see below |
| **Enabled** | Whether the rest of the application may use it |
| **Fields** | Type-specific configuration, held in the row's own expander (§6.8.1–§6.8.3) |

**Status is reported, not chosen.** It describes what the application found, and the user cannot set it. The vocabulary is per type:

```text
Engines        not configured · ready · error
Subscriptions  not configured · syncing · error
Databases      not configured · indexing · indexed · error
```

**Subscriptions has no `offline` status value.** Offline is a condition of the whole application, not of any one Subscription, and is surfaced once at Library workspace level (§4.3.3) rather than per row — confirmed by the implementation, where the per-Subscription status function returns only `error`, `syncing` or a new-game count, and the global `offline` state is read separately to suppress rather than add a per-row indicator.

**Status and Enabled are independent.** A database can be indexed but disabled, and a disabled object is not an error. §4.3.10 depends on this distinction: the Library switcher lists every configured database and offers only those both `indexed` and enabled.

**Every object section is presented as rows** in boxed groups. See §6.8.1, §6.8.2 and §6.8.3.

The row's leading slot is shared by all three sections and is specified once, in **§6.8.4**.

**A row's expander is momentary, in every section.** Opening one closes any other that was open, and expanded state is not persisted across visits to the section.

**Adding an object creates it and opens its configuration** in one step, with a default name and `not configured` status. A newly created object is **disabled by default**: an unconfigured resource must not be handed to the rest of the application before it has been given a path or a URL.

**Removing an object is destructive and not undoable**, and is confirmed before it happens (§6.1). This confirmation follows the `ConfirmRemove` modal pattern (§4.4.5). Removal takes effect immediately everywhere; see §4.3.10 for what the Library switcher does when the active library is the object removed.

### 6.8.1 Databases

Databases use a **row pattern**: a database is chosen by comparing figures — games, size — which a row aligns into a column; a grid of Cards does not.

#### Groups

The section presents two groups, each a **rounded, bordered box** with its label above it:

```text
INSTALLED
┌──────────────────────────────────────────────────────────────┐
│ ▤  Master Games      2.4M games · 1.0 GB                 ◉ › │
│ ▤  My Games            812 games · 2.4 MB                ◉ › │
└──────────────────────────────────────────────────────────────┘

AVAILABLE
┌──────────────────────────────────────────────────────────────┐
│ ▤  Caissabase 2024  5.4M games · 2.3 GB            [Install] │
└──────────────────────────────────────────────────────────────┘
```

**Installed** are the databases registered with the application. **Available** is a curated list offered for download. Both are ordered alphabetically; neither marks how a database arrived.

#### The row

Rows are **44px** — Apple HIG's 44pt target, which satisfies WCAG 2.2 SC 2.5.5 (AAA) outright and is touch-ready without a second build.

| Slot | Installed | Available |
| --- | --- | --- |
| Leading icon | the database glyph, 18px in the §6.8.4 slot | the same |
| Name | the database's name | the catalogue entry's name |
| Detail | `games · size` | the same; the size is the download |
| Trailing | **toggle**, then **chevron** | **Install** button |

The toggle precedes the chevron. The toggle is a value control and belongs with the row's data; the chevron is structural and takes the outer edge.

**The detail line carries no status word.** An installed database is ready by definition, and the toggle already reports whether the application may use it.

Counts are compacted — `9.57M`, `526k` — and the size unit is chosen per value, because a personal database of a few hundred games and a distributed one of several million differ by four orders of magnitude.

#### Acquiring a database

A distributed database is a **database file that is already indexed**. It downloads and it is ready: there is no indexing phase, and the `indexing` status in §6.8's vocabulary is not reached by this route.

**The Install button is the progress indicator.** It fills in place and reports a percentage; no separate progress bar appears, and the row does not change shape. On completion the entry shows `Installed` briefly, then leaves the Available list.

**A downloaded database arrives enabled.** This is a deliberate exception to §6.8's rule that new objects arrive disabled — that rule exists because an engine or a subscription cannot be used until it is given a path or a URL, and a downloaded database has nothing left to supply. It becomes selectable in the Library switcher (§4.3.10) immediately.

**Add database** registers a database file already on the machine. It is not an import: no games are copied and nothing is converted. It is distinct from Add games (§4.4.5), which imports games into the *active* library.

#### Row settings

The chevron **expands the row in place**; it does not navigate. The expanded area carries:

| Field | |
| --- | --- |
| Name | Editable. Commits on blur (below). An empty name is refused rather than committed |
| Version | Reported, not set |
| Remove database | Destructive, confirmed (§6.1) |

Field commit timing follows §6.1; expander behaviour follows §6.8.

The name is what the Library switcher displays and middle-truncates (§4.3.10), so renaming here renames the library throughout the application.

### 6.8.2 Engines

Engines use the **row pattern** of §6.8.1. Everything there holds — 44px rows, two boxed groups labelled *Installed* and *Available*, alphabetical order, the Add action in the section heading, the Install button doubling as the progress indicator, and a chevron that expands in place.

Two things differ, and both follow from **an engine being configurable where a database is not**.

#### The version sits beside the name

```text
INSTALLED
┌──────────────────────────────────────────────────────────┐
│ ⚙  Stockfish  17.1      UCI · 4 threads · 512 MB    ◉  › │
│ ⚙  Torch      3         UCI · 2 threads · 256 MB    ○  › │
└──────────────────────────────────────────────────────────┘
```

An engine's version is what distinguishes one release from another and is compared while scanning the list, so it is given a slot of its own immediately after the name, set in the **monospace face** so that releases align down the column.

A database carries its edition inside its name — *Caissabase 2024* — so §6.8.1 puts version in the expander instead. The two treatments are deliberate, not an inconsistency.

Engine detail lines are also much shorter than a database's, which is what leaves the room.

| Slot | Installed | Available |
| --- | --- | --- |
| Leading icon | the engine glyph (§7.4) | the same |
| Name | the engine's name | the catalogue entry's name |
| **Version** | beside the name, monospace | the same |
| Detail | `protocol · threads · hash` | `protocol · download size` |
| Trailing | **toggle**, then **chevron** | **Install** button |

The thread count is singular at one: `UCI · 1 thread · 256 MB`.

#### The expander carries controls

**An expander's sub-rows are 36px**, not §6.12's 44px. They sit *inside* an expanded row, and matching the parent would flatten the hierarchy that makes an expansion read as belonging to the row above it. This is the exception §6.12 refers to.

| Field | |
| --- | --- |
| Name | Editable. Commits on blur |
| Version | Reported, not set |
| **Threads** | Select. Commits on change |
| **Hash** | Select. Commits on change |
| Remove engine | Destructive, confirmed (§6.1) |

**Threads and Hash are the only engine options exposed.** They are the two the application itself sets on every engine. A UCI engine may declare dozens more; surfacing them all would make the expander's height unpredictable and turn a settings section into an engine console. Exposing further options is a specification change, not a configuration one — see also §11.2 on engine run-settings storage.

#### Acquiring an engine

An engine is a binary: it downloads and it is ready. Acquisition is one phase, as for Databases.

**A downloaded engine arrives enabled**, with **1 thread** and **256 MB** hash. Like a downloaded database, it needs no path supplying, which is the reason §6.8 disables newly created objects — so the same exception applies.

**Add engine** registers an engine binary already on the machine.

### 6.8.3 Subscriptions

Subscriptions use the row pattern, in **one boxed group**.

#### There is no second group

§6.8.1 and §6.8.2 split their sections into *Installed* and *Available* because there is a catalogue to download from. **Subscriptions has no catalogue.** A subscription names something on one of two sources; nothing is fetched from a list, and no entry ever moves between groups. A second group would have nothing to hold.

Three alternatives were drawn and rejected:

| | Why not |
| --- | --- |
| Grouped by source | Borrows the two-group silhouette while meaning something different — a filter, not a state change. With one subscription per source it yields two boxes of one row each, and the shape changes with the user's data |
| A second group listing the two sources | Permanent, unlike *Available*, and duplicates the heading's Add action |
| Sync on the row | A third trailing control, more than any other row in Settings, for a rare action |

#### The row

```text
SUBSCRIPTIONS
┌────────────────────────────────────────────────────────────────────┐
│ ♟  Hikaru         Hourly · last synced 12 min ago            ◉   › │
│ ♞  AwesomeAtti    Daily · last synced 2 h ago       12 new   ◉   › │
│ ♞  DrNykterstein  Hourly · last synced 1 h ago      Syncing  ◉   › │
│ ♟  MagnusCarlsen  Weekly · never synced             Error    ○   › │
└────────────────────────────────────────────────────────────────────┘
```

| Slot | |
| --- | --- |
| Leading icon | The **source's own brand mark** — Chess.com or Lichess (§4.3.3, §7.4). Not a generic feed glyph, and not the engine or database icon |
| Name | The subscription's name, from its own configuration |
| Detail | `interval · last synced`, or `interval · never synced` |
| **Status** | Present only when a state applies — see below |
| Trailing | **toggle**, then **chevron** |

**The mark is what makes one group sufficient.** It already says which service a row belongs to, so a group heading would repeat the icon in words.

**Rows are sorted alphabetically by name**, as in the other two sections.

**There is no version field.** A subscription has no version; the slot Engines gained (§6.8.2) is simply absent.

#### Status is live

Engines and databases are effectively static once installed. **A subscription changes state while the section is open** — it syncs, it errors, it reports new games. (When the *application* goes offline, that is a global condition shown once at Library workspace level, §4.3.3 — never a per-Subscription state; see also §6.8's corrected status vocabulary.)

The status slot uses **the priority §4.3.3 already defines** for the Library Sidebar:

```text
error  ▸  syncing  ▸  new-game count  ▸  nothing
```

Reusing that ranking is not tidiness: it is what prevents one subscription from reading one way in Settings and another way in the Library.

**Error and syncing carry an icon as well as a colour** (§9.3). A new-game count is text, and appears only when non-zero.

#### Row settings

The chevron expands in place. The expanded area carries:

| Field | |
| --- | --- |
| Name | Editable. Commits on blur. An empty name is refused rather than committed |
| Source | Reported, not set |
| Sync interval | Select — Hourly, Daily, Weekly, Manual. Commits on change |
| **Sync now** | The manual action no other object type has |
| Remove subscription | Destructive, confirmed (§6.1) |

**Sync now is in the expander, not on the row.** A subscription's whole purpose is that it syncs by itself, so a manual sync is a rare action and does not earn a permanent slot beside the toggle.

**A disabled subscription does not sync**, manually or otherwise. That is what disabling one means.

### 6.8.4 The leading slot

Every object row across all three sections opens with an **18px slot**, so the name column begins at the same offset throughout — the geometry is §7.4.1's.

The slot is a layout box and is not the same measurement as the glyph inside it. Databases and Engines draw a Lucide glyph at 18px; Subscriptions draws a Simple Icons brand mark at 16px. Both render the same visual height, for the reason §7.4.1 gives. Sizing the slot to its content instead put Subscriptions' names 2px left of every other section's and out of step with its own expander.

## 6.9 Section Heading and Empty States

**The Section Heading carries the Add action**, labelled with the object type — `Add engine`, `Add subscription`, `Add database` — rather than a bare `Add`.

The Add action is **always present in the heading, whatever the object count**, including when the section is empty. A heading action that disappeared when the list emptied would remove the control at the moment it is most needed.

**Empty state.** A section with no objects shows a short explanation of what the object type is for, and a second Add control within the empty state itself. This is a second route to the heading's action, not the only one.

## 6.10 About

About presents application identity, the licences the application is bound by, and its credits. It is **informational**: nothing here is a configurable object and nothing carries a control.

Its content is not rows — it is a set of stated facts, and a fact is not a setting. The section is free to present them as it best can, and where a line needs to run long it does. It borrows §6.12's boxed groups, 44px rhythm and type so that it reads as the same family as every other section, but it is not bound by them, and a departure here is not a defect. This is an exception to §6.12, alongside §6.8.2's expander sub-rows.

The Application Menu's About item (§2.2) opens the Settings Tab at this section rather than a separate dialog, so there is one place where this information lives.

The section presents **three boxed groups**.

### Application

| Fact | Value |
| --- | --- |
| Application | the product name (§1) |
| Version | **`Technology Preview (v0.1.0)`** — one localisable string with a `{version}` placeholder, per §8, rather than a label concatenated onto a number |
| Licence | **`GPL-3.0-or-later`** |
| Data location | that no data leaves the machine (§1.1) |

### Third party

One entry per redistributed component. The canonical table — name, and licence as an SPDX identifier — lives in §7.6 and is not restated here; this section presents it exactly as tabulated there.

**The application's licence is not a preference.** Chessground (the board-rendering library the application embeds — an unrelated third-party project, not to be confused with the application's own product name, §1) is GPL-3.0-or-later and carries no linking exception, and it is bundled into the application's JavaScript rather than shipped beside it, so the combined work is covered. Everything else listed in §7.6 imposes attribution only.

**Naming a licence does not discharge it.** MIT and GPL both require the licence *text* to accompany the software, and §1.1 requires the application to work offline, so the text is **bundled** rather than linked. The row that opens it is specified here but **not yet built** — see §11.2.

**Simple Icons carries no version** because it is not a dependency: two paths are copied into the source rather than installed (§7.4.2). CC0 waives copyright in the artwork and grants no trademark rights, which is why §7.4 confines a brand mark to denoting its own brand.

### Credits

A single entry carrying the attribution and, beneath it, what the tools contributed:

> **Designed by AwesomeAtti. Brought to life with AI.**
> AI assisted with the code, wireframes, and documentation. The vision, direction, and design decisions courtesy of AwesomeAtti.

It carries a sentence rather than a value, so it takes the full width and flows: at the 800 × 600 floor (§2.4) it sets on two lines, which is accepted. It is **the one entry in the workspace with no right-hand column**. No reading-width cap is applied — one would wrap the line while the column still had room.

## 6.11 Resizing and Scrolling

**Every section scrolls, About included.** The scrolling region is the area **beneath** the Section Heading, not the Content Area as a whole.

**The Section Heading does not scroll.** It is pinned at 44px, and for an object section it carries the Add action (§6.9) — a header button that scrolled away would be unreachable with a dozen engines installed, which is the reason the action sits there rather than at the top of the first group.

The Settings Sidebar does not scroll (§6.4), and the Application Shell never scrolls (§2).

**Horizontal scrolling is never introduced** at any window size. Setting rows wrap their controls beneath their labels before overflowing.

At the 800 × 600 window floor (§2.4) the Content Area is 580px wide. The workspace is usable at the floor without a horizontal scrollbar and without the Sidebar collapsing.

## 6.12 The row

**Every row in the Settings Workspace is 44px**, whichever section it is in and whatever it carries. One height across the Sidebar, the Section Headings and every kind of content row is what puts the two regions on a single rhythm, so switching sections moves nothing on screen.

| Slot | Type | Rule |
| --- | --- | --- |
| Leading icon | 18px in an 18px slot | **Object rows only** (§6.8.4). It says which *kind* of thing the row is, which a control row does not need — every row in a control section is a preference |
| Label | 13.5px, weight 600 | The setting, object or field name |
| Detail / value | 12px, muted, right | Optional. Same line, never beneath |
| Control | right, fixed | Toggle, select, button, or the disclosure chevron |

**A row is one line.** Descriptions and tips are not part of this workspace's pattern: a setting whose label needs a sentence of explanation is a setting whose label is wrong. Anything a reader would need beyond the label belongs in the documentation, not the interface.

**Exceptions are documented where they occur.** Anything that departs from this clause says so in its own section and gives its reason. There are two: **§6.8.2's expander sub-rows**, which are subordinate to the row they open beneath, and **§6.10 About**, which presents stated facts rather than settings and is not row-based at all.

**One switch.** The toggle is 34 × 20 at a 10px radius, filled with the affirmative colour when on, everywhere in the workspace.

---

# 7 Visual System

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

The theme must remain coherent under the operating system's forced-colors or high-contrast mode: any state conveyed by fill alone must also be conveyed by another means (§9.3).

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

The application is a **pointer-driven desktop application** and is dense accordingly. It is not optimized for touch input; see §9.4.

| Element | Height |
| --- | --- |
| Tab Bar | 40px |
| Tab Bar control button | 36px (Application Menu 40px) |
| Workspace toolbar | 40px |
| Workspace sidebar header | 40px — equal to the workspace toolbar beside it, which is what lets the icon rail align with the content (§4.3.8) |
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

The **collapsed sidebar width of 56px is a shell-level value** (the `--rail-w` token), so that any workspace adopting an icon rail uses the same measure. The expanded sidebar width of 220px is likewise shared.

## 7.4 Iconography

**Lucide is the application's icon set** (ISC licence), bundled with the application. Every icon in every workspace is a Lucide glyph unless it appears in the register of exceptions below, and that register is exhaustive: an icon that is neither Lucide nor listed there is a defect. No icon is loaded at runtime and none is drawn by the host.

Icons are imported individually, so that only those actually used reach the bundle. Importing the set as a whole would pull in more than two thousand.

**Icons are never Unicode characters.** An earlier revision used characters such as `⏮ ⏭ ◀ ▶ ⏸ ⏻ ⋯ ⟳ ⚠ ▾ ☰` as icons. Thirteen of the seventeen in use are absent from the bundled IBM Plex faces, so they were rendered by whatever the operating system substituted: different on every platform, occasionally colour emoji, and not offline in any meaningful sense (§1.1). Every icon is bundled SVG.

The bundled faces are the **latin** and **latin-ext** subsets of IBM Plex Sans and Mono. A character outside those subsets has no bundled glyph whatever it looks like in an editor, so coverage is not a matter of judgement: it is checked against the font files.

**One concept, one glyph — with one deliberate exception for category vs. instance.** The mapping from concept to icon is defined once, in `lib/icons.js`, and shared; two names for the same object take the same icon, and two different objects never take the same one. A Library and a database are the same object and share a glyph (§4.3.10); an unfiltered *view* of the library is a different thing and does not. The **Subscriptions category** — the group heading, the collapsed-rail group icon, and the Settings Sidebar's section glyph — uses `rss`; an **individual Subscription**, wherever it is listed (Library Sidebar row, Settings Subscriptions row), uses its source's own brand mark instead, never `rss` (§4.3.1, §4.3.3, §6.4, §6.8.3). This is confirmed by the implementation, where the `Feed` (`rss`) icon is imported only for the two category-level usages, and every per-Subscription row renders `ChessComMark` or `LichessMark`.

### 7.4.1 Rendering

Lucide is drawn on a 24px grid with a 2px stroke. This interface renders icons at 12–18px, where that stroke is optically heavy, so the application renders at **stroke 1.5 at every size**, held constant rather than scaled with the glyph — otherwise a 12px status glyph comes out hairline beside an 18px row glyph.

**Size is a property of the role, not a single default.** `ICON_SIZE` is the fallback for a call site that names no size; the roles below name one.

| Role | Drawn at | Slot | Where |
| --- | :-: | :-: | --- |
| Object row glyph | 18px | 18px | The leading slot of a row in an object section (§6.8) |
| Sidebar section glyph | 18px | 18px | The Settings Sidebar (§6.4) |
| Brand mark | 16px | 18px | A subscription's source (§4.3.3, §6.8.3) |
| Disclosure chevron | 15px | 20px | The expander control on a row (§6.8) |
| Button glyph | 13px | — | Inside a button, beside its label |
| Status glyph | 12px | — | Beside status text |

**The slot and the drawing are different measurements.** A row's leading slot is 18px in every section so that the name column starts at the same offset throughout — 14px padding + 18px slot + 12px gap = 44px, which is also the expander's indent. What is drawn inside the slot varies by icon set.

A 16px brand mark and an 18px Lucide glyph have **the same visual height**, to within half a pixel. Lucide reserves a margin inside its 24-unit grid and renders at about 92% of nominal size; Simple Icons take the full grid and render at 100%. The two sizes are equal, not different, and the difference in the number exists only to cancel the difference in built-in padding.

**Weight is not equalised, and deliberately so.** A filled brand mark carries more ink than a stroked glyph of the same visual height. A source mark should read as a brand rather than as another piece of interface furniture.

### 7.4.2 Register of exceptions

Three kinds of image are not Lucide. Nothing else is exempt.

| # | Exception | What | Why Lucide cannot serve |
| :-: | --- | --- | --- |
| 1 | **Brand marks** | Chess.com and Lichess, from **Simple Icons** (CC0), 16px, monochrome, inheriting the row's colour. `ChessComMark.svelte`, `LichessMark.svelte` | Lucide contains no brand marks and correctly never will. A brand mark is only ever used to denote that brand. CC0 covers the artwork; each mark remains its owner's trademark |
| 2 | **Bespoke illustration** | The undersized-window drawing in `WindowFloorGate.svelte` (§2.4.1) | It illustrates a specific condition rather than naming a concept. No icon set contains a glyph for "this window is too small" |
| 3 | **Board pieces** | Chess pieces on the board, from Chessground's own asset set (§5.4.1) | Board content, not interface iconography. The pieces are the application's subject matter |

**Adding a fourth exception is a specification change.** A concept with no Lucide glyph is resolved by choosing the nearest Lucide glyph or by reconsidering the concept — not by reaching for a second icon set.

Icons are never the sole carrier of state; see §9.3.

## 7.5 Motion

Motion is functional rather than decorative. It is confined to state transitions that would otherwise be abrupt — a control changing state, a transient notice appearing.

All motion respects the operating system's reduced-motion preference, under which transitions are removed rather than shortened.

## 7.6 Third-Party Components and Licences

This is the application's canonical, single record of redistributed third-party components and their licences. §6.10 (Settings → About) presents this table to the user and cross-references this section rather than maintaining a second copy.

One entry per redistributed component: its name, and its licence as an **SPDX identifier**.

| Component | Licence |
| --- | --- |
| Chessground | `GPL-3.0-or-later` |
| chessops | `GPL-3.0-or-later` |
| Svelte | `MIT` |
| Lucide | `ISC` |
| Simple Icons | `CC0-1.0` |
| IBM Plex | `OFL-1.1` |

Chessground and Simple Icons are also discussed, for their respective roles, in §7.4.2's register of icon exceptions; Chessground is the board-rendering library the application embeds, an unrelated third-party project and not to be confused with the application's own product name (§1).

---

# 8 Localization

All user-facing text is localized. No string is hard-coded in a component.

Locale files are **bundled with the application** (§1.1). Changing locale from the Application Menu applies immediately to every open workspace and persists across sessions.

On first run the application selects a bundled locale matching the operating system preference, falling back to English.

Resolution order for a string is: the active locale, then English, then the key itself. A partially translated locale therefore degrades to English rather than to blank text.

Text must not be assembled from concatenated fragments. Where a value appears inside a sentence, the whole sentence is a single localizable string with a named placeholder, so that translators control word order.

Layout must tolerate text expansion. Labels that are short in English are frequently 30–50% longer in German; no layout may depend on a specific string length.

**No right-to-left locale is included in this release.** Adding one requires the entire shell and every workspace to mirror, and is a layout change that must be scoped separately rather than treated as an additional translation.

---

# 9 Accessibility

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

The shell's own keyboard map is §2.5; the Library Workspace's is §4.4.3; the Game Workspace's is §5.3. The Settings Workspace defines no keyboard behaviour of its own — see §11.2.

## 9.3 Non-colour state

**No state is conveyed by colour alone.** Selected, active, error and synchronizing states each carry at least one non-colour cue: position, weight, shape, or text.

This holds under forced-colors mode, where the application's own palette is replaced by the operating system's.

## 9.4 Target size

Interactive targets meet the 24 × 24 CSS pixel minimum. Rows in lists and tables are full-width targets and satisfy this comfortably at the densities in §7.3.

The application does **not** meet the 44 × 44 guidance intended for touch input. This is a deliberate consequence of being a dense pointer-driven application, and it is the correct trade for the intended input device.

**If touch input is brought into scope**, the resolution is a user-selectable density setting with a comfortable mode at 40–44px rows, rather than relaxing the default density. This specification does not currently define touch behavior.

---

# 10 Platform

The application is distributed as a self-contained application whose entire UI — code, styles, icons, fonts, and localized text — is installed locally and available offline (§1.1).

Two shell behaviors depend on capabilities the host may withhold:

| Behavior | Requirement | Where unavailable |
| --- | --- | --- |
| Enforcing the window minimum (§2.4) | The application may resize its own window | The window-size notice guarantees the presentation regardless |
| Quit (§2.2.2) | The application may close its own window | A dismissible notice states the platform action instead |

Where a capability is unavailable, the application states the limitation plainly. It does not present a control that silently does nothing.

Only a **native shell** enforces §2.4 at the window-manager level. If a strict reading of that clause is required for acceptance, native packaging is the means; it changes no part of this specification.

The complete list of redistributed third-party components and their licences is given once, in §7.6, and is not repeated here.

---

# 11 Open Decisions and Revision Notes

## 11.1 Revision Notes

This is a condensed record of what changed in the four source documents before this merge, kept for history. It is not a call to action; open items are in §11.2.

**Application Shell.** Tab Bar height (40px), minimum/preferred tab widths (220/300px), and close-tab activation order were fixed from previously unstated or "TBD" values. The New Tab Button was reconciled with the prototype as **hidden**, and the empty Game Workspace it used to create was **removed** — along with the `Ctrl/⌘+T` binding that created it. Tab overflow's control order, the Tab List (shown only while overflowing, excluding the Library Tab, name-only with truncation), and scroll-control disable-at-extent behaviour were specified. The Application Menu gained **Full Screen** and **Quit**, each with explicit host-capability fallbacks. The Application Window minimum (800×600) gained tiered enforcement plus a window-size notice that holds on every host. A shell-level keyboard map was added. The visual system (theme tokens, bundled typefaces, density scale, iconography, motion) was written from scratch, including the load-bearing 0.600em monospace advance and the shell-level 56px collapsed-sidebar token. Iconography was reconciled with the prototype: Lucide bundled at stroke 1.5, Simple Icons for brand marks, and the earlier Unicode-glyph icons explicitly rejected as a defect.

**Library Workspace.** The Sidebar's Library-heading-above-the-three-views was removed as redundant; Subscriptions/Collections/Tags gained fold state with persistence and fault-escalation while folded. The Library switcher was added (frameless, middle-truncating, sourced from Settings → Databases). Subscription rows were specified with source brand marks rather than the plain-text or generic-feed treatment first illustrated, and the workspace-level (not per-row) offline indicator was established. The Content Table's column-sizing model was rewritten twice (once for the two-stage flex rule, once on 15 Sep for 12px outer-edge padding), moving the table minimum from 600px through 504px to 516px, and empty states, keyboard map and `grid` semantics were added. The Status Bar gained a single-form count plus a four-claimant precedence slot (import running ▸ unanswered outcome ▸ offline ▸ selection). Adding Games was written in full on 11 Sep (dialog, import, outcomes, Import report), superseding a deferred placeholder.

**Settings Workspace.** Written from a gap: the Library Workspace's switcher cited a Databases section that did not yet exist as its own document. Databases, Engines and Subscriptions were each accepted as a **row pattern** in boxed groups (4 Sep), superseding an earlier **Card grid** pattern description. Theme and Language were confirmed as appearing in both Settings and the Application Menu, writing the same value, superseding an earlier exclusion. **This merge removes the Card pattern, the Card-based Detail/Edit View, and the Card grid geometry entirely** — Settings' own appendix had already confirmed they were not rendered by any section, retained only for reference; this document carries forward only what is actually built (the row/expander pattern, live in all three object sections). The former §3.4's "note on the section number" — reconciling the Shell front matter's incorrect §4/§5/§6 claim against the documents' actual §3.2/§3.4/§5 numbering — is resolved by this merge's renumbering (§4/§5/§6 respectively) rather than left open.

**Game Workspace.** Written incrementally: Game Info (§5.6.5) was the last of the five Sections to be specified, closing the last placeholder in the composition. The panel's row grid (`30 + 6 + n×24`), the Move List's three-move floor as the panel's one invariant, and the Evaluation Timeline's anchored (not stacked) placement were all stated explicitly for the first time, which retired an earlier state in which Game Details could scroll when Section floors overran the panel — that state no longer occurs. The Explorer was renamed from "Move Explorer". Scrollbar treatment, menu-clipping, and the Engine's never-scrolls behaviour were amended on 15 Sep.

**Product naming.** All four source documents referred to the product throughout by an earlier working name. This merge establishes **Plyvio** as the product name (§1), stated once, with all other body-text references generalized to "the app" / "the application". Chessground, an unrelated third-party board-rendering library, is unaffected by this change.

## 11.2 Open Decisions

These are unresolved items carried forward from the four source documents' own appendices, plus items raised by this merge. They are recorded for the product owner to decide; no resolution is implied by their inclusion here.

1. ~~The New Tab Button has no action.~~ **Resolved 24 Sep** — see §2.1.2/§2.5: "New Game," a blank unsaved draft, restoring `Ctrl/⌘ + T` alongside it.
2. **A shared modal/dialog primitive is not yet defined at the shell level.** The Add Games dialog (§4.4.5), the Import report, and Settings' `ConfirmRemove` each follow the same informal pattern (scrim, `role="dialog"`, `aria-modal`, `Esc`-to-dismiss) but there is no single specified shell component behind them. This merge does not attempt to design one.
3. **An unreadable game's fate during import is unspecified** — rejected, truncated at the illegal move and kept, or imported unvalidated — which in turn leaves the Import report's exact contents open.
4. **The import cascade guard is untested.** Continuing past an unreadable game is the stated behaviour, but the stop rule for a structural error that could turn one failure into thousands (a starting heuristic of 20 consecutive failures, or >25% of the first 100 games) is unconfirmed.
5. **How a running Subscription sync interacts with a manual import is undecided.** A proposed rule (manual import cancels a running sync, which retries at its next interval) has not been adopted.
6. **What counts as a duplicate game during import is unspecified**, though the Duplicates option (Skip / Import anyway) is.
7. **Import undo is not designed.** It would need an import identifier on every game, which is a data-model decision outside this document's scope.
8. **Whether tags, collections and username should be remembered between imports is undecided.** One proposal is to keep them for the session and clear on relaunch.
9. **There is no paste size limit defined** for the Add Games Paste tab, nor a decision on whether a very large paste should redirect the user to the File tab.
10. **What happens when an online import is started while offline is unspecified** — whether the Online tab warns before commit, or the import simply ends in a Network error outcome.
11. **The date-range control on the Add Games Online tab is unspecified** — its options, whether a custom range is offered, and what it limits.
12. **The Library switcher has no keyboard equivalent**, unlike every other Sidebar control.
13. **A Subscription's identifying field has no settled name.** Its `name` currently serves as both display label and the thing it identifies; "account" is known to be wrong (it only happens to fit Chess.com and Lichess), but no replacement term has been chosen.
14. **The Settings Workspace defines no keyboard behaviour of its own.**
15. **Engine options beyond Threads and Hash are unspecified**, as is what an engine's `path` field is used for now that its expander no longer shows it directly.
16. **The Databases `indexing` status is currently unreachable by any specified route.** It is retained in the status vocabulary (§6.8) and in the Library switcher's states (§4.3.10) against a future import path that would build an index; both should be revisited together if no such path appears.
17. **The row that would show the bundled MIT/GPL licence texts (§6.10) is specified but not yet built.**
18. **§5.4.1's Evaluation Bar scale clause is superseded and not yet rewritten.** It still describes an earlier non-linear, clamped scale rather than the one agreed and built (a linear ramp to ±4.00 across three quarters of the bar, then two discrete levels a side). §5.6.2's Evaluation Timeline defers to §5.4.1 for the same mapping, so currently only one of the two places describes it correctly.
19. **What determines the Evaluation Timeline's Opening/Middle/End phase boundaries, and how those two ply numbers reach the Section, is unspecified** (§5.6.2). The Section is only specified to read them, not to compute them.
20. **The general rule for a Section Header's control glyph is unsettled.** The Engine's toggle (§5.6.4) is the only Section with a control so far, so whether "reports a state → draws the state" vs. "fires an action → names the action" is a durable rule or a one-off has not been tested against a second case.
21. **Where an engine's run settings (lines shown, depth limit) should be persisted is undecided.** The `engines` table stores what an engine *is*, not how it is run, and per-engine run profiles are named only as a possibility.
22. **The Game Controls Toolbar's stated preference — that the trailing-most control should be the most forgiving one — is not yet followed.** More (a menu) currently sits trailing-most rather than Flip (an easily-undone toggle); the 16px trailing inset addresses proximity to the window corner but the ordering itself has not been changed.
23. **Game Info's `Hideable: No`** [A] **is provisional**, per its own marked assumption: locking it protects the game's identity, but every other reporting Section can be hidden and a reader who knows the game may not need it either.
24. **The Game View's 16px padding on all sides** [A] **is written to reconcile the 427px floor but was not confirmed against a source design document.** Every board-sizing figure in §5.4.1 derives from it.
25. **Whether Object rows' free-text Name field should remain typed input, or move to a reported/structured pattern like General's Library location (§6.1, §6.6), is unreviewed.** General avoids free text specifically because auto-apply removes any save step at which a bad value could be caught; Object rows (and a Subscription's identifying value, item 13) are currently the sole exception to that avoidance, and it is worth determining whether the exception is necessary or simply unexamined.
26. **Move deletion/undo of a played-but-unsaved move is undesigned.** Stage 5 lifted the restriction this item originally described — a move can now be played from any position, starting a variation when it isn't already there (§5.4.1's "Playing moves"; §5.6.1's "Variations") — but there is still no way to remove a move once played; closing the tab without saving is currently the only way back.
