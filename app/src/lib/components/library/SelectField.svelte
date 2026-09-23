<script>
  /**
   * One value chosen from a short list. §3.2.4.5
   *
   * Used four times in the Add Games dialog — destination, duplicate policy,
   * online source and date range — so the behaviour is written once: click to
   * open, Escape or an outside click to dismiss, and `menuitemradio` with
   * `aria-checked`, which is the pattern §3.2.3.10's Library switcher already
   * established rather than a second list behaviour invented here.
   *
   * `placement="up"` opens the menu above the trigger. The Add Games dialog
   * uses it on its option rows, which sit at the bottom of a box that clips
   * its content (wireframe r6, D-3). The menu scrolls past eight entries.
   *
   * Not a native <select>. The source entries carry a brand mark and the
   * destination entries carry a state, and neither survives inside an <option>.
   */
  import Icon from '$lib/components/Icon.svelte';
  import { ChevronDown, Checked } from '$lib/icons.js';

  let {
    value,
    options = [],          // [{ id, label, icon?, mark?, detail?, disabled? }] -- mark is a component (e.g. ChessComMark), rendered directly, not through Icon
    label,                 // accessible name
    width = null,
    align = 'left',
    placement = 'down',    // 'down' | 'up'
    onselect
  } = $props();

  let open = $state(false);
  let el = $state(null);

  const current = $derived(options.find((o) => o.id === value) ?? options[0] ?? null);

  function choose(o) {
    if (o.disabled) return;          // listed but not selectable, per §3.2.3.10
    open = false;
    onselect?.(o.id);
  }

  function onDocPointer(e) {
    if (el && !el.contains(e.target)) open = false;
  }
  function onKey(e) {
    if (e.key === 'Escape' && open) { e.stopPropagation(); open = false; }
  }

  $effect(() => {
    if (!open) return;
    document.addEventListener('pointerdown', onDocPointer, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer, true);
      document.removeEventListener('keydown', onKey, true);
    };
  });
</script>

<div class="sel" bind:this={el} style={width ? `width:${width}px` : ''}>
  <button
    type="button"
    class="trigger"
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label={label}
    onclick={() => (open = !open)}
  >
    {#if current?.mark}
      {@const Mark = current.mark}
      <span class="mark"><Mark size={13} /></span>
    {/if}
    {#if current?.icon}<Icon icon={current.icon} size={13} />{/if}
    <span class="name">{current?.label ?? ''}</span>
    <Icon icon={ChevronDown} size={12} />
  </button>

  {#if open}
    <div class="menu" class:right={align === 'right'} class:up={placement === 'up'} role="menu" aria-label={label}>
      {#each options as o (o.id)}
        <button
          type="button"
          class="item"
          class:disabled={o.disabled}
          role="menuitemradio"
          aria-checked={o.id === value}
          aria-disabled={o.disabled || undefined}
          onclick={() => choose(o)}
        >
          {#if o.mark}
            {@const Mark = o.mark}
            <span class="mark"><Mark size={13} /></span>
          {/if}
          {#if o.icon}<Icon icon={o.icon} size={13} />{/if}
          <span class="name">{o.label}</span>
          {#if o.detail}<span class="detail">{o.detail}</span>{/if}
          {#if o.id === value}<Icon icon={Checked} size={12} />{/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .sel { position: relative; flex: none; }

  .trigger {
    width: 100%;
    height: 26px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 7px;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
    font: 11.5px var(--sans);
    color: var(--ink);
    text-align: left;
  }
  .trigger:hover { background: var(--chrome-2); }
  .trigger :global(svg:last-child) { margin-left: auto; color: var(--faint); flex: none; }

  .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .mark {
    flex: none;
    width: 13px; height: 13px;
    display: grid; place-items: center;
    color: var(--ink);
  }

  .menu {
    position: absolute;
    top: 29px;
    left: 0;
    z-index: 60;
    min-width: 100%;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 6px;
    box-shadow: var(--shadow);
    padding: 4px;
    max-height: calc(8 * 28px + 10px);
    overflow-y: auto;
  }
  .menu.right { left: auto; right: 0; }
  .menu.up { top: auto; bottom: 29px; }

  .item {
    width: 100%;
    height: 28px;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 8px;
    border-radius: 4px;
    font: 12px var(--sans);
    color: var(--ink);
    white-space: nowrap;
  }
  .item:hover { background: var(--chrome-2); }
  /*
    Listed but not selectable — a database that is indexing or disabled
    (§3.2.3.10). Hiding it would make it look deleted; refusing to select it
    says what is true.
  */
  .item.disabled { color: var(--faint); }
  .item.disabled:hover { background: none; }
  .item .detail { margin-left: auto; font: 10px var(--mono); color: var(--faint); }
  .item :global(svg:last-child) { margin-left: auto; color: var(--ink); flex: none; }
  .item .detail ~ :global(svg) { margin-left: 6px; }
</style>
