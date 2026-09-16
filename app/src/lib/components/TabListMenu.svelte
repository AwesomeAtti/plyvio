<script>
  /*
    WF-06b — tab-list dropdown. Rendered only while the strip overflows.

    Revised 4 Sep: lists the STRIP only — the pinned Library tab is always
    visible and cannot be lost, so it is not here. Each row shows the tab's
    name and nothing else, truncating when it must; the off-screen and pinned
    labels are gone. The active tab keeps its tick, and closable tabs keep
    their close control, because those are state and action rather than label.
  */
  import Popover from './Popover.svelte';
  import MenuItem from './MenuItem.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { CloseTab, Checked } from '$lib/icons.js';
  import { t } from '$lib/stores/i18n.js';

  let { tabs = [], activeId, onselect, onclose, ondismiss } = $props();

  function title(tab) {
    return tab.title ?? ($t(tab.titleKey) + (tab.titleSuffix ?? ''));
  }

  function pick(id) {
    onselect?.(id);
    ondismiss?.();
  }

  function close(e, id) {
    e.stopPropagation();
    onclose?.(id);
  }
</script>

<Popover {ondismiss}>
  <MenuItem kind="label">{$t('tablist.heading')} · {tabs.length}</MenuItem>

  {#each tabs as row (row.tab.id)}
    <div class="row">
      <button class="pick" type="button" role="menuitem" onclick={() => pick(row.tab.id)}>
        <span class="txt" title={title(row.tab)}>{title(row.tab)}</span>
        {#if row.tab.id === activeId}
          <span class="tick"><Icon icon={Checked} size={13} /></span>
        {/if}
      </button>

      {#if row.tab.closable}
        <button
          class="x"
          type="button"
          aria-label={$t('tab.closeNamed', { name: title(row.tab) })}
          onclick={(e) => close(e, row.tab.id)}
        >
          <Icon icon={CloseTab} size={12} />
        </button>
      {:else}
        <span class="x-spacer" aria-hidden="true"></span>
      {/if}
    </div>
  {/each}
</Popover>

<style>
  .row { display: flex; align-items: stretch; gap: 2px; }
  .row:hover { background: var(--chrome-2); border-radius: 4px; }

  .pick {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 6px 8px 10px;
    border-radius: 4px;
    font-size: 13px;
    text-align: left;
  }
  .txt { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tick { flex: none; display: grid; place-items: center; color: var(--ink); }
  .x {
    flex: none;
    width: 24px;
    display: grid;
    place-items: center;
    border-radius: 4px;
    color: var(--faint);
  }
  .x:hover { background: var(--chrome-3); color: var(--danger); }
  .x-spacer { flex: none; width: 24px; }
</style>
