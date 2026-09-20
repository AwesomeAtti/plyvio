<script>
  /**
   * Auto-apply means there is no Cancel to walk a mistake back, so removal —
   * the one irreversible action in this workspace — gets its own confirmation.
   * (SW-06, consequence 3)
   */
  import { t } from '$lib/stores/i18n.js';

  let { name, body, onconfirm, oncancel } = $props();
  let el;

  $effect(() => { el?.querySelector('.danger')?.focus(); });

  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); oncancel?.(); }
  }
</script>

<div class="scrim" role="presentation" onkeydown={onKey}>
  <div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="cr-title" bind:this={el}>
    <h2 id="cr-title">{$t('settings.confirmRemove', { name })}</h2>
    <p>{body ?? $t('settings.confirmRemoveBody')}</p>
    <div class="actions">
      <button type="button" class="quiet" onclick={() => oncancel?.()}>{$t('settings.cancel')}</button>
      <button type="button" class="danger" onclick={() => onconfirm?.()}>{$t('settings.remove')}</button>
    </div>
  </div>
</div>

<style>
  .scrim {
    position: absolute;
    inset: 0;
    z-index: 30;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--paper) 72%, transparent);
    padding: 20px;
  }
  .dlg {
    width: 340px;
    max-width: 100%;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 6px;
    box-shadow: var(--shadow);
    padding: 16px 18px;
  }
  h2 { margin: 0 0 6px; font-size: 14px; color: var(--ink); }
  p { margin: 0 0 16px; font-size: 12.5px; color: var(--muted); }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  button {
    font: 12px var(--sans);
    padding: 7px 13px;
    border-radius: 4px;
    border: 1px solid var(--rule-strong);
    background: var(--chrome);
    color: var(--ink);
  }
  button:hover { background: var(--chrome-2); }
  .danger { background: var(--danger); border-color: var(--danger); color: #fff; }
  .danger:hover { filter: brightness(1.08); background: var(--danger); }
</style>
