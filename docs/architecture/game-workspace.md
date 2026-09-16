# Game Workspace (§5)

Built from `wireframes/game-workspace-wireframes.html` (now
`design/game-workspace-wireframes.html`). Two regions: a flexible Game View
and a fixed 360px Game Details. The workspace itself never scrolls.

### The board is Chessground 10.1.1

**Note the package name.** Chessground v10 is published as
`@lichess-org/chessground`. The unscoped `chessground` package was rescoped and
stops at 9.2.1 — `npm install chessground@10.1.1` returns E404, which is a
confusing error for what is really a rename.

`src/lib/components/game/ChessBoard.svelte` is a thin wrapper. Per §5.4.1 the
board component owns rendering, pieces, **coordinates**, highlighting and
interaction; the wrapper owns none of that. It mounts Chessground into a square
box the Game View has already sized, pushes position changes in, and tears it
down.

The board is `viewOnly`. §5.3 makes ply navigation the workspace's only
navigation, so pieces are not draggable — moving one would mean creating a
variation, which no Section specifies yet.

All three Chessground stylesheets are bundled and every asset inside them is a
`data:` URI: 12 piece sprites and the board texture, 13 in all. Nothing is
fetched at runtime, so §1.1 holds. Chessground costs about **68KB** of the
installed payload, most of it the cburnett piece CSS.

### Geometry lives in `src/lib/game/layout.js`

Pure functions, no DOM, because vitest applies no stylesheets and computed
geometry is the only kind that can be asserted on. The components read these
values rather than re-deriving them.

```
board = min(gameViewWidth − 67, gameViewHeight − 32)
        67 = 16 padding + 27 bar + 8 gap + 16 padding
```

Game View floor 427px, board floor 360px, no board maximum. `427 + 360 = 787`
against the 800px window minimum leaves 13px, so a fixed Game Details can never
exceed 373px.

### The Evaluation Bar label

Fixed 27px wide — it never grows, with the board or anything else. The label is
**10px proportional sans, not the tabular monospace**: it aligns with nothing,
and proportional setting is what lets a signed value fit. Negatives are signed,
positives bare, mate renders `M<n>`, a mated position renders `#`.

The sign is the **hyphen-minus (U+002D, 0.399em)**, never U+2212 (0.600em). At
10px that difference is 2px in a 27px column, which is the margin between
`-M12` fitting and not. A typography pass that "corrects" this sign breaks the
layout, so `layout.js` says so at the point of use and a test asserts the code
point.

### Sections are placeholders, deliberately

§5.4.2 specifies the shell, not the Sections. `src/lib/game/sections.js`
declares only the contract each Section fills in — floor, height behaviour,
scrolling, header slots, hideability — and the bodies render as hatched
placeholders. Inventing contents would take design decisions that have not been
taken, in a prototype built to validate the shell around them.

Two values there are provisional and marked as such: **Move List absorbs
surplus**, and its 110px floor therefore sets where the shell starts to scroll.

**A finding from building it.** With the placeholder floors summing to 480px,
the full composition *fits* at the 800 × 600 minimum with 40px to spare:

```
600 window − 40 tab bar − 40 toolbar = 520 available
480 of floors                        =  40 headroom
```

So the shell's scrolling state is currently unreachable at any permitted window
size. That is a property of these placeholder floors, not of the design — 40px
of collective growth across five Sections brings it back, and whichever Section
is designed first will probably spend it. Both branches are implemented and
tested.

### Mock games, and no runtime chess engine

To regenerate the data, install chess.js transiently so it never enters
`package.json`:

```bash
npm i --no-save chess.js@1.4.0 && node scripts/gen-games.mjs && npm install
```

(The trailing `npm install` restores optional native bindings that `--no-save`
prunes; without it the next build fails on a missing rolldown binary.)

`scripts/gen-games.mjs` walks four real games with chess.js **at build time**
and writes `src/lib/game/games.js`: a FEN per ply, the from/to squares for
last-move highlighting, and a check flag. chess.js is not a dependency of the
app — the prototype ships plain data and Chessground renders it. A test asserts
it stays out of `package.json`.

The games are Kasparov–Topalov 1999, Morphy's Opera Game, Byrne–Fischer 1956 and
Fischer–Spassky 1972 game 6. Two end in mate — one by White, one by Black — so
the `M<n>` label path is exercised in both directions rather than assumed.

**The evaluation is not an engine assessment.** There is no engine here. It is
material balance plus a deterministic wobble, present so the bar has plausible
values to render, and labelled as such in the generator. It does reach beyond
±10 pawns, so the clamp is genuinely exercised.

Accepted wireframes: `design/game-workspace-wireframes.html`,
`design/game-moves-comments.html`, `design/game-eval-timeline.html`,
`design/game-move-explorer.html`, `design/game-engine.html`,
`design/game-info-g1.html`. `working/wireframes/game-moves-regions.html`
(BX-1b) is *not* among them — see
`docs/decisions/0002-bx-1b-regions-and-boxing-withdrawn.md`.
