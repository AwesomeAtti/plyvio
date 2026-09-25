<script>
  /**
   * The promotion piece choice — Stage 4 of `analysis-board-plan.md`.
   *
   * `ChessBoard.svelte` shows this OVER the board the moment a pawn is
   * dropped on the far rank, before the move is finalized: chessground has
   * already moved the pawn there visually, but nothing is recorded (no
   * `onmove`, no `api.set` beyond what chessground did on its own) until a
   * piece is chosen here.
   *
   * Four plain squares, not chessground pieces: piece rendering only
   * exists inside chessground's own DOM (`@lichess-org/chessground`'s
   * sprite CSS targets its own markup), and reproducing that coupling here
   * for four icons was worse than four Unicode glyphs styled to match.
   *
   * Stacks toward the middle of the board from the promotion square, the
   * same direction lichess and every other UI place it — the four squares
   * a piece choice ever needs are always free, because nothing can be
   * standing on the promoting pawn's own file that close to the edge once
   * it's the one about to promote there.
   */
  let {
    size, square, color, orientation = 'white',
    onchoose = null, oncancel = null
  } = $props();

  const PIECES = ['queen', 'rook', 'bishop', 'knight'];
  const GLYPH = {
    white: { queen: '♕', rook: '♖', bishop: '♗', knight: '♘' },
    black: { queen: '♛', rook: '♜', bishop: '♝', knight: '♞' }
  };

  /*
   * $derived, not const: `square`/`orientation` are reactive props, and
   * though this component is normally torn down and recreated fresh for
   * each promotion (ChessBoard's own `{#if pendingPromotion}`), the board
   * can still be flipped while the picker is up -- `flipBoard` isn't
   * gated on it -- so `orientation` (and, if this component were ever
   * reused across promotions instead of recreated, `square`) do need to
   * stay live rather than freezing at mount (Svelte's own
   * `state_referenced_locally` warning, fixed 25 Sep).
   */
  const file = $derived(square.charCodeAt(0) - 97); // 'a' -> 0
  const rank = $derived(Number(square[1]) - 1); // '1' -> 0
  const col = $derived(orientation === 'white' ? file : 7 - file);
  const destRow = $derived(orientation === 'white' ? 7 - rank : rank);
  const rows = $derived(destRow === 0 ? [0, 1, 2, 3] : [3, 2, 1, 0].map((n) => 7 - n));

  const square$ = (s) => s / 8;

  function choose(piece) {
    onchoose?.(piece);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); oncancel?.(); }
  }

  function onScrimClick() {
    oncancel?.();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<!-- Catches a click anywhere off the four squares as a cancel; the squares
     themselves stop that click from reaching it (see below). -->
<div class="scrim" onpointerdown={onScrimClick} role="presentation"></div>

<div class="picker" style="width:{size}px;height:{size}px" role="menu" aria-label="Choose promotion piece">
  {#each PIECES as piece, i (piece)}
    <button
      type="button"
      role="menuitem"
      class="choice"
      style="width:{square$(size)}px;height:{square$(size)}px;left:{col * square$(size)}px;top:{rows[i] * square$(size)}px;font-size:{square$(size) * 0.62}px"
      onpointerdown={(e) => e.stopPropagation()}
      onclick={() => choose(piece)}
      aria-label={piece}
    >{GLYPH[color][piece]}</button>
  {/each}
</div>

<style>
  .scrim {
    position: absolute;
    inset: 0;
    z-index: 9;
  }

  .picker {
    position: absolute;
    inset: 0;
    z-index: 10;
    pointer-events: none;
  }

  .choice {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    border: none;
    background: var(--paper, #fff);
    box-shadow: 0 1px 4px rgba(0, 0, 0, .35);
    line-height: 1;
    cursor: pointer;
  }

  .choice:hover, .choice:focus-visible {
    background: var(--accent-soft, #dbe7ff);
    outline: none;
  }
</style>
