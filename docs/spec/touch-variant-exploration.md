# Touch Variant — Exploration

> **Not a specification.** This is an exploratory study of what an App Shell and
> Library Workspace optimised for touch would look like, and what building one
> would cost. Nothing in the prototype implements it. It does not amend §2 or
> §3.2.
>
> Wireframes: `wireframes/touch-wireframes.html` (TW-01 … TW-10).

**Target device.** iPad 11-inch in **landscape, 1180 × 820**. The wireframes are
drawn at 1:1 at that size. Portrait is out of scope.

**Given.** Two interactions were specified up front: **swipe scrolls the list**,
and **a single tap opens a game**. Almost everything below follows from those two
plus the touch target minimum.

---

## 1. The headline finding

**A touch build shows 45% of the rows the desktop build shows.**

| Device (landscape) | Touch rows | Desktop rows | Ratio |
| --- | --- | --- | --- |
| iPad mini · 1133 × 744 | 9.4 | 21.3 | 44% |
| iPad 11″ · 1180 × 820 | 10.6 | 23.9 | 44% |
| iPad Pro 13″ · 1366 × 1024 | 13.8 | 30.7 | 45% |

The ratio does not move with screen size, because both figures scale linearly
with height while the row heights stay fixed. **There is no display large enough
to make the density cost go away** — only displays where the absolute number
becomes comfortable.

What buys some of it back: a touch row carries **two lines**. The desktop table
shows eight columns in 30px; the touch list shows six fields in 64px, and drops
both Elo columns to the game itself.

---

## 2. Metrics

Apple asks 44pt, Android 48dp. WCAG 2.5.8 (AA) permits 24px — a floor, not a
target — and 2.5.5 (AAA) asks 44. **The desktop build fails all three at every
interactive element.**

| Element | Desktop | Touch |
| --- | --- | --- |
| Sidebar row | 26px | **48px** |
| Content row | 30px | **64px** |
| Search field | 26px | **44px** (17px type) |
| Tab close | ~24px | **44px** |
| Toolbar buttons | 26px | **44px** |
| Tab bar | 40px | 56px |
| Tab minimum | 220px | 240px |
| Sidebar width | 220px | 280px |
| Icon size | 16px | 22px |
| Status bar | 24px | 32px |
| Collapsed rail | 56px | **dropped** |

Two of these are not just bigger numbers:

- **The tab minimum grows to 240px** because the close control can no longer be
  revealed on hover. It has to be permanently visible at 44px, and 220px does not
  hold a label and a 44px target without crowding.
- **The rail is dropped.** It exists on desktop to return 164px while keeping
  every destination reachable — a trade that only pays when targets can be 34px.
  At 48px a rail becomes 56px of chrome that reaches nothing, and the flyouts it
  needs are worse under a finger than a drawer is.

---

## 3. What the two given interactions displace

| Gesture | Result | What it replaces |
| --- | --- | --- |
| tap | Opens the game | Desktop **double-click** |
| swipe ↕ | Scrolls the list | Wheel, scrollbar |
| long-press | Enters selection mode | Desktop **single-click select**, and right-click |
| swipe ← on a row | Trash | Context menu item |
| swipe → on a row | Favorite | Context menu item |
| swipe → from edge | Opens the sidebar drawer | Collapse control |
| pull down | Sync subscriptions | No desktop equivalent |

### Tap-to-open takes selection with it

The desktop model is *click selects, double-click opens*. If a tap opens, **no
gesture is left for selecting** — and selection is not decoration here: the
status bar reports it, and any multi-game action depends on it.

So selection becomes a **mode**, entered by long-press, as in Photos and Files.
That is a real addition to §3.2.4.3 rather than a restyling: it introduces a
state the workspace does not currently have, with its own toolbar and its own
exit.

### Three things disappear silently

- **Every `title` tooltip.** Used today on sidebar rows, tab close and toolbar
  buttons — including the full text of a truncated subscription name, which on
  touch has no recovery path at all.
- **Row hover.** On desktop it is the only cue telling you what you are about to
  hit.
- **The hover-revealed close button**, as above.

---

## 4. Structure

