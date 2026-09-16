<script>
  /**
   * A comment banner — §5.4.2, Moves.
   *
   * ONE BAR, NOT A ROW OF PILLS. A banner is a single discrete statement, so it gets a
   * single box. Two pills with a gap between them say "two unrelated tags"; a bordered
   * bar with a leading icon says "one reading, of this kind".
   *
   * TYPED BY ITS LEADING ICON, AND BY ITS GROUND. The icon is the first thing on the bar,
   * before any value, and the `kind` also picks the fill — so two banner kinds are
   * distinguishable without reading the glyph. Tint is finite in a 360px column that
   * already spends it on the Section, the move row, the open block and the comment
   * region: two kinds fit comfortably, and a fifth would have to fall back to the icon
   * alone. Adding a kind means adding a case here and nowhere else.
   *
   * THE VALUES HOLD THE ENDS, AND THEY ARE ALL THERE IS. An evaluation banner carries the
   * evaluation and the best move and nothing else: the one leads, the other is pushed to
   * the trailing edge by the spacer so it holds a column down a stack of banners.
   *
   * The engine and its depth used to follow the evaluation in muted parentheses, on every
   * banner in the game. They are a property of the document, not of a position — one
   * [%engine] governs every evaluation in the file — so they are stated once, in the game
   * comment at the top of the Section, and the repetition is gone from here. Provenance
   * asserted on each statement was both a waste of a 360px column and a claim that it
   * could differ between moves, which it cannot.
   *
   * WEIGHT, NOT SIZE, DOES THE EMPHASIS. Only the evaluation and the move are bold. At
   * 10px with 2px padding the bar is 18.5px against a 26px move row, so opening a ply
   * costs less than adding a move to the list — measured, and the reason this is 10px
   * rather than the 11px the comment text uses. Below 10px the processor mark stops
   * reading as one and the minus stops reading as a minus.
   *
   * TWO DECIMALS AND A SIGN. The Evaluation Bar shows one decimal and no plus because its
   * label has 27px (§5.4.1). This has the width, so it shows what the document stores.
   * They can differ in the last digit; that is rounding, not disagreement.
   */
  import { evalScore } from '$lib/game/layout.js';
  import Icon from '$lib/components/Icon.svelte';
  import { EngineMark, BestMoveMark, VariationMark } from '$lib/icons.js';

  let {
    kind = 'engine', e = null, x = null, best = null, engine = null, line = null, date = null
  } = $props();

  const MARK = { engine: EngineMark, variation: VariationMark, game: EngineMark };

  /**
   * The game kind states the document's engine context and nothing else.
   *
   * It is the one banner that is not about a position: there is no evaluation to lead
   * with and no best move to hold the trailing edge, so the engine's name takes the
   * weight the evaluation carries elsewhere, and the depth and date follow it muted —
   * the same relationship, one level up.
   */
  const context = $derived.by(() => {
    const bits = [];
    if (engine?.depth !== null && engine?.depth !== undefined) bits.push(`d${engine.depth}`);
    if (date) bits.push(date);
    return bits.length ? bits.join(' \u00b7 ') : null;
  });

  /**
   * Mate is unsigned and absolute; the end it sits at carries the side, as on the bar.
   *
   * Moved to layout.js when the Timeline's header started printing the same value:
   * two components formatting one number independently is how they come to disagree.
   */
  const score = $derived(evalScore({ e, x }));

  /* The engine is read for the game kind alone; an evaluation banner states values only. */
</script>

<div class="ban {kind}">
  <span class="ico"><Icon icon={MARK[kind] ?? EngineMark} size={11} /></span>

  {#if kind === 'variation'}
    <span class="line">{line}</span>
  {:else if kind === 'game'}
    {#if engine?.name}<b class="val">{engine.name}</b>{/if}
    {#if context}<span class="att">{context}</span>{/if}
    <span class="sp"></span>
  {:else}
    {#if score}<b class="val">{score}</b>{/if}
    <span class="sp"></span>
    {#if best}
      <span class="best"><Icon icon={BestMoveMark} size={10} /><b>{best}</b></span>
    {/if}
  {/if}
</div>

<style>
  .ban {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 2px 7px;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--surface);
    font: 10px/1.25 var(--mono);
    color: var(--muted);
    margin-bottom: 3px;
  }
  .ban:last-child { margin-bottom: 0; }

  /* The kind picks the ground, so two banners are told apart without reading the icon. */
  .ban.variation {
    background: var(--chrome);
    border-color: var(--rule);
  }

  .ico { flex: none; display: inline-flex; color: var(--muted); }

  /* Only the two things worth reading carry weight. */
  .val { color: var(--ink); font-weight: 700; }
  .att { color: var(--faint); font-weight: 400; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sp { flex: 1; min-width: 6px; }

  .best {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--ink);
  }
  .best b { font-weight: 700; }

  .line { color: var(--ink); overflow-wrap: anywhere; }
</style>
