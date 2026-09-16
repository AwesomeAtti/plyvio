<script>
  /**
   * Evaluation Timeline — the Section drawn in `wireframes/game-eval-timeline.html`.
   * G1 and G2 granted 13 Sep. It has no clause yet, so nothing here cites one.
   *
   * It is a TRANSPORT CONTROL that happens to be a chart. Press anywhere to jump,
   * hold and move to scrub. The curve is what makes the transport worth having:
   * you seek by the shape of the game, the way a video scrubber is seeked by the
   * shape of the picture.
   *
   * Two measurements decide most of what follows.
   *
   * HORIZONTALLY the track is the whole game, 0 to N plies, first and last stop
   * flush to the edges. N + 1 stops, because the starting position is one of them.
   * Nothing scrolls and nothing zooms, so a long game gets less than 2px a ply and
   * the control cannot be aimed at one — which is why it does not try. The timeline
   * is coarse navigation and the Move List is fine navigation, and because it cannot
   * land exactly it says where it will land before it lands (the preview).
   *
   * VERTICALLY it is the Evaluation Bar laid on its side and swept through the game:
   * the same evalFraction(), so at the playhead the boundary here and the divider
   * there describe one number. It flips with the board for that reason — the bar
   * flips (§5.4.1), and if this did not, the two would disagree about which end is
   * White's the moment the board was flipped.
   *
   * Nothing in the plot is drawn per-ply. At the long end of a real corpus the stops
   * are ~1.3px apart, so markers or dots would be noise; the curve is a shape.
   */
  import {
    trackX, plyAtX, evaluatedRuns, areaPath, regionsOf, moveNumberOf
  } from '$lib/game/timeline.js';
  import { t } from '$lib/stores/i18n.js';

  let {
    plies = [],
    ply = 0,
    orientation = 'white',
    /**
     * Optional { middle, end } ply numbers for the three regions.
     *
     * The Section READS these; it does not compute them. Where they come from is
     * still being researched, and nothing here changes when it is settled — two
     * numbers and the regions draw, no numbers and they do not. There is no
     * fallback to equal thirds, because thirds would be the application claiming
     * a phase boundary it has not earned.
     */
    bounds = null,
    onselect
  } = $props();

  let box = $state(null);
  let w = $state(0);
  let h = $state(0);
  let hover = $state(null);
  let tipW = $state(0);
  let dragging = $state(false);

  const N = $derived(Math.max(0, plies.length - 1));
  const flipped = $derived(orientation === 'black');

  const xOf = (i) => trackX(i, N, w);

  const runs = $derived(evaluatedRuns(plies.slice(0, N + 1)));

  const regions = $derived.by(() =>
    regionsOf(bounds, N, w).map((r) => ({ ...r, label: $t(`game.timeline.${r.key}`) }))
  );

  const moveNo = moveNumberOf;
  const sanOf = (i) => plies[i]?.s ?? null;

  // Edge inset for the preview plate, the same 4px it sits below the top edge.
  const TIP_INSET = 4;

  // White "12.e4", Black "12…Nf6" — the single ellipsis character, as the Move
  // List and Game Controls number Black's ply. The move only — the curve under
  // the pointer already shows the evaluation.
  const preview = $derived.by(() => {
    const i = hover;
    if (i === null || i === undefined || !w) return null;
    const text = i === 0
      ? $t('game.timeline.start')
      : `${moveNo(i)}${i % 2 ? '.' : '…'}${sanOf(i) ?? ''}`;
    // Centred on the stop, then held inside the Section so a stop near either
    // end does not push the plate past the edge (where overflow would clip it).
    const centred = xOf(i) - tipW / 2;
    const max = Math.max(TIP_INSET, w - tipW - TIP_INSET);
    return { left: Math.min(Math.max(centred, TIP_INSET), max), text };
  });

  function plyAt(clientX) {
    if (!box || N < 1) return 0;
    const r = box.getBoundingClientRect();
    return plyAtX(clientX - r.left, r.width, N);
  }

  function down(ev) {
    if (N < 1) return;
    box?.setPointerCapture?.(ev.pointerId);
    dragging = true;
    const i = plyAt(ev.clientX);
    hover = i;
    onselect?.(i);
  }

  function move(ev) {
    const i = plyAt(ev.clientX);
    hover = i;
    // Coalesced by the browser to one event a frame, so a fast drag across a long
    // game does not queue a board render per ply.
    if (dragging) onselect?.(i);
  }

  function up(ev) {
    if (!dragging) return;
    dragging = false;
    box?.releasePointerCapture?.(ev.pointerId);
  }
