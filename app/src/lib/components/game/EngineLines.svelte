<script>
  /**
   * Engine Section, the body — `wireframes/game-engine.html` Rev A. G1 and G2
   * 21 Sep.
   *
   * Named for what it draws rather than for the Section, because Settings
   * already has an `EngineSection.svelte` — that one is the Engines page of
   * Settings (§3.4.8.2), a different thing entirely, and two files under one
   * name is how the wrong one gets edited.
   *
   * A LIVE VIEW OF THE POSITION ON THE BOARD. It reports what an engine makes of
   * this position while it is running, and nothing else: it does not read the
   * game's `[%eval]`, does not write one, and does not walk the game. That other
   * thing — computing evaluations across a whole game — is a separate feature
   * with its own wireframe, and this Section's design does not assume it.
   *
   * IT REPORTS; IT DOES NOT NAVIGATE (Q4). No row is clickable and the cursor
   * stays the default arrow, the same rule the Explorer already follows.
   * Clicking a line to play it onto the board means the board can show a
   * position the game never reached, which is the interactive analysis board on
   * the roadmap, not this.
   *
   * FOUR STATES, all drawn: no engine configured (EN-04), off with nothing ever
   * computed (EN-01), running (EN-02), and off with the last result retained
   * (EN-06). The fourth is why `running` and "has rows" are separate questions:
   * turning the toggle off stops the search and dims what it found; it does not
   * clear it. Leaving the position clears it — that is the shell's business, not
   * this component's.
   */
  import { t } from '$lib/stores/i18n.js';
  import { evalScore } from '$lib/game/layout.js';
  import { formatPv, formatDepth } from '$lib/game/engine.js';

  let {
    lines = [],
    running = false,
    hasEngine = true,
    hasMoves = true,
    moveNumber = 1,
    blackToMove = false,
    onsettings
  } = $props();

  const pv = (line) => formatPv(line.pv, moveNumber, blackToMove);
</script>

{#if !hasEngine}
  <!-- EN-04. The same shape as the Explorer's "No library selected": the body
       states what is missing and the way out names its destination. -->
  <div class="quiet">
    {$t('game.engine.noEngine')} ·
    <button class="lnk" type="button" onclick={() => onsettings?.()}>{$t('game.engine.addOne')}</button>
  </div>
{:else if !hasMoves}
  <!-- Not drawn in Rev A, and reachable in the prototype: the last ply of a game
       that ended in mate or stalemate has no move to search. Saying so beats a
       toggle reading as running over an empty body. -->
  <div class="quiet">{$t('game.engine.noMoves')}</div>
{:else if !lines.length}
  <!-- EN-01. Off, and nothing has run here. The body says what the toggle does
       rather than sitting empty. -->
  <div class="quiet">{$t('game.engine.off')}</div>
{:else}
  <div class="body" class:stale={!running} role="list" aria-live="polite">
    {#each lines as line (line.rank)}
      <div
        class="row"
        class:top={line.rank === 1}
        role="listitem"
        aria-label={$t('game.engine.rowLabel', {
          rank: line.rank, score: evalScore(line), depth: line.depth, pv: pv(line)
        })}
      >
        <span class="rk">{line.rank}</span>
        <span class="sc">{evalScore(line)}</span>
        <!-- The depth REACHED, per line. The configured ceiling is a different
             number and lives in the options menu (Q5). -->
        <span class="dp">{formatDepth(line.depth)}</span>
        <span class="pv">{pv(line)}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  /*
    NO SCROLLING. The Section is sized to its lines (engineHeight), so it shows
    exactly the number of lines chosen in its options and there is nothing to
    scroll to. It was `overflow-y: auto`, and the 1px rules between rows made the
    content a few pixels taller than the body, which drew a scrollbar for
    nothing. Agreed 15 Sep.
  */
  .body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding: 3px 0;
  }

  /*
    EN-06 — stopped, not cleared. The toggle's position is the primary cue and
    this is the secondary one (§9.3: never colour, and never opacity, alone).
  */
  .body.stale { opacity: .5; }

  /*
    FLEX, NOT GRID. The Explorer's message box is a grid with one text child and
    centres it correctly; this one has two — the sentence and the shortcut — and
    a grid gives each its own implicit row, which stacked them and clipped the
    second against a 30px body at the Section's floor. They are one line.
  */
  .quiet {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0 4px;
    padding: 3px 12px;
    text-align: center;
    font-size: 12px;
    color: var(--muted);
  }

  .lnk {
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: default;
  }
  .lnk:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; border-radius: 2px; }

  /*
    24px rows on the Explorer's grid. Baseline alignment, because the score
    and the line are set at different sizes and it is the text that should line
    up, not the boxes.
  */
  .row {
    display: flex;
    align-items: baseline;
    height: 24px;
    padding: 0 10px;
    font: 12px/24px var(--mono);
  }
  .row + .row { border-top: 1px solid var(--rule); }

  /* Rank is context, like the Explorer's move number: present, not competing. */
  .rk {
    flex: none;
    width: 20px;
    font-size: 10px;
    color: var(--faint);
  }

  .sc {
    flex: none;
    width: 46px;
    font-weight: 600;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }

  .dp {
    flex: none;
    width: 34px;
    font-size: 10.5px;
    color: var(--faint);
  }

  /* Truncates rather than wrapping — a variation that wrapped would change the
     Section's height, which is allocated from the line count, not the text. */
  .pv {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--muted);
  }
  .row.top .pv { color: var(--ink-2); }
</style>
