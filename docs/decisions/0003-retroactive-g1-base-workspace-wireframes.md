# 0003 — Retroactive G1 confirmation: shell, Library and Settings base wireframes

## Status

Accepted — 2026-09-16, by AwesomeAtti, during the plyvio migration.

## Context

`working/STATUS.md`'s Register marks G1 for three foundational wireframes —
`shell-wireframes.html`, `library-workspace-wireframes.html` and
`settings-workspace-wireframes.html` — with `~` ("inferred, needs
confirming"), not a solid `✓`. In practice all three were built, tested and
specified (`docs/spec/1-2-application-shell.md`,
`docs/spec/3.2-library-workspace.md` and
`docs/spec/3.4-settings-workspace.md` all cite them as their basis), and
every later, explicitly-gated wireframe in the Library and Settings
Workspaces was drawn as a refinement on top of them. What's missing is not
agreement that the design is right — it's a contemporaneous record of an
explicit G1 instruction for these three specifically, because the gating
process (STATUS.md's "Approval gates" section) was formalized after they
were already in use.

Migrating the prototype's `wireframes/` folder into `design/` (accepted) and
`working/wireframes/` (everything else) forced the question these three
files had been sitting on unresolved.

## Decision

Treat G1 as confirmed retroactively for `shell-wireframes.html`,
`library-workspace-wireframes.html` and `settings-workspace-wireframes.html`.
All three move into `design/` alongside the other accepted wireframes
(including `game-workspace-wireframes.html`, whose G1 was already a solid
`✓`). This is a bookkeeping correction, not a new design decision — nothing
about these wireframes changes; what changes is that the gap between "built
and specified" and "explicitly gated" no longer travels forward into the new
project structure.

This follows the same precedent STATUS.md itself already records for the
Library switcher (`library-switcher-options.html`, granted G1 and G2
retrospectively on 4 Sep) — a retrospective grant made explicit rather than
inferred, and, per that entry, not to be treated as routine going forward.

## Consequences

- `design/` now holds all four base `*-wireframes.html` files
  (shell, library-workspace, settings-workspace, game-workspace) as the
  accepted reference for the Application Shell, Library and Settings
  Workspaces, alongside their later G1-passed refinements.
- `working/STATUS.md` is preserved as-is (untouched, moved verbatim) as the
  historical record showing the `~` — this ADR is the durable correction
  that supersedes it going forward, not an edit to the original record.
- Should any of these three need a Rev B, it now supersedes an explicitly
  gated G1 rather than an inferred one.
