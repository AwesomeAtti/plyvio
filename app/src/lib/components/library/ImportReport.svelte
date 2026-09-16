<script>
  /**
   * Import report. §3.2.4.5
   *
   * Deliberately not a fourth tab of the Add Games dialog: this is about an
   * import that has already happened, and folding it into the surface that
   * starts new ones is how a clean dialog turns into a control panel.
   *
   * It is only ever opened by a click — from the Status Bar notice the user
   * chose to answer. A report that opens itself would be a modal arriving
   * unbidden, minutes after the action that caused it and possibly mid-move in
   * a Game tab; the information is not urgent enough to earn that.
   *
   * Closing it answers the notice, so both clear together.
   */
  import { t } from '$lib/stores/i18n.js';
  import Icon from '$lib/components/Icon.svelte';
  import { ClearIcon, CopyIcon, Checked, ProblemIcon } from '$lib/icons.js';
  import { outcomeMessage } from '$lib/library/importJob.js';

  let { plan, onclose } = $props();

  const message = $derived(outcomeMessage(plan));
  const sourceName = $derived(plan.sources[0]?.label ?? $t('add.pastedText'));
  const wholeSourceFailure = $derived(message !== null);

  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); onclose?.(); }
  }

  let el = $state(null);
  $effect(() => { el?.querySelector('.done')?.focus(); });

  /**
   * Copy is the whole recovery path in this revision: take the text, fix it,
   * paste it back into the Paste tab. The prototype has no PGN to copy, so it
   * copies the description of the failure — which is the shape of the action,
   * and is what a test can assert.
   */
  function copy(text) {
    try { navigator.clipboard?.writeText(text); } catch { /* not available */ }
  }

  const failureText = (f) => `${$t('add.report.line', { n: f.line.toLocaleString() })} — ${$t(f.reasonKey, f.vars)}`;
  const allText = $derived(plan.failures.map(failureText).join('\n'));
</script>

