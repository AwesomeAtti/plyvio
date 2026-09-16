# 0002 — BX-1b (regions and boxing) withdrawn from the Moves Section

## Status

Accepted — originally decided during the prototype's build (13 Sep, per
`working/STATUS.md`), recorded as an ADR during the plyvio migration,
2026-09-16.

## Context

`working/wireframes/game-moves-regions.html` Rev B passed G1 and G2
explicitly on 13 Sep: an open move in the Moves Section was drawn as one
bordered, rounded box, with its comment region sharing the box's top border
rather than sitting as a separate card beneath it — a 3px left spine and a
distinct ground so the comment read as the move expanded, not as something
new.

Building it exposed a problem the wireframe didn't have to account for: the
box is inset 4px, and the rows inside it need to give back 5px on each side
(the 4px margin plus the box's own 1px border) to stay aligned with every
unopened row's number gutter and trailing control. That arithmetic was
missed on the first implementation pass, which left the gutter and control
1px out of line whenever a move was open. A source-level test was added to
assert the arithmetic against the CSS itself, because jsdom has no layout
engine and could not have caught either this bug or an earlier alignment bug
in the same Section.

## Decision

Withdraw BX-1b from the build before it reached G3. Grouping an open move
with its comment is instead carried by ground (background) and rules
(borders/lines) rather than by a bordered, inset box — no compensating
inset arithmetic required. `docs/spec/5-game-workspace.md` §5.6.1 specifies
the ground/rules approach, not BX-1b.

`game-moves-regions.html` Rev B stays in `working/wireframes/`, not
`design/`: it is the record of an accepted-then-rejected direction, not a
drawing that explains the Moves Section as it stands today.

## Consequences

- A future contributor should not resurrect a bordered/inset treatment for
  an open move without a plan for the inset arithmetic that broke twice
  here — once missed entirely, once caught only by a source-level test
  because no rendering test could see it.
- The wireframe is preserved (in `working/`, not deleted) specifically so
  this reasoning has something concrete to point at, rather than only a
  prose description of a design nobody can see.
