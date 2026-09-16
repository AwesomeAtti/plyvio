<script>
  import { t } from '$lib/stores/i18n.js';
  import { activeTab, workspaceState } from '$lib/stores/tabs.js';
  import SettingsWorkspace from './settings/SettingsWorkspace.svelte';
  import LibraryWorkspace from './library/LibraryWorkspace.svelte';
  import GameWorkspace from './game/GameWorkspace.svelte';

  let { aboutFocus = false } = $props();

  const META = {
    library:  { titleKey: 'ws.library.title',  bodyKey: 'ws.library.body',  ref: '§4' },
    game:     { titleKey: 'ws.game.title',     bodyKey: 'ws.game.body',     ref: '§5' },
    settings: { titleKey: 'ws.settings.title', bodyKey: 'ws.settings.body', ref: '§6' }
  };

  const meta = $derived(META[$activeTab.kind]);
  const id = $derived($activeTab.id);

  function onInput(e) {
    const v = e.target.value;
    workspaceState.update((s) => ({ ...s, [id]: { ...(s[id] || {}), scratch: v } }));
  }
</script>

{#if $activeTab.kind === 'library'}
  <!-- §3.2 — the Library Workspace owns its own regions and scrolling. -->
  <div class="ws-settings" id="workspace-area" role="tabpanel" tabindex="-1" aria-label={$t(meta.titleKey)}>
    <LibraryWorkspace />
  </div>
{:else if $activeTab.kind === 'game'}
  <!-- §5 — the Game Workspace never scrolls; each region handles its own. -->
  <div class="ws-settings" id="workspace-area" role="tabpanel" tabindex="-1" aria-label={$t(meta.titleKey)}>
    {#key id}
      <GameWorkspace tabId={id} libraryGameId={$activeTab.gameId ?? null} />
    {/key}
  </div>
{:else if $activeTab.kind === 'settings'}
  <!-- §3.4 — the Settings Workspace is implemented; it owns its own scrolling. -->
  <div class="ws-settings" id="workspace-area" role="tabpanel" tabindex="-1" aria-label={$t(meta.titleKey)}>
    <SettingsWorkspace {aboutFocus} />
  </div>
{:else}
<div class="ws" id="workspace-area" role="tabpanel" tabindex="-1" aria-label={$t(meta.titleKey)}>
  <div class="inner">
    <header>
      <span class="ref">{meta.ref}</span>
      <h1>{$t(meta.titleKey)}</h1>
      <p>{$t(meta.bodyKey)}</p>
    </header>

    <div class="stub">
      <span>{$t('ws.outOfScope')}</span>
    </div>

    <!-- Demonstrates §2.3: each workspace keeps its own state across tab switches. -->
    <section class="probe">
      <label for="probe-{id}">{$t('ws.stateProbe')}</label>
      <input
        id="probe-{id}"
        type="text"
        placeholder={$t('probe.placeholder')}
        value={$workspaceState[id]?.scratch ?? ''}
        oninput={onInput}
      />
      <span class="hint">tab id: <code>{id}</code></span>
    </section>

  </div>
</div>
{/if}

<style>
  .ws {
    flex: 1;
    min-height: 0;
    overflow: auto;          /* the workspace's own scrolling, not the shell's */
    background: var(--surface);
  }

  /* The Settings Workspace manages its own regions and scrolling. */
  .ws-settings {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden;
  }
  .inner { max-width: 720px; padding: 40px 36px 60px; }

  .ref {
    font: 10px/1 var(--mono);
    letter-spacing: .12em;
    color: var(--faint);
  }
  h1 { font-size: 20px; margin: 10px 0 8px; letter-spacing: -.01em; }
  header p { margin: 0; color: var(--muted); max-width: 60ch; }

  .stub {
    margin: 26px 0;
    height: 150px;
    display: grid;
    place-items: center;
    border: 1px solid var(--rule);
    border-radius: 5px;
    background:
      repeating-linear-gradient(135deg, transparent, transparent 9px, var(--rule) 9px, var(--rule) 10px);
  }
  .stub span {
    background: var(--surface);
    border: 1px solid var(--rule);
    padding: 7px 12px;
    border-radius: 3px;
    font: 10px/1 var(--mono);
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .probe { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
  .probe label { color: var(--muted); font-size: 12.5px; }
  .probe input {
    width: 320px;
    padding: 8px 10px;
    font: 13px var(--sans);
    color: var(--ink);
    background: var(--paper);
    border: 1px solid var(--rule-strong);
    border-radius: 4px;
  }
  .hint { font: 10px/1 var(--mono); color: var(--faint); }
  .hint code { color: var(--muted); }

</style>
