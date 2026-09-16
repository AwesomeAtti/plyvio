# 5. Game Workspace

> **Revision status.** This revision specifies the workspace's overview, layout, navigation,
> the **Game View** region, the **Game Details shell**, and **all five** Sections that plug
> into it. Game Info was the last placeholder in the composition and is specified in §5.6.5.
>
> Three changes arrived with it and are stated here rather than left to be discovered:
> the panel's Sections sit on **one row grid** (§5.4.2); the **Move List never renders fewer
> than three moves**, which is the panel's one invariant; and the **Evaluation Timeline is
> anchored** below the stack rather than in it, displayed only where that invariant can be
> honoured. Together they remove a state this document used to describe — **Game Details no
> longer scrolls** (§5.5).
>
> Assumptions still to confirm are marked **[A]**.
>
> *Amended 15 Sep 2026 (G3).* §5.4.2: a Section's menus are drawn above the panel rather than
> clipped by it, and the row grid's 6px of body padding is stated to include the Section's
> bottom rule. §5.6.1: the Move List shows the platform scrollbar, as the Explorer does, and
> its trailing track is 40px. §5.6.3: the Section is renamed **Explorer**, the source menu's footer
> opens Settings at Databases, and the body no longer scrolls when every move fits. §5.6.4: the
> Engine never scrolls.

---

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

The two names describe purpose rather than implementation, in keeping with §3.1.

The **Evaluation Bar is not a third region.** It is board furniture, in the same sense as coordinates, highlighting and arrows, and it lives inside the Game View. Its two ends mean *White* and *Black* — a statement about the board's top and bottom edges, not the window's — so a bar spanning the full window height would be wrong on its own terms.

---

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

**Derived constraint.** `427 + 360 = 787` against the Application Window's 800px minimum leaves **13px of slack**. A fixed Game Details can therefore never exceed **373px** without violating the Game View's floor — a change that would fail only at the minimum window size, and so is stated here rather than left to be discovered.

---

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

---

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

#### Evaluation Bar

The bar shows the engine's assessment of the **current position** as a single vertical quantity, readable without moving the eye to Game Details.

**Geometry**

- Width **fixed at 27px**. It does not scale with the board, the window, or anything else. The value is derived from the label's fit (below), not chosen for proportion.
- **8px** between the bar and the board edge.
- Height exactly equal to the rendered board height; **top and bottom always aligned with the board's**.
- Positioned immediately left of the board.
- **Additional space benefits the board, never the bar.** The bar's width is the one dimension in this region that never changes.

**Orientation.** The bar flips with the board. Whoever is at the bottom of the board keeps their end of the bar at the bottom, so "my colour is down here" holds in both orientations.

**Scale.** Centipawn evaluations are mapped non-linearly, so that most of the bar's travel sits near equality where the difference matters. Values beyond a ceiling are clamped; mate pegs the bar fully. A dashed line marks dead even, so distance from equality is readable without the number.

**The numeric label carries one decimal. Negative values are signed; positive values are not.** The label rides the advantaged end, so for a positive value the position already states which side is ahead and a plus adds nothing. A minus is different: it is the only thing distinguishing a value from its mirror when the label is read on its own, so it is kept.

The sign is the **hyphen-minus** (`-`, U+002D), not the typographic minus (`−`, U+2212). The two are 0.399 em and 0.600 em respectively, and the difference is load-bearing — see below.

**The label is set in the proportional sans at 10px, not the monospace.** This is a deliberate exception to the visual system's rule that numeric values take the monospace face (§7). That rule exists so numbers stacked in columns align; this label aligns with nothing.

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

---

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

**The trailing-most control should be the most forgiving one available**, for the same reason: whatever sits closest to the corner is what a mis-aimed press finds.

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

---

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

---

## 5.6 Sections

§5.4.2 defines the shell and the contract a Section fills. This section defines the Sections that fill it. Four of the five are specified here; Game Info is not yet drawn and remains a placeholder in the composition.

Each states what it declares to the shell, what it draws, and what it does when it has nothing to draw. Where a Section repeats a rule the shell already gives it, the shell's statement governs.

---

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

---

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

**The Section reads the two ply numbers that place the boundaries; it does not compute them.** Where they come from is not specified here. Given both, the regions are drawn; given neither, they are not, and **there is no fallback to equal thirds** — thirds would be the application asserting a phase boundary it has not earned.

