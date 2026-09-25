<script>
  /**
   * Section frame and Section Header — §5.4.2.
   *
   * One header pattern, filled in by slots. Sections do not invent their own
   * headers, which is what keeps the collapse controls aligned down the panel.
   *
   * Slot order and truncation behaviour are the part that matters:
   *   left cluster   title, then source — source absorbs truncation
   *   right cluster  status, control, options, collapse — never truncates
   *
   * Status is in the right cluster specifically so it survives; a status that
   * can be truncated away is not a status.
   */
  import { t } from '$lib/stores/i18n.js';
  import { SECTION_HEADER_H } from '$lib/game/layout.js';
  import Icon from '$lib/components/Icon.svelte';
  import { SectionToggle, SectionOptions, SectionCollapse, SectionExpand, Favorites, EngineOn, EngineOff, SaveGame }
    from '$lib/icons.js';
  import GameInfo from './GameInfo.svelte';
  import MoveList from './MoveList.svelte';
  import EvalTimeline from './EvalTimeline.svelte';
  import MoveExplorer from './MoveExplorer.svelte';
  import EngineLines from './EngineLines.svelte';
  import { formatCount } from '$lib/settings/databases.js';
  import { evalScore } from '$lib/game/layout.js';
  import {
    ENGINE_MIN_LINES, ENGINE_MAX_LINES,
    ENGINE_DEPTH_MIN, ENGINE_DEPTH_MAX, ENGINE_DEPTH_STEP
  } from '$lib/game/engine.js';

  let {
    section, height, collapsed = false, oncollapse, onhide,
    plies = [], ply = 0, engine = null, orientation = 'white', onselectply,
    tree = null, path = [], onselectpath, onvariationedit = null,
    explorer = null, onselectlibrary, onexplorersettings,
    engineView = null, onengine, onselectengine, onenginelines, onenginedepth,
    onenginesettings,
    info = null, onfavourite, oneditinfo, onedittags, dirty = false, onsave
  } = $props();

  /**
   * The header's status slot.
   *
   * The Timeline prints the evaluation at the playhead, agreed 13 Sep. It uses
   * evalScore() rather than the bar's evalLabel(): two decimals and a sign,
   * because this slot has no 27px constraint to honour. The two agree on the
   * value and differ in the last digit, which is rounding rather than
   * disagreement.
   *
   * A ply with no evaluation prints NOTHING. A dash would be a value.
   */
  let sourceOpen = $state(false);
  let optionsOpen = $state(false);

  /* One menu at a time: both hang off the same header, and two open at once
     would overlap the Section's own body. */
  const openSource = () => { optionsOpen = false; sourceOpen = !sourceOpen; };
  const openOptions = () => { sourceOpen = false; optionsOpen = !optionsOpen; };

  /*
    Escape, or a press anywhere outside, closes an open menu.

    Not in any wireframe, because how a menu closes is not something a drawing
    of an open menu can show. Without it the only way out of the source menu is
    the control that opened it — and that menu covers the options control it
    sits beside, so a user who opened the wrong one has to find their way back
    rather than simply dismiss it. Same rule as `Popover.svelte`, applied here
    rather than reused, because that component's box is positioned for the tab
    bar and a Section's menus hang from their own header.
  */
  $effect(() => {
    if (!sourceOpen && !optionsOpen) return;
    const close = () => { sourceOpen = false; optionsOpen = false; };
    const onPointer = (e) => {
      if (!e.target.closest?.('.srcmenu, .optmenu, [data-popover-trigger]')) close();
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey, true);
    };
  });

  /*
    A Section's menus are not clipped by the stack.

    `.stack` clips its overflow, and a menu is a child of its Section, so a menu
    taller than the room left below its header was cut off at the stack's
    bottom edge. The Explorer is the last Section in the stack and at most three
    rows tall, so its library menu lost its last item, Settings.

    Each menu keeps the place its stylesheet gives it. This measures that place
    and pins the menu there with `position: fixed`, which an ancestor's overflow
    does not clip. It is measured again when anything scrolls or the window
    resizes, so the menu stays on its header. If the menu would still run past
    the bottom of the window, it is lifted to end 8px above that edge.
  */
  function hang(node) {
    const place = () => {
      Object.assign(node.style, { position: '', top: '', left: '', right: '', marginLeft: '' });
      const r = node.getBoundingClientRect();
      const top = Math.max(8, Math.min(r.top, window.innerHeight - r.height - 8));
      Object.assign(node.style, {
        position: 'fixed', top: `${top}px`, left: `${r.left}px`, right: 'auto', marginLeft: '0'
      });
    };
    place();
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    return {
      destroy() {
        window.removeEventListener('resize', place);
        document.removeEventListener('scroll', place, true);
      }
    };
  }

  /* Q2 — the Section cannot be on without an engine. The control is disabled
     rather than present-but-inert, so the reason is legible before it is
     pressed rather than after. */
  const engineReady = $derived(!!engineView?.source);

  const status = $derived.by(() => {
    /*
      Game Info's status is the FAVOURITE, and it is a mark rather than a value
      — drawn below as an icon, not printed here. It exists so the fact survives
      collapse (GI-F): a collapsed Game Info is a header and nothing else, and
      whether this game is a favourite is the one thing on the card worth
      knowing without expanding it. An unfavourited game renders nothing; a
      hollow star in every header would be four-fifths noise.
    */
    if (section.id === 'info') return null;
    if (section.id === 'explorer') {
      // Games that CONTAIN this position — the size of the sample every row is
      // drawn from, and the Section's only absolute number. Empty rather than
      // stale when there is nothing to report.
      if (!explorer?.library) return null;
      return $t('game.explorer.games', { n: explorer.total.toLocaleString() });
    }
    if (section.id !== 'timeline') return $t('game.sec.status');
    const p = plies[ply];
    if (!p) return null;
    return evalScore(p);
  });
