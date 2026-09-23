<script>
  /**
   * PWA only — covers the shell when this window has no storage because
   * another window or tab of the app already holds it (`opfs-sahpool`
   * locks its whole pool to one instance). See stores/pwaStorageLock.js
   * for why there's no live recovery yet, and ACTIONS.md, "PWA: a second
   * window can't open the board once OPFS lands".
   *
   * Modeled on WindowFloorGate: a full-cover gate rather than a toast or a
   * dialog over content, so the shell never presents itself in a broken
   * state. Never shown on Tauri — checkStorageLock() no-ops there.
   */
  import { t } from '$lib/stores/i18n.js';
  import {
    storageLockedElsewhere, checkStorageLock, retryStorageLock
  } from '$lib/stores/pwaStorageLock.js';

  $effect(() => { checkStorageLock(); });
</script>

{#if $storageLockedElsewhere}
  <div class="gate" role="alertdialog" aria-modal="true" aria-labelledby="pwalock-title">
    <div class="panel">
      <svg class="mark" viewBox="0 0 52 40" aria-hidden="true">
        <rect class="back" x="3" y="3" width="38" height="28" rx="3" />
        <rect x="11" y="9" width="38" height="28" rx="3" />
        <g class="crown" transform="translate(19,17)">
          <path d="M0 12 L2 4 L7 8 L11 2 L15 8 L20 4 L22 12 Z" />
          <line x1="0" y1="12" x2="22" y2="12" />
        </g>
      </svg>

      <h1 id="pwalock-title">{$t('pwaLock.title')}</h1>
      <p class="body">{$t('pwaLock.body')}</p>

      <button type="button" class="retry" onclick={() => retryStorageLock()}>
        {$t('pwaLock.button')}
      </button>

      <p class="instruction">{$t('pwaLock.footer')}</p>
    </div>
  </div>
{/if}

<style>
  .gate {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    padding: 20px;
    background: var(--paper);
    overflow: hidden;
  }

  .panel {
    max-width: 340px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
  }

  .mark {
    width: 52px;
    height: 40px;
    margin-bottom: 18px;
    overflow: visible;
  }
  .mark rect, .mark line, .mark path {
    fill: none;
    stroke: var(--rule-strong);
    stroke-width: 1.5;
  }
  .mark .back { stroke-dasharray: 3 2.5; stroke: var(--faint); }
  .mark .crown { stroke: var(--ink-2); }

  h1 {
    font-size: 16px;
    margin: 0 0 8px;
    color: var(--ink);
    letter-spacing: -.01em;
  }
  .body {
    margin: 0 0 18px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }

  .retry {
    font: 12.5px/1 var(--sans);
    padding: 9px 16px;
    margin: 0 0 18px;
    border-radius: 5px;
    border: 1px solid var(--ink);
    background: var(--ink);
    color: var(--paper);
    cursor: pointer;
  }
  .retry:hover { opacity: .9; }

  .instruction {
    margin: 0;
    font-size: 12.5px;
    color: var(--ink-2);
  }
</style>