#### Interaction and status

Press or drag anywhere in the chart. **The whole content box is the target**, not the curve and not the playhead, and the region labels do not intercept the press.

**The Section takes no focus and binds no keys.** Arrow keys already step the game (§5.3), and a focusable control here would put a second owner on the same keys for the same state.

The **status slot** carries the evaluation at the playhead.

**The hover preview names the stop under the pointer, and nothing else**: the move number and the move played, White's written `12.e4` and Black's `12…Nf6` — the single ellipsis character, as the Move List numbers Black's ply — and `Start` at the starting position. **It carries no evaluation**; the curve under the pointer already is the evaluation, and the status slot carries the exact value at the playhead.

The preview is centred on the hovered stop and **held 4px inside the Section's edges** — the same inset it keeps from the top — so a stop near either end moves the plate inward rather than cutting it off.

**The Section hides itself when the game has fewer than two positions.** A game with no moves has one stop and no track to divide; there is nothing to scrub through and no shape to draw.

That is a **content** reason and is not the same as displacement: there is genuinely nothing to draw, rather than nowhere to draw it. So the Section can be absent for three distinct reasons — the user hid it, the game is too short, or the window is too short — and the Sections menu reports the user's apart from the other two (§5.4.2).

---

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

Its figures are position statistics held by the game database — one row per position per distinct move played from it, with the games that played it and how they ended. The table and its position key are specified in the database schema (§6); this Section reads them and does not derive them.

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

**The Section is named Explorer**, in its header and wherever the application lists it. It was called the *Move Explorer* until 15 Sep; the header had already dropped "Move", because the source beside the title names the library and the rows are self-evidently moves, and the Section's name now follows its title rather than the reverse.

The **source** slot carries the library being explored — the one thing in this Section the user changes. The list offers `None`, then the installed libraries, each with its own size, and ends with a footer shortcut, `Settings ›`, which opens the **Databases** section of Settings (§3.4.8.1), where libraries are managed. It names that section rather than Settings itself; there is only one place in Settings this list could mean. `None` leads because it is the absence of a selection rather than one of the things being selected between. **The library explored need not be the one the game came from**: reading your own game against a master library is the Section's most useful case.

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

---

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

The **source** slot carries the engine in use, and follows §5.4.2's source-selector shape: the current engine, then the engines Settings offers — installed and enabled — then a footer shortcut. The footer names the Engines section of Settings (§3.4.8) rather than Settings itself; there is only one place in Settings this list could mean.

The **control** slot carries the **shared icon button**, like every other Section's. It is **disabled when no engine is selected**: the Section cannot run without one, and a disabled control states that before it is pressed rather than after.

**Its glyph is a toggle** — the knob left for stopped, right for running. That is what lets this Section use the shared button at all. The control sets a state the reader then watches rather than firing an action, and a power symbol shows what pressing it will do while showing nothing about what it is doing now; a toggle draws the state instead of describing it. The Section Header therefore has no exception to carry (§5.4.2).

**Its state is carried by the knob's position, not by its colour** (§9.3). Running is additionally drawn in the affirmative colour, which is reinforcement and never the only signal.

**The glyph is drawn at 20px where the header's other icons are 13.** Not because it fails small — at 13px the knob's position is distinguishable, and the colour carries it besides. Because this is the only control in the panel that reports an *ongoing* state: the options and collapse controls are read when the reader goes looking for them, and this one is read while a search is running, at a glance, from wherever the eye happens to be. Legibility at a glance is worth more here than uniformity with glyphs that are only ever read on purpose. **The button is unchanged at 26px**, so the control column does not move and the target matches its neighbours; what differs is the mark inside it.

It carries `role="switch"` and `aria-checked`, per §5.4.2.

There is **no status slot**. The depth reached is per row, which leaves the slot with nothing to say, and a slot kept against a future use is a slot the next passing value fills.

The **options** menu carries exactly two settings — the **number of lines** (one to three) and the **depth limit**. Engine configuration belongs in Settings and is not duplicated here; these two are surfaced because they are worth reaching while watching the Section itself. Threads, hash and the rest are not here and do not come here.

