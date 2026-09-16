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
  }
</style>
