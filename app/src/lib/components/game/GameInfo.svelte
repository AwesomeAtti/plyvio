<script>
  /**
   * Game Info — §5.6.5. Drawn in wireframes/game-info-g1.html; G1 granted.
   *
   * THE SCOREBOARD CARD (GI-C5), ON THE PANEL'S ROW GRID.
   *
   *   names                      who played
   *   rating · result · rating   what happened
   *   favourite · date · site    when and where
   *   chips                      the user's marks, when there are any
   *
   * The order is the ranking, literally: player names outrank result, which
   * outranks date played, which outranks location played. Ratings are drawn
   * beside the name they belong to and never at the weight of a ranked field —
   * a rating is a property of a player, not a fact about the game.
   *
   * EXACTLY TWO HEIGHTS, three rows or four. The chip rail is one line that
   * scrolls SIDEWAYS rather than wrapping, so a fourth tag costs nothing and no
   * height between the two is reachable. That is why the Section declares a
   * floor and a ceiling one row apart rather than "sized to content".
   */
  import { t } from '$lib/stores/i18n.js';
  import { SECTION_ROW_H } from '$lib/game/layout.js';
  import { formatGameDate } from '$lib/game/info.js';
  import Icon from '$lib/components/Icon.svelte';
  import { Favorites, GameDate, GameSite, TagIcon, Collection } from '$lib/icons.js';

  let { info = null, onfavourite, onedittags } = $props();

  const date = $derived(formatGameDate(info?.date, (k) => $t(k)));
  const chips = $derived(info?.chips ?? []);
</script>