**Neither setting is persisted in this revision.** They last as long as the tab, like the ply and the board orientation (§5.3). Where a per-engine setting would be stored is a database question and is open — the `engines` table stores what an engine *is*, not how it is run.

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

---

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

Every field is a column the database already stores (§1 of the schema). What this Section decides is which of them earns a place and at what weight.

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

**The result is drawn in its plain PGN form** — `1-0`, `0-1`, `1/2-1/2`, no spaces. Deliberately **not** §5.4.1's `½-½` substitution, which the application uses elsewhere: this card is a reading of the game's record, and the record says `1/2-1/2`.

**The date is one fixed form** — `30 Aug 2026` — and not locale-dependent formatting. A locale formatter reorders the fields, so the same game would read `Aug 30, 2026` for one reader and `30 Aug 2026` for another. The order is fixed everywhere; the month **word** is translated, which is vocabulary rather than format.

#### Favourite, tags and collections

These are the user's marks on their copy of the game rather than facts about the game, and they are stored with the library row rather than with the game. A game opened from no library has none, and the card draws the record alone.

**The favourite is the leading mark on row 3, and is mirrored into the header's status slot.** A collapsed Game Info is a header and nothing else, and whether this game is a favourite is the one thing on the card worth knowing without expanding it. An unfavourited game renders nothing there; a hollow mark in every header would be noise four times out of five.

**Tags and collections share one horizontally scrolling rail** — a fourth row, real chips, one line.

The alternatives were to wrap, to cap at a count, or to scroll vertically in a boxed tray. Wrapping makes the Section's height follow the data. Capping hides how many there are. A tray is a second scrolling region inside a panel that has just been designed not to scroll. Sideways is the one that leaves the Section a fixed pair of heights, and it is precedented: the Tab Strip overflows the same way (§2.1.3–.4), and like it the rail has no `◀ ▶` controls — wheel and trackpad only, with the trailing edge faded to say there is more.

**Pressing the rail opens the Edit dialog at Tags and Collections.** The rail reports; it does not edit.

#### The Edit dialog

Opened from the Section's options menu at the top, or from the chip rail scrolled to the marks. Arriving at the top when the tags were pressed is not the dialog that was asked for.

It reuses the modal chrome and the token field the Add Games dialog established (§3.2.4.5) rather than inventing a second modal and a second way to pick a tag.

Field order is **the card's ranking, not PGN's export order**:

```text
White + rating
Black + rating
Result
Event · Site · Date · Round
Favourite · Collections · Tags
```

The Seven Tag Roster opens with Event, Site, Date and Round and reaches the players fifth. A form that disagreed with the card above it would teach two orders for one game, so the players lead here as they lead there.

**Result is a closed set of four**, because the standard defines four values (§8.1.1.6) and there is nothing a reader could type that it would accept and the buttons would not offer. `*` is one of the four and is a real value — a game not yet decided — so it is labelled rather than printed bare.

**The date is validated, not reformatted under the user.** `YYYY.MM.DD` with `?` permitted for parts that are not known, since a partial date is valid input rather than an error. What is flagged is a value that is neither.

**Editing writes to the lifted columns, never to `pgn`.** §2.1 of the schema keeps the document byte-for-byte as received and treats the columns as the editable copies, so a column and its tag pair can legitimately disagree after an edit. That is the intended relationship rather than a defect.

**[A] Hideable is provisional.** Game Info is the game's identity and sits first in the panel, which argues for locking it; the counter-argument is that a reader who knows the game does not need it, and every other reporting Section can be removed. Locked is the reversible half of the choice.

---

## Appendix — decisions and open items

