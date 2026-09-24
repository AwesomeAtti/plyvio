<script>
  import Icon from '$lib/components/Icon.svelte';
  import { CloseTab } from '$lib/icons.js';
  import { t } from '$lib/stores/i18n.js';

  let {
    tab,
    active = false,
    width = null,        // px; null = intrinsic width (pinned tab)
    pinned = false,
    dirty = false,        // unsaved edits (analysis-board-plan.md, Stage 1)
    onselect,
    onclose
  } = $props();

  const label = $derived(tab.title ?? ($t(tab.titleKey) + (tab.titleSuffix ?? '')));

  function keydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onselect?.(tab.id);
    }
  }

  function closeClick(e) {
    e.stopPropagation();          // Svelte 5 removed event modifiers
    onclose?.(tab.id);
  }
</script>

<div
  class="tab"
  class:active
  class:pinned
  style={width ? `width:${width}px` : ''}
  role="tab"
  aria-selected={active}
  aria-controls="workspace-area"
  tabindex={active ? 0 : -1}
  data-tab-id={tab.id}
  title={label}
  onclick={() => onselect?.(tab.id)}
  onkeydown={keydown}
  onmousedown={(e) => { if (e.button === 1) e.preventDefault(); }}
  onauxclick={(e) => { if (e.button === 1 && tab.closable) { e.preventDefault(); onclose?.(tab.id); } }}
>
  <span class="glyph" class:game={tab.kind === 'game'} aria-hidden="true"></span>
  <span class="label">{label}</span>

  {#if tab.closable}
    <button
      class="close"
      class:dirty
      type="button"
      tabindex="-1"
      aria-label={$t('tab.closeNamed', { name: label })}
      title={dirty ? $t('tab.confirmUnsavedBody') : null}
      onclick={closeClick}
    >
      <!--
        Dirty → the × is replaced by a filled dot (VS Code's own pattern);
        hovering or focusing swaps it back so the tab can still be closed —
        that swap doesn't bypass the close-time confirmation, it just says
        "you can still click here." Both are always in the DOM so the swap
        is a CSS-only opacity change, not a re-render on every hover.
      -->
      <span class="dot" aria-hidden="true"></span>
      <span class="xicon"><Icon icon={CloseTab} size={12} /></span>
    </button>
  {/if}
</div>

<style>
  .tab {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    height: var(--bar-h);
    padding: 0 10px;
    background: var(--chrome);
    border-right: 1px solid var(--rule);
    color: var(--muted);
    overflow: hidden;
    white-space: nowrap;
    user-select: none;
    cursor: default;
    position: relative;
  }
  .tab:hover { background: var(--chrome-2); color: var(--ink-2); }

  .tab.active { background: var(--surface); color: var(--ink); }
  .tab.active::after {
    content: "";
    position: absolute;
    inset: auto 0 0 0;
    height: 2px;
    background: var(--ink);
  }

  .tab.pinned {
    background: var(--surface);
    border-right: 1px solid var(--rule-strong);
    color: var(--ink-2);
    padding: 0 14px;
  }
  .tab.pinned:hover { background: var(--surface); }
  .tab.pinned.active { color: var(--ink); }

  /* Reserved space — never truncates at any tab width. (WF-02) */
  .glyph {
    flex: none;
    width: 9px; height: 9px;
    border: 1.5px solid currentColor;
    border-radius: 50%;
    opacity: .55;
  }
  .glyph.game { border-radius: 2px; }

  .label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;   /* the only element that absorbs the shrink */
    font-size: 12.5px;
  }

  .close {
    flex: none;
    width: 17px; height: 17px;
    display: grid;
    place-items: center;
    border-radius: 3px;
    color: var(--faint);
  }
  .close:hover { background: var(--chrome-3); color: var(--ink); }

  /* Dirty: dot shows, × hidden -- until hover/focus swaps them back. */
  .close .dot { display: none; }
  .close.dirty .dot {
    display: block;
    width: 7px; height: 7px;
    border-radius: 50%;
    background: currentColor;
    color: var(--ink-2);
  }
  .close.dirty:hover .dot, .close.dirty:focus-visible .dot { display: none; }
  .close.dirty .xicon { display: none; }
  .close.dirty:hover .xicon, .close.dirty:focus-visible .xicon { display: grid; }
  /* Icon size comes from the `size` prop, not from CSS — see TabBar.svelte. */
</style>