<div class="gi" style="--row:{SECTION_ROW_H}px">
  <!-- Row 1. Each name truncates independently with an ellipsis and carries the
       full value in a tooltip, matching the Section Header's own degradation
       rule. The row cannot assume a comma: an online source gives a handle
       where a classical record gives `Lastname, Firstname`. -->
  <div class="row names">
    <span class="nm" class:unknown={!info?.white} title={info?.white ?? ''}>
      {info?.white ?? $t('game.info.playerUnknown')}
    </span>
    <span class="nm right" class:unknown={!info?.black} title={info?.black ?? ''}>
      {info?.black ?? $t('game.info.playerUnknown')}
    </span>
  </div>

  <!--
    Row 2. An equal 1fr · auto · 1fr grid, so the result sits on the card's
    centre line regardless of how wide the two ratings are. Centring by flex
    would let a four-digit rating opposite a blank pull it off-centre, which is
    visible the moment two games are compared.

    The result is the PLAIN PGN FORM — 1-0, 0-1, 1/2-1/2 — not §5.4.1's ½-½
    substitution used elsewhere in the application. This card reads the game's
    record, and the record says 1/2-1/2.
  -->
  <div class="row score">
    <span class="elo">{info?.whiteElo ?? ''}</span>
    {#if info?.result}
      <span class="mark">{info.result}</span>
    {:else}
      <span class="mark unknown">{$t('game.info.resultUnknown')}</span>
    {/if}
    <span class="elo right">{info?.blackElo ?? ''}</span>
  </div>

  <!--
    Row 3. The favourite leads, then date and location. Measured at zero cost:
    the star rides in space the row already had.

    A PGN `?` is never shown verbatim — it becomes a plain-language absence,
    dimmed, so a missing value reads as missing rather than as a fourth data
    point. The favourite is only drawn where there is a library row to write it
    to; a game not opened from a library has nothing to mark.
  -->
  <div class="row meta">
    {#if info?.hasRow}
      <button
        class="fav"
        class:on={info.favorite}
        type="button"
        aria-pressed={info.favorite}
        aria-label={info.favorite ? $t('game.info.unfavourite') : $t('game.info.favourite')}
        onclick={() => onfavourite?.()}
      ><Icon icon={Favorites} size={13} /></button>
    {/if}

    <span class="mi" class:unknown={!date}>
      <Icon icon={GameDate} size={13} />{date ?? $t('game.info.dateUnknown')}
    </span>
    <span class="mi" class:unknown={!info?.site}>
      <Icon icon={GameSite} size={13} />{info?.site ?? $t('game.info.siteUnknown')}
    </span>
  </div>

  {#if chips.length}
    <!--
      Row 4 — the chip rail (GI-T2 option d).

      ONE LINE THAT SCROLLS SIDEWAYS. Not wrapping, not capped to a count, not a
      boxed tray that scrolls vertically: those were the three alternatives and
      each either changes the Section's height with the data or hides how many
      there are. Precedented by the Tab Strip's own overflow (§2.1.3–.4), and
      like it there are no ◀ ▶ controls — wheel and trackpad only.

      Pressing the rail opens the Edit dialog scrolled to Tags and Collections,
      which is where they are changed. The rail reports; it does not edit.
    -->
    <div class="row railrow">
      <button
        class="rail"
        type="button"
        aria-label={$t('game.info.editTags')}
        onclick={() => onedittags?.()}
      >
        <span class="inner">
          {#each chips as c (c.kind + c.id)}
            <span class="chip">
              <Icon icon={c.kind === 'tag' ? TagIcon : Collection} size={10} />{c.name}
            </span>
          {/each}
        </span>
      </button>
      <!-- Outside the scrolling box, so it stays over the rail's trailing edge
           rather than travelling with the chips. As a sibling INSIDE the rail it
           sat after the last chip instead of on top of it, and never appeared. -->
      <span class="fade" aria-hidden="true"></span>
    </div>
  {/if}
</div>

<style>
  /*
    3px top and bottom is the grid's body padding; every row is exactly one
    grid unit. Nothing here may use a margin — a margin between rows would put
    the card between two rows of the grid, which is the shape the Engine's old
    fixed 104 had and the reason the grid was written down.
  */
  .gi {
    flex: 1;
    min-height: 0;
    padding: 3px 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .row {
    flex: none;
    height: var(--row);
    display: flex;
    align-items: center;
    min-width: 0;
  }

  /* ---------------------------------------------------- row 1, the names */

  .names { justify-content: space-between; gap: 10px; }

  .nm {
    flex: 1;
    min-width: 0;
    font: 600 13px/1.2 var(--sans);
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .nm.right { text-align: right; }

  /* --------------------------------------------- row 2, ratings + result */

  .score {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 8px;
  }

  .elo {
    font: 11.5px/1 var(--mono);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .elo.right { text-align: right; }

  .mark {
    font: 700 15px/1 var(--mono);
    color: var(--ink);
    white-space: nowrap;
  }

  /* ------------------------------------------------ row 3, date and site */

  .meta {
    justify-content: center;
    gap: 14px;
    border-top: 1px solid var(--rule);
  }

  .mi {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font: 11.5px/1 var(--sans);
    color: var(--muted);
    white-space: nowrap;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .fav {
    flex: none;
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 3px;
    background: none;
    color: var(--faint);
    cursor: default;
  }
  .fav:hover { color: var(--ink); background: var(--chrome); }
  .fav:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }
  .fav.on { color: var(--accent, #8a5a1c); }
  .fav.on :global(svg) { fill: currentColor; }

  /* An absent value, drawn as absent. Never the PGN placeholder itself. */
  .unknown { color: var(--faint); }

  /* ------------------------------------------------- row 4, the chip rail */

  /* The row owns the rule and the clipping; the button inside it scrolls. */
  .railrow {
    position: relative;
    overflow: hidden;
    border-top: 1px solid var(--rule);
  }

  .rail {
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: none;
    overflow-x: auto;
    overflow-y: hidden;
    cursor: default;
    text-align: left;
  }
  /* No visible thumb: the rail is one line inside a 24px row and a scrollbar
     would take a third of it. Same choice the Move List makes. */
  .rail::-webkit-scrollbar { width: 0; height: 0; }
  .rail { scrollbar-width: none; }
  .rail:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }

  .inner {
    display: flex;
    align-items: center;
    gap: 8px;
    width: max-content;
  }

  /*
    Option A, granted G1: roomier chips at no cost to the grid.

    11px of side padding and an 8px gap, up from 8 and 6. All of it horizontal
    — the chip stays 20.5px inside a 24px row, which leaves 1.75px above and
    below. Growing it vertically eats that clearance and the rail starts to
    look jammed against the meta row; the alternative drawn was a two-unit
    rail, which spends 24px at the Timeline's threshold rather than here.
  */
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex: none;
    padding: 4px 11px;
    border: 1px solid var(--rule-strong);
    border-radius: 10px;
    font: 10.5px/1 var(--sans);
    color: var(--muted);
    white-space: nowrap;
  }
  .chip :global(svg) { color: var(--faint); }

  /*
    The rail runs off the card's edge rather than stopping short, so the fade is
    what says there is more — the same job the Tab Strip's overflow markers do,
    at a scale too small for markers.

    Absolutely positioned against the ROW, not the scrolling box. Inside the
    rail it would be laid out after the last chip and scroll away with it, which
    is exactly what it did before this.
  */
  .fade {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 22px;
    background: linear-gradient(to right, transparent, var(--surface));
    pointer-events: none;
  }
</style>