| Item | Decision |
| --- | --- |
| Game View minimum | 427px, composed as 16 + 27 + 8 + 360 + 16 |
| Board at the 800 × 600 minimum | **373px** |
| Board maximum | **None.** The board is the focus of the workspace |
| Board placement | Centred in the Game View on both axes |
| Evaluation Bar width | **27px**, constant at every board size. Set by the label's fit |
| Evaluation Bar height | Exactly the board's, top and bottom aligned |
| Evaluation Bar slot | **Permanently reserved.** The board never moves because of the bar |
| Evaluation Bar label | One decimal. **Negatives signed with the hyphen-minus; positives bare.** Mate renders `M<n>` |
| Evaluation Bar label type | **10px proportional sans**, not the tabular monospace — the label aligns with nothing |
| Evaluation Bar width is fixed | It does not scale with the board or the window. Additional space benefits the board |
| Game Details width | Fixed 360px; derived ceiling of 373px at the minimum window |
| Game Details scrolling | **Never.** The Evaluation Timeline yields before the Move List's floor can be broken |
| Game Controls Toolbar | Part of the Game Details shell, anchored to its bottom |
| Workspace scrolling | Never |
| Empty state | None — a Game Workspace always has a game |
| Section **Ceiling** | Contract property. A maximum rendered height, for a Section sized to content. Three Sections declare one — Game Info, the Explorer and the Engine |
| Section **Anchored** | Contract property. Below the stack, outside its allocation and its scrolling. One Section declares it — the Evaluation Timeline |
| The panel's row grid | **`30 + 6 + n × 24`.** Every Section height is a whole number of rows; a height between two rows is a height nobody chose |
| Section Header exceptions | **None.** The Engine's control was the one, and it retired when a toggle glyph let it use the shared button |
| Section visibility control | The Game Controls Toolbar's **More** menu, with four states — ticked, unticked, ticked-and-displaced, ticked-and-locked |
| Which Section absorbs | **The Move List.** The only Section whose usefulness scales with height |
| The panel's invariant | **The Move List never renders fewer than three moves.** Everything the Timeline does about space follows from it |
| Toolbar insets | **8px leading, 16px trailing.** The trailing end is the window's bottom-right corner |
| Toolbar controls | **26 × 26px, 8px apart**, symbols without text labels |
| Move List floor | **108px — three moves.** Stated in moves, not pixels; its row is **24px**, the grid's |
| Move List number gutter | **36px**, sized on the longest number plus its trailing padding |
| Move List trailing track | **40px** — the comment control's chevron lines up with the header's collapse chevron |
| Move List scrollbar | **The platform's, as in the Explorer.** No lane is reserved |
| Section menus | **Drawn above the panel**, never clipped by the stack; lifted to fit the window |
| Move List comment control | Per **row**, not per ply. Opening splits the move only when White's ply carries the comment |
| Evaluation Timeline height | **108px fixed** — 30px of header, 78px of chart, no axis strip |
| Evaluation Timeline placement | **Anchored** between the stack and the toolbar — a transport control against the transport it drives |
| Evaluation Timeline displacement | Shown only where the Move List keeps three moves. Measured against each Section's **maximum**, with a 16px dead band, and **never written to the user's stored visibility** |
| Evaluation Timeline axis | **0 to N plies**, N + 1 stops, first and last flush to the edges. No scroll, no zoom |
| Evaluation Timeline scale | **§5.4.1's**, shared rather than reimplemented. Flips with the board |
| Evaluation Timeline preview | **The move only** — `12.e4`, `12…Nf6`, no evaluation. Held 4px inside the Section's edges |
| Explorer name | **Explorer** — in the header, the Sections menu and this document. *Move Explorer* until 15 Sep |
| Explorer height | **Sized to content, 60–108px.** A fourth move scrolls rather than growing it; the body is padded 3px above and 2px below so that three moves do not |
| Explorer source footer | **Settings › Databases** (§3.4.8.1) |
| Explorer rows | **Read-only.** Move-on-click belongs with interactive analysis |
| Explorer tooltip | **Game count only**, on row hover, centred over the share. Above the row, below it where the list would clip it |
| Engine height | **Sized to content, 60–108px.** One to three principal variations, on the Explorer's row grid |
| Engine scrolling | **Never.** It shows exactly the lines chosen |
| Engine control | **The shared icon button**, with a toggle glyph at 20px. Disabled with no engine selected |
| Engine status slot | **None.** The depth reached is per row, which leaves the slot nothing to say |
| Engine options | **Two settings only** — lines and depth limit. Engine configuration stays in Settings |
| Engine rows | **Read-only**, joining the Explorer's rule rather than carving a second exception to it |
| Engine scope | **A live view of the current position.** It reads no stored evaluation and writes none |
| Evaluation Bar source | **A running Engine Section wins** while it is running for the position on screen; otherwise the stored evaluation, or nothing. **Never both** |
| Live analysis retention | **Switching off retains and dims; leaving the position clears.** Returning does not restore it, and none of it is persisted |
| Game Info height | **Two heights, not a range** — 108px, or 132px with the chip rail. The rail scrolls sideways, so nothing between is reachable |
| Game Info order | Player names, result, date, location — the row order **is** the ranking |
| Game Info result form | **Plain PGN** — `1-0`, `0-1`, `1/2-1/2`. Not §5.4.1's `½-½` substitution |
| Game Info date form | **One fixed form**, `30 Aug 2026`. Not locale-dependent ordering; a partial date degrades to what is known |
| Game Info absences | A PGN `?` or `*` is **never shown verbatim** — a plain-language absence, dimmed |
| Tags and collections | **One horizontally scrolling rail**, precedented by the Tab Strip's overflow. No `◀ ▶` controls |
| Edit dialog field order | **The card's ranking, not the PGN roster's** — players first |
| Editing and `pgn` | Edits write the lifted columns. **`pgn` is never rewritten** |

