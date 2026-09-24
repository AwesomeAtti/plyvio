<script>
  import TabBar from './TabBar.svelte';
  import WorkspaceArea from './WorkspaceArea.svelte';
  import WindowFloorGate from './WindowFloorGate.svelte';
  import SecondWindowGate from './SecondWindowGate.svelte';
  import QuitNotice from './QuitNotice.svelte';
  import { get } from 'svelte/store';
  import {
    openGame, activeId, activateByOffset, activateIndex, activateLast
  } from '$lib/stores/tabs.js';
  import {
    requestCloseActiveTab, pendingCloseTab, saveAndClose, discardAndClose, cancelClose
  } from '$lib/stores/closeGuard.js';
  import { saveTab } from '$lib/stores/game.js';
  import {
    openNewGame, pendingPaste, handlePaste, confirmPasteNewTab, confirmPasteReplace, cancelPaste
  } from '$lib/stores/newGame.js';
  import ConfirmUnsavedChanges from './ConfirmUnsavedChanges.svelte';
  import ConfirmPasteImport from './ConfirmPasteImport.svelte';
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

  /*
    Cmd/Ctrl+S — Stage 1's save shortcut. A no-op on any tab `saveTab`
    itself already no-ops on (nothing dirty, or no library id to save to
    yet) rather than something this handler needs to check first.
  */
  function saveCurrentTab() {
    saveTab(get(activeId));
  }

  /*
    Board paste target — `analysis-board-plan.md` Stage 3. Window-level,
    the same reach as `onKeydown`'s mod-key shortcuts above, rather than a
    listener on the board itself: `ChessBoard.svelte`'s root isn't
    focusable today (§5.4.1), and a paste's real target while a Game
    Workspace is open is "this game," not literally the board element.
    Anything actually editable — the Add Games Paste tab's own textarea, a
    Settings field — gets first refusal: its own paste event fires and
    completes there and never needs to reach here, because THIS listener
    only acts when the event's target is not an editable element at all.
  */
  function onPaste(e) {
    const target = e.target;
    const tag = target?.tagName;
    const editable = tag === 'INPUT' || tag === 'TEXTAREA' || !!target?.isContentEditable;
    if (editable) return;
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (!text) return;
    handlePaste(text);
  }

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

    if (e.key.toLowerCase() === 'w') { e.preventDefault(); requestCloseActiveTab(); return; }
    if (e.key.toLowerCase() === 's') { e.preventDefault(); saveCurrentTab(); return; }
    /*
      §2.1.2's own note: "If the New Tab Button is given a new action, this
      binding should be reconsidered alongside it." Given one 24 Sep — see
      `features.js`'s `NEW_TAB_BUTTON`.
    */
    if (e.key.toLowerCase() === 't') { e.preventDefault(); openNewGame(); return; }
    if (e.key === 'Tab') { e.preventDefault(); activateByOffset(e.shiftKey ? -1 : 1); return; }
    if (/^[1-8]$/.test(e.key)) { e.preventDefault(); activateIndex(Number(e.key)); return; }
    if (e.key === '9') { e.preventDefault(); activateLast(); return; }
  }
</script>

<svelte:window onkeydown={onKeydown} onpaste={onPaste} />

<div id="app-root">
  <TabBar onnavigate={onNavigate} />
  <WorkspaceArea {aboutFocus} />
</div>

<!-- §2.4 — covers the shell entirely below 800 x 600 (see WindowFloorGate). -->
<WindowFloorGate />
<!-- PWA only — covers the shell when another window already holds storage. -->
<SecondWindowGate />
<QuitNotice />

{#if $pendingCloseTab}
  <ConfirmUnsavedChanges
    name={$pendingCloseTab.title}
    onsave={saveAndClose}
    ondontsave={discardAndClose}
    oncancel={cancelClose}
  />
{/if}

{#if $pendingPaste}
  <ConfirmPasteImport
    kind={$pendingPaste.kind}
    onnewtab={confirmPasteNewTab}
    onreplace={confirmPasteReplace}
    oncancel={cancelPaste}
  />
{/if}
