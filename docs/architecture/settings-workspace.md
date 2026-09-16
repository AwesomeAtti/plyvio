# Settings Workspace (§3.4)

Auto-apply, approved 3 Sep. Every control commits on change; there is no Save
and no Cancel. This is **consistent with §3.4.9**, not a deviation — the clause
reads "saving *or applying* changes", and this is the second branch.

Removing Save removes the moment where invalid input would normally be caught,
so three things are handled explicitly rather than assumed:

1. **Validation runs before the commit.** `applyField()` returns a message key
   and writes nothing when a required field is empty, so the object keeps its
   last good value. Clearing an engine's executable path and blurring is
   rejected, not applied.
2. **Text commits on blur, never per keystroke.** Committing per character
   would apply a path in a broken half-typed state on every letter. Selects and
   toggles commit on change, since they have no intermediate states.
3. **Removal confirms first.** It is the one irreversible action, and with no
   Cancel there is nothing to walk it back, so `ConfirmRemove` gates it.

A quiet "✓ All changes applied" indicator appears after each successful commit,
because auto-apply removes the Save button that normally signals that a change
stuck.

**A rejected commit keeps the bad input on screen**, beside its error, rather
than reverting to the last good value. Reverting would discard what the user
typed without explaining why. The *stored* value is untouched either way — only
the display holds the invalid text so it can be corrected.

`src/lib/settings/layout.js` holds the grid geometry as pure functions, so the
column claims are verifiable without a browser:

| Window | Content | Columns |
|---|---|---|
| 800px (minimum) | 580px | 2 |
| 918px | 698px | 3 |
| 1140px | 920px | 4 |

n columns need `n×210 + (n−1)×12` of usable width, plus 44px content padding
and the 220px sidebar. The tests assert the thresholds, that the count never
decreases as the window widens, and that it never drops below one column.

The Settings sidebar is a nested `tablist`/`tabpanel` pair inside the shell's
own. Both panels are labelled; queries in tests use ids rather than roles,
which are ambiguous with two panels present.

Accepted wireframes: `design/settings-workspace-wireframes.html`,
`design/settings-databases.html`, `design/settings-engines.html`,
`design/settings-subscriptions.html`, `design/settings-control-sections.html`.
