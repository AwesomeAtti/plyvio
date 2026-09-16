# Application Shell (§1.3, §2)

The tabbed workspace model: one window, one shell, one active workspace, with
the Library pinned first and Settings a singleton always rightmost. See
`docs/architecture/overview.md` for the full implemented-clause table
(§1.3, §2.1.1–§2.2, WF-06b).

The shell's own mechanics — the tab-bar overflow geometry, the 800×600
window floor, and the rule that the shell itself never scrolls — are
cross-cutting enough that other workspaces reference them directly (the Game
Workspace's floor arithmetic in particular), so they are documented together
in [Layout and window floor](layout.md) rather than repeated here.

Where the shell's build has drifted from `docs/spec/1-2-application-shell.md`,
see [Deviations from the specification](deviations.md).

Accepted wireframe: `design/shell-wireframes.html`.