**Open — the trailing-most toolbar control is More.** §5.4.2 states that the control nearest the corner should be the most forgiving one available, and More is a menu: mis-aimed, it opens something. Flip is the alternative — a toggle, visibly undone by pressing it again — but exchanging them puts More away from the trailing edge, where the platform convention puts it. The 16px inset addresses the proximity; this states the preference the arrangement does not yet follow.

**Open — §5.4.1's Scale clause is superseded and not yet rewritten.** §5.6.2 defers to it for the mapping, and it still describes the earlier non-linear-and-clamped scale rather than the one that was agreed and built: a linear ramp to ±4.00 across three quarters of the bar, then two discrete levels a side, with four bands that hold no value. Until it is rewritten, §5.4.1 and §5.6.2 name the same mapping and only one of them describes it.

**Open — the Evaluation Timeline's phase boundaries.** §5.6.2 specifies that the Section reads two ply numbers and draws nothing without them. What determines those numbers, and how they reach the Section, is deliberately not specified here.

**Closed — Game Info.** Drawn, built and specified: **§5.6.5**. It was the last placeholder in the composition, so §5.4.2's shell now has no Section standing in for one.

**Closed — the worst-case scroll.** Whether Game Details should scroll at the Application Window's minimum, or Sections should be trimmed to prevent it, was carried as a policy question. It resolves by neither: the case no longer occurs. The Move List's three-move floor is honoured at every permitted window size because the Evaluation Timeline is displaced before it can be broken, so the panel has lost a state rather than gained a rule (§5.5).

**Open — the composition's order was corrected, not chosen.** This document's table listed Game Info, Timeline, Engine, **Move List, Explorer**, while the figure it was drawn from put Explorer above the Move List. The two disagreed for a revision. The table's order is the one specified and built; the figure was wrong. Recorded because the disagreement was silent — nothing in either document referred to the other — and the same pair could drift again.

**Open — the Section Header's control glyph, for the next Section that needs one.** §5.4.2 now says the header has no exceptions, and §5.6.4's toggle is what made that true. What is not settled is the general rule: a control that *reports a state* wants a glyph that draws the state, and a control that *fires an action* wants one that names the action. One Section is not a pattern. The next Section to fill the slot either confirms this or shows where it breaks.

**Open — where an engine's run settings live.** §5.6.4 surfaces two of them in the Section and states that neither is persisted in this revision. The `engines` table stores what an engine *is* rather than how it is run, and the database schema names reusable engine profiles only as a possibility. The Section's bounds for the depth limit are therefore stated in the build and not here: they are not a property of the Section, and specifying them before Settings draws the same control would fix a range in two places at once.

**[A] Open — Game View padding.** Written as 16px on all four sides. This reconciles the 427px floor exactly and matches the shell's spacing rhythm, but was not specified in the source document. Every board figure in §5.4.1 derives from it.

**Removed from the previous draft.** The "container ships early" argument is build sequencing rather than UI, and §1.2 places implementation out of scope; it belongs in a build note. Rationale repeated across three or four places has been stated once, on the principle that rationale earns its place only where it prevents a specific wrong implementation.

**Deferred to the Sections.** The Evaluation Bar's source priority and retention rules are stated with the Engine Section — **§5.6.4** — rather than in §5.4.1, because they describe a relationship between two components and belong where that relationship is defined.
