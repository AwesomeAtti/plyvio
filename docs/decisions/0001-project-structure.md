# 0001 — Project structure: migrating the prototype into plyvio's tree

## Status

Accepted — 2026-09-16.

## Context

The prototype grew for several weeks as a flat tree in
`chessgui prototype - pwa/`: the SvelteKit app, `spec/`, `wireframes/`
(dozens of accepted, exploratory and superseded drawings mixed together),
`samples/`, working notes under `working notes/`, and a single 32KB
`app/README.md` covering everything from `npm run dev` to per-workspace
implementation detail, sat side by side at the top level. That was workable
for one person iterating alone; it stops being workable as the project moves
toward a real repository, a desktop (Tauri) target, and material other people
— or a future AwesomeAtti — will need to navigate without re-deriving which
wireframe was actually accepted or which doc describes which workspace.

## Decision

Copy (never move) the prototype into a new `plyvio/` tree, restructured as:

```
README.md  LICENSE  NOTICES.md  .gitignore
docs/spec/            ← from spec/
docs/architecture/    ← from app/README.md, split by topic (see below)
docs/decisions/       ← this file and its siblings
design/               ← accepted wireframes + the assets they actually load
samples/               build_samples.py, annotate.py, README.md, the sample .db files
site/                 ← from app/site/
app/                  ← the SvelteKit app (app/src/lib/ untouched for now — the
                         platform split is separate work that comes after this
                         tree is settled and verified)
working/              ← private. Gitignored, and its own private repo.
```

`working/` receives `STATUS.md`, `working notes/`, the superseded wireframes
(everything below G1 in STATUS.md's register, plus `wireframes/assets/` —
none of it is loaded by an accepted wireframe), and `index-draft.html`. The
old prototype folder is left untouched as a fallback, to be retired by
AwesomeAtti, not by this migration.

`docs/architecture/` is not a straight file-for-file move of
`app/README.md`: roughly half of that document was cross-cutting
(conventions, icons, locales, the layout-geometry pattern, the 800×600
floor, the no-scroll shell, offline behaviour, testing notes) rather than
specific to one workspace, so it is split into topic docs rather than four
workspace docs. See `docs/architecture/overview.md` for the index.

Which wireframes are "accepted" is decided from STATUS.md's Register (the
G1/G2/G3 table), not from filenames or from the separate "Accepted
wireframes" table further down that file, which turned out to be stale and
missing several items the Register itself shows as gated. Two edge cases
from that reconciliation are recorded as their own ADRs: 0002 (a wireframe
that passed G1 but whose design was later withdrawn from the build) and
0003 (three foundational wireframes whose G1 the Register itself flags as
unconfirmed).

`package.json`'s `name` becomes `plyvio`. Nothing else renames yet — the
Tauri identifier and the repository name are separate decisions, made later
and by AwesomeAtti.

## Consequences

- The public tree (everything outside `working/`) is navigable by someone
  who was not present for the prototype's history: specification in
  `docs/spec/`, why the code looks the way it does in `docs/architecture/`,
  why the project is shaped the way it is in `docs/decisions/`, and what's
  actually current in `design/`.
- `working/` carries the messy, honest record (STATUS.md's gate history,
  rejected explorations, in-progress notes) without that history leaking
  into the material other people or tools will read.
- `app/src/lib/` is intentionally not touched by this migration. Any
  reasoning about the eventual platform split belongs to that later work,
  not to this one.
