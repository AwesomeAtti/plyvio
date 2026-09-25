<script>
  /**
   * Game Details shell — §5.4.2.
   *
   * A fixed 360px column: a stack of Sections, and a Game Controls Toolbar
   * anchored to the bottom. The shell provides the frame, the common header,
   * collapse and visibility management, and height allocation. Sections plug
   * in and are each constrained by it.
   *
   * THE PANEL NO LONGER SCROLLS. The Move List never renders fewer than three
   * moves, and the Evaluation Timeline is displayed only where the composition
   * can honour that — so the state §5.4.2 described, where floors cannot all be
   * met, is now unreachable at any permitted window size. The scrolling branch
   * is kept because the contract still promises it; nothing in the shipped
   * composition reaches it.
   */
  import {
    DETAILS_W, TOOLBAR_H, TIMELINE_H, allocateSections, timelineFits
  } from '$lib/game/layout.js';
  import GameSection from './GameSection.svelte';
  import GameControls from './GameControls.svelte';

  let {
    sections = [], plies = [], ply = 0, tree = null, path = [], engine = null, orientation = 'white',
    explorer = null, onselectlibrary, onexplorersettings,
    engineView = null, onengine, onselectengine, onenginelines, onenginedepth,
    onenginesettings,
    info = null, onfavourite, oneditinfo, onedittags, dirty = false, onsave,
    plyCount = 1, playing = false,
    oncollapse, onhide, onselectply, onselectpath,
    onfirst, onprev, onnext, onlast, onflip, onplay,
    sectionsMenu = false, onmore, ontoggleSection, displacedOut
  } = $props();

  let h = $state(0);

  /* Height the panel has for Sections and the Timeline together. */
  const available = $derived(Math.max(0, (h || 560) - TOOLBAR_H));

  /*
    DISPLACEMENT.

    `showing` is state rather than a derived value because the rule has
    hysteresis: the Timeline drops out at the threshold and does not return
    until the window is a little taller, so the answer depends on the previous
    answer. Without that, dragging a window across the threshold pops a 108px
    block in and out on the pixel, relaying the whole panel each time.

    THIS IS NOT `hidden`. A displaced Timeline is one the user still wants and
    the layout has no room for; the user's own visibility is never written to
    here, which is what lets it come back on its own when the window grows.
  */
  let showing = $state(true);
  $effect(() => {
    const t = sections.find((s) => s.id === 'timeline');
    if (!t || t.hidden) { showing = false; return; }
    showing = timelineFits(sections, available, showing);
  });

  const timeline = $derived(sections.find((s) => s.id === 'timeline' && !s.hidden) ?? null);
  const timelineOn = $derived(!!timeline && showing);

  /* Reported upward so the toolbar's Sections menu can say WHY the Timeline is
     not on screen, rather than showing a tick against something absent. */
  $effect(() => { displacedOut?.(!!timeline && !showing); });

  const stackAvailable = $derived(Math.max(0, available - (timelineOn ? TIMELINE_H : 0)));
  const alloc = $derived(allocateSections(sections, stackAvailable));
  const shown = $derived(sections.filter((s) => !s.hidden && !s.anchored));
</script>

<aside class="details" style="width:{DETAILS_W}px" bind:clientHeight={h}>
  <div class="stack" class:scrolls={alloc.scrolls}>
    {#each shown as s (s.id)}
      <GameSection
        section={s}
        height={alloc.heights[s.id]}
        collapsed={!!s.collapsed}
        {plies}
        {ply}
        {tree}
        {path}
        {onselectpath}
        {engine}
        {orientation}
        {explorer}
        {onselectlibrary}
        {onexplorersettings}
        {engineView}
        {onengine}
        {onselectengine}
        {onenginelines}
        {onenginedepth}
        {onenginesettings}
        {info}
        {onfavourite}
        {oneditinfo}
        {onedittags}
        {dirty}
        {onsave}
        {onselectply}
        {oncollapse}
        {onhide}
      />
    {/each}
  </div>

  {#if timelineOn}
    <!--
      ANCHORED, between the stack and the toolbar.

      §5.6.2 calls the Timeline "a transport control that is also a chart", so
      it sits against the transport it drives and the two navigation controls
      read as one group. Being outside `.stack` it is outside the stack's
      scrolling as well — it cannot be scrolled away any more than the toolbar
      can, which is the other half of why it moved here.

      It keeps the common Section header (option A). The alternative was to drop
      it to furniture like the Evaluation Bar, which would have saved its 30px
      but left the playhead evaluation and the collapse control homeless.
    -->
    <div class="anchored">
      <GameSection
        section={timeline}
        height={TIMELINE_H}
        collapsed={!!timeline.collapsed}
        {plies}
        {ply}
        {engine}
        {orientation}
        {onselectply}
        {oncollapse}
        {onhide}
      />
    </div>
  {/if}

  <GameControls {ply} {plyCount} {playing} {sectionsMenu} {sections}
    timelineDisplaced={!!timeline && !showing}
    {ontoggleSection}
    {onfirst} {onprev} {onnext} {onlast} {onflip} {onplay} {onmore} />
</aside>

<style>
  .details {
    flex: none;
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-left: 1px solid var(--rule-strong);
    background: var(--chrome);
    /* §5.2 — fixed width. It does not change with window size. */
  }

  .stack {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /*
    The floors cannot all be honoured, so the shell scrolls rather than
    compressing Sections below them (§5.4.2). The toolbar is outside this box,
    so it stays anchored while the stack scrolls behind it.
  */
  .stack.scrolls { overflow-y: auto; }

  /* Outside .stack, so outside its scrolling. Flush to the toolbar below it. */
  .anchored { flex: none; }
</style>
