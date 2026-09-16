# Testing notes

Sixteen test files. The main ones:

- `layout.test.js` — geometry. Includes an exhaustive sweep of every width
  800–2400px × 1–14 tabs asserting the floor always holds, both monotonicity
  properties, and the anti-oscillation guarantee.
- `tabs.test.js` — workspace model invariants: Settings singleton and rightmost,
  game insertion before Settings, close-activates-neighbour, state retention.
- `shell.test.js` — the real components in jsdom: control order and count in
  both states, exactly one New Tab Button at all times, rendered tab widths
  never below 220px, dropdown contents, menu behaviour, locale switching.
- `gate.test.js` — the window-floor gate appearing and withdrawing at the
  boundary, flagging only the offending axis, staying localized, leaving the
  shell mounted underneath; plus the assertion that no element in the shell
  scrolls except the tab strip.
- `library.test.js` — the Library Workspace: the column model swept across
  every width from 504–4000px, the mock corpus, sidebar filtering and search
  composition, trailing-slot priority including offline, the collapsed rail and
  its flyouts, selection, open-or-activate, the four empty states and the
  status bar, including the right slot's precedence.
- `addGames.test.js` — §3.2.4.5: the import plan and its five outcomes, the
  messages, the single lane and cancelling, the Status Bar line, the dialog's
  tabs and presence-not-validity enablement, Smart Collections excluded, and
  the house rules (no characters as icons, no concatenated strings, every
  string in all three locales).
- `settings.test.js` — the Settings Workspace: section order and active state,
  last-section memory, the object-management pattern across all three sections,
  auto-apply commit and rejection, blur-not-keystroke text commits, removal
  confirmation, empty state, and the grid column maths.
- `appCommands.test.js` — the two new menu commands: item presence and order,
  localization, fullscreen enter/exit/reject and external state changes, and
  every Quit failure path reaching the notice rather than failing silently.
- `windowFloor.test.js` — §2.4 clamp geometry, chrome compensation, the
  display-mode gate that keeps it inert in a browser tab, and the runaway
  guard. The runaway test caught a real scheduling bug: the debounce originally
  tracked a `requestAnimationFrame` handle, which goes stale under a
  synchronous scheduler and would have silently ignored every resize after the
  first. Async rAF hides it in a real browser.

## What these tests cannot tell you

**vitest does not inject Svelte's scoped CSS into jsdom.** `document.styleSheets`
is empty, so `getComputedStyle` returns initial values for everything and any
assertion built on it is vacuous — it passes whether or not the rule exists.
Two tests in `gate.test.js` were doing exactly that before this was noticed.

Style invariants are therefore asserted **against the source**: the tests read
the component and CSS files and check the rule is written. That is a weaker but
honest guarantee — it proves the rule exists, not that a browser applies it.
Anything genuinely geometric lives in a pure module (`layout.js`,
`settings/layout.js`) where it can be tested properly.

jsdom also has no layout engine, so `tests/setup.js` polyfills `ResizeObserver`
and each test declares the width it is simulating. No browser binary could be
installed in the build container, so **rendered pixels, wheel-scroll momentum,
the resize drag, and both themes have never been verified mechanically** —
check those by eye.
