<script>
  /**
   * Game Controls Toolbar — §5.4.2, §5.3.
   *
   * Anchored to the bottom of the Game Details shell. It belongs to the shell,
   * not to any Section, and no Section can scroll it away: the controls that
   * move through the game must always be reachable.
   */
  import { t } from '$lib/stores/i18n.js';
  import { TOOLBAR_H, timelineWindowHeight } from '$lib/game/layout.js';
  import Icon from '$lib/components/Icon.svelte';
  import { FirstPly, PrevPly, NextPly, LastPly, PlayIcon, PauseIcon, FlipBoardIcon, MoreIcon, Checked }
    from '$lib/icons.js';

  let {
    ply = 0, plyCount = 1, playing = false,
    sections = [], timelineDisplaced = false, ontoggleSection,
    onfirst, onprev, onnext, onlast, onflip, onplay, onmore
  } = $props();

  /*
    THE SECTIONS MENU LIVES HERE.

    §5.4.2 gives the user exactly one control over composition — which Sections
    are displayed — and never said where it lives. The toolbar's More menu is
    where it belongs: composition is a property of the panel rather than of any
    Section in it, and a control that adds a Section back cannot live inside the
    Section it would add.
  */
  let open = $state(false);
  const toggle = () => { open = !open; onmore?.(); };

  /* The window height at which the Timeline fits, for the footer. Computed from
     the composition rather than written down, so it moves when a Section does. */
  const timelineAt = $derived(timelineWindowHeight(sections));

  /**
   * FOUR STATES, and the third is the one that matters.
   *
   *   on        the user wants it and it is on screen
   *   off       the user removed it — persists across sessions AND window sizes
   *   displaced the user wants it; the layout has no room. Ticked and dimmed,
   *             with the reason. NEVER written to the user's stored state, so
   *             growing the window brings it back on its own.
   *   locked    not hideable. The Move List absorbs; Game Info is the game's
   *             identity.
   *
   * Ticked would claim a displaced Section is on screen; unticked would
   * misreport the user's own choice. It needs its own presentation or the menu
   * tells one of two lies.
   */
  function stateOf(s) {
    if (!s.hideable) return 'locked';
    if (s.hidden) return 'off';
    if (s.id === 'timeline' && timelineDisplaced) return 'displaced';
    return 'on';
  }

  /*
    Escape, or a press outside, closes it. Same rule as a Section's own menus —
    stated here rather than shared, because that one is positioned against a
    Section header and this one against the toolbar.
  */
  $effect(() => {
    if (!open) return;
    const close = () => (open = false);
    const onPointer = (e) => {
      if (!e.target.closest?.('.moremenu, [data-more-trigger]')) close();
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey, true);
    };
  });

  const atStart = $derived(ply <= 0);
  const atEnd = $derived(ply >= plyCount - 1);

  // "12." for White's move, "12…" for Black's. Ply 0 is the start position.
  const label = $derived(
    ply === 0 ? $t('game.start') : `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'}`
  );
</script>

