# Layout and window floor

## Layout model

`src/lib/layout.js` holds the overflow geometry as a pure function. It is the
one piece worth reading first — the same pure-function-over-DOM pattern
repeats in `src/lib/library/columns.js`, `src/lib/game/layout.js` and
`src/lib/settings/layout.js`, for the same reason: vitest applies no
stylesheets, so a computed width cannot be asserted, and anything genuinely
geometric has to live in a module that can be tested without a browser.

```
normalAvail = barWidth − pinnedWidth − MENU_W
rawWidth    = min(TAB_PREF, floor((normalAvail − NEWTAB_W) / tabCount))
overflow    = tabCount > 0 && rawWidth < TAB_MIN
tabWidth    = overflow ? TAB_MIN : max(TAB_MIN, rawWidth)
```

The overflow decision is derived from the **normal-state** budget only. It
deliberately does not depend on the width of the controls that entering
overflow introduces — that feedback loop would oscillate at the boundary,
flickering the whole tab bar. `tests/layout.test.js` asserts this, plus
monotonicity in both bar width and tab count.

Control widths, and the resulting reflow §2.1.3 accepts:

| State | Controls | Width |
|---|---|---|
| Normal | `[ ☰ ]` | 40px |
| Overflow | `[ + ] [ ◀ ▶ ] [ ▾ ] [ ☰ ]` | 184px |

At an 800px window: 132 pinned + 484 strip + 184 controls. 484 ÷ 220 = **2.2
tabs visible** — the tightest legal case, accepted because 800 × 600 is the
floor rather than the working size.

## The 800 × 600 minimum (§2.4)

§2.4 requires that "the window cannot be resized below 800 pixels in width or
600 pixels in height". **No web application can veto a window resize.** This is
the browser security model, not a gap in this implementation:

- **Chrome** refuses `window.resizeTo()` on any window it did not open by
  script. The web.dev PWA docs describe app windows resizing themselves, but on
  macOS the call is silently ignored.
- **Safari** on macOS gives "Add to Dock" apps a fixed 320 × 567 minimum,
  enforced by Safari and not overridable from JavaScript.
- The **web app manifest has no minimum-size field.** `minWidth` exists only as
  an unshipped proposal.

So the clause is met by a two-part strategy, neither part of which modifies the
specification:

### 1. Snap-back where the platform permits it — `src/lib/windowFloor.js`

Gated on `display-mode: standalone` (or `window-controls-overlay`,
`fullscreen`, or Safari's `navigator.standalone`), so it is completely inert in
a browser tab rather than fighting the user agent. It clamps the **viewport**
to 800 × 600 and adds the window chrome back on top, so the usable area gets
the full minimum rather than the minimum minus a title bar.

This works on Chrome for Windows and ChromeOS. It does **not** work on macOS
Chrome or Safari. It verifies asynchronously — resizes are not applied on the
calling tick, so reading the result synchronously reports a false failure on
platforms where the call actually worked — and disables itself after three
consecutive ineffective attempts rather than fighting an unresponsive host for
the life of the session.

### 2. The window-floor gate — `src/lib/components/WindowFloorGate.svelte`

The part that holds everywhere. Below 800 × 600 the shell is covered entirely
by a panel naming the current size, the required minimum, and which axis is
short. **The shell is never presented at an illegal window size.**

The shell stays mounted underneath, so no tab or workspace state is lost; the
gate withdraws the moment the window is large enough. It is localized like the
rest of the shell.

This is enforcement of the *experience* rather than of the OS window. It is the
strongest guarantee available to a PWA, and the reason the shell needs no
degraded sub-800px layout and no scrollbars of its own.

**A native shell (Tauri/Electron) is the only way to make the OS itself refuse
the drag** — `minWidth`/`minHeight` on the native window. That is a packaging
decision; the shell code is unaffected by it.

## The shell never scrolls (§2)

`body` and `#app-root` are both `overflow: hidden`, and `#app-root` is
`position: fixed; inset: 0` — it fills the window exactly.

`#app-root` deliberately carries **no** `min-width`/`min-height`. A minimum
there would make the document overflow below 800px and produce shell-level
scrollbars. Undersized windows are the gate's job instead.

Scrolling is a workspace concern. The shell hands each workspace a fixed box
sized by the window and the workspace decides what to do with overflow inside
it. The only horizontally scrollable region in the shell itself is the Tab
Strip, and only while overflowing. `tests/gate.test.js` asserts this by walking
every element in the rendered shell and failing on any scrollable one that is
neither the strip nor inside the workspace area.
