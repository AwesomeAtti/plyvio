<script>
  /**
   * Library Sidebar — §3.2.3
   *
   * 220px expanded, 56px collapsed rail. Navigation only: subscriptions are
   * configured in Settings, and this is a view of them (§3.2.3.3).
   *
   * Collapsed, bounded destinations keep individual icons while the three
   * unbounded groups collapse to one icon each, whose members live in a
   * click-opened flyout (§3.2.3.7).
   */
  import { t } from '$lib/stores/i18n.js';
  import { openSettings } from '$lib/stores/tabs.js';
  import { selectSection } from '$lib/stores/settings.js';
  import Icon from '$lib/components/Icon.svelte';
  import LibrarySwitcher from './LibrarySwitcher.svelte';
  import ChessComMark from '$lib/components/icons/ChessComMark.svelte';
  import LichessMark from '$lib/components/icons/LichessMark.svelte';
  import {
    AllGames, Favorites, Recent, Feed, Collection, SmartCollection, TagIcon,
    TrashIcon, CollapseSidebar, ExpandSidebar, Syncing, SyncError, MoreIcon, AddGames,
    SectionCollapse, SectionExpand
  } from '$lib/icons.js';
  import {
    selection, selectSidebar, counts, sidebarCollapsed, toggleSidebar,
    collections, tags, offline,
    visibleSubscriptions, overflowSubscriptions, pinSubscription,
    sectionCollapsed, toggleSection
  } from '$lib/stores/library.js';

  let flyout = $state(null);      // 'subscriptions' | 'collections' | 'tags' | null
  let morePopover = $state(false);
  let rootEl;

  const is = (kind, id) =>
    $selection.kind === kind && (id === undefined || $selection.id === id);

  /** §3.2.3.6 — a count never truncates; five digits or more abbreviate. */
  function fmtCount(n) {
    if (!n) return '';
    return n > 9999 ? '9k+' : n.toLocaleString();
  }

  /** §3.2.3.3 — error ▸ syncing ▸ new count ▸ nothing. */
  function slotOf(sub) {
    if ($offline && sub.state !== 'error') {
      // Offline is not an error; prior state is retained (§3.2.3.3).
      return sub.count > 0 ? { cls: 'cnt', text: fmtCount(sub.count) } : { cls: '', text: '' };
    }
    // §3.2.3.3 — these were '⚠' and '⟳', neither of which exists in the
    // bundled fonts; they were being drawn by the OS fallback.
    if (sub.state === 'error')   return { cls: 'err',  icon: SyncError, label: $t('lib.error') };
    if (sub.state === 'syncing') return { cls: 'sync', icon: Syncing,   label: $t('lib.syncing') };
    if (sub.count > 0)           return { cls: 'cnt',  text: fmtCount(sub.count),
                                          label: $t('lib.newGames', { n: sub.count }) };
    return { cls: '', text: '' };
  }

  /** §3.2.3.3 — the source mark, not a generic feed icon. */
  const SOURCE_MARK = { chesscom: ChessComMark, lichess: LichessMark };
  const markOf = (sub) => SOURCE_MARK[sub.source] ?? null;

  const allSubs = $derived($visibleSubscriptions.concat($overflowSubscriptions));
  const anyNew = $derived(allSubs.some((s) => s.count > 0));

  /**
   * §3.2.3.1 — what a folded heading shows in its trailing slot.
   *
   * Folding must not hide a fault. A group that is closed while one of its
   * Subscriptions is erroring would silently swallow the only place that
   * error is reported, so the heading inherits the same precedence its rows
   * use (§3.2.3.3): error ▸ syncing ▸ item count. Collections and Tags have
   * no states, so they fall straight through to the count.
   *
   * Open headings show nothing. The counts are on the rows, one row below.
   */
  function headSlot(name) {
    if (!$sectionCollapsed[name]) return { cls: '', text: '' };
    if (name === 'subscriptions' && !$offline) {
      if (allSubs.some((s) => s.state === 'error'))
        return { cls: 'err', icon: SyncError, label: $t('lib.error') };
      if (allSubs.some((s) => s.state === 'syncing'))
        return { cls: 'sync', icon: Syncing, label: $t('lib.syncing') };
    }
    const n = name === 'subscriptions' ? allSubs.length
            : name === 'collections'   ? $collections.length
            : $tags.length;
    return { cls: 'cnt', text: fmtCount(n) };
  }

  function pick(sel) {
    selectSidebar(sel);
    flyout = null;
    morePopover = false;
  }

  function onKeydown(e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...rootEl.querySelectorAll('[data-nav]')];
    const i = items.indexOf(e.currentTarget);
    if (i === -1) return;
    e.preventDefault();
    const next = items[i + (e.key === 'ArrowDown' ? 1 : -1)];
    if (next) next.focus();
  }

  function dismiss(e) {
    if (e.key === 'Escape') { flyout = null; morePopover = false; }
  }

  $effect(() => {
    const onDoc = (e) => {
      if (rootEl && !rootEl.contains(e.target)) { flyout = null; morePopover = false; }
    };
    document.addEventListener('pointerdown', onDoc, true);
    document.addEventListener('keydown', dismiss, true);
    return () => {
      document.removeEventListener('pointerdown', onDoc, true);
      document.removeEventListener('keydown', dismiss, true);
    };
  });
