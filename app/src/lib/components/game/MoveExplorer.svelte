<script>
  /**
   * Explorer — `wireframes/game-move-explorer.html` Rev B. G1 and G2 14 Sep.
   *
   * The Section answers one question: from the position on the board, what has
   * been played before, and how did those games end? One row per distinct legal
   * move played, ordered by share descending.
   *
   * IT REPORTS; IT DOES NOT NAVIGATE. No row is clickable, the played move
   * included, and the cursor stays the default arrow. Playing a move from here
   * means the board can show a position the game never reached, which makes the
   * workspace's primary state — the current ply — stop describing it. That is an
   * interactive analysis board, and it arrives with its own wireframe. The played
   * move is not made the exception: a list where one row of three answers a click
   * teaches that rows are clickable, and the other two then read as broken.
   *
   * EVERY NUMBER IN A ROW IS A PERCENTAGE OF SOMETHING DIFFERENT — share of the
   * position, then share of that move's decided games. Exactly one absolute
   * number is on screen and it is in the header.
   */
  import { t } from '$lib/stores/i18n.js';
  import { EXPLORER_MOVE_W, EXPLORER_SHARE_W, labelFits } from '$lib/game/explorer.js';

  let {
    rows = [],
    total = 0,
    library = null,
    loading = false,
    playedMove = null,
    moveNumber = 1,
    blackToMove = false
  } = $props();

  let body = $state(null);
  let barW = $state(0);
  let hover = $state(null);
  let hoverEl = null;          // the hovered row, for re-measuring on scroll
  let tipBelow = $state(false);

  /*
    The games tooltip sits above its row and flips below when the list's own top
    edge would clip it — the list scrolls, so it clips anything outside it. The
    test is the row's place in the visible list, not its index, so a row scrolled
    up to the top edge flips as the first row does.
    TIP_H is the plate's height from its CSS: 10px/1 type plus 3px padding twice.
    It overlaps the row by 3px, so it needs TIP_H - 3 of room above.
  */
  const TIP_H = 16;
  const TIP_OVERLAP = 3;

  function placeTip(row) {
    if (!body || !row?.isConnected) return;
    const room = row.getBoundingClientRect().top - body.getBoundingClientRect().top;
    tipBelow = room < TIP_H - TIP_OVERLAP;
  }

  /*
    The bar's width is measured, not assumed.
    §2 budgets it at 201px from a 360px Section less 3px of side borders — but
    GameSection draws no side borders, so the row actually has 339px to spend and
    the bar comes out at 203. Two pixels, and the fit rule moves from 10.4% to
    10.3%: immaterial to the design, but it has to be computed against the width
    the bar really has, or labels are decided against a number that is not true
    of the screen.
  */
  const seg = (s) => ({ ...s, label: s.pct > 0 && labelFits((s.pct / 100) * barW, s.pct) ? s.pct : null });

  const label = (row) => `${moveNumber}${blackToMove ? '…' : '.'}`;

  /**
   * Scrolled to on arrival, because at a ceiling of three the game's own move
   * may be below the fold. The board drives the Section, never the reverse.
   */
  $effect(() => {
    if (!body || !playedMove || !rows.length) return;
    // Same mechanism the Move List uses to keep the current ply in view: ask the
    // row to bring itself into view rather than computing an offset, which keeps
    // it right when the row height changes and costs nothing when it has not.
    body.querySelector(`[data-move="${CSS.escape(playedMove)}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  });

  const message = $derived.by(() => {
    if (!library) return $t('game.explorer.noLibrary');
    if (loading) return null;
    if (!rows.length) return $t('game.explorer.outOfBook');
    return null;
  });
</script>

{#if loading}
  <!-- Holds its last height rather than resizing on every ply; the status
       empties rather than showing a stale count. -->
  <div class="msg" aria-live="polite"></div>
{:else if message}
  <div class="msg">{message}</div>
{:else}
  <div
    class="body"
    bind:this={body}
    role="list"
    onscroll={() => { if (hover) placeTip(hoverEl); }}
  >
    {#each rows as row (row.move)}
      <div
        class="row"
        data-move={row.move}
        class:played={row.move === playedMove}
        class:hot={hover === row.move}
        role="listitem"
        aria-label={$t('game.explorer.rowLabel', { move: row.move, share: row.share, games: row.games })}
        onpointerenter={(ev) => { hover = row.move; hoverEl = ev.currentTarget; placeTip(hoverEl); }}
        onpointerleave={() => { hover = null; hoverEl = null; }}
      >
        <span class="mv" style="width:{EXPLORER_MOVE_W}px"
          ><span class="no">{label(row)}</span> {row.move}</span
        >
        <span class="sh" style="width:{EXPLORER_SHARE_W}px">
          {row.share}%
          {#if hover === row.move}
            <!-- One number, exact, no suffix. The row already shows the move, the
                 share and the results; a tooltip repeating them would be a second
                 copy of the row. Shown for the row, drawn over the percent because
                 it is the count behind it. -->
            <span class="tip" class:below={tipBelow}>{$t('game.explorer.games', { n: row.games })}</span>
          {/if}
        </span>

        <span class="bar" bind:clientWidth={barW}>
          {#each row.segments.map(seg) as s (s.key)}
            {#if s.drawn}
              <span class="sg {s.key}" style="width:{s.pct}%">
                {#if s.label !== null}<i>{s.label}</i>{/if}
              </span>
            {/if}
          {/each}
        </span>
      </div>
    {/each}
  </div>
{/if}

<style>
  /*
    3px above the rows and 2px below them, not 3 and 3. The Section's 1px bottom
    rule sits inside its height, so with 3 and 3 the rows were 1px taller than
    the body and a scrollbar appeared at every row count, including when all
    the moves fit. Counting the rule as the last pixel of the body padding keeps
    the height on the panel's row grid (30 + 6 + 24n) and shows exactly that
    many rows without scrolling. A fourth move still scrolls. Fixed 15 Sep.
  */
  .body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 3px 0 2px;
  }

  .msg {
    flex: 1;
    min-height: 0;
    display: grid;
    place-items: center;
    font-size: 12px;
    color: var(--muted);
    padding: 3px 10px;
    text-align: center;
  }

  .row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 24px;
    padding: 0 10px;
  }
  .row.hot { background: var(--chrome); }

  .mv {
    flex: none;
    font: 12px/1 var(--mono);
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* The ply number is context, the move is the content — the same relationship
     the Move List draws in its number gutter. */
  .mv .no { color: var(--faint); }
  .row.played .mv { font-weight: 600; }

  /* Full row height, so the tooltip anchored here measures from the row's edges. */
  .sh {
    flex: none;
    align-self: stretch;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    font: 11px/1 var(--mono);
    font-variant-numeric: tabular-nums;
    color: var(--ink-2);
  }

  .bar {
    flex: 1;
    min-width: 0;
    height: 16px;
    display: flex;
    overflow: hidden;
    /* In dark mode White's fill is the lightest thing in the panel and would
       otherwise bleed; in light mode Black's needs the same containment. */
    border: 1px solid var(--rule-strong);
    border-radius: 2px;
  }

  .sg {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    overflow: hidden;
  }
  /* Dedicated tokens, adjusted per theme and never swapped: a segment that
     inverted in dark mode would swap the two sides of every result here. */
  .sg.white  { background: var(--res-white); }
  .sg.draws  { background: var(--res-draw); }
  .sg.black  { background: var(--res-black); }

  .sg i {
    font: 11px/1 var(--mono);
    font-style: normal;
    font-variant-numeric: tabular-nums;
  }
  /* Contrast comes from the segment: the label is never a colour the fill
     beneath it does not support. */
  .sg.white i { color: var(--res-white-ink); }
  .sg.draws i { color: var(--res-draw-ink); }
  .sg.black i { color: var(--res-black-ink); }

  .tip {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(100% - 3px);
    z-index: 5;
    pointer-events: none;
    font: 10px/1 var(--mono);
    color: var(--surface);
    background: var(--ink);
    padding: 3px 6px;
    border-radius: 3px;
    white-space: nowrap;
  }
  .tip.below { bottom: auto; top: calc(100% - 3px); }
</style>
