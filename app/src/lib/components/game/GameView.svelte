<script>
  /**
   * Game View — §5.4.1.
   *
   * Exists to solve one problem: the Evaluation Bar must be exactly as tall as
   * the RENDERED board, and the board sizes itself to its container. One
   * component has to compute the board's pixel size and hand it to both
   * children. That is this component's whole job.
   *
   * It does not scroll (§5.5).
   */
  import { PAD, BAR_GAP, gameViewLayout } from '$lib/game/layout.js';
  import ChessBoard from './ChessBoard.svelte';
  import EvalBar from './EvalBar.svelte';

  let {
    position, live = null, orientation = 'white', evalVisible = true,
    shapes = [], onshapeschange = null,
    movable = false, dests = new Map(), turnColor = 'white', onmove = null
  } = $props();

  /*
    §5.4.1 and Q8 — what the bar is showing an evaluation OF.

    A live search for this position wins while it is running; otherwise the
    position's own `[%eval]`, or nothing. One or the other, never both: the bar
    holds one number and it has to be clear which question that number answers.
    `live` carries only the evaluation, so everything else the bar reads — the
    side to move, the position itself — still comes from the ply.
  */
  const evaluation = $derived(live ? { ...position, e: live.e, x: live.x } : position);

  let w = $state(0);
  let h = $state(0);

  const geom = $derived(gameViewLayout(w || 440, h || 560));
</script>

<div class="view" bind:clientWidth={w} bind:clientHeight={h} style="padding:{PAD}px">
  <!-- The assembly is centred on both axes; slack on the unconstrained axis
       becomes symmetric margin (§5.4.1). -->
  <div class="assembly" style="gap:{BAR_GAP}px">
    <EvalBar height={geom.board} position={evaluation} {orientation} visible={evalVisible} />
    <ChessBoard
      size={geom.board}
      fen={position.f}
      lastMove={position.m}
      check={!!position.k}
      {orientation}
      {shapes}
      {onshapeschange}
      {movable}
      {dests}
      {turnColor}
      {onmove}
    />
  </div>
</div>

<style>
  .view {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    /* §5.5 — the region never scrolls. Below the Game View's floor the
       assembly is clipped rather than shrunk; the window gate (§2.4) is what
       stops that from being reachable. */
    overflow: hidden;
    background: var(--paper);
  }

  .assembly {
    flex: none;
    display: flex;
    align-items: stretch;
  }
</style>
