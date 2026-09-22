<script>
  /**
   * Several values chosen from a list, with creation in place. §3.2.4.5
   *
   * Tags and Collections share this control, so it is learned once. Import is
   * the only moment the imported games are a distinct set — afterwards they are
   * indistinguishable from everything else in the library — which is why
   * creating a tag or a collection has to be possible HERE rather than sending
   * the user to the Sidebar first and losing the set on the way.
   *
   * SMART COLLECTIONS ARE NOT OFFERED. §3.2.3.1 defines one as a folder that
   * finds its own contents, so a game cannot be put into it. They are omitted
   * rather than shown disabled: a disabled row invites the user to work out why.
   * The caller filters; this control just renders what it is given.
   *
   * `placement="up"` opens the list above the field — the Add Games dialog's
   * option rows sit at the bottom of a box that clips its content (r6, D-3).
   */
  import { t } from '$lib/stores/i18n.js';
  import Icon from '$lib/components/Icon.svelte';
  import { ClearIcon, AddGames } from '$lib/icons.js';

  let {
    tokens = [],            // [{ id, name }]
    available = [],         // [{ id, name }] — already filtered by the caller
    label,
    placeholder = '',
    placement = 'down',     // 'down' | 'up'
    onchange
  } = $props();

  let draft = $state('');
  let open = $state(false);
  let el = $state(null);
  let input = $state(null);

  const chosen = $derived(new Set(tokens.map((x) => x.id)));

  const matches = $derived(
    available
      .filter((a) => !chosen.has(a.id))
      .filter((a) => a.name.toLowerCase().includes(draft.trim().toLowerCase()))
  );

  /* Offered only when the typed text matches nothing exactly — otherwise the
     list would invite creating a second thing with an existing name. */
  const canCreate = $derived(
    draft.trim().length > 0 &&
    !available.some((a) => a.name.toLowerCase() === draft.trim().toLowerCase()) &&
    !tokens.some((x) => x.name.toLowerCase() === draft.trim().toLowerCase())
  );

  let created = 0;

  function add(token) {
    if (chosen.has(token.id)) return;
    onchange?.([...tokens, token]);
    draft = '';
    input?.focus();
  }

  function create() {
    const name = draft.trim();
    if (!name) return;
    /* A negative id cannot collide with the seeded fixtures, which count up
       from 0 — the same kind of id collision `stores/settings.js`'s
       `nextId()` guards against with its own `n` marker. */
    add({ id: -(++created) - Date.now() % 1000, name, isNew: true });
  }

  function remove(id) {
    onchange?.(tokens.filter((x) => x.id !== id));
  }

  function onKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matches.length) add(matches[0]);
      else if (canCreate) create();
      return;
    }
    /* Backspace on an empty field removes the last token — the convention
       every token field has, and the only way to correct one without aiming. */
    if (e.key === 'Backspace' && draft === '' && tokens.length) {
      e.preventDefault();
      remove(tokens[tokens.length - 1].id);
      return;
    }
    if (e.key === 'Escape' && open) { e.stopPropagation(); open = false; }
  }

  function onDocPointer(e) {
    if (el && !el.contains(e.target)) open = false;
  }

  $effect(() => {
    if (!open) return;
    document.addEventListener('pointerdown', onDocPointer, true);
    return () => document.removeEventListener('pointerdown', onDocPointer, true);
  });
</script>

<div class="tf" bind:this={el}>
  <div class="field" class:open>
    {#each tokens as tok (tok.id)}
      <span class="tok">
        {tok.name}
        <button type="button" onclick={() => remove(tok.id)} aria-label={$t('add.removeToken', { name: tok.name })}>
          <Icon icon={ClearIcon} size={10} />
        </button>
      </span>
    {/each}
    <input
      bind:this={input}
      bind:value={draft}
      type="text"
      aria-label={label}
      placeholder={tokens.length ? '' : placeholder}
      onfocus={() => (open = true)}
      oninput={() => (open = true)}
      onkeydown={onKeydown}
    />
  </div>

  {#if open && (matches.length || canCreate)}
    <div class="menu" class:up={placement === 'up'} role="listbox" aria-label={label}>
      {#each matches.slice(0, 8) as m (m.id)}
        <button type="button" class="item" role="option" aria-selected="false" onclick={() => add(m)}>
          {m.name}
        </button>
      {/each}
      {#if canCreate}
        {#if matches.length}<div class="sep"></div>{/if}
        <button type="button" class="item create" onclick={create}>
          <Icon icon={AddGames} size={12} />
          {$t('add.create', { name: draft.trim() })}
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .tf { position: relative; flex: 1; min-width: 0; }

  .field {
    min-height: 26px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    padding: 2px 6px;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
  }
  .field:focus-within { border-color: var(--focus); }

  .tok {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 18px;
    padding: 0 3px 0 6px;
    border-radius: 3px;
    background: var(--chrome-2);
    border: 1px solid var(--rule-strong);
    font: 11px var(--sans);
    color: var(--ink);
    white-space: nowrap;
  }
  .tok button {
    display: grid;
    place-items: center;
    width: 13px; height: 13px;
    border-radius: 2px;
    color: var(--muted);
  }
  .tok button:hover { background: var(--chrome-3); color: var(--ink); }

  input {
    flex: 1;
    min-width: 60px;
    height: 20px;
    border: 0;
    background: none;
    color: var(--ink);
    font: 11.5px var(--sans);
    outline: none;
  }
  input::placeholder { color: var(--faint); }

  .menu {
    position: absolute;
    top: calc(100% + 3px);
    left: 0;
    z-index: 60;
    min-width: 180px;
    max-width: 100%;
    max-height: calc(9 * 26px + 17px);
    overflow-y: auto;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 6px;
    box-shadow: var(--shadow);
    padding: 4px;
  }
  .menu.up { top: auto; bottom: calc(100% + 3px); }

  .item {
    width: 100%;
    height: 26px;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 8px;
    border-radius: 4px;
    font: 12px var(--sans);
    color: var(--ink);
    text-align: left;
    white-space: nowrap;
  }
  .item:hover { background: var(--chrome-2); }
  .create { color: var(--ink-2); }
  .sep { height: 1px; background: var(--rule); margin: 3px 6px; }
</style>