</script>

<div class="side" class:rail={$sidebarCollapsed} bind:this={rootEl}>

  <!--
    §3.2.3.8 — the collapse control sits in the Sidebar it controls, and
    occupies the same slot in both states.

    The header carries no title of its own — the switcher names the library,
    which is the only title this panel needs. The row matches the Content
    Toolbar's 40px, which is what lets the rail's icons line up with the
    content beside them.
  -->
  <div class="head">
    {#if !$sidebarCollapsed}
      <!--
        Library switcher, Option A (§3.2.3.10) — fills the header, collapse
        trails it. The truncation budget is derived in switcher.js from this
        header's own measurements, not passed as a literal.
      -->
      <LibrarySwitcher />
    {/if}
    <button
      class="tog"
      type="button"
      aria-expanded={!$sidebarCollapsed}
      aria-label={$sidebarCollapsed ? $t('lib.expand') : $t('lib.collapse')}
      title={$sidebarCollapsed ? $t('lib.expand') : $t('lib.collapse')}
      onclick={toggleSidebar}
    ><Icon icon={$sidebarCollapsed ? ExpandSidebar : CollapseSidebar} size={15} /></button>
  </div>

  <nav class="body" aria-label={$t('lib.nav')}>
    {#if !$sidebarCollapsed}
      <!--
        NO "LIBRARY" HEADING (§3.2.3.1, removed 5 Sep).

        It labelled nothing. The tab is called Library, the switcher above
        names the library, and these three rows are the only ones that could
        be meant — a heading that repeats its container is decoration. The
        three views now open the panel directly, which is also what makes
        them the group that does NOT fold: they are always the fallback.
      -->
      <button class="it" class:on={is('all')} data-nav type="button" onkeydown={onKeydown}
              onclick={() => pick({ kind: 'all' })} title={$t('lib.allGames')}>
        <Icon icon={AllGames} /><span class="nm">{$t('lib.allGames')}</span>
        <span class="slot">{fmtCount($counts.all)}</span>
      </button>
      <button class="it" class:on={is('favorites')} data-nav type="button" onkeydown={onKeydown}
              onclick={() => pick({ kind: 'favorites' })} title={$t('lib.favorites')}>
        <Icon icon={Favorites} /><span class="nm">{$t('lib.favorites')}</span>
        <span class="slot">{fmtCount($counts.favorites)}</span>
      </button>
      <button class="it" class:on={is('recent')} data-nav type="button" onkeydown={onKeydown}
              onclick={() => pick({ kind: 'recent' })} title={$t('lib.recentlyAdded')}>
        <Icon icon={Recent} /><span class="nm">{$t('lib.recentlyAdded')}</span>
        <span class="slot">{fmtCount($counts.recent)}</span>
      </button>

      <!--
        §3.2.3.1 — the three unbounded groups fold. The heading is the control:
        a whole-width button, so the target is the row rather than the 12px
        chevron. `aria-controls` ties it to the list it opens.
      -->
      {@const subsSlot = headSlot('subscriptions')}
      <button class="grp" type="button" data-nav onkeydown={onKeydown} data-section="subscriptions"
              aria-expanded={!$sectionCollapsed.subscriptions}
              aria-controls="grp-subscriptions"
              title={$sectionCollapsed.subscriptions ? $t('lib.expandSection') : $t('lib.collapseSection')}
              onclick={() => toggleSection('subscriptions')}>
        <Icon icon={$sectionCollapsed.subscriptions ? SectionExpand : SectionCollapse} size={12} />
        <span class="gl">{$t('lib.subscriptions')}</span>
        <span class="slot {subsSlot.cls}" aria-label={subsSlot.label ?? undefined}>
          {#if subsSlot.icon}<Icon icon={subsSlot.icon} size={12} label={subsSlot.label} />{:else}{subsSlot.text}{/if}
        </span>
      </button>
      <div id="grp-subscriptions">
        {#if !$sectionCollapsed.subscriptions}
          {#each $visibleSubscriptions as sub (sub.id)}
            {@const slot = slotOf(sub)}
            {@const Mark = markOf(sub)}
            <button class="it" class:on={is('subscription', sub.id)} data-nav type="button"
                    onkeydown={onKeydown} onclick={() => pick({ kind: 'subscription', id: sub.id })}
                    title={sub.name}>
              {#if Mark}<Mark size={16} />{/if}<span class="nm">{sub.name}</span>
              <span class="slot {slot.cls}" aria-label={slot.label ?? undefined}>
                {#if slot.icon}<Icon icon={slot.icon} size={12} label={slot.label} />{:else}{slot.text ?? ''}{/if}
              </span>
            </button>
          {/each}
          {#if $overflowSubscriptions.length}
            <button class="it act" data-nav type="button" onkeydown={onKeydown}
                    aria-expanded={morePopover}
                    onclick={() => (morePopover = !morePopover)}>
              <Icon icon={MoreIcon} /><span class="nm">{$t('lib.more')}</span>
              <span class="slot"></span>
            </button>
          {/if}
          <button class="it act" data-nav type="button" onkeydown={onKeydown}
                  onclick={() => { openSettings(); flyout = null; }}>
            <Icon icon={AddGames} /><span class="nm">{$t('lib.addSubscription')}</span>
            <span class="slot"></span>
          </button>
        {/if}
      </div>

      {@const collSlot = headSlot('collections')}
      <button class="grp" type="button" data-nav onkeydown={onKeydown} data-section="collections"
              aria-expanded={!$sectionCollapsed.collections}
              aria-controls="grp-collections"
              title={$sectionCollapsed.collections ? $t('lib.expandSection') : $t('lib.collapseSection')}
              onclick={() => toggleSection('collections')}>
        <Icon icon={$sectionCollapsed.collections ? SectionExpand : SectionCollapse} size={12} />
        <span class="gl">{$t('lib.collections')}</span>
        <span class="slot {collSlot.cls}">{collSlot.text}</span>
      </button>
      <div id="grp-collections">
        {#if !$sectionCollapsed.collections}
          {#each $collections as c (c.id)}
            <button class="it" class:on={is('collection', c.id)} data-nav type="button"
                    onkeydown={onKeydown} onclick={() => pick({ kind: 'collection', id: c.id })}
                    title={c.name}>
              <Icon icon={c.smart ? SmartCollection : Collection} />
              <span class="nm">{c.name}</span>
              <span class="slot">{fmtCount($counts.collection[c.id])}</span>
            </button>
          {/each}
          <button class="it act" data-nav type="button" onkeydown={onKeydown}>
            <Icon icon={AddGames} /><span class="nm">{$t('lib.newCollection')}</span>
            <span class="slot"></span>
          </button>
        {/if}
      </div>

      {@const tagSlot = headSlot('tags')}
      <button class="grp" type="button" data-nav onkeydown={onKeydown} data-section="tags"
              aria-expanded={!$sectionCollapsed.tags}
              aria-controls="grp-tags"
              title={$sectionCollapsed.tags ? $t('lib.expandSection') : $t('lib.collapseSection')}
              onclick={() => toggleSection('tags')}>
        <Icon icon={$sectionCollapsed.tags ? SectionExpand : SectionCollapse} size={12} />
        <span class="gl">{$t('lib.tags')}</span>
        <span class="slot {tagSlot.cls}">{tagSlot.text}</span>
      </button>
      <div id="grp-tags">
        {#if !$sectionCollapsed.tags}
          {#each $tags as tg (tg.id)}
            <button class="it" class:on={is('tag', tg.id)} data-nav type="button"
                    onkeydown={onKeydown} onclick={() => pick({ kind: 'tag', id: tg.id })}
                    title={tg.name}>
              <Icon icon={TagIcon} /><span class="nm">{tg.name}</span>
              <span class="slot">{fmtCount($counts.tag[tg.id])}</span>
            </button>
          {/each}
        {/if}
      </div>

    {:else}
      <!--
        NO LIBRARY SWITCHER IN THE RAIL (§3.2.3.10, removed 4 Sep).

        A single `database` glyph is the same glyph for every library, so it
        could not answer the only question a collapsed switcher exists to
        answer — which library is open. It offered a way to CHANGE scope while
        being unable to SHOW it, which is the wrong half.

        The rail is filters within the current library. Switching the library
        expands the Sidebar first.
      -->

      <!-- Collapsed rail: individual icons for bounded destinations only. -->
      <button class="rail-it" class:on={is('all')} data-nav type="button" onkeydown={onKeydown}
              onclick={() => pick({ kind: 'all' })} title={$t('lib.allGames')}
              aria-label={$t('lib.allGames')}><Icon icon={AllGames} size={18} /></button>
      <button class="rail-it" class:on={is('favorites')} data-nav type="button" onkeydown={onKeydown}
              onclick={() => pick({ kind: 'favorites' })} title={$t('lib.favorites')}
              aria-label={$t('lib.favorites')}><Icon icon={Favorites} size={18} /></button>
      <button class="rail-it" class:on={is('recent')} data-nav type="button" onkeydown={onKeydown}
              onclick={() => pick({ kind: 'recent' })} title={$t('lib.recentlyAdded')}
              aria-label={$t('lib.recentlyAdded')}><Icon icon={Recent} size={18} /></button>

      <div class="rail-sep"></div>

      <button class="rail-it" class:on={is('subscription')} class:open={flyout === 'subscriptions'}
              data-nav type="button" onkeydown={onKeydown} aria-expanded={flyout === 'subscriptions'}
              onclick={() => (flyout = flyout === 'subscriptions' ? null : 'subscriptions')}
              title={$t('lib.subscriptions')} aria-label={$t('lib.subscriptions')}>
        <Icon icon={Feed} size={18} />
        {#if anyNew && !$offline}<span class="dot" aria-hidden="true"></span>{/if}
      </button>
      <button class="rail-it" class:on={is('collection')} class:open={flyout === 'collections'}
              data-nav type="button" onkeydown={onKeydown} aria-expanded={flyout === 'collections'}
              onclick={() => (flyout = flyout === 'collections' ? null : 'collections')}
              title={$t('lib.collections')} aria-label={$t('lib.collections')}>
        <Icon icon={Collection} size={18} />
      </button>
      <button class="rail-it" class:on={is('tag')} class:open={flyout === 'tags'}
              data-nav type="button" onkeydown={onKeydown} aria-expanded={flyout === 'tags'}
              onclick={() => (flyout = flyout === 'tags' ? null : 'tags')}
              title={$t('lib.tags')} aria-label={$t('lib.tags')}>
        <Icon icon={TagIcon} size={18} />
      </button>
    {/if}
  </nav>

  <!-- Trash is anchored to the bottom, outside the scrolling flow (§3.2.3.1). -->
  <div class="foot">
    {#if $sidebarCollapsed}
      <button class="rail-it" class:on={is('trash')} data-nav type="button" onkeydown={onKeydown}
              onclick={() => pick({ kind: 'trash' })} title={$t('lib.trash')}
              aria-label={$t('lib.trash')}><Icon icon={TrashIcon} size={18} /></button>
    {:else}
      <button class="it" class:on={is('trash')} data-nav type="button" onkeydown={onKeydown}
              onclick={() => pick({ kind: 'trash' })} title={$t('lib.trash')}>
        <Icon icon={TrashIcon} /><span class="nm">{$t('lib.trash')}</span>
        <span class="slot">{fmtCount($counts.trash)}</span>
      </button>
    {/if}
  </div>

  <!-- More… popover: same component role as the rail flyout (§3.2.3.3). -->
  {#if morePopover}
    <div class="fly more" role="menu">
      <div class="fh">{$t('lib.subscriptions')}</div>
      {#each $overflowSubscriptions as sub (sub.id)}
        {@const slot = slotOf(sub)}
        {@const Mark = markOf(sub)}
        <button class="it" type="button" role="menuitem" title={sub.name}
                onclick={() => { pinSubscription(sub.id); morePopover = false; }}>
          {#if Mark}<Mark size={16} />{/if}<span class="nm">{sub.name}</span>
          <span class="slot {slot.cls}">
            {#if slot.icon}<Icon icon={slot.icon} size={12} label={slot.label} />{:else}{slot.text ?? ''}{/if}
          </span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Rail flyouts carry the same list as the expanded group (§3.2.3.7). -->
  {#if flyout}
    <div class="fly rail-fly" role="menu">
      {#if flyout === 'subscriptions'}
        <div class="fh">{$t('lib.subscriptions')}</div>
        {#each $visibleSubscriptions.concat($overflowSubscriptions) as sub (sub.id)}
          {@const slot = slotOf(sub)}
          {@const Mark = markOf(sub)}
          <button class="it" class:on={is('subscription', sub.id)} type="button" role="menuitem"
                  title={sub.name} onclick={() => pick({ kind: 'subscription', id: sub.id })}>
            {#if Mark}<Mark size={16} />{/if}<span class="nm">{sub.name}</span>
            <span class="slot {slot.cls}">
            {#if slot.icon}<Icon icon={slot.icon} size={12} label={slot.label} />{:else}{slot.text ?? ''}{/if}
          </span>
          </button>
        {/each}
        <button class="it act" type="button" role="menuitem"
                onclick={() => { openSettings(); flyout = null; }}>
          <Icon icon={AddGames} /><span class="nm">{$t('lib.addSubscription')}</span>
          <span class="slot"></span>
        </button>
      {:else if flyout === 'collections'}
        <div class="fh">{$t('lib.collections')}</div>
        {#each $collections as c (c.id)}
          <button class="it" class:on={is('collection', c.id)} type="button" role="menuitem"
                  title={c.name} onclick={() => pick({ kind: 'collection', id: c.id })}>
            <Icon icon={c.smart ? SmartCollection : Collection} />
            <span class="nm">{c.name}</span>
            <span class="slot">{fmtCount($counts.collection[c.id])}</span>
          </button>
        {/each}
        <button class="it act" type="button" role="menuitem">
          <Icon icon={AddGames} /><span class="nm">{$t('lib.newCollection')}</span>
          <span class="slot"></span>
        </button>
      {:else}
        <div class="fh">{$t('lib.tags')}</div>
        {#each $tags as tg (tg.id)}
          <button class="it" class:on={is('tag', tg.id)} type="button" role="menuitem"
                  title={tg.name} onclick={() => pick({ kind: 'tag', id: tg.id })}>
            <Icon icon={TagIcon} /><span class="nm">{tg.name}</span>
            <span class="slot">{fmtCount($counts.tag[tg.id])}</span>
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .side {
    position: relative;
    flex: none;
    width: var(--library-sidebar-w);
    border-right: 1px solid var(--rule-strong);
    background: var(--chrome);
    display: flex;
    flex-direction: column;
    /*
      NOT overflow:hidden. The rail flyout is positioned at left:60px, outside
      this 56px box, so clipping here removes it entirely — it renders, it is
      just invisible. `.body` owns the scrolling and does its own clipping,
      which is all that was wanted.
    */
    overflow: visible;
  }
  .side.rail { width: var(--rail-w); }

  /* 40px — the Content Toolbar's height (§3.2.4.1), so the two regions share
     a baseline and the rail's icons align with the content beside them. */
  .head {
    flex: none;
    height: 40px;
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-end;
    padding: 0 6px 0 8px;
    border-bottom: 1px solid var(--rule);
  }
  .side.rail .head { justify-content: center; padding: 0; }
  .tog {
    flex: none;
    width: 20px; height: 20px;
    display: grid; place-items: center;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--surface);
    color: var(--muted);
    font: 11px/1 var(--mono);
  }
  .tog:hover { background: var(--chrome-2); color: var(--ink); }

  /* 7px, not 5: the first row is now a destination rather than a heading, so
     it needs the breathing room the heading's own top padding used to give. */
  .body { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 7px 0 5px; }
  .foot { flex: none; border-top: 1px solid var(--rule); padding: 4px 0; }

  /*
    §3.2.3.1 — the group heading is the disclosure control.

    It stays a heading first: same 9px mono caps, same faint colour, no button
    chrome. The chevron is the only addition, and it is nearly invisible until
    the pointer arrives, so a panel at rest reads as three labels rather than
    three controls. The click target is the full row, not the 12px glyph.
  */
  .grp {
    display: flex;
    align-items: center;
    gap: 5px;
    width: 100%;
    font: 9px/1 var(--mono);
    letter-spacing: .13em;
    text-transform: uppercase;
    color: var(--faint);
    padding: 11px 8px 6px 9px;
    text-align: left;
  }
  .grp .gl { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .grp:hover { color: var(--muted); }
  .grp:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; border-radius: 3px; }

  /*
    Faint at rest, full on hover or keyboard focus. `visibility` is not used:
    the glyph must hold its 12px whatever its state, or every heading shifts
    2px sideways as the pointer crosses it.
  */
  .grp :global(svg) {
    flex: none;
    opacity: .28;
    transition: opacity .12s ease;
  }
  .grp:hover :global(svg),
  .grp:focus-visible :global(svg) { opacity: .85; }
  /* A folded group keeps its chevron up, since it is now the only thing
     saying the rows below are missing rather than absent. */
  .grp[aria-expanded="false"] :global(svg) { opacity: .6; }

  /* The heading's trailing slot is narrower than a row's: it carries a group
     total, never a five-digit game count. */
  .grp .slot { width: 26px; font-size: 9px; }
  .grp .slot :global(svg) { opacity: 1; }
  /* Muted, not ink: a group total is context for a folded heading, not a
     figure competing with the row counts it stands in for. */
  .grp .slot.cnt { color: var(--muted); }

  .it {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 26px;
    padding: 0 8px 0 12px;
    font-size: 12.5px;
    color: var(--muted);
    white-space: nowrap;
    text-align: left;
  }
  .it:hover { background: var(--chrome-2); color: var(--ink-2); }
  .it.on { background: var(--surface); color: var(--ink); font-weight: 600; }
  .it.on::before {
    content: "";
    position: absolute;
    left: 0; top: 3px; bottom: 3px;
    width: 3px;
    background: var(--ink);
  }
  .it.act { color: var(--muted); font-style: italic; }

  .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }

  /* §3.2.3.6 — fixed 34px, right-aligned; the name yields, never the count. */
  .slot {
    flex: none;
    width: 34px;
    text-align: right;
    font: 10px/1 var(--mono);
    color: var(--faint);
    font-variant-numeric: tabular-nums;
  }
  .slot :global(svg) { display: inline-block; vertical-align: -2px; }
  .slot.cnt  { color: var(--ink); }
  .slot.err  { color: var(--danger); }
  .slot.sync { color: var(--ink-2); }

  /*
    The eight hand-drawn shapes here were border-radius approximations of
    icons. They are replaced by Lucide (see $lib/icons.js); what remains is
    the sizing and the selected-state emphasis, applied to whatever SVG the
    row renders.
  */
  .it :global(svg), .rail-it :global(svg) { flex: none; opacity: .62; }
  .it.on :global(svg), .rail-it.on :global(svg) { opacity: 1; }

  .rail-it {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 34px;
    color: var(--muted);
  }
  .rail-it:hover { background: var(--chrome-2); color: var(--ink-2); }
  .rail-it.on, .rail-it.open { background: var(--surface); color: var(--ink); }
  .rail-it.on::before {
    content: "";
    position: absolute;
    left: 0; top: 4px; bottom: 4px;
    width: 3px;
    background: var(--ink);
  }
  /* `.ic` was the div-with-a-border-radius that stood in for an icon before
     Lucide. Nothing renders that class now. */

  /* Presence only — counts never appear in the rail (§3.2.3.6). */
  .dot {
    position: absolute;
    top: 6px; right: 12px;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--ink);
  }
  .rail-sep { height: 1px; background: var(--rule); margin: 6px 10px; }

  .fly {
    position: absolute;
    z-index: 30;
    min-width: 214px;
    max-width: 260px;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 6px;
    box-shadow: var(--shadow);
    padding: 4px;
  }
  .fly.rail-fly { left: calc(var(--rail-w) + 4px); top: 48px; }
  .fly.more { left: 8px; right: 8px; top: 130px; min-width: 0; }
  .fly .it { border-radius: 4px; }
  .fly .fh {
    font: 9px/1 var(--mono);
    letter-spacing: .13em;
    text-transform: uppercase;
    color: var(--faint);
    padding: 7px 9px 5px;
  }
</style>
