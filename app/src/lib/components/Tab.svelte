<script>
  import Icon from '$lib/components/Icon.svelte';
  import { CloseTab } from '$lib/icons.js';
  import { t } from '$lib/stores/i18n.js';

  let {
    tab,
    active = false,
    width = null,        // px; null = intrinsic width (pinned tab)
    pinned = false,
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
      type="button"
      tabindex="-1"
      aria-label={$t('tab.closeNamed', { name: label })}
      onclick={closeClick}
    >
      <Icon icon={CloseTab} size={12} />
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
  /* Icon size comes from the `size` prop, not from CSS — see TabBar.svelte. */
</style>
