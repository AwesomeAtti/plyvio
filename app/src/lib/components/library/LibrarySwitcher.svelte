<script>
  /**
   * Library switcher — §3.2.3.10. Placement Option A, chosen 4 Sep.
   *
   * Fills the Sidebar header, with the collapse control trailing it. Names the
   * database the workspace is showing; the list comes from Settings → Databases
   * (§3.4.8), and `Manage databases…` is the only route to changing that list,
   * so §3.2.3.3's rule that the Sidebar carries no configuration controls
   * still holds.
   *
   * NO ICON. A Library is a database file — one object, two words — so a glyph
   * beside the name in a panel that is unambiguously the library would be a
   * second name for the same thing. Dropping it also returns 24px to the name.
   *
   * The name MIDDLE-truncates. Library names are files and files get versioned
   * by year, so end truncation renders "…Reference 2026" and "…Reference 2025"
   * as the same string. See $lib/library/truncate.js. This is the one exception
   * to §3.2.3.6, which truncates every other Sidebar item at the end.
   */
  import { t } from '$lib/stores/i18n.js';
  import { openSettings } from '$lib/stores/tabs.js';
  import { selectSection } from '$lib/stores/settings.js';
  import Icon from '$lib/components/Icon.svelte';
  import { SectionExpand, LibraryIcon, SettingsIcon, Syncing, SyncError, Checked } from '$lib/icons.js';
  import { libraries, activeLibrary, selectLibrary } from '$lib/stores/libraries.js';
  import { middleTruncate, measureText } from '$lib/library/truncate.js';
  import { NAME_W, NAME_FONT } from '$lib/library/switcher.js';

  // Derived from the Sidebar's fixed 220px, not asserted. See switcher.js.
  let { width = NAME_W } = $props();

  let open = $state(false);
  let root = $state(null);

  // Measured once. Returns null under jsdom and in any environment without a
  // real canvas, and the label then falls back to CSS end-truncation.
  const measure = measureText(NAME_FONT);

  const fullName = $derived($activeLibrary?.name ?? $t('lib.noLibrary'));
  const label = $derived(measure ? middleTruncate(fullName, width, measure) : fullName);

  function pick(id) {
    if (selectLibrary(id)) open = false;
  }

  function manage() {
    open = false;
    openSettings();
    selectSection('databases');
  }

  function stateOf(lib) {
    if (lib.status === 'indexed' && lib.enabled) return { text: lib.meta };
    if (lib.status === 'indexed' && !lib.enabled) return { text: $t('lib.db.disabled') };
    if (/index/i.test(lib.status)) return { icon: Syncing, text: $t('lib.db.indexing') };
    return { icon: SyncError, text: $t('lib.db.unavailable') };
  }

  $effect(() => {
    if (!open) return;
    const onDoc = (e) => { if (root && !root.contains(e.target)) open = false; };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); open = false; } };
    document.addEventListener('pointerdown', onDoc, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDoc, true);
      document.removeEventListener('keydown', onKey, true);
    };
  });
</script>

<div class="wrap" bind:this={root}>
  <button
    class="trigger"
    type="button"
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label={$t('lib.switchLibrary', { name: fullName })}
    title={fullName}
    onclick={() => (open = !open)}
  >
    <span class="nm">{label}</span>
    <Icon icon={SectionExpand} size={14} />
  </button>

  {#if open}
    <div class="menu" role="menu" aria-label={$t('lib.libraries')}>
      <div class="mlab">{$t('lib.libraries')}</div>
      {#each $libraries as lib (lib.id)}
        {@const st = stateOf(lib)}
        <button
          class="mrow"
          class:on={lib.id === $activeLibrary?.id}
          class:off={!lib.selectable}
          type="button"
          role="menuitemradio"
          aria-checked={lib.id === $activeLibrary?.id}
          aria-disabled={!lib.selectable}
          title={lib.name}
          onclick={() => pick(lib.id)}
        >
          <Icon icon={LibraryIcon} size={15} />
          <span class="nm">{lib.name}</span>
          {#if st.icon}<Icon icon={st.icon} size={12} />{/if}
          <span class="st">{st.text}</span>
          {#if lib.id === $activeLibrary?.id}<Icon icon={Checked} size={14} />{/if}
        </button>
      {/each}
      <div class="msep"></div>
      <button class="mrow" type="button" role="menuitem" onclick={manage}>
        <Icon icon={SettingsIcon} size={15} />
        <span class="nm">{$t('lib.manageDatabases')}</span>
      </button>
    </div>
  {/if}
</div>

<style>
  .wrap { flex: 1; min-width: 0; position: relative; }

  /*
    NO FRAME (changed 5 Sep).

    The border and surface fill drew a text field, and the control is not one —
    nothing is typed here, and there is exactly one other framed thing in this
    header, the collapse button, which the box competed with. Removing it lets
    the library name read as the panel's title, which is what it is: the
    largest, darkest text in the Sidebar, sitting at the same 12px left edge
    as the group headings below it.

    The affordance survives in the chevron and in the hover fill, which is now
    a rounded band behind the text rather than a permanent outline around it —
    the same treatment the menu rows below use.
  */
  .trigger {
    width: 100%;
    height: 26px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 4px;
    background: none;
    border: 0;
    border-radius: 5px;
    color: var(--ink);
    text-align: left;
    cursor: default;
  }
  .trigger:hover { background: var(--chrome-2); }
  .trigger[aria-expanded="true"] { background: var(--chrome-2); }
  .trigger:focus-visible { outline: 2px solid var(--focus); outline-offset: -1px; }
  .trigger .nm {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    /* Only reached where canvas measurement is unavailable; the measured path
       has already shortened the string. */
    text-overflow: ellipsis;
  }
  /* The chevron is the whole affordance now, so it is not faint — but it is
     still secondary to the name it qualifies. */
  .trigger :global(svg) { flex: none; opacity: .55; }
  .trigger:hover :global(svg),
  .trigger[aria-expanded="true"] :global(svg) { opacity: .9; }

  /*
    The menu is not bound by the trigger's width. It sizes to content up to a
    cap, because it is the recovery path for a truncated name — a menu that
    truncated too would leave nowhere to read the full thing.
  */
  .menu {
    position: absolute;
    z-index: 30;
    top: calc(100% + 5px);
    left: 0;
    min-width: 100%;
    width: max-content;
    max-width: 320px;
    background: var(--surface);
    border: 1px solid var(--rule-strong);
    border-radius: 7px;
    box-shadow: var(--shadow);
    padding: 4px;
  }

  .mlab {
    font: 9px/1 var(--mono);
    letter-spacing: .13em;
    text-transform: uppercase;
    color: var(--faint);
    padding: 8px 9px 5px;
  }

  .mrow {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 9px;
    height: 30px;
    padding: 0 8px;
    border-radius: 5px;
    font-size: 12.5px;
    color: var(--ink);
    text-align: left;
    cursor: default;
  }
  .mrow:hover:not(.off) { background: var(--chrome); }
  .mrow:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }
  .mrow.on { background: var(--chrome-2); font-weight: 600; }
  .mrow.off { color: var(--faint); }
  .mrow .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mrow .st { flex: none; font: 10px/1 var(--mono); color: var(--faint); }

  .msep { height: 1px; background: var(--rule); margin: 4px 6px; }
</style>