<div class="tb" style="height:{TOOLBAR_H}px" role="toolbar" aria-label={$t('game.controls')}>
  <button type="button" onclick={onfirst} disabled={atStart} aria-label={$t('game.first')} title="Home"><Icon icon={FirstPly} size={14} /></button>
  <button type="button" onclick={onprev}  disabled={atStart} aria-label={$t('game.prev')}  title="←"><Icon icon={PrevPly} size={14} /></button>
  <button type="button" onclick={onplay} aria-label={playing ? $t('game.pause') : $t('game.play')} title="Space">
    <Icon icon={playing ? PauseIcon : PlayIcon} size={14} />
  </button>
  <button type="button" onclick={onnext}  disabled={atEnd} aria-label={$t('game.next')} title="→"><Icon icon={NextPly} size={14} /></button>
  <button type="button" onclick={onlast}  disabled={atEnd} aria-label={$t('game.last')} title="End"><Icon icon={LastPly} size={14} /></button>

  <!--
    The position readout is no longer drawn, but it still ANNOUNCES.

    It was the only aria-live region reporting the current ply: the Move List
    highlights it but says nothing, so deleting the element outright would have
    left a screen reader silent about where stepping through the game had
    landed. Clipped rather than removed, it costs no width and loses nothing.
  -->
  <span class="ply-sr" aria-live="polite">{label}</span>

  <span class="gap"></span>

  <button type="button" onclick={onflip} aria-label={$t('game.flip')} title="F"><Icon icon={FlipBoardIcon} size={14} /></button>
  <button
    type="button"
    class:on={open}
    data-more-trigger
    aria-haspopup="menu"
    aria-expanded={open}
    onclick={toggle}
    aria-label={$t('game.more')}
  ><Icon icon={MoreIcon} size={14} /></button>

  {#if open}
    <div class="moremenu" role="menu">
      <button class="mi" role="menuitem" onclick={() => { open = false; onflip?.(); }}>
        <!-- A spacer, not an empty tick box: this row is a command, and a box
             beside it would offer a state it does not have. -->
        <span class="gutter"></span>{$t('game.flip')}<span class="kb">F</span>
      </button>

      <div class="sep"></div>
      <div class="grp">{$t('game.more.sections')}</div>

      {#each sections as s (s.id)}
        {@const st = stateOf(s)}
        <button
          class="mi"
          class:dim={st === 'displaced'}
          role="menuitemcheckbox"
          aria-checked={st !== 'off'}
          aria-disabled={st === 'locked'}
          disabled={st === 'locked'}
          title={st === 'locked' ? $t('game.more.locked') : ''}
          onclick={() => { if (st !== 'locked') ontoggleSection?.(s.id); }}
        >
          <span class="bx" class:ticked={st !== 'off'} class:locked={st === 'locked'}>
            {#if st !== 'off'}<Icon icon={Checked} size={9} />{/if}
          </span>
          {$t(s.titleKey)}
          {#if st === 'displaced'}<span class="why">{$t('game.more.noRoom')}</span>{/if}
        </button>
      {/each}

      {#if timelineDisplaced}
        <!-- The footer states what the list cannot say for itself — the shape
             §5.4.2 already gives a source selector, reused rather than a second
             way of explaining a menu being invented. -->
        <div class="foot">{$t('game.more.timelineNeeds', { h: timelineAt })}</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /*
    8px between controls, not 4.

    Every vendor lands on roughly this figure and the old value was half the
    lowest of them: Apple asks for "about 12 points of padding around elements
    that include a bezel" and rates spacing as "as important as size"; Microsoft's
    token between buttons is 8epx; Google's is 8dp. These buttons have a bezel.

    It fits: the bar has 344px of content width, the fixed items spend 251 and the
    gaps now 64, leaving 29px in the flex spacer — still a visible division between
    the transport group and Flip/More.
  */
  .tb {
    flex: none;
    position: relative;   /* the More menu hangs from this box */
    display: flex;
    align-items: center;
    gap: 8px;
    /*
      16px at the TRAILING edge, 8 at the leading one.

      This bar sits along the bottom of the window and its trailing end is the
      window's bottom-right corner — where the rounded corner clips content and
      where the bottom and right resize edges meet. Measured on a real window,
      the corner curve reaches about 8px inward at a button's lower edge, which
      is exactly where the last button's edge used to be.

      Apple states the rule for the other end and the principle is the same:
      "Make sure window controls don't overlap toolbar items… instead of placing
      buttons directly on the leading edge, move them inward." A native macOS
      bottom bar is part of the window FRAME and the system insets it; this one
      is drawn in a page inside a browser, so it has to inset itself.
    */
    padding: 0 16px 0 8px;
    border-top: 1px solid var(--rule-strong);
    background: var(--chrome);
  }

  button {
    flex: none;
    gap: 5px;
    min-width: 26px;
    height: 26px;
    padding: 0 7px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: 11px/1 var(--sans);
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    cursor: default;
  }
  button:hover:not(:disabled) { background: var(--chrome-2); }
  button:disabled { color: var(--faint); background: var(--chrome); }
  button:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }

  /* Announced, never drawn. See the element for why it still exists. */
  .ply-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  .gap { flex: 1; }

  /* --------------------------- the More menu --------------------------- */

  /*
    Hung from the toolbar, opening UPWARD: the bar is at the bottom of the
    window, so there is nothing below it to open into. Right-aligned to the
    control, inset to clear the window's bottom-right corner the way the
    toolbar itself is.
  */
  .moremenu {
    position: absolute;
    z-index: 40;
    right: 16px;
    bottom: calc(100% - 7px);
    min-width: 236px;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 6px;
    box-shadow: var(--shadow);
    padding: 4px;
  }

  /*
    justify-content is RESTATED, not inherited. The toolbar's own `button` rule
    centres its contents — correct for a 26px transport button, wrong for a menu
    row, and the menu's rows are buttons inside that same toolbar. Without this
    every row without an auto-margin child floats in the middle of the menu.
  */
  .moremenu .mi {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    text-align: left;
    gap: 8px;
    width: 100%;
    min-width: 0;
    height: auto;
    padding: 6px 8px;
    border: 0;
    border-radius: 4px;
    background: none;
    font: 11.5px/1 var(--sans);
    color: var(--ink);
    text-align: left;
    cursor: default;
  }
  .moremenu .mi:hover:not(:disabled) { background: var(--chrome); }
  .moremenu .mi:disabled { color: var(--muted); background: none; }
  .moremenu .mi.dim { color: var(--muted); }

  /* The tick box. Ticked, unticked, and ticked-but-muted are three readings of
     one control, so they are one element in three states rather than three. */
  /* Holds the tick column open on rows that have no tick. */
  .gutter { flex: none; width: 13px; }

  .bx {
    flex: none;
    width: 13px;
    height: 13px;
    display: grid;
    place-items: center;
    border: 1px solid var(--rule-strong);
    border-radius: 2px;
    color: transparent;
  }
  .bx.ticked { background: var(--ink); border-color: var(--ink); color: var(--surface); }
  .bx.locked { background: var(--chrome-2, var(--chrome)); border-color: var(--rule-strong); color: var(--muted); }
  .mi.dim .bx.ticked { background: var(--muted); border-color: var(--muted); }

  .moremenu .kb { margin-left: auto; font: 10px/1 var(--mono); color: var(--faint); }
  .why { margin-left: auto; font: 9.5px/1 var(--mono); color: var(--accent, #8a5a1c); white-space: nowrap; }

  .sep { height: 1px; background: var(--rule); margin: 4px 2px; }
  .grp {
    padding: 7px 8px 4px;
    font: 9px/1 var(--mono);
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--faint);
  }
  .foot {
    margin-top: 4px;
    padding: 7px 8px 3px;
    border-top: 1px solid var(--rule);
    font: 10px/1.5 var(--mono);
    color: var(--muted);
  }

  button.on { background: var(--chrome-2, var(--chrome)); border-color: var(--ink); }
</style>