</script>

<section
  class="sec"
  class:collapsed
  style="height:{height}px;--hd-h:{SECTION_HEADER_H}px"
  aria-labelledby="sec-{section.id}-title"
>
  <header class="hd" style="height:{SECTION_HEADER_H}px">
    <span class="ttl" id="sec-{section.id}-title">{$t(section.titleKey)}</span>

    {#if section.source && section.id === 'explorer'}
      <!-- The one thing in this Section the user changes, so it sits where the
           shell puts changeable sources: beside the title, absorbing truncation. -->
      <button
        class="src"
        type="button"
        data-popover-trigger
        aria-haspopup="menu"
        aria-expanded={sourceOpen}
        title={explorer?.library?.name ?? $t('game.explorer.none')}
        onclick={() => (sourceOpen = !sourceOpen)}
      >
        {explorer?.library?.name ?? $t('game.explorer.none')}<Icon
          icon={sourceOpen ? SectionCollapse : SectionExpand} size={11} />
      </button>
    {:else if section.source && section.id === 'engine'}
      <!-- The engine in use, in the slot §5.4.2 gives a changeable source. The
           name is read far more often than the menu is opened, which is why it
           sits with the identity and absorbs truncation on the title's behalf. -->
      <button
        class="src"
        class:empty={!engineReady}
        type="button"
        data-popover-trigger
        aria-haspopup="menu"
        aria-expanded={sourceOpen}
        title={engineView?.source?.name ?? $t('game.engine.none')}
        onclick={openSource}
      >
        {engineView?.source?.name ?? $t('game.engine.none')}<Icon
          icon={sourceOpen ? SectionCollapse : SectionExpand} size={11} />
      </button>
    {:else if section.source}
      <button class="src" type="button" title={$t('game.sec.sourceHint')}>
        {$t('game.sec.source')}<Icon icon={SectionExpand} size={11} />
      </button>
    {/if}

    <span class="sp"></span>

    {#if section.id === 'info'}
      {#if info?.favorite}
        <span class="st fav" title={$t('game.info.isFavourite')}>
          <Icon icon={Favorites} size={12} />
        </span>
      {/if}
    {:else if section.status && status}<span class="st">{status}</span>{/if}

    {#if section.control && section.id === 'engine'}
      <!--
        THE SHARED ICON BUTTON, like every other Section's control.

        This slot held a SWITCH until now — the one documented exception to
        "Sections fill the header in rather than reinvent it" (Q1, settled 21
        Sep). The exception has been retired, and by its own argument rather
        than against it: what it objected to was a power glyph, which says what
        pressing it will do while saying nothing about what it is doing now.
        `toggle-left` / `toggle-right` draws the state instead of describing it,
        so the button can carry a watched state after all.

        It stays `role="switch"` with `aria-checked`. Only the picture changed.

        Q2 still holds: the Section cannot be on without an engine, so with none
        selected the control is disabled rather than present-but-inert — the
        reason is legible before it is pressed rather than after.
      -->
      <button
        class="ic"
        class:on={!!engineView?.running}
        type="button"
        role="switch"
        aria-checked={!!engineView?.running}
        aria-label={$t('game.engine.control')}
        disabled={!engineReady}
        onclick={() => onengine?.(!engineView?.running)}
      ><Icon icon={engineView?.running ? EngineOn : EngineOff} size={20} /></button>
    {:else if section.control}
      <button class="ic" type="button" aria-label={$t('game.sec.control')}><Icon icon={SectionToggle} size={13} /></button>
    {/if}

    {#if section.id === 'info' && dirty}
      <button
        class="ic"
        type="button"
        aria-label={$t('game.save')}
        onclick={() => onsave?.()}
      ><Icon icon={SaveGame} size={13} /></button>
    {/if}

    {#if section.options && section.id === 'info'}
      <button
        class="ic"
        type="button"
        data-popover-trigger
        aria-haspopup="menu"
        aria-expanded={optionsOpen}
        aria-label={$t('game.sec.options')}
        onclick={openOptions}
      ><Icon icon={SectionOptions} size={13} /></button>
    {:else if section.options && section.id === 'engine'}
      <button
        class="ic"
        type="button"
        data-popover-trigger
        aria-haspopup="menu"
        aria-expanded={optionsOpen}
        aria-label={$t('game.sec.options')}
        onclick={openOptions}
      ><Icon icon={SectionOptions} size={13} /></button>
    {:else if section.options}
      <button class="ic" type="button" aria-label={$t('game.sec.options')}><Icon icon={SectionOptions} size={13} /></button>
    {/if}

    <button
      class="ic"
      type="button"
      aria-expanded={!collapsed}
      aria-controls="sec-{section.id}-body"
      aria-label={collapsed ? $t('game.sec.expand') : $t('game.sec.collapse')}
      onclick={() => oncollapse?.(section.id)}
    ><Icon icon={collapsed ? SectionExpand : SectionCollapse} size={13} /></button>
  </header>

  {#if sourceOpen && section.id === 'explorer'}
    <div class="srcmenu" role="menu" use:hang>
      <!-- None leads: it is the absence of a selection rather than one of the
           things being selected between. -->
      <button class="mi" role="menuitemradio" aria-checked={!explorer?.library}
        onclick={() => { onselectlibrary?.(null); sourceOpen = false; }}>
        <span class="tick">{explorer?.library ? '' : '✓'}</span>{$t('game.explorer.none')}
      </button>
      {#each explorer?.libraries ?? [] as lib (lib.id)}
        <button class="mi" role="menuitemradio" aria-checked={explorer?.library?.id === lib.id}
          onclick={() => { onselectlibrary?.(lib.id); sourceOpen = false; }}>
          <span class="tick">{explorer?.library?.id === lib.id ? '✓' : ''}</span>{lib.name}
          <!-- The library's own size, not the position's: "is this worth
               asking?" against the header's "what did it say?". -->
          <span class="sz">{formatCount(lib.games)}</span>
        </button>
      {/each}
      <div class="sep"></div>
      <!-- A control, not a sentence: it names the destination the way every
           other shortcut out of a menu does. -->
      <!-- A shortcut to Settings at its Databases section, where Libraries are
           managed — the Explorer's sources are Libraries, so that is the only
           place in Settings this menu could mean. -->
      <button class="mi shortcut" role="menuitem"
        onclick={() => { sourceOpen = false; onexplorersettings?.(); }}>
        {$t('game.explorer.settings')}<span class="sz">›</span>
      </button>
    </div>
  {/if}

  {#if sourceOpen && section.id === 'engine'}
    <!-- EN-03. The Explorer's library menu, line for line: current value marked,
         then the list, then a footer naming its destination. The footer goes to
         the Engines section of Settings rather than to Settings' front page —
         there is only one place in Settings this menu could mean. -->
    <div class="srcmenu" role="menu" use:hang>
      {#each engineView?.sources ?? [] as src (src.id)}
        <button class="mi" role="menuitemradio" aria-checked={engineView?.source?.id === src.id}
          onclick={() => { onselectengine?.(src.id); sourceOpen = false; }}>
          <span class="tick">{engineView?.source?.id === src.id ? '✓' : ''}</span>{src.name}
          <span class="sz">{src.protocol}</span>
        </button>
      {/each}
      {#if engineView?.sources?.length}<div class="sep"></div>{/if}
      <button class="mi shortcut" role="menuitem"
        onclick={() => { sourceOpen = false; onenginesettings?.(); }}>
        {$t('game.engine.settings')}<span class="sz">›</span>
      </button>
    </div>
  {/if}

  {#if optionsOpen && section.id === 'info'}
    <!-- GI-M's entry point. One item: the dialog is where every field on this
         card is changed, so a menu of per-field commands would be five ways
         into one place. -->
    <div class="optmenu" role="menu" use:hang>
      <button class="mi" role="menuitem"
        onclick={() => { optionsOpen = false; oneditinfo?.(); }}>
        <span class="tick"></span>{$t('game.info.edit')}
      </button>
    </div>
  {/if}

  {#if optionsOpen && section.id === 'engine'}
    <!--
      EN-05. Hangs under the options control the way the source menu hangs under
      the source: flush to the header, no gap. The edge differs because the
      control does — this one is in the right cluster.

      TWO SETTINGS, and deliberately only two (Q5). Engine settings live in
      Settings; these are the ones worth reaching while watching the Section
      itself. Threads and hash are not here and are not coming here.
    -->
    <div class="optmenu" role="menu" use:hang>
      <div class="oh">{$t('game.engine.analysis')}</div>

      <div class="optrow">
        <span class="olab">{$t('game.engine.lines')}</span>
        <span class="stp">
          <button type="button" aria-label={$t('game.engine.fewerLines')}
            disabled={(engineView?.lineCount ?? 0) <= ENGINE_MIN_LINES}
            onclick={() => onenginelines?.((engineView?.lineCount ?? 0) - 1)}>−</button>
          <b>{engineView?.lineCount}</b>
          <button type="button" aria-label={$t('game.engine.moreLines')}
            disabled={(engineView?.lineCount ?? 0) >= ENGINE_MAX_LINES}
            onclick={() => onenginelines?.((engineView?.lineCount ?? 0) + 1)}>+</button>
        </span>
      </div>

      <div class="optrow">
        <span class="olab">{$t('game.engine.depth')}</span>
        <span class="stp">
          <button type="button" aria-label={$t('game.engine.lessDepth')}
            disabled={(engineView?.depth ?? 0) <= ENGINE_DEPTH_MIN}
            onclick={() => onenginedepth?.((engineView?.depth ?? 0) - ENGINE_DEPTH_STEP)}>−</button>
          <b>{engineView?.depth}</b>
          <button type="button" aria-label={$t('game.engine.moreDepth')}
            disabled={(engineView?.depth ?? 0) >= ENGINE_DEPTH_MAX}
            onclick={() => onenginedepth?.((engineView?.depth ?? 0) + ENGINE_DEPTH_STEP)}>+</button>
        </span>
      </div>
    </div>
  {/if}

  {#if !collapsed}
    {#if section.id === 'explorer'}
      <div class="content" id="sec-{section.id}-body">
        <MoveExplorer
          rows={explorer?.rows ?? []}
          total={explorer?.total ?? 0}
          library={explorer?.library ?? null}
          playedMove={explorer?.played ?? null}
          moveNumber={explorer?.moveNumber ?? 1}
          blackToMove={explorer?.blackToMove ?? false}
        />
      </div>
    {:else if section.id === 'timeline'}
      <!-- Drawn in wireframes/game-eval-timeline.html; G1 and G2 granted 13 Sep.
           `bounds` has no reader yet — where the phase boundaries come from is
           still being researched — so the regions stay unrendered rather than
           being guessed at. -->
      <div class="content" id="sec-{section.id}-body">
        <EvalTimeline {plies} {ply} {orientation} onselect={onselectply} />
      </div>
    {:else if section.id === 'engine'}
      <!-- Drawn in wireframes/game-engine.html Rev A; G1 and G2 granted 21 Sep.
           The lines are mock (engineMock.js): the prototype runs no engine, and
           the states are what this build exists to exercise. -->
      <div class="content" id="sec-{section.id}-body">
        <EngineLines
          lines={engineView?.lines ?? []}
          running={!!engineView?.running}
          hasEngine={engineReady}
          hasMoves={engineView?.hasMoves !== false}
          moveNumber={engineView?.moveNumber ?? 1}
          blackToMove={engineView?.blackToMove ?? false}
          onsettings={() => onenginesettings?.()}
        />
      </div>
    {:else if section.id === 'info'}
      <!-- Drawn in wireframes/game-info-g1.html; G1 granted, option A. -->
      <div class="content" id="sec-{section.id}-body">
        <GameInfo {info} {onfavourite} {onedittags} />
      </div>
    {:else if section.id === 'moves'}
      <!-- The one Section that is built. The rest stay placeholders until each is
           drawn and agreed in its own turn. -->
      <div class="content" id="sec-{section.id}-body">
        <MoveList {tree} {path} {engine} onselect={onselectpath} {onvariationedit} />
      </div>
    {:else}
      <!--
        The remaining Sections are not specified (§5.4.2). Rendering a placeholder is
        the honest thing here: inventing contents would make design decisions that
        have not been taken, in a prototype whose purpose is to validate the shell
        around them.
      -->
      <div class="body" id="sec-{section.id}-body">
        <span class="ph">
          {$t('game.sec.placeholder')}
          · floor {section.floor}px
          {#if section.absorb} · {$t('game.sec.absorbs')}{/if}
          {#if section.scrolls} · {$t('game.sec.scrolls')}{/if}
        </span>
      </div>
    {/if}
  {/if}
</section>

<style>
  .sec {
    position: relative;
    flex: none;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--surface);
    border-bottom: 1px solid var(--rule);
  }

  /*
    A title bar, not just a row of text. The header carries the panel's tone and the
    body carries the surface, so each Section reads as a titled box and the boundary
    between one Section and the next is visible without counting rules. The Sections
    stack directly on one another, so without this they run together — most visibly
    now that one of them has real content and the others do not.
  */
  .hd {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 6px 0 12px;
    background: var(--chrome);
    border-bottom: 1px solid var(--rule);
  }

  .ttl {
    flex: none;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ink);
    white-space: nowrap;
  }

  /* Absorbs truncation on behalf of the title. Sits with the identity because
     it is read far more often than it is operated. */
  .src {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font: 10px/1 var(--mono);
    color: var(--muted);
    background: none;
    border: 0;
    padding: 3px 2px;
    cursor: default;
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .sp { flex: 1; min-width: 8px; }

  /*
    HUNG FROM THE HEADER, not from the top of the Section.

    `margin-top: -2px` alone did not do that, and had not since the Explorer's
    menu was built: an absolutely positioned child of a flex container takes its
    static position from the container's content box, not from the sibling it
    follows in the markup, so the menu was landing over the header it drops from
    and covering the title and the source it belongs to. The header's own height
    is the offset, and it comes from SECTION_HEADER_H rather than a literal 30
    so the two cannot drift apart.
  */
  .srcmenu {
    position: absolute;
    z-index: 40;
    top: calc(var(--hd-h) - 2px);
    margin-left: 10px;
    min-width: 200px;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 6px;
    box-shadow: var(--shadow);
    padding: 4px;
  }
  .mi {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 5px 8px;
    border: 0;
    border-radius: 4px;
    background: none;
    font: 11.5px/1 var(--sans);
    color: var(--ink);
    text-align: left;
    cursor: default;
  }
  .mi:hover { background: var(--chrome); }
  .mi .tick { flex: none; width: 10px; color: var(--muted); font-size: 10px; }
  .mi .sz { margin-left: auto; color: var(--muted); font: 10px/1 var(--mono); }
  .sep { height: 1px; background: var(--rule); margin: 4px 2px; }

  /* The source slot with nothing selected: present, and visibly empty rather
     than absent, so the way to fix it is where the value will be. */
  .src.empty { color: var(--faint); }

  /*
    The running Engine, coloured.

    The switch this replaced went `--fill-3` to `--ok`, and the colour was doing
    real work: it is what made "is it searching?" answerable from across the
    panel rather than by reading a knob's position. The glyph carries the state
    on its own, so the colour is reinforcement rather than the only signal —
    which is the arrangement §9 asks for.
  */
  .ic.on,
  .ic.on:hover { color: var(--ok, #2f5d3a); }

  /*
    20px, not the 13 its neighbours use. Chosen deliberately, and checked
    against 13, 15, 16, 17 and 18 on the real 360px header before choosing.

    It is NOT that the glyph fails small — at 13px the knob's position is
    distinguishable, and the colour carries it besides. It is that this is the
    only control in the panel that reports an ONGOING state. The ellipsis and
    the chevron are read when the reader goes looking for them; this one is
    read while a search is running, at a glance, from wherever the eye happens
    to be. Legibility at a glance is worth more here than uniformity with
    glyphs that are only ever read on purpose.

    The button is unchanged at 26px, so the control column does not move and
    the target matches its neighbours. What differs is the mark inside it.
  */
  .ic:disabled { opacity: .4; }
  .ic:disabled:hover { background: none; color: var(--muted); }

  /*
    The options menu. The source menu's box, hung from the other edge because
    the control it belongs to is in the other cluster.
  */
  .optmenu {
    position: absolute;
    z-index: 40;
    top: calc(var(--hd-h) - 2px);
    right: 6px;
    min-width: 200px;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 6px;
    box-shadow: var(--shadow);
    padding: 4px;
  }
  .optmenu .oh {
    font: 9px/1 var(--mono);
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--faint);
    padding: 5px 8px 4px;
  }
  .optrow {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 8px 5px;
    font: 11.5px/1 var(--sans);
    color: var(--ink);
  }
  .optrow .olab { flex: 1; min-width: 0; }
  .stp {
    flex: none;
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    overflow: hidden;
  }
  .stp button {
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border: 0;
    background: none;
    color: var(--muted);
    font: 12px/1 var(--sans);
    cursor: default;
  }
  .stp button:hover:not(:disabled) { background: var(--chrome); color: var(--ink); }
  .stp button:disabled { color: var(--faint); }
  .stp button:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }
  /* Tabular, because the number changes under a cursor that must not move. */
  .stp b {
    min-width: 26px;
    text-align: center;
    font: 11.5px/1 var(--mono);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: var(--ink);
  }

  .st {
    flex: none;
    font: 10px/1 var(--mono);
    color: var(--muted);
    white-space: nowrap;
  }

  /* The favourite mirrored out of Game Info's meta row. Filled, because a
     hollow star here would read as the control it is not — this slot reports,
     the card's own star is what toggles. */
  .st.fav { display: inline-flex; align-items: center; color: var(--accent, #8a5a1c); }
  .st.fav :global(svg) { fill: currentColor; }

  .ic {
    flex: none;
    /*
      26px, not 24. WCAG 2.2 SC 2.5.8 (AA) requires 24×24 CSS px, so 24 passed —
      but exactly at the threshold, where any later trim fails it silently. Two
      pixels of margin cost nothing in a header that has a flex spacer, and they
      match the Game Controls Toolbar's buttons.
    */
    width: 26px;
    height: 26px;
    display: grid;
    place-items: center;
    font: 10px/1 var(--mono);
    color: var(--muted);
    background: none;
    border: 1px solid transparent;
    border-radius: 3px;
    cursor: default;
  }
  .ic:hover { background: var(--chrome); color: var(--ink); }
  .ic:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }

  /* A built Section fills its box; the placeholder centres inside it. */
  .content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .body {
    flex: 1;
    min-height: 0;
    display: grid;
    place-items: center;
    background:
      repeating-linear-gradient(135deg, transparent, transparent 8px, var(--chrome) 8px, var(--chrome) 9px);
  }
  .ph {
    background: var(--surface);
    border: 1px solid var(--rule);
    padding: 4px 8px;
    border-radius: 3px;
    font: 9px/1 var(--mono);
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--faint);
    text-align: center;
  }
</style>
