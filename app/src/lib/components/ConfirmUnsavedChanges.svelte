<script>
  /**
   * Close-time confirmation — `analysis-board-plan.md`'s Stage 1.
   *
   * Same shape as Settings' `ConfirmRemove.svelte` (scrim, alertdialog,
   * Escape-to-cancel) — the Office/macOS convention for "you're about to
   * lose unsaved work," and nothing about this app's shell argues for
   * inventing a different one. One more button than `ConfirmRemove`:
   * Cancel, Don't Save, Save. Save is the DEFAULT here, not Don't Save —
   * the reverse of `ConfirmRemove`, where the destructive action is the one
   * being confirmed. Don't Save carries `ConfirmRemove`'s `.danger` styling
   * instead; Save reuses the Edit dialog's own `.btn.primary` (`GameInfo
   * Dialog.svelte`) so the two save affordances in this app read as the
   * same action.
   */
  import { t } from '$lib/stores/i18n.js';

  let { name, onsave, ondontsave, oncancel } = $props();
  let el;
  let saving = $state(false);

  $effect(() => { el?.querySelector('.primary')?.focus(); });

  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); oncancel?.(); }
  }

  async function handleSave() {
    if (saving) return;
    saving = true;
    await onsave?.();
  }
</script>

<div class="scrim" role="presentation" onkeydown={onKey}>
  <div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="cu-title" bind:this={el}>
    <h2 id="cu-title">{$t('tab.confirmUnsaved', { name })}</h2>
    <p>{$t('tab.confirmUnsavedBody')}</p>
    <div class="actions">
      <button type="button" class="btn" onclick={() => oncancel?.()} disabled={saving}>
        {$t('tab.cancel')}
      </button>
      <button type="button" class="btn danger" onclick={() => ondontsave?.()} disabled={saving}>
        {$t('tab.dontSave')}
      </button>
      <button type="button" class="btn primary" onclick={handleSave} disabled={saving}>
        {$t('tab.save')}
      </button>
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--paper) 72%, transparent);
    padding: 20px;
  }
  .dlg {
    width: 380px;
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
  .btn {
    font: 12px var(--sans);
    padding: 7px 13px;
    border-radius: 4px;
    border: 1px solid var(--rule-strong);
    background: var(--chrome);
    color: var(--ink);
  }
  .btn:hover:not(:disabled) { background: var(--chrome-2); }
  .btn:disabled { opacity: .5; }
  .btn.primary { background: var(--ink); color: var(--surface); border-color: var(--ink); }
  .btn.primary:hover:not(:disabled) { opacity: .9; }
  .btn.danger { background: var(--danger); border-color: var(--danger); color: #fff; }
  .btn.danger:hover:not(:disabled) { filter: brightness(1.08); background: var(--danger); }
</style>