</script>

<!--
  No tabindex and no key handling. Arrow keys already step the game (§5.3), and a
  focusable slider here would put a second owner on the same keys for the same
  state. This is a pointer affordance over navigation the keyboard already drives.
-->
<div
  class="tl"
  class:dragging
  bind:this={box}
  bind:clientWidth={w}
  bind:clientHeight={h}
  role="img"
  aria-label={$t('game.timeline.label')}
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  onpointerleave={() => { if (!dragging) hover = null; }}
>
  {#if w > 0 && h > 0}
    <svg class="plot" width={w} height={h} aria-hidden="true">
      <rect class="gnd" class:flip={flipped} x="0" y="0" width={w} height={h} />

      {#each runs as run, k (k)}
        <path class="fill" class:flip={flipped} d={areaPath(run, plies, { w, h, n: N, flipped })} />
      {/each}

      {#each regions as r (r.key)}
        {#if r.overlay}<rect class="ovl" x={r.x} y="0" width={r.w} height={h} />{/if}
      {/each}
      {#each regions as r (r.key)}
        {#if r.x > 0}<line class="ovd" x1={r.x} y1="0" x2={r.x} y2={h} />{/if}
      {/each}

      <!-- Dead even. Horizontal here, the same line §5.4.1 puts across the bar. -->
      <line class="even" x1="0" y1={h / 2} x2={w} y2={h / 2} />

      <line class="head" x1={xOf(ply)} y1="0" x2={xOf(ply)} y2={h} />
      <rect class="knob" x={xOf(ply) - 3.5} y={h - 7} width="7" height="7" rx="1.5" />
    </svg>

    {#each regions as r (r.key)}
      <span class="rlab" style="left:{r.x + r.w / 2}px">{r.label}</span>
    {/each}

    {#if preview}
      <span class="tip" style="left:{preview.left}px" bind:clientWidth={tipW}>{preview.text}</span>
    {/if}
  {/if}
</div>

<style>
  .tl {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;
    cursor: default;
    touch-action: none;
    background: var(--eval-black);
  }
  .tl.dragging { cursor: grabbing; }

  .plot { display: block; }

  /* Ground is the side at the TOP; the filled area is the side at the bottom.
     Flipping swaps both, exactly as the bar does. */
  .gnd { fill: var(--eval-black); }
  .gnd.flip { fill: var(--eval-white); }
  .fill { fill: var(--eval-white); }
  .fill.flip { fill: var(--eval-black); }

  .even {
    stroke: rgba(128, 128, 128, .85);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }

  /* Neutral grey, not a tint: the overlay sits over both halves of a two-tone
     chart, and anything with a hue lightens one and muddies the other. */
  .ovl { fill: #808080; opacity: .19; }
  .ovd { stroke: #b9b9b4; stroke-width: 1; opacity: .55; }

  .head { stroke: var(--focus); stroke-width: 1.5; }
  .knob { fill: var(--focus); }

  /* On a plate, because the ground under a label is whichever side owns that
     part of the chart and the boundary between them moves. */
  .rlab, .tip {
    position: absolute;
    transform: translateX(-50%);
    pointer-events: none;
    white-space: nowrap;
    font: 8px/1 var(--mono);
    letter-spacing: .16em;
    text-transform: uppercase;
    color: #efedea;
    background: rgba(27, 27, 25, .44);
    padding: 2px 5px;
    border-radius: 2px;
  }
  .rlab { bottom: 4px; }

  .tip {
    top: 4px;
    font: 10px/1.3 var(--mono);
    letter-spacing: 0;
    text-transform: none;
    background: rgba(27, 27, 25, .88);
    padding: 3px 6px;
    border-radius: 3px;
    transform: none;
  }
</style>
