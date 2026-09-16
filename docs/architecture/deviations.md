# Deviations from the specification

Errata for `docs/spec/`: places where the built prototype and the written
specification disagree, and which side is currently right. Filed here rather
than under any one workspace doc, since a deviation can originate in the
Application Shell, Library, Game or Settings Workspace alike.

1. **§2.1.2 — New Tab Button.** The spec says "visible but inactive".
   Requirement 5 says it creates a Game workspace. Requirement 5 is
   implemented; the spec needs amending, as the two cannot both hold.

2. **§2.1.4 — Tab-list dropdown.** The spec defers this to a future release.
   It is included here, approved 3 Sep, because the 220px floor leaves only
   ~2.2 tabs visible at the minimum window size.

3. **§2.2 — Full Screen and Quit added to the Application Menu.** §2.2 fixes the
   menu at Language, Theme, Settings and About. Full Screen and Quit were added
   by request on 3 Sep. Both are commands rather than preferences, which is why
   they sit beside Theme rather than in the Settings Workspace. The four
   specified items keep their relative order; `tests/shell.test.js` asserts
   both that fact and that nothing beyond these two was added.

   - **Full Screen** uses the Fullscreen API, which needs a user gesture — the
     menu click supplies it. The menu label tracks the real state, including
     exits the user triggers with Esc or F11.
   - **Quit** calls `window.close()`, which browsers only reliably permit on
     script-opened windows. An installed PWA window generally qualifies in
     Chrome; a browser tab never does, and Safari is unverified. It therefore
     verifies afterwards and raises a dismissible notice if the window is still
     open, rather than appearing to do nothing.

4. **§2 — Keyboard interaction is unspecified.** The map in `AppShell.svelte`
   (WF-10) is a proposal, not a requirement. `Ctrl/⌘+T` and `Ctrl/⌘+W` are
   intercepted by the host browser in a normal tab. `⌘T` is free in an
   installed PWA window (no tab strip), but **`⌘W` still closes the PWA window**
   on macOS and never reaches the handler — it needs remapping to `⌘⇧W` or a
   `Ctrl`-based binding to be testable there.
