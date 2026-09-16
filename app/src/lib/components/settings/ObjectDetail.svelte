<script>
  import Icon from '$lib/components/Icon.svelte';
  import { ScrollLeft as BackArrow, Checked } from '$lib/icons.js';
  /**
   * §3.4.9 — Detail/Edit View. Replaces the collection inside the Content Area
   * only; the Sidebar stays live so the user can leave sideways at any time.
   *
   * Auto-apply (approved 3 Sep): every field commits on change or blur. There
   * is no Save and no Cancel, so no exit route can strand unsaved work. The
   * "applied" indicator exists because removing Save removes the signal that
   * normally tells the user their change stuck.
   */
  import { t } from '$lib/stores/i18n.js';
  import SettingRow from './SettingRow.svelte';
  import ConfirmRemove from './ConfirmRemove.svelte';
  import { OBJECT_TYPES } from '$lib/settings/schema.js';
  import { objects, applyField, removeObject, closeDetail } from '$lib/stores/settings.js';

  let { section, id, sectionLabel } = $props();

  let errors = $state({});
  let showApplied = $state(false);
  let confirming = $state(false);
  let appliedTimer;

  const type = $derived(OBJECT_TYPES[section]);
  const object = $derived(($objects[section] ?? []).find((o) => o.id === id) ?? null);

  function commit(fieldId, value) {
    const err = applyField(section, id, fieldId, value);
    errors = { ...errors, [fieldId]: err };
    if (!err) {
      showApplied = true;
      clearTimeout(appliedTimer);
      appliedTimer = setTimeout(() => (showApplied = false), 1800);
    }
  }
</script>

{#if object}
  <div class="chead">
    <h2>
      <button class="crumb" type="button" onclick={closeDetail}><Icon icon={BackArrow} size={13} /> {sectionLabel}</button>
      <span class="sep" aria-hidden="true">/</span>
      <span class="name">{object.name}</span>
    </h2>
    <div class="actions">
      <!--
        §7.4 — the mark is a bundled glyph, not a character. It was
        '✓ ' + t('settings.applied'), which broke three clauses at once:
        U+2713 is outside the bundled latin subsets so the OS drew it; §8
        forbids assembling text from concatenated fragments; and the character
        sat inside the live region, so it was announced as well as drawn.

        The icon is now a sibling of the text and aria-hidden, leaving the live
        region to announce the localised string and nothing else.
      -->
      <span class="applied" class:show={showApplied}>
        {#if showApplied}<Icon icon={Checked} size={13} />{/if}
        <span aria-live="polite">{showApplied ? $t('settings.applied') : ''}</span>
      </span>
      <button class="btn" type="button" onclick={closeDetail}>{$t('settings.done')}</button>
    </div>
  </div>

  <div class="scroll">
    <div class="rows">
      {#each type.fields as f (f.id)}
        <SettingRow
          label={$t(f.labelKey)}
          type={f.type}
          options={f.options ?? []}
          value={object[f.id]}
          error={errors[f.id] ?? null}
          oncommit={(v) => commit(f.id, v)}
        />
      {/each}
    </div>

    <div class="danger-zone">
      <button class="remove" type="button" onclick={() => (confirming = true)}>
        {$t('settings.remove')}
      </button>
    </div>

    {#if confirming}
      <ConfirmRemove
        name={object.name}
        onconfirm={() => { confirming = false; removeObject(section, id); }}
        oncancel={() => (confirming = false)}
      />
    {/if}
  </div>
{/if}

<style>
  /* §3.4.12 — pinned, like every other section's heading. */
  .chead {
    flex: none;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 22px;
    border-bottom: 1px solid var(--rule);
  }

  /* The Detail View's scrolling region. */
  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 18px 22px 22px;
  }
  h2 {
    margin: 0;
    font-size: 16px;
    letter-spacing: -.01em;
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }
  .crumb {
    font: inherit;
    font-weight: 400;
    color: var(--muted);
    white-space: nowrap;
  }
  .crumb:hover { color: var(--ink); text-decoration: underline; }
  .sep { color: var(--faint); font-weight: 400; }
  .name { color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .actions { flex: none; display: flex; align-items: center; gap: 10px; }
  .applied {
    display: inline-flex; align-items: center; gap: 5px;
    font: 10px/1 var(--mono);
    color: var(--muted);
    white-space: nowrap;
    opacity: 0;
    transition: opacity .15s ease;
    min-width: 130px;
    text-align: right;
  }
  .applied.show { opacity: 1; }
  @media (prefers-reduced-motion: reduce) { .applied { transition: none; } }

  .btn {
    font: 12px var(--sans);
    padding: 7px 13px;
    background: var(--chrome);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    color: var(--ink);
  }
  .btn:hover { background: var(--chrome-2); }

  .rows {
    border: 1px solid var(--rule);
    border-radius: 5px;
    overflow: hidden;
  }

  .danger-zone { display: flex; }
  .remove {
    font: 12px var(--sans);
    padding: 7px 13px;
    background: transparent;
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    color: var(--danger);
  }
  .remove:hover { background: var(--danger); border-color: var(--danger); color: #fff; }
</style>
