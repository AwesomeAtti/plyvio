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
   * Pieces move from any position; a move played before the end of a line
   * starts a variation (§5.4.1, "Playing moves"). The `movable`/`dests`
   * prop pair comes from `stores/game.js`'s `moveInputs`, which is the one
   * place that decides whether THIS tab, THIS position, is a legal place to
   * move a piece at all — this component plays whatever it's handed and
   * nothing more.
   *
   * Promotion is the one piece of interaction this component owns outright
   * rather than reporting upward: chessground's own `movable.events.after`
   * fires once the piece has already been dropped, with no pause for a
   * choice, so the picker (`PromotionPicker.svelte`) has to sit here, between
   * that event and `onmove`, holding the move back until a piece is chosen.
   *
   * Chessground keeps its own `turnColor`, separate from `movable.color`:
   * `movable.color` says which side's pieces may move at all, `turnColor`
   * says whose turn it is. It uses the second to tell an ordinary move from
   * a premove, and to pick which king `check: true` highlights. Chessground
   * flips it after every drop, but nothing resets it when the position
   * changes by navigation, so it is read from the FEN on every push below —
   * on every board, movable or not. Left stale, a drag by the side to move
   * is handled as a premove: grey, unfiltered destinations, and no
   * `movable.events.after`.
   */
  import { onMount } from 'svelte';
  import { Chessground } from '@lichess-org/chessground';
  import { isPromotionMove, turnFromFen } from '$lib/game/moves.js';
  import PromotionPicker from './PromotionPicker.svelte';

  import '@lichess-org/chessground/assets/chessground.base.css';
  import '@lichess-org/chessground/assets/chessground.brown.css';
  import '@lichess-org/chessground/assets/chessground.cburnett.css';

  let {
    size = 360, fen, lastMove = null, check = false, orientation = 'white',
    shapes = [], onshapeschange = null, autoShapes = [],
    movable = false, dests = new Map(), turnColor = 'white', onmove = null
  } = $props();

  let el = $state(null);
  let api = null;

  /** `{from, to}` while the promotion picker is up; `null` the rest of the
      time. Squares only -- the piece choice comes back through the
      picker's own callback, not stored here. */
  let pendingPromotion = $state(null);

  function handleAfter(orig, dest) {
    if (isPromotionMove(fen, orig, dest)) {
      pendingPromotion = { from: orig, to: dest };
    } else {
      onmove?.(orig, dest, null);
    }
  }

  function choosePromotion(piece) {
    const move = pendingPromotion;
    pendingPromotion = null;
    onmove?.(move.from, move.to, piece);
  }

  /** The picker was dismissed without a choice -- chessground has already
      moved the pawn visually (its own optimistic update, ahead of anything
      `onmove` would do), and nothing recorded it, so the only way back is
      telling chessground the position again. */
  function cancelPromotion() {
    pendingPromotion = null;
    api?.set({ fen, lastMove: lastMove ?? undefined });
  }

  onMount(() => {
    api = Chessground(el, {
      fen,
      orientation,
      turnColor: turnFromFen(fen),
      lastMove: lastMove ?? undefined,
      check,
      /*
       * `viewOnly: true` looked like the right setting for a board that
       * doesn't move pieces (§5.3 — ply navigation is the only navigation),
       * but chessground's `bindBoard` returns before attaching ANY
       * board-level pointer listener when `viewOnly` is true (events.js) —
       * that includes the one `drawable` needs to start a shape, not just
       * the one piece dragging needs. Confirmed by testing: `drawable:
       * { enabled: true }` alone did nothing while `viewOnly` stayed true.
       * So `viewOnly` comes off, and "no piece movement" is enforced the
       * same way a movable-but-restricted board always does it elsewhere —
       * `movable`/`draggable` below — plus `selectable: { enabled: false }`,
       * which stops the one other viewOnly side effect: clicking a piece
       * still calls chessground's own `selectSquare` regardless of
       * `movable`, and would otherwise highlight it as if a move might
       * follow, which it can't.
       */
      viewOnly: false,
      selectable: { enabled: false },
      coordinates: true,
      // §5.4.1 — the Evaluation Bar sits to the board's left, so coordinates
      // render inside the squares rather than in an outside margin.
      coordinatesOnSquares: false,
      disableContextMenu: true,
      highlight: { lastMove: true, check: true },
      animation: { enabled: true, duration: 180 },
      /*
       * Drawing (arrows + square highlights) only — analysis test, no
       * persistence. `onChange` is chessground's own hook, firing with the
       * live shapes array on every draw/erase/Esc; the caller (GameView →
       * GameWorkspace) is the one that decides where that goes.
       *
       * `autoShapes` is chessground's own separate array for exactly this:
       * drawn like `shapes`, but with no `onChange` and no persistence path
       * at all — nothing the user does can turn one into a saved drawing,
       * which is what makes it the right primitive for the Engine Section's
       * hover preview (GameWorkspace derives it from the hovered line, never
       * from user input).
       */
      drawable: { enabled: true, shapes, autoShapes, onChange: (s) => onshapeschange?.(s) },
      movable: { free: false, color: undefined, showDests: true, events: { after: handleAfter } },
      draggable: { enabled: false },
      selectable: { enabled: false }
    });
    return () => { api?.destroy(); api = null; };
  });

  // One push per change. Chessground diffs internally, so handing it the whole
  // position each time is cheaper than it looks and avoids tracking what moved.
  // `drawable.shapes` rides along here too: chessground does not clear drawn
  // shapes on its own when the position changes, so without this line an
  // annotation drawn on one ply would keep showing on every ply after it.
  // `autoShapes` rides along for the same reason — GameWorkspace already
  // clears it on navigation, but nothing here should depend on that.
  $effect(() => {
    if (!api) return;
    // A move dragged into the promotion picker stays uncommitted, so
    // nothing else is draggable until it's resolved (chosen or cancelled) --
    // reading `pendingPromotion` here is what makes this effect rerun the
    // moment that happens, same as any other prop change below.
    const interactive = movable && !pendingPromotion;
    api.set({
      fen, orientation, turnColor: turnFromFen(fen), lastMove: lastMove ?? undefined,
      check, drawable: { shapes, autoShapes },
      movable: { color: interactive ? turnColor : undefined, dests: interactive ? dests : new Map() },
      draggable: { enabled: interactive },
      selectable: { enabled: interactive }
    });
  });

  /* Chessground reads its own element's box, so a resize needs an explicit
     redraw — the board is sized by the Game View, not by its own content. */
  $effect(() => {
    size;
    if (api) api.redrawAll();
  });
</script>

<div class="board-wrap" style="width:{size}px;height:{size}px">
  <div
    class="board"
    bind:this={el}
    style="width:{size}px;height:{size}px"
    aria-hidden="true"
  ></div>
  {#if pendingPromotion}
    <PromotionPicker
      {size}
      square={pendingPromotion.to}
      color={turnColor}
      {orientation}
      onchoose={choosePromotion}
      oncancel={cancelPromotion}
    />
  {/if}
</div>

<style>
  .board-wrap {
    /* Purely a positioning context for `PromotionPicker`, which sits over
       the board as a sibling of the chessground-owned `.board` element
       rather than a child of it -- chessground manages `.board`'s own DOM
       directly and would clobber anything Svelte rendered inside it. */
    flex: none;
    position: relative;
  }

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
