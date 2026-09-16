<script>
  /** §3.4.8, §3.4.10 — collection of Cards, Add action, empty state. */
  import { t } from '$lib/stores/i18n.js';
  import ObjectCard from './ObjectCard.svelte';
  import { OBJECT_TYPES } from '$lib/settings/schema.js';
  import { objects, addObject, openDetail } from '$lib/stores/settings.js';

  let { section, heading } = $props();

  const type = $derived(OBJECT_TYPES[section]);
  const items = $derived($objects[section] ?? []);
</script>

<div class="chead">
  <h2>{heading}</h2>
  <!-- §3.4.10 — stays with the heading, available regardless of object count -->
  <button class="add" type="button" onclick={() => addObject(section)}>
    {$t(type.addKey)}
  </button>
</div>

{#if items.length === 0}
  <div class="empty">
    <p>{$t(type.emptyKey)}</p>
    <button class="add" type="button" onclick={() => addObject(section)}>
      {$t(type.addKey)}
    </button>
  </div>
{:else}
  <ul class="grid">
    {#each items as o (o.id)}
      <ObjectCard object={o} onopen={(id) => openDetail(section, id)} />
    {/each}
  </ul>
{/if}

<style>
  .chead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 11px;
    border-bottom: 1px solid var(--rule);
  }
  h2 { margin: 0; font-size: 16px; letter-spacing: -.01em; color: var(--ink); }

  .add {
    flex: none;
    font: 12px var(--sans);
    padding: 7px 12px;
    background: var(--chrome);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    color: var(--ink);
    white-space: nowrap;
  }
  .add:hover { background: var(--chrome-2); }

  /*
    §3.4.10 — cards grow and shrink within bounds and wrap onto new rows.
    The 210px floor yields 2 columns at the 800px minimum window and 3 from
    about 874px; horizontal scrolling never appears.
  */
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  }

  .empty {
    border: 1px dashed var(--rule-strong);
    border-radius: 5px;
    padding: 38px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
  }
  .empty p { margin: 0; font-size: 13px; color: var(--muted); max-width: 42ch; line-height: 1.5; }
</style>
