<script>
  let { align = 'right', labelledby = null, ondismiss, children } = $props();

  let el;

  function onDocPointer(e) {
    if (el && !el.contains(e.target) && !e.target.closest?.('[data-popover-trigger]')) {
      ondismiss?.();
    }
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); ondismiss?.(); }
  }

  $effect(() => {
    document.addEventListener('pointerdown', onDocPointer, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer, true);
      document.removeEventListener('keydown', onKey, true);
    };
  });
</script>

<div class="pop" class:left={align === 'left'} bind:this={el} role="menu" aria-labelledby={labelledby}>
  {@render children?.()}
</div>

<style>
  .pop {
    position: absolute;
    top: calc(var(--bar-h) + 2px);
    right: 4px;
    z-index: 40;
    min-width: 220px;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 6px;
    box-shadow: var(--shadow);
    padding: 4px;
    color: var(--ink);
  }
  .pop.left { right: auto; left: 4px; }
</style>
