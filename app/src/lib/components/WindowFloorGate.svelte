<script>
  /**
   * §2.4 — the Application Window's 800 × 600 minimum.
   *
   * A PWA cannot veto a resize: Chrome refuses resizeTo() on windows it did not
   * open, Safari's Add-to-Dock apps enforce their own 320×567 floor, and the
   * manifest has no minimum-size field. windowFloor.js snaps the window back
   * where the platform allows it (Chrome on Windows/ChromeOS); everywhere else
   * this gate is what keeps the clause true in practice.
   *
   * Below the floor the shell is not rendered in a degraded state — it is
   * covered entirely. The shell therefore never presents itself at an illegal
   * window size, and it never needs scrollbars to cope with one.
   */
  import { t } from '$lib/stores/i18n.js';
  import { MIN_WIDTH, MIN_HEIGHT } from '$lib/windowFloor.js';

  let w = $state(0);
  let h = $state(0);

  $effect(() => {
    const read = () => { w = window.innerWidth; h = window.innerHeight; };
    read();
    window.addEventListener('resize', read, { passive: true });
    return () => window.removeEventListener('resize', read);
  });

  const narrow = $derived(w > 0 && w < MIN_WIDTH);
  const short  = $derived(h > 0 && h < MIN_HEIGHT);
  const blocked = $derived(narrow || short);
</script>

{#if blocked}
  <div class="gate" role="alertdialog" aria-modal="true" aria-labelledby="gate-title">
    <div class="panel">
      <svg class="mark" viewBox="0 0 48 36" aria-hidden="true">
        <rect x="1" y="1" width="46" height="34" rx="3" />
        <line x1="1" y1="9" x2="47" y2="9" />
        <rect class="inner" x="9" y="15" width="30" height="14" rx="2" />
      </svg>

      <h1 id="gate-title">{$t('gate.title')}</h1>
      <p class="body">{$t('gate.body', { w: MIN_WIDTH, h: MIN_HEIGHT })}</p>

      <dl class="dims">
        <div class="row">
          <dt>{$t('gate.current')}</dt>
          <dd>
            <span class:bad={narrow}>{w}</span>
            <span class="x">×</span>
            <span class:bad={short}>{h}</span>
          </dd>
        </div>
        <div class="row">
          <dt>{$t('gate.minimum')}</dt>
          <dd class="min">{MIN_WIDTH} <span class="x">×</span> {MIN_HEIGHT}</dd>
        </div>
      </dl>

      <p class="instruction">{$t('gate.instruction')}</p>
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
    overflow: hidden;          /* the shell never scrolls — not even here */
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
    width: 48px;
    height: 36px;
    margin-bottom: 18px;
    overflow: visible;
  }
  .mark rect, .mark line {
    fill: none;
    stroke: var(--rule-strong);
    stroke-width: 1.5;
  }
  .mark .inner {
    stroke: var(--ink-2);
    stroke-dasharray: 3 2.5;
  }

  h1 {
    font-size: 16px;
    margin: 0 0 8px;
    color: var(--ink);
    letter-spacing: -.01em;
  }
  .body {
    margin: 0 0 20px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }

  .dims {
    margin: 0 0 20px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: var(--rule);
    border: 1px solid var(--rule);
    border-radius: 4px;
    overflow: hidden;
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 9px 12px;
    background: var(--surface);
  }
  dt {
    font: 10px/1 var(--mono);
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--muted);
  }
  dd {
    margin: 0;
    font: 12px/1 var(--mono);
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  dd.min { color: var(--muted); }
  .x { color: var(--faint); padding: 0 2px; }
  .bad { color: var(--danger); font-weight: 700; }

  .instruction {
    margin: 0;
    font-size: 12.5px;
    color: var(--ink-2);
  }
</style>
