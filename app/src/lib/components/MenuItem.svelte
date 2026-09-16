<script>
  import Icon from '$lib/components/Icon.svelte';
  import { SubmenuArrow, Checked } from '$lib/icons.js';
  /**
   * `checked` is a SELECTION, not a decoration.
   *
   * It was drawn as an aria-hidden ✓ on a plain role="menuitem", which meant
   * the state reached the screen and nothing else: a screen reader announced
   * every locale identically and named none of them as active, while §2.2
   * requires the menu to mark the active locale.
   *
   * The role is what carries it now. `select` says which kind:
   *
   *   'radio'    one of a mutually exclusive set — the locale list
   *   'checkbox' an independent toggle
   *
   * Once aria-checked is on the element, the tick is only that state's visual
   * rendering, so it is correctly aria-hidden. That is the whole distinction:
   * hiding a decorative glyph is right, hiding the sole carrier of state is not.
   */
  let {
    kind = 'button',      // 'button' | 'label'
    select = 'radio',     // 'radio' | 'checkbox' — only meaningful when selectable
    value = null,
    checked = null,       // null = an ordinary command, not part of a selection
    submenu = false,
    disabled = false,
    onclick,
    children
  } = $props();

  /*
    `checked` defaults to null rather than false so that an ordinary command
    stays a plain menuitem. An UNCHECKED member of a selection group still
    needs its role and aria-checked="false" — that is what tells a screen
    reader the group exists and that this member is not the chosen one — so
    false and "not applicable" cannot be the same value.
  */
  const selectable = $derived(checked !== null);
  const itemRole = $derived(
    !selectable ? 'menuitem' : select === 'checkbox' ? 'menuitemcheckbox' : 'menuitemradio'
  );
</script>

{#if kind === 'label'}
  <div class="mi label">{@render children?.()}</div>
{:else}
  <button
    class="mi"
    type="button"
    role={itemRole}
    aria-checked={selectable ? checked : undefined}
    {disabled}
    {onclick}
  >
    <span class="txt">{@render children?.()}</span>
    {#if value}<span class="val">{value}</span>{/if}
    {#if checked}<span class="tick" aria-hidden="true"><Icon icon={Checked} size={13} /></span>{/if}
    {#if submenu}<span class="chev"><Icon icon={SubmenuArrow} size={13} /></span>{/if}
  </button>
{/if}

<style>
  .mi {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: left;
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 13px;
    color: var(--ink);
  }
  button.mi:hover:not(:disabled) { background: var(--chrome-2); }
  button.mi:disabled { color: var(--faint); cursor: default; }
  .txt { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .val { color: var(--muted); font-size: 12px; flex: none; }
  .tick { color: var(--ink); flex: none; }
  .chev { color: var(--muted); flex: none; }
  .mi.label {
    font: 10px/1 var(--mono);
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 9px 10px 7px;
  }
</style>