**The tab model survives.** §2.1's pinned Library plus a scrolling strip works at
1180px landscape: the strip is 942px, which is 3.9 tabs at 240px. It would not
survive on a phone, where a switcher-only model would be needed.

Two changes to the tab bar:

- **The scroll chevrons go.** Swipe already scrolls the strip. Keeping buttons
  that duplicate a gesture costs 88px and teaches nothing.
- **The tab list becomes a bottom sheet** rather than a dropdown — anchored to
  the bottom edge where the thumb is, dismissed by swiping down. It also becomes
  more important, as the only non-gestural way to reach a scrolled-out tab.

**The table becomes a list.** Eight columns at a 504px minimum is a pointer
layout. The touch row is two lines:

| Line | Carries | Behaviour |
| --- | --- | --- |
| 1 | White — Black, result as a chip | 15px semibold; truncates last; the chip never truncates |
| 2 | Event · date · move count | 13px muted; absorbs truncation for line 1 |
| — | *Dropped:* White Elo, Black Elo | The two narrowest columns and the least glanced |

**The column model is not wasted.** `columns.js` stays exactly as specified for
pointer builds; the list is **an alternative renderer over the same data**, not a
replacement. A hybrid device could switch between them, which is the strongest
argument for keeping both.

---

## 5. What it would cost to build

| Item | Kind of change |
| --- | --- |
| Row and control metrics | **Tokens.** The app is already token-driven; add `--row-h`, `--control-h`, `--field-h`, switch on `pointer: coarse`, with a Settings override |
| Two-line list | **New component**, over the existing store |
| Selection mode | **New state** — long-press, mode flag, replaced toolbar, and a §3.2.4.3 decision |
| Swipe actions | **New interaction** — pointer events with a latch and dismissal rules |
| Tab switcher sheet | **Re-presentation** of the existing tab list |
| Tooltips | **Removal** — every `title` needs a visible replacement or it is lost |

### Hazards specific to this codebase

- **`ROW_H = 30` is duplicated.** It is a JS constant driving virtualisation in
  `ContentTable.svelte` *and* a `height: 30px` in that component's CSS. A density
  switch must change both atomically, or the virtual window desynchronises from
  what is drawn and the list scrolls to the wrong place. This is the most likely
  bug in the work.
- **§2.4's window floor conflicts.** 800 × 600 is fine in landscape; in portrait
  an iPad mini is 744 wide and `WindowFloorGate` would cover the app. The floor
  needs a device class, not a smaller number.
- **No safe-area handling.** `#app-root` is `position: fixed; inset: 0`. In a
  standalone PWA that puts the status bar and home indicator over content. Needs
  `viewport-fit=cover` and `env(safe-area-inset-*)`.
- **The fixed shell fights the software keyboard.** It does not shrink when the
  keyboard opens, so a focused search field can end up behind it. Needs the
  `visualViewport` API.
- **iOS zooms the search input today.** It is 13px; below 16px Safari zooms on
  focus, and the fixed shell cannot scroll back. This is a live bug on any touch
  device, not only in a touch build.
- **Momentum scrolling may fight the virtualiser.** The table translates an inner
  container; on iOS that can blank during momentum. Unverified.

### Testing

jsdom has no touch and performs no layout, so none of this is testable the way
the current suite tests things. It would need Playwright with device emulation —
**which would not install in the container used for this project.**

---

## 6. Open questions

1. **Is touch a supported target or the primary one?** A tablet-with-keyboard
   story keeps the tab strip and the table with larger rows. A phone story keeps
   neither, and §2.4's floor has to go.
2. **Does the desktop build keep click-to-select?** If the two builds diverge on
   what a tap or click means, that divergence needs stating in §3.2.4.3 rather
   than emerging from the media query.
3. **One app or two?** Everything above is written assuming one app that adapts
   at `pointer: coarse` with a user override. A separate build would be simpler
   per-target and twice the surface to keep in step.

---

## 7. Unverified

No browser binary could be installed in the build container, so **none of this
has been seen rendered**, on an iPad or anywhere else. The measurements are
arithmetic, the conventions are drawn from Photos, Files and Mail, and the
hazards in §5 are reasoned rather than observed.
