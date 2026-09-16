<script>
  import { tick } from 'svelte';
  import Tab from './Tab.svelte';
  import AppMenu from './AppMenu.svelte';
  import TabListMenu from './TabListMenu.svelte';
  import { t } from '$lib/stores/i18n.js';
  import { NEW_TAB_BUTTON } from '$lib/features.js';
  import {
    stripTabs, activeId, allTabs, libraryTab,
    openGame, closeTab, activate
  } from '$lib/stores/tabs.js';
  import { computeLayout } from '$lib/layout.js';
  import Icon from '$lib/components/Icon.svelte';
  import { NewTab, ScrollLeft, ScrollRight, TabList, AppMenuIcon } from '$lib/icons.js';

  let { onnavigate } = $props();

  let barW = $state(0);
  let pinnedW = $state(0);
  let stripEl = $state(null);
  let scrollLeft = $state(0);
  let clientW = $state(0);
  let scrollW = $state(0);

  let menuOpen = $state(false);
  let listOpen = $state(false);

  const n = $derived($stripTabs.length);

  /* Two-stage overflow — see $lib/layout.js. Computed from the normal-state
     budget only, so the decision never depends on the overflow controls it
     would introduce; that feedback loop would oscillate at the boundary. */
  const geo = $derived(computeLayout(barW, pinnedW, n));
  const overflow = $derived(geo.overflow);
  const tabWidth = $derived(geo.tabWidth);

  /* Scroll affordances */
  const canLeft = $derived(overflow && scrollLeft > 1);
  const canRight = $derived(overflow && scrollLeft + clientW < scrollW - 1);

  function readScroll() {
    if (!stripEl) return;
    scrollLeft = stripEl.scrollLeft;
    clientW = stripEl.clientWidth;
    scrollW = stripEl.scrollWidth;
  }

  function onWheel(e) {
    if (!overflow || !stripEl) return;
    const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (d === 0) return;
    e.preventDefault();                 // vertical wheel → horizontal scroll
    stripEl.scrollLeft += d;
    readScroll();
  }

  /*
    §2.1.2 — the button is hidden, and its action is unresolved: it used to
    create an empty Game Workspace, and those were removed on 4 Sep. Throwing
    is deliberate. A silent no-op would let the control be unhidden and look
    broken; this makes the open question loud the moment anyone flips the flag.
  */
  function onNewTab() {
    throw new Error('New Tab Button action is unspecified — see §2.1.2');
  }

  function nudge(dir) {
    if (!stripEl) return;
    stripEl.scrollBy({ left: dir * tabWidth, behavior: 'smooth' });
    setTimeout(readScroll, 260);
  }

  async function scrollActiveIntoView() {
    await tick();
    if (!stripEl || !overflow) return;
    const el = stripEl.querySelector(`[data-tab-id="${CSS.escape($activeId)}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    setTimeout(readScroll, 260);
  }

  // Selecting a tab, or opening a game, scrolls that tab into view. (WF-06)
  $effect(() => { $activeId; scrollActiveIntoView(); });
  $effect(() => { n; tabWidth; tick().then(readScroll); });

  /* Off-screen markers for the tab list. All strip tabs share one width,
     so position is exact without measuring each element. */
  /*
    WF-06b, revised 4 Sep — the dropdown lists the STRIP, not every tab.

    The Library tab is pinned outside the scrolling strip, so it is visible in
    every state the dropdown can appear in. Listing a tab the user can already
    see, and cannot lose, was noise; the dropdown exists to reach tabs that
    scrolling has taken away.

    Off-screen markers went with it. Once the list is only the strip, a row's
    position in the list already matches its position in the strip, and the
    marker was a second answer to a question the order had answered.
  */
  const listRows = $derived($stripTabs.map((tab) => ({ tab })));

  /* Roving focus across the strip (WF-10) */
  function onStripKey(e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const els = [...stripEl.querySelectorAll('[role="tab"]')];
    const i = els.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    const next = els[i + (e.key === 'ArrowRight' ? 1 : -1)];
    if (next) next.focus();
  }

</script>

<div class="tabbar" role="tablist" aria-label={$t('app.name')} bind:clientWidth={barW}>

  <!-- Pinned Library tab — outside the scrolling strip (§2.1.1) -->
  <div class="pinned-slot" bind:clientWidth={pinnedW}>
    <Tab
      tab={libraryTab}
      pinned
      active={$activeId === libraryTab.id}
      onselect={activate}
    />
  </div>

  <!-- Tab Strip -->
  <div
    class="strip"
    class:overflowing={overflow}
    role="presentation"
    bind:this={stripEl}
    onscroll={readScroll}
    onwheel={onWheel}
    onkeydown={onStripKey}
  >
    {#each $stripTabs as tab (tab.id)}
      <Tab
        {tab}
        width={tabWidth}
        active={$activeId === tab.id}
        onselect={activate}
        onclose={closeTab}
      />
    {/each}

    {#if NEW_TAB_BUTTON && !overflow}
      <!-- Normal state: immediately after the last tab, inside the strip (§2.1.2) -->
      <button class="ctl newtab-inline" type="button" title={$t('ctl.newTab')} aria-label={$t('ctl.newTab')} onclick={onNewTab}>
        <Icon icon={NewTab} size={15} />
      </button>
    {/if}
  </div>

  <!-- Tab Bar Controls — order is always [ + ] [ < > ] [ v ] [ menu ] (§2.1.3) -->
  <div class="controls">
    {#if overflow}
      {#if NEW_TAB_BUTTON}
        <button class="ctl" type="button" title={$t('ctl.newTab')} aria-label={$t('ctl.newTab')} onclick={onNewTab}>
          <Icon icon={NewTab} size={15} />
        </button>
      {/if}

      <button class="ctl" type="button" disabled={!canLeft}
              title={$t('ctl.scrollLeft')} aria-label={$t('ctl.scrollLeft')} onclick={() => nudge(-1)}>
        <Icon icon={ScrollLeft} size={15} />
      </button>

      <button class="ctl" type="button" disabled={!canRight}
              title={$t('ctl.scrollRight')} aria-label={$t('ctl.scrollRight')} onclick={() => nudge(1)}>
        <Icon icon={ScrollRight} size={15} />
      </button>

      <button class="ctl" type="button" data-popover-trigger
              aria-expanded={listOpen} aria-haspopup="menu"
              title={$t('ctl.tabList')} aria-label={$t('ctl.tabList')}
              onclick={() => { listOpen = !listOpen; menuOpen = false; }}>
        <Icon icon={TabList} size={15} />
      </button>
    {/if}

    <button class="ctl menu" type="button" data-popover-trigger
            aria-expanded={menuOpen} aria-haspopup="menu"
            title={$t('ctl.menu')} aria-label={$t('ctl.menu')}
            onclick={() => { menuOpen = !menuOpen; listOpen = false; }}>
      <Icon icon={AppMenuIcon} size={16} />
    </button>
  </div>

  {#if menuOpen}
    <AppMenu ondismiss={() => (menuOpen = false)} {onnavigate} />
  {/if}
  {#if listOpen}
    <TabListMenu
      tabs={listRows}
      activeId={$activeId}
      onselect={activate}
      onclose={closeTab}
      ondismiss={() => (listOpen = false)}
    />
  {/if}
</div>

<style>
  .tabbar {
    position: relative;
    display: flex;
    align-items: stretch;
    height: var(--bar-h);
    flex: none;
    background: var(--chrome);
    border-bottom: 1px solid var(--rule-strong);
  }

  .pinned-slot { flex: none; display: flex; }

  .strip {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: stretch;
    overflow-x: hidden;      /* scrolled programmatically; no native scrollbar in chrome */
    overflow-y: hidden;
    scrollbar-width: none;
  }
  .strip.overflowing { overflow-x: auto; }
  .strip::-webkit-scrollbar { height: 0; }

  .controls {
    flex: none;
    display: flex;
    align-items: stretch;
    border-left: 1px solid var(--rule-strong);
    background: var(--chrome);
  }

  .newtab-inline { border-right: 1px solid transparent; }
  .ctl {
    flex: none;
    width: 36px;
    display: grid;
    place-items: center;
    color: var(--muted);
  }
  .ctl:hover:not(:disabled) { background: var(--chrome-2); color: var(--ink); }
  .ctl:disabled { color: var(--faint); cursor: default; }
  .ctl.menu { width: 40px; color: var(--ink-2); }
  /*
    No `.ctl svg` sizing rule. Icons are Lucide components (§7.4) and take
    their size from the `size` prop at the call site; the rules that used to
    be here sized the hand-drawn SVG paths they replaced, matched nothing
    after that change, and Svelte warned about them on every build.
  */

</style>
