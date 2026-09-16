<script>
  /**
   * Moves — the §5.4.2 Section.
   *
   * Two columns and a number gutter, which is what this Section was before it was
   * replaced by a placeholder, and what every desktop chess GUI uses. The layout is
   * scannable rather than dense on purpose: the eye finds move 24 by counting down a
   * column, not by reading a paragraph.
   *
   * WIDTH. Game Details is 360px, and every row uses all of it. 12px of air on each
   * side, a 36px number gutter, two move columns, and a 40px trailing track holding the
   * comment control.
   *
   * The gutter is 36px because "136…" is 28.8px at 12px mono — move 136 is the longest
   * number in the sample corpus, at 271 plies — and it needs its 6px of trailing padding
   * as well. The old 30px was sized on the number alone and forgot the padding, so from
   * move 10 the number ate its own leading inset and from move 100 it ran off the edge.
   *
   * THE SCROLLBAR IS THE MOVE EXPLORER'S. The list scrolls the way the Explorer's
   * body does — plain `overflow` with the platform's own scrollbar — so the two
   * scrolling Sections look and behave the same (agreed 15 Sep). It previously hid
   * its scrollbar entirely, which left no thumb to show where in the game the list
   * was. `scrollbar-gutter: stable` is still not used: a reserved lane is one nothing
   * can paint into, so every tint and rule stopped short of the Section edge.
   *
   * A ROW IS A MOVE, WHICH IS TWO PLIES. The comment control belongs to the row, not to
   * either ply: one glyph says that this move carries commentary, whether that is
   * White's, Black's or both, and opening it shows everything the move has to say. A
   * control per ply would put two of them on most annotated rows and make the reader
   * work out which half each belonged to.
   *
   * OPENING SPLITS THE MOVE. A comment belongs under the ply that earned it, and it
   * cannot sit under one of two plies sharing a row. So when White's comment opens, the
   * move breaks across two rows: White keeps the first with Black's cell empty, the
   * comment follows, and Black's ply starts a new row carrying the same number. Black's
   * comment then sits under that. When only Black has a comment nothing has to break —
   * the comment already follows both moves — so the pair stays whole. The trigger is a
   * comment on White's ply, not a comment anywhere.
   *
   * The empty CELL is left empty rather than filled with an ellipsis: the grid's columns
   * already say which side moved, and a glyph in the cell would repeat that.
   *
   * The NUMBER is a different question, and it does take the ellipsis. A row carrying
   * only Black's ply is numbered `1…`, not `1.`, because `1.` announces White's move and
   * the split leaves two rows running under the same number. In the mono face `…` is one
   * cell — `1…` and `1.` are both 14.4px — so correct notation costs nothing, and it
   * says what the removed box was drawn to say. For the same reason a comment is not labelled
   * with the move it belongs to: it sits directly beneath that ply, which is the
   * statement. Anything else added to a comment is text the document does not contain.
   *
   * NOTHING IS BOXED, AND NOTHING IS INSET. An open move used to sit in a bordered box,
   * which meant its rows were 5px narrower than every other row and had to give that
   * back through a compensating grid — arithmetic that no rendering test could check and
   * that went wrong twice. Grouping is carried by ground and rules instead: the comment
   * region is tinted, a hairline separates it from the move above and another closes the
   * group, and a 3px rule runs down its leading edge marking where that comment starts
   * and ends. Every row then uses one grid, so the gutter and the control line up by
   * construction rather than by compensation.
   *
   * The leading rule is painted INSIDE the box as an inset shadow, not as a border. A
   * border would move the comment's contents 3px right and put them out of line with the
   * move text above them, which is the whole thing this is trying to fix.
   *
   * Inside that region the comment has its own ground, a step back from the move row,
   * and its edges reach the Section's own. Banners sit on that
   * ground, inset from it, which is what makes them visibly belong to the comment rather
   * than float in the Section.
   *
   * WHAT IS BOXED. A box is a discrete statement: the move row and each banner get one.
   * A container and free text do not — the comment region carries a ground and a rule
   * but no border of its own, and prose carries nothing. Four nested levels, two
   * treatments to learn.
   *
   * A COMMENT IS A BANNER AND A REMAINDER. Commands this application understands are
   * drawn by `CommentBanner` and removed from the text, so nothing is shown twice;
   * everything else stays as written. `plies.js` owns which commands those are.
   *
   * COLLAPSED BY DEFAULT. This is what makes the layout survive real data: every ply in
   * the annotated corpus carries a comment, so showing them all would cost a row each
   * and leave three moves on screen. Collapsed, the cost is a glyph at the row's
   * trailing edge and the list stays a move list.
   *
   * PLY 0 MARKS NOTHING. The starting position was produced by no move, so no move can
   * be current there. Marking move 1 would be a claim the position does not support.
   *
   * SCROLLING. The current ply is kept in view by scrolling the shortest distance that
   * reveals it, never by re-centring — re-centring makes every arrow key move the whole
   * list under the reader. Scrolling by hand does not navigate: reading ahead is normal,
   * and the next key press snaps back to wherever the game actually is.
   */
  import { t, locale } from '$lib/stores/i18n.js';
  import Icon from '$lib/components/Icon.svelte';
  import { CommentIcon, SectionCollapse, SectionExpand, BestMoveMark } from '$lib/icons.js';
  import CommentBanner from './CommentBanner.svelte';

  let { plies = [], ply = 0, engine = null, onselect } = $props();

  let listEl = $state(null);

  /**
   * Which rows are open, keyed by the row's move number. Collapsed is the default, so
   * this starts empty; it is replaced rather than mutated on every toggle, because the
   * assignment is what the reactivity tracks.
   */
  let open = $state(new Set());

  const toggle = (no) => {
    const next = new Set(open);
    if (next.has(no)) next.delete(no);
    else next.add(no);
    open = next;
  };

  /**
   * A ply's annotation, split the way it is drawn: a banner for the commands this
   * application understands, and whatever text is left for everything else. Either may
   * be absent, and a ply with neither has no control and no rows of its own.
   */
  const side = (i) => {
    const p = plies[i];
    if (!p) return null;
    const banner = p.e !== null || p.x !== null || p.b !== null;
    return {
      san: p.s, ply: i, comment: p.c, banner, e: p.e, x: p.x, best: p.b,
      annotated: banner || !!p.c,
      /* The engine would have played what was played. The banner says so too; on the row
         it is the one mark that survives the comment being collapsed. */
      wasBest: !!p.b && p.b === p.s
    };
  };

  const blocks = $derived.by(() => {
    const out = [];
    for (let i = 1; i < plies.length; i += 2) {
      const no = (i + 1) / 2;
      const white = side(i);
      const black = side(i + 1);
      const has = !!(white?.annotated || black?.annotated);
      const isOpen = has && open.has(no);

      /* A move may have two comments, so the control names both of the blocks it opens. */
      const controls = [white, black]
        .filter((s) => s?.annotated)
        .map((s) => `cmt-p${s.ply}`)
        .join(' ');

      if (!isOpen) {
        out.push({ kind: 'row', key: `p${i}`, no, white, black, control: has, open: false, controls });
        continue;
      }

      const items = [];
      if (white?.annotated) {
        /* The move breaks: White, its annotation, then Black on a row of its own. */
        items.push({ t: 'row', key: `w${i}`, no, white, black: null, control: true, open: true, controls });
        items.push({ t: 'cmt', key: `cw${i}`, move: white });
        /* Black's ply continues the move, so it is numbered `1…` rather than `1.`. */
        if (black) items.push({ t: 'row', key: `b${i}`, no, cont: true, white: null, black, control: false });
        if (black?.annotated) items.push({ t: 'cmt', key: `cb${i}`, move: black });
      } else {
        /* Only Black is annotated, so nothing has to move aside for it. */
        items.push({ t: 'row', key: `p${i}`, no, white, black, control: true, open: true, controls });
        if (black?.annotated) items.push({ t: 'cmt', key: `cb${i}`, move: black });
      }
      out.push({ kind: 'group', key: `g${i}`, items });
    }
    return out;
  });

  /**
   * The document's own date, in the reader's locale.
   *
   * The extension writes an ISO timestamp; showing it raw would put a machine string in
   * front of a person, and hardcoding an English format would be wrong in two of the
   * three locales this application ships.
   */
  const engineDate = $derived.by(() => {
    if (!engine?.timestamp) return null;
    const at = new Date(engine.timestamp);
    if (Number.isNaN(at.getTime())) return null;
    return new Intl.DateTimeFormat($locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(at);
  });

  /* Scroll the shortest distance that brings the current move into view. */
  $effect(() => {
    const target = ply;
    if (!listEl || target < 1) return;
    listEl.querySelector(`[data-ply="${target}"]`)?.scrollIntoView({ block: 'nearest' });
  });
</script>

<div class="ml" bind:this={listEl} role="list" aria-label={$t('game.moves.list')}>
  <!--
    The game comment: the document's own remark, before any move was made, which is where
    the extension writes its [%engine]. It is not about a position, so it carries no
    evaluation and no best move — only who was analysing, how deep, and when.
  -->
  {#if engine}
    <div class="gamecmt">
      <CommentBanner kind="game" {engine} date={engineDate} />
    </div>
  {/if}

  {#snippet moveRow(row)}
    <div class="row" role="listitem">
      <span class="no">{row.no}{row.cont ? '\u2026' : '.'}</span>

      {#each [row.white, row.black] as move, col (col)}
        {#if move}
          <button
            class="mv"
            class:on={ply === move.ply}
            type="button"
            data-ply={move.ply}
            aria-current={ply === move.ply ? 'true' : undefined}
            onclick={() => onselect?.(move.ply)}
          >{move.san}{#if move.wasBest}<span class="wb" aria-hidden="true"><Icon icon={BestMoveMark} size={10} /></span>{/if}</button>
        {:else}
          <!-- The other ply is on its own row. The columns say which side this is. -->
          <span class="mv empty"></span>
        {/if}
      {/each}

      <span class="slot">
        {#if row.control}
          <button
            class="cc"
            type="button"
            aria-expanded={row.open}
            aria-controls={row.controls}
            aria-label={row.open ? $t('game.moves.hideComment') : $t('game.moves.showComment')}
            onclick={() => toggle(row.no)}
          >
            <Icon icon={CommentIcon} size={12} />
            <Icon icon={row.open ? SectionCollapse : SectionExpand} size={11} />
          </button>
        {/if}
      </span>
    </div>
  {/snippet}

  {#each blocks as block (block.key)}
    {#if block.kind === 'row'}
      {@render moveRow(block)}
    {:else}
      <!-- One move, expanded: its rows and its comments inside a single box. -->
      <div class="blk">
        {#each block.items as item (item.key)}
          {#if item.t === 'row'}
            {@render moveRow(item)}
          {:else}
            <div class="ann" id="cmt-p{item.move.ply}">
              {#if item.move.banner}
                <!-- Values only: the engine that produced them is stated once, at the top. -->
                <CommentBanner e={item.move.e} x={item.move.x} best={item.move.best} />
              {/if}
              {#if item.move.comment}
                <p class="cmt">{item.move.comment}</p>
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  {/each}
</div>

<style>
  .ml {
    flex: 1;
    min-height: 0;
    /* The axis is declared, not inherited. `overflow-y: auto` alone computes the other
       axis to `auto` as well, which is how this Section acquired a horizontal scrollbar
       nobody asked for the moment anything exceeded its track by a pixel. */
    overflow: hidden auto;
    background: var(--surface);
    /* No padding at the top: the first row meets the title bar. */
    padding: 0 0 2px;
  }

  /* One grid, every row, open or closed. The trailing track is fixed so the control
     sits on one vertical line down the Section, and so a row without a comment is
     exactly as wide as one with. 40px of track holds a 30px control and 10px of air,
     which puts the control's chevron on the same vertical line as the chevron of the
     Section header's collapse control (agreed 15 Sep; it was 36px and sat 4px right). */
  .row {
    display: grid;
    grid-template-columns: 36px 1fr 1fr 40px;
    align-items: center;
  }

  .no {
    padding: 5px 6px 5px 12px;
    text-align: right;
    font: 12px/1.35 var(--mono);
    font-variant-numeric: tabular-nums;
    color: var(--faint);
    user-select: none;
  }

  .mv {
    font: 12px/1.35 var(--mono);
    text-align: left;
    padding: 5px 8px;
    color: var(--ink);
    background: none;
    border: 1px solid transparent;
    border-radius: 3px;
    cursor: default;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mv:hover { background: var(--chrome); }

  /*
    The current ply is the workspace's primary state (§5.3), so it is marked with a
    fill rather than an outline: an outline is what keyboard focus needs, and spending
    it here would leave focus nothing of its own to say.
  */
  .mv.on { background: var(--ink); color: var(--surface); }
  .mv.on:hover { background: var(--ink); }
  .mv:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }

  .mv.empty { cursor: default; }
  .mv.empty:hover { background: none; }

  /* Flush to the leading side of its track, so the air falls between the control and
     the Section edge rather than being split either side of it. */
  .slot { display: flex; justify-content: flex-start; }

  /* Glyph and chevron together: the glyph says the move carries commentary, the
     chevron says which way it will go. */
  .cc {
    display: inline-flex;
    align-items: center;
    gap: 1px;
    height: 24px;
    padding: 2px 2px;
    color: var(--muted);
    background: none;
    border: 1px solid transparent;
    border-radius: 3px;
    cursor: default;
  }
  .cc:hover { background: var(--chrome); color: var(--ink); }
  .cc:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }

  /*
    An open move: no box, no inset, nothing that would narrow the rows inside it. A rule
    closes the group at the bottom; the tint on the comment regions and the rules around
    them are what say these rows belong together.
  */
  .blk {
    border-bottom: 1px solid var(--rule);
  }

  /*
    The comment region. Joined to the row above by a shared border rather than separated
    by a gap; its own ground, a step back from the move; a rule at the leading edge; and
    no border of its own, because it is a container rather than a statement.
  */
  .blk .ann {
    border-top: 1px solid var(--rule);
    /* Inset, not a border: a border would push the contents 3px right, out of line with
       the move text above them. */
    box-shadow: inset 3px 0 0 var(--rule-strong);
    background: var(--chrome);
    padding: 5px 12px 6px;
  }

  /*
    The game comment. Flush to the title bar, because it belongs to the document rather
    than to anything in the list, and marked with the same leading rule as every other
    comment in the Section.
  */
  .gamecmt {
    background: var(--chrome);
    border-bottom: 1px solid var(--rule);
    box-shadow: inset 3px 0 0 var(--rule-strong);
    padding: 5px 12px 6px;
  }

  /*
    The rule carries the indent; the text starts as near the edge as the rule allows.
    A comment is the longest thing in this Section — the corpus median is 46 characters
    — so every pixel given to indentation is a pixel taken from the thing being read.
  */
  .cmt {
    margin: 3px 0 0;
    font: 11px/1.45 var(--mono);
    color: var(--muted);
    overflow-wrap: anywhere;
  }

  /* The played move was the engine's own choice. */
  .wb {
    display: inline-flex;
    vertical-align: -1px;
    margin-left: 4px;
    color: var(--muted);
  }
  .mv.on .wb { color: var(--chrome); }
</style>
