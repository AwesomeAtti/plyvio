<script>
  /**
   * Shown when Quit could not close the window.
   *
   * Browsers only reliably permit window.close() on script-opened windows, so
   * Quit is a request the host may refuse. Rather than appearing to do nothing,
   * the app says what happened and what the user can do instead.
   */
  import { t } from '$lib/stores/i18n.js';
  import { quitBlocked, dismissQuitNotice } from '$lib/stores/appCommands.js';
</script>

{#if $quitBlocked}
  <div class="wrap" role="status" aria-live="polite">
    <div class="notice">
      <div class="text">
        <strong>{$t('quit.blockedTitle')}</strong>
        <p>{$t('quit.blockedBody')}</p>
      </div>
      <button type="button" onclick={dismissQuitNotice}>{$t('quit.dismiss')}</button>
    </div>
  </div>
{/if}

<style>
  .wrap {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 90;
    display: grid;
    place-items: center;
    padding: 16px;
    pointer-events: none;
  }
  .notice {
    pointer-events: auto;
    display: flex;
    align-items: flex-start;
    gap: 16px;
    max-width: 460px;
    padding: 13px 14px;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-left: 3px solid var(--danger);
    border-radius: 5px;
    box-shadow: var(--shadow);
  }
  .text { flex: 1; min-width: 0; }
  strong { display: block; font-size: 13px; color: var(--ink); margin-bottom: 3px; }
  p { margin: 0; font-size: 12.5px; line-height: 1.45; color: var(--muted); }
  button {
    flex: none;
    align-self: center;
    font: 12px var(--sans);
    padding: 6px 11px;
    color: var(--ink);
    background: var(--chrome);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
  }
  button:hover { background: var(--chrome-2); }
</style>
