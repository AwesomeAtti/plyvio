<script>
  /**
   * One conventional settings control. §3.4.6, §3.4.7
   *
   * Auto-apply: selects and toggles commit on change; text commits on blur,
   * never per keystroke, which would apply half-typed values. An invalid
   * value is rejected before commit and the control keeps its last good one.
   */
  import { t } from '$lib/stores/i18n.js';

  let {
    label,
    type = 'select',        // 'select' | 'toggle' | 'text'
    value,
    options = [],
    error = null,
    oncommit
  } = $props();

  // Seeding $state from a prop captures only its initial value, so the draft
  // starts empty and is synced by an effect that reads `value` reactively.
  //
  // Note what happens on a REJECTED commit: `value` does not change, so this
  // effect does not re-run and the invalid text stays on screen beside its
  // error. That is deliberate — silently reverting to the last good value
  // would discard what the user typed without telling them why. The stored
  // value is untouched either way; only the display keeps the bad input so it
  // can be corrected.
  let draft = $state('');
  $effect(() => { draft = String(value ?? ''); });

  const id = `set-${Math.random().toString(36).slice(2, 8)}`;
</script>

<div class="row" class:invalid={Boolean(error)}>
  <div class="text">
    <label class="lbl" for={id}>{label}</label>
    {#if error}<div class="err" role="alert">{$t(error)}</div>{/if}
  </div>

  <div class="ctrl">
    {#if type === 'toggle'}
      <button
        {id}
        class="tog"
        class:on={value}
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onclick={() => oncommit?.(!value)}
      ></button>

    {:else if type === 'select'}
      <select {id} value={value} onchange={(e) => oncommit?.(e.currentTarget.value)}>
        {#each options as o (o)}<option value={o}>{o}</option>{/each}
      </select>

    {:else}
      <input
        {id}
        type="text"
        bind:value={draft}
        onblur={() => oncommit?.(draft)}
        onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />
    {/if}
  </div>
</div>

<style>
  /*
    §3.4.6 / §3.4.7 / §3.4.13 — the control row.

    EVERY row in the Settings Workspace is 44px. A control row carries a label
    and its control, and nothing else: descriptions and tips are not part of the
    pattern, so no row in a section is ever two lines.

    `min-height` rather than `height` for one reason only — a validation error
    (§3.4.1) renders beneath the label, and that must not be clipped. Errors are
    transient and occur only in the Detail View, where the text fields are; no
    row in General or Appearance can produce one.

    No leading slot. An object row's icon says which KIND of thing the row is,
    and it must, because that box can hold an engine or a database. Every row
    here is a preference, so an icon would name nothing (§7.4). The label
    therefore starts at 14px rather than §3.4.8.4's 44px, and that is deliberate.
  */
  .row {
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 14px;
    background: var(--surface);
  }
  /*
    The separator is a bottom border on each row, cleared on the last — NOT
    `.row + .row`. Svelte scopes CSS per component template, and each
    SettingRow renders exactly one `.row` at its root, so a sibling combinator
    has no second `.row` in this template to match: the compiler proves it
    unused and strips it, and the separators silently disappear.
  */
  .row { border-bottom: 1px solid var(--rule); }
  .row:last-child { border-bottom: 0; }
  .row.invalid { background: var(--paper); }

  .text { min-width: 0; }
  .lbl { font-size: 13.5px; font-weight: 600; color: var(--ink); display: block; }
  .err { font-size: 11.5px; color: var(--danger); margin-top: 4px; }

  .ctrl { flex: none; }

  select, input[type="text"] {
    font: 12px var(--sans);
    color: var(--ink);
    background: var(--chrome);
    border: 1px solid var(--rule-strong);
    border-radius: 5px;
    height: 28px;
    padding: 0 9px;
  }
  input[type="text"] { width: 240px; font-family: var(--mono); font-size: 11.5px; }
  .row.invalid input[type="text"] { border-color: var(--danger); }

  /*
    ONE toggle. This was 34x19 with a 99px radius, a border and an --ink fill,
    while the three object sections used 34x20, a 10px radius, no border and
    --ok. Two switches for one control in one workspace. This is the object
    sections' toggle, which §3.4.8.1-.3 already specify.
  */
  .tog {
    width: 34px; height: 20px;
    flex: none;
    border: 0;
    border-radius: 10px;
    background: var(--fill-3, #cfcfc9);
    position: relative;
    padding: 0;
  }
  .tog::after {
    content: "";
    position: absolute;
    top: 2px; left: 2px;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, .3);
    transition: left .12s ease;
  }
  .tog.on { background: var(--ok, #2f5d3a); }
  .tog.on::after { left: 16px; }

  @media (prefers-reduced-motion: reduce) { .tog::after { transition: none; } }
</style>
