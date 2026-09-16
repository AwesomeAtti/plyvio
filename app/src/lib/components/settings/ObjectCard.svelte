<script>
  /** §3.4.9 — one object, one click target. Opens the Detail/Edit View. */
  let { object, onopen } = $props();
</script>

<li class="cell">
  <button class="card" type="button" onclick={() => onopen?.(object.id)}>
    <span class="nm">{object.name}</span>
    <span class="meta">{object.meta}</span>
    <span class="foot">
      <span class="pill" class:ok={object.enabled}>{object.status}</span>
    </span>
  </button>
</li>

<style>
  .cell { list-style: none; display: flex; }
  .card {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
    text-align: left;
    padding: 12px;
    min-height: 104px;
    border: 1px solid var(--rule-strong);
    border-radius: 5px;
    background: var(--surface);
  }
  .card:hover { border-color: var(--ink-2); background: var(--paper); }

  .nm {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    font: 11px/1.4 var(--mono);
    color: var(--muted);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .foot { margin-top: auto; }

  /* Status carries shape + text, not colour alone. */
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font: 10px/1 var(--mono);
    padding: 5px 8px;
    border: 1px solid var(--rule-strong);
    border-radius: 99px;
    color: var(--muted);
  }
  .pill::before {
    content: "";
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--rule-strong);
  }
  .pill.ok { color: var(--ink-2); }
  .pill.ok::before { background: var(--ink); }
</style>
