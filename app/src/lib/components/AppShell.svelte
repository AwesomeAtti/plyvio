<script>
  import TabBar from './TabBar.svelte';
  import WorkspaceArea from './WorkspaceArea.svelte';
  import WindowFloorGate from './WindowFloorGate.svelte';
  import QuitNotice from './QuitNotice.svelte';
  import {
    openGame, closeActive, activateByOffset, activateIndex, activateLast
  } from '$lib/stores/tabs.js';
  import { enforceWindowFloor } from '$lib/windowFloor.js';
  import { watchFullscreen } from '$lib/stores/appCommands.js';
  import {
    selectSection, loadPreferences, loadLibraries, loadEngines, loadSubscriptions
  } from '$lib/stores/settings.js';
  import { loadActiveLibrarySelection } from '$lib/stores/libraries.js';

  let aboutFocus = $state(false);

  // §2.4 — hold the window at or above 800 x 600 where the platform permits it.
  $effect(() => enforceWindowFloor());

  // Keep the menu's Full Screen state in step with the host, including exits
  // the user triggers with Esc or F11 rather than through the menu.
  $effect(() => watchFullscreen());

  // The Library's mock corpus is replaced by the active library's real game
  // database in `stores/library.js` itself now (a module-level subscribe on
  // `activeLibraryId`, so it also reloads on every switch, not just once) —
  // no separate mount effect needed here.

  // Replaces the schema-backed Settings preferences with the real values
  // from config.db, once, on mount. A no-op outside Tauri; see
  // stores/settings.js.
  $effect(() => { loadPreferences(); });

  // Replaces the installed half of the Databases section with the real
  // libraries from config.db, once, on mount. A no-op outside Tauri; see
  // stores/settings.js. Chained, not a separate effect: restoring the
  // last-selected library (`loadActiveLibrarySelection()`, `stores/
  // libraries.js`) has to run AFTER this replaces the seeded/mock rows —
  // see that function's own comment for why the order matters.
  $effect(() => { loadLibraries().then(() => loadActiveLibrarySelection()); });

  // Replaces the Engines section with the real engines from config.db,
  // once, on mount. A no-op outside Tauri; see stores/settings.js.
  $effect(() => { loadEngines(); });

  // Replaces the Subscriptions list with the real subscriptions from
  // config.db, once, on mount — read-only (see stores/settings.js). A
  // no-op outside Tauri.
  $effect(() => { loadSubscriptions(); });

  function onNavigate(detail) {
    if (detail?.section === 'about') {
      // §2.2 — About opens or focuses the Settings tab AND jumps to the
      // About section. Selecting the section is the part that actually
      // satisfies the clause; the flash is only a visual cue.
      selectSection('about');
      aboutFocus = true;
      setTimeout(() => (aboutFocus = false), 1400);
    }
  }

  /* Keyboard map — WF-10 */
  function onKeydown(e) {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;

    if (e.key.toLowerCase() === 'w') { e.preventDefault(); closeActive(); return; }
    if (e.key === 'Tab') { e.preventDefault(); activateByOffset(e.shiftKey ? -1 : 1); return; }
    if (/^[1-8]$/.test(e.key)) { e.preventDefault(); activateIndex(Number(e.key)); return; }
    if (e.key === '9') { e.preventDefault(); activateLast(); return; }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div id="app-root">
  <TabBar onnavigate={onNavigate} />
  <WorkspaceArea {aboutFocus} />
</div>

<!-- §2.4 — covers the shell entirely below 800 x 600 (see WindowFloorGate). -->
<WindowFloorGate />
<QuitNotice />
