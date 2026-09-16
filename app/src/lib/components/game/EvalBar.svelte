<script>
  /**
   * Evaluation Bar — §5.4.1.
   *
   * Fixed 27px wide. It never grows: not with the board, not with the window.
   * Its height is exactly the board's, top and bottom aligned, and it flips
   * with the board so a player's colour keeps its end.
   *
   * The slot is permanently reserved. When `visible` is false this renders
   * nothing INTO the slot but the slot itself stays — the board must not move
   * because the bar was hidden.
   */
  import { BAR_W, evalFraction, evalLabel, evalSide } from '$lib/game/layout.js';

  let { height = 360, position = null, orientation = 'white', visible = true } = $props();

  const known = $derived(!!position && (position.e != null || position.x != null));
  const whiteFrac = $derived(known ? evalFraction(position) : 0.5);
  const label = $derived(known ? evalLabel(position) : null);
  const side = $derived(known ? evalSide(position) : 'white');

  // White's end is the bottom of the board in the default orientation, the top
  // when flipped. The bar is drawn top-down, so this is the black share.
  const flipped = $derived(orientation === 'black');
  const topFrac = $derived(flipped ? whiteFrac : 1 - whiteFrac);

  const labelAtTop = $derived(flipped ? side === 'white' : side === 'black');
</script>

<div class="bar" style="height:{height}px;width:{BAR_W}px" aria-hidden="true">
  {#if visible}
    {#if known}
      <div class="fill {flipped ? 'w' : 'b'}" style="height:{topFrac * 100}%"></div>
      <div class="fill {flipped ? 'b' : 'w'}" style="height:{(1 - topFrac) * 100}%"></div>
      <div class="even"></div>
      {#if label}
        <span class="lab" class:top={labelAtTop} class:onDark={labelAtTop !== flipped}>{label}</span>
      {/if}
    {:else}
      <!-- No evaluation available: one neutral fill. No divider, no number —
           an empty bar at 50% would read as "equal", which is a claim. -->
      <div class="unknown"></div>
    {/if}
  {/if}
</div>

<style>
  .bar {
    flex: none;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--rule-strong);
    background: var(--chrome);
  }

  .fill { flex: none; }
  .fill.w { background: var(--eval-white); }
  .fill.b { background: var(--eval-black); }
  .unknown {
    flex: 1;
    background: repeating-linear-gradient(
      135deg, var(--chrome), var(--chrome) 5px, var(--chrome-2) 5px, var(--chrome-2) 6px
    );
  }

  /* Dead even, so distance from equality is readable without the number. */
  .even {
    position: absolute;
    left: 0; right: 0; top: 50%;
    border-top: 1px dashed rgba(128, 128, 128, .85);
    pointer-events: none;
  }

  /*
    §5.4.1 — 10px PROPORTIONAL sans, deliberately not the tabular monospace
    used elsewhere for numbers. This label aligns with nothing, and proportional
    setting is what lets a signed value fit 27px. The sign in the string is the
    hyphen-minus (0.399em), not U+2212 (0.600em); swapping them costs 2px and
    breaks the fit.
  */
  .lab {
    position: absolute;
    left: 0; right: 0;
    bottom: 3px;
    font: 10px/1 var(--sans);
    font-variant-numeric: proportional-nums;
    text-align: center;
    color: var(--eval-black);
    pointer-events: none;
  }
  .lab.top { top: 3px; bottom: auto; }
  .lab.onDark { color: var(--eval-white); }
</style>