<div class="scrim" role="presentation">
  <div class="dlg" role="dialog" aria-modal="true" aria-labelledby="ir-title"
       tabindex="-1" bind:this={el} onkeydown={onKey}>
    <div class="head">
      <h2 id="ir-title">{$t('add.report.title')}</h2>
      <button type="button" class="x" onclick={() => onclose?.()} aria-label={$t('add.close')}>
        <Icon icon={ClearIcon} size={14} />
      </button>
    </div>

    <div class="summary">
      <div class="where"><b>{sourceName}</b></div>

      {#if wholeSourceFailure}
        <!-- One outcome, one sentence. The cause is not diagnosed because in
             most of these cases it cannot be. -->
        <div class="whole">
          <Icon icon={ProblemIcon} size={14} />
          <span>{$t(message.key, message.vars)}</span>
        </div>
      {:else}
        <div class="pills">
          <span class="pill ok">{$t('add.report.added', { n: plan.added.toLocaleString() })}</span>
          {#if plan.skipped}
            <span class="pill dup">{$t('add.report.skipped', { n: plan.skipped })}</span>
          {/if}
          {#if plan.failures.length}
            <span class="pill err">{$t('add.report.failed', { n: plan.failures.length })}</span>
          {/if}
        </div>
      {/if}
    </div>

    {#if plan.failures.length}
      <div class="table">
        <div class="th"><span>{$t('add.report.where')}</span><span>{$t('add.report.why')}</span><span></span></div>
        <div class="rows">
          {#each plan.failures as f (f.line)}
            <div class="tr">
              <span class="pill err">{$t('add.report.line', { n: f.line.toLocaleString() })}</span>
              <span class="why">{$t(f.reasonKey, f.vars)}</span>
              <button type="button" class="copy" onclick={() => copy(failureText(f))}>
                <Icon icon={CopyIcon} size={12} />{$t('add.report.copy')}
              </button>
            </div>
          {/each}
        </div>
      </div>
    {:else if !wholeSourceFailure}
      <div class="none">
        <Icon icon={Checked} size={18} />
        <span>{$t('add.report.nothingWrong')}</span>
      </div>
    {:else}
      <div class="none quiet">{$t('add.report.nothingAdded')}</div>
    {/if}

    <div class="foot">
      <span class="cnt">
        {#if plan.failures.length}
          {$t('add.report.summary', {
            n: plan.failures.length,
            total: (plan.total || 0).toLocaleString()
          })}
        {/if}
      </span>
      {#if plan.failures.length}
        <button type="button" class="btn" onclick={() => copy(allText)}>
          <Icon icon={CopyIcon} size={12} />{$t('add.report.copyAll')}
        </button>
      {/if}
      <button type="button" class="btn primary done" onclick={() => onclose?.()}>
        {$t('add.report.done')}
      </button>
    </div>
  </div>
</div>

<style>
  .scrim {
    position: absolute;
    inset: 0;
    z-index: 55;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--paper) 72%, transparent);
    padding: 16px;
  }
  .dlg {
    width: 580px;
    max-width: 100%;
    height: 440px;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 8px;
    box-shadow: var(--shadow);
  }

  .head {
    flex: none;
    height: 38px;
    display: flex;
    align-items: center;
    padding: 0 10px 0 14px;
    border-bottom: 1px solid var(--rule);
  }
  .head h2 { margin: 0; font-size: 13.5px; font-weight: 600; }
  .x {
    margin-left: auto;
    width: 22px; height: 22px;
    display: grid; place-items: center;
    border-radius: 3px;
    color: var(--muted);
  }
  .x:hover { background: var(--chrome-2); color: var(--ink); }

  .summary {
    flex: none;
    padding: 12px 14px;
    border-bottom: 1px solid var(--rule);
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .where { font: 12px var(--sans); color: var(--muted); }
  .where b { color: var(--ink); font-weight: 600; }

  .pills { display: flex; gap: 7px; flex-wrap: wrap; }
  .pill {
    font: 9px var(--mono);
    letter-spacing: .06em;
    text-transform: uppercase;
    padding: 3px 5px;
    border-radius: 3px;
    border: 1px solid var(--rule-strong);
    background: var(--chrome);
    color: var(--muted);
    white-space: nowrap;
  }
  .pill.ok  { color: var(--ink); border-color: var(--rule-strong); }
  .pill.dup { color: var(--ink-2); }
  .pill.err { color: var(--danger); border-color: var(--danger); }

  .whole { display: flex; align-items: center; gap: 8px; font: 12.5px var(--sans); color: var(--danger); }

  .table { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
  .th, .tr {
    display: grid;
    grid-template-columns: 92px 1fr 78px;
    gap: 10px;
    align-items: center;
    padding: 0 14px;
  }
  .th {
    flex: none;
    height: 24px;
    background: var(--chrome);
    border-bottom: 1px solid var(--rule-strong);
    font: 9px var(--mono);
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .rows { flex: 1; min-height: 0; overflow-y: auto; }
  .tr { height: 30px; border-bottom: 1px solid var(--rule); font: 11.5px var(--sans); }
  .why {
    font: 10.5px var(--mono);
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .copy {
    display: flex;
    align-items: center;
    gap: 5px;
    font: 11px var(--sans);
    color: var(--muted);
    padding: 3px 5px;
    border-radius: 3px;
  }
  .copy:hover { background: var(--chrome-2); color: var(--ink); }

  .none {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--muted);
    font: 12.5px var(--sans);
  }
  .none.quiet { color: var(--faint); }

  .foot {
    flex: none;
    height: 42px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    background: var(--chrome);
    border-top: 1px solid var(--rule-strong);
  }
  .cnt { margin-right: auto; font: 10px var(--mono); color: var(--muted); }
  .btn {
    flex: none;
    height: 26px;
    padding: 0 11px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    font: 12px var(--sans);
    color: var(--ink);
  }
  .btn:hover { background: var(--chrome-2); }
  .btn.primary { background: var(--ink); border-color: var(--ink); color: var(--surface); font-weight: 600; }
  .btn.primary:hover { filter: brightness(1.15); background: var(--ink); }
</style>
