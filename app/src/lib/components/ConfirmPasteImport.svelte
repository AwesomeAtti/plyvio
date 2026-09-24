<script>
  /**
   * Board-paste confirmation — `analysis-board-plan.md`'s Stage 3.
   *
   * Same shape as `ConfirmUnsavedChanges.svelte` (scrim, alertdialog,
   * Escape-to-cancel): a second confirmation dialog that invents its own
   * chrome would read as a different app. "Open in New Tab" is the DEFAULT
   * (focused, `.primary`) rather than "Replace This Game" — pasting is far
   * more often "I want to look at this" than "I want to overwrite what's
   * open" (`ACTIONS.md`'s "Analysis board" row). Neither button is styled
   * `.danger`: `stores/newGame.js`'s `confirmPasteReplace` detaches the
   * tab into a new draft rather than writing over the saved game, so
   * "Replace" is not actually destructive — it just changes what THIS tab
   * shows, the same as opening a different game in it would.
   */
  import { t } from '$lib/stores/i18n.js';

  let { kind, onnewtab, onreplace, oncancel } = $props();
  let el;

  $effect(() => { el?.querySelector('.primary')?.focus(); });

  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); oncancel?.(); }
  }
</script>

<div class="scrim" role="presentation" onkeydown={onKey}>
  <div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="cp-title" bind:this={el}>
    <h2 id="cp-title">{$t(kind === 'fen' ? 'paste.titleFen' : 'paste.titlePgn')}</h2>
    <p>{$t('paste.body')}</p>
    <div class="actions">
      <button type="button" class="btn" onclick={() => oncancel?.()}>
        {$t('tab.cancel')}
      </button>
      <button type="button" class="btn" onclick={() => onreplace?.()}>
        {$t('paste.replace')}
      </button>
      <button type="button" class="btn primary" onclick={() => onnewtab?.()}>
        {$t('paste.newTab')}
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
  .btn:hover { background: var(--chrome-2); }
  .btn.primary { background: var(--ink); color: var(--surface); border-color: var(--ink); }
  .btn.primary:hover { opacity: .9; }
</style>
