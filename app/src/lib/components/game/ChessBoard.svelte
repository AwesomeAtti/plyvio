<script>
  /**
   * Chess Board — §5.4.1.
   *
   * A thin wrapper over Chessground 10.1.1. Per the spec the board component
   * owns rendering, pieces, coordinates, highlighting and interaction; this
   * file owns none of that. It does exactly three things:
   *
   *   1. mounts Chessground into a square box the Game View has already sized,
   *   2. pushes position / orientation / highlight changes into it,
   *   3. tears it down.
   *
   * Note the package name: Chessground v10 is published as
   * `@lichess-org/chessground`. The unscoped `chessground` package stopped at
   * 9.2.1 and does not have this version.
   *
   * The board is viewOnly. §5.3 makes ply navigation the workspace's only
   * navigation, so pieces are not draggable — moving one would mean creating a
   * variation, which no Section specifies yet.
   */
  import { onMount } from 'svelte';
  import { Chessground } from '@lichess-org/chessground';

  import '@lichess-org/chessground/assets/chessground.base.css';
  import '@lichess-org/chessground/assets/chessground.brown.css';
  import '@lichess-org/chessground/assets/chessground.cburnett.css';

  let { size = 360, fen, lastMove = null, check = false, orientation = 'white' } = $props();

  let el = $state(null);
  let api = null;

  onMount(() => {
    api = Chessground(el, {
      fen,
      orientation,
      lastMove: lastMove ?? undefined,
      check,
      viewOnly: true,
      coordinates: true,
      // §5.4.1 — the Evaluation Bar sits to the board's left, so coordinates
      // render inside the squares rather than in an outside margin.
      coordinatesOnSquares: false,
      disableContextMenu: true,
      highlight: { lastMove: true, check: true },
      animation: { enabled: true, duration: 180 },
      drawable: { enabled: false },
      movable: { free: false, color: undefined },
      draggable: { enabled: false }
    });
    return () => { api?.destroy(); api = null; };
  });

  // One push per change. Chessground diffs internally, so handing it the whole
  // position each time is cheaper than it looks and avoids tracking what moved.
  $effect(() => {
    if (!api) return;
    api.set({ fen, orientation, lastMove: lastMove ?? undefined, check });
  });

  /* Chessground reads its own element's box, so a resize needs an explicit
     redraw — the board is sized by the Game View, not by its own content. */
  $effect(() => {
    size;
    if (api) api.redrawAll();
  });
</script>

<div
  class="board"
  bind:this={el}
  style="width:{size}px;height:{size}px"
  aria-hidden="true"
></div>

<style>
  .board {
    flex: none;
    /* Chessground positions absolutely inside this box; it must not be the
       thing that decides the size. */
    position: relative;
    box-shadow: 0 1px 3px rgba(0, 0, 0, .18);

    /* The coordinate label colors below (rank/file text) — chessground.
       brown.css's actual light/dark square colors, sampled off the
       rendered board, not guessed. Scoped as custom properties here rather
       than written as literals in the color rules so they read as named
       theme values and are a one-line change if the board's color theme
       (brown/blue/green) becomes selectable, or if these get promoted to
       app-wide tokens in app.css later — either just redefines these two
       names, nothing that reads them has to change. */
    --board-coord-light: #f0d9b5;
    --board-coord-dark: #c0ae91;
  }

  /* Chessground's own stylesheets (chessground.base.css) size and place the
     ranks/files coordinate labels for a board that reserves extra margin
     space around it. This board has no such margin — it is exactly the 8x8
     box — so those fixed-pixel rules (e.g. `left: 24px`, `top: -20px`) push
     the labels partly outside it instead of into the corner of the edge
     squares. These overrides replace the positioning with square-relative
     percentages so the labels stay inside the board at any size, and drop
     the uppercase transform so file letters read as lowercase (a-h), matching
     standard algebraic notation.

     Chessground colors each label to contrast with its own square by
     default (light text on a dark square, dark text on a light one); the
     color rule further down replaces that with the board's own two square
     colors, swapped, instead of touching this positioning.

     Chessground renders all of this directly into the bound element rather
     than through Svelte, so the selectors below must be :global. */
  :global(.board coords.ranks) {
    left: 0;
    top: 0;
    width: 12.5%;
    height: 100%;
    z-index: 3;
  }
  :global(.board coords.files) {
    left: 0;
    bottom: 0;
    width: 100%;
    height: 12.5%;
    text-transform: none;
    z-index: 3;
  }
  :global(.board coords coord) {
    display: flex;
    /* Fixed, not %: padding percentages always resolve against the
       containing block's WIDTH (a CSS quirk that applies even to top/bottom
       padding), which here is the full board width, not this square's own
       size — so a percentage inset would land much bigger on a small board
       than a large one relative to the square it sits in. */
    padding: 4px;
    opacity: 1;
    font-weight: 700;
    /* A text line's box is taller than its glyphs (font leading/descender
       space baked into the default line-height), so flex-end alignment on
       the cross axis puts that extra space below the visible character
       instead of the character itself sitting flush — the letter reads as
       floating above the corner rather than sitting in it. Collapsing
       line-height to 1 removes that slack. */
    line-height: 1;
  }
  :global(.board coords.ranks coord) {
    align-items: flex-start;
    justify-content: flex-start;
    transform: none;
  }
  :global(.board coords.files coord) {
    align-items: flex-end;
    justify-content: flex-end;
  }

  /* Use the board's own two square colors for the labels (see the
     --board-coord-* tokens above), swapped: a label sitting on a light
     square is colored with the dark square's shade (and vice versa), so it
     reads as "the other square color" rather than an unrelated gray/white.

     Neither chessground's `coord-light`/`coord-dark` classes (see wrap.ts)
     nor its own default-color stylesheet rule could be reused as-is here:
     both just mark alternation along each axis, not the square's actual
     color, and — because rank 1 and file a start from the same a1 corner
     but count along different axes — "odd" lands on the dark square for
     both ranks and files. Copying the theme stylesheet's rank/file split
     (it uses *opposite* odd/even between the two axes) put rank 1's label
     in the exact same color as its own dark a1 square, i.e. invisible.
     What's below was checked directly against the rendered board instead:
     for both axes, `:nth-child(odd)` (index 1: rank 1, file a) is the dark
     a1 square, so it takes the light token, and `:nth-child(even)` takes
     the dark one. `.orientation-black` mirrors the same odd/even swap the
     theme stylesheet uses for a flipped board, though only orientation-white
     (the default) has been checked against the live board. `!important`
     because the theme stylesheet's own rule has equal-or-higher specificity
     and would otherwise win on source order. */
  :global(.board.orientation-white coords.ranks coord:nth-child(odd)),
  :global(.board.orientation-white coords.files coord:nth-child(odd)),
  :global(.board.orientation-black coords.ranks coord:nth-child(even)),
  :global(.board.orientation-black coords.files coord:nth-child(even)) {
    color: var(--board-coord-light) !important;
  }
  :global(.board.orientation-white coords.ranks coord:nth-child(even)),
  :global(.board.orientation-white coords.files coord:nth-child(even)),
  :global(.board.orientation-black coords.ranks coord:nth-child(odd)),
  :global(.board.orientation-black coords.files coord:nth-child(odd)) {
    color: var(--board-coord-dark) !important;
  }
</style>
