<script>
  /**
   * Game Workspace — §5.
   *
   * Two regions: a flexible Game View and a fixed 360px Game Details. The
   * workspace itself never scrolls (§5.5); each region handles its own.
   *
   * §5.3 — the current ply is this workspace's primary state. Everything that
   * reports on a position follows it; nothing holds its own idea of where the
   * game is. Toolbar, keyboard and (later) Sections are equivalent inputs.
   */
  import { onDestroy, untrack } from 'svelte';
  import { t } from '$lib/stores/i18n.js';
  import {
    activeGame, composition, ensureGameState,
    firstPly, prevPly, nextPly, lastPly, goToPly, goToPath, atLastPly,
    moveInputs, playMove, editVariation,
    flipBoard, toggleCollapsed, toggleHidden, setPlyShapes,
  explorerContentHeight, setExplorerLibrary,
  engineContentHeight, setEngineOn, setEngineSource, setEngineLines, setEngineDepth,
  infoHeight, toggleFavourite, saveGameInfo, saveTab
} from '$lib/stores/game.js';
  import { pvMoves } from '$lib/game/moves.js';
  import { engineHoverAutoShapes } from '$lib/game/engine.js';
  import { openSettings } from '$lib/stores/tabs.js';
  import { selectSection } from '$lib/stores/settings.js';
  import GameView from './GameView.svelte';
  import GameDetails from './GameDetails.svelte';
  import GameInfoDialog from './GameInfoDialog.svelte';

  let { tabId, libraryGameId = null } = $props();

  /*
    Deliberately the INITIAL values. A tab's game is fixed when the tab opens;
    this seeds the store once and must not re-run if the props are later
    reassigned. `untrack` says so, and stops Svelte warning that the read
    captures only the first value — which is the intent, not a bug.
  */
  untrack(() => ensureGameState(tabId, libraryGameId));

  const g = $derived($activeGame);

  /* Board interaction inputs for the ply on screen right now (Stage 4) --
     `g` is read only to establish the dependency; `moveInputs` re-reads the
     stores itself so this always answers for the CURRENT ply, not a stale
     snapshot from when the tab was opened. */
  const moves = $derived.by(() => { g; return moveInputs(tabId); });

  /** null, 'top' or 'tags' — which part of the Edit dialog was asked for. */
  let editing = $state(null);
  const openEdit = (where) => (editing = where);

  /*
    §5.4.1 and Q8 — the Evaluation Bar's source, when the Engine Section is
    running for the position on the board.

    The relationship is LOOSE and one-way. A live search is the better answer to
    "what is this position worth" than an evaluation stored by some other engine
    at some other time, so while one is running the bar follows it and moves
    with it. The moment it stops, the bar is back on `[%eval]` — or on nothing,
    which it draws as neutral rather than as 0.00.

    Never both at once: two numbers for one position, a thousand pixels apart,
    is the failure this rule exists to prevent. And nothing is written back —
    the Section does not produce `[%eval]`, here or anywhere.
  */
  const liveEval = $derived.by(() => {
    const top = g?.engineView?.running ? g.engineView.lines[0] : null;
    return top ? { e: top.e, x: top.x } : null;
  });

  /** The source menu's footer, and the body's way out of the no-engine state:
      Settings, at the Engines section rather than at its front page. */
  function openEngineSettings() {
    selectSection('engines');
    openSettings();
  }

  /**
   * Engine Section — hover a line to preview it, click to play its first
   * move (ACTIONS.md, 25 Sep). Ephemeral UI state, the same category as
   * `editing`/`playing` above: nothing here is saved, and none of it
   * belongs in the tab's own state in `stores/game.js`.
   *
   * The hovered RANK, not the line object itself. `EngineLines.svelte`
   * reports whichever row the pointer is over; the line data for that row
   * is re-derived from `g.engineView.lines` on every render instead of
   * captured once at pointerenter. Two things needed this, both found by
   * hand 25 Sep: clicking a line plays its move, which moves the board and
   * starts a new search, but the pointer is still sitting over the same
   * row the whole time -- no pointerenter/pointerleave fires, so nothing
   * would tell a captured-object version to update, and it either froze on
   * the old line or (with the explicit clear this replaced) went blank
   * until the pointer left and came back. Deriving by rank instead means
   * the annotation tracks whatever that row is currently showing -- the
   * old line until the new position's first result arrives, then the new
   * one -- with no re-hover needed. It's also just correct for the case
   * the old comment here worried about (the object going stale mid-search
   * as depth improves the PV): now it can't go stale, because it's never
   * kept past one render.
   */
  let hoveredRank = $state(null);

  const hoveredLine = $derived(
    hoveredRank == null ? null : (g?.engineView?.lines ?? []).find((l) => l.rank === hoveredRank) ?? null
  );

  /**
   * The board's `autoShapes` for the hover preview -- `game/engine.js`'s
   * `engineHoverAutoShapes` does the actual work (pure, tested on its own);
   * this just feeds it the position actually on screen and the row's
   * current line, if any (the position may have fewer legal moves than
   * the hovered rank, or no result yet for a search just starting).
   */
  const engineHoverShapes = $derived(
    g && hoveredLine ? engineHoverAutoShapes(g.position.f, hoveredLine) : []
  );

  function onEngineHover(line) {
    hoveredRank = line ? line.rank : null;
  }

  /** Plays the line's first ply exactly as a board drag would -- through the
      same tab-scoped `playMove`, which walks into an existing move or
      branches a new variation. */
  function onEngineLineClick(line) {
    if (!g) return;
    const move = pvMoves(g.position.f, line.pv, 1)[0];
    if (move) playMove(tabId, move);
  }

  /** The Explorer's source menu footer: Settings, at the Databases section,
      where the Libraries it reads from are managed. */
  function openDatabaseSettings() {
    selectSection('databases');
    openSettings();
  }

  /* ------------------------------ playback ------------------------------ */

  let playing = $state(false);
  let timer = null;

  function stop() { playing = false; clearInterval(timer); timer = null; }

  function play() {
    if (playing) return stop();
    if (atLastPly(tabId)) firstPly(tabId);
    playing = true;
    timer = setInterval(() => {
      if (atLastPly(tabId)) return stop();
      nextPly(tabId);
    }, 700);
  }

  // Any manual navigation cancels playback: the user has taken the cursor
  // back, and a board that keeps advancing under them would be a bug.
  const manual = (fn) => () => { stop(); fn(tabId); };

  onDestroy(stop);
  $effect(() => { tabId; stop(); });

  /* ------------------------------- §5.3 keys ---------------------------- */

  function onKeydown(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;          // shell owns modified keys (§2.5)
    const el = e.target;
    if (el instanceof HTMLElement &&
        (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;

    switch (e.key) {
      case 'ArrowLeft':  stop(); prevPly(tabId); break;
      case 'ArrowRight': stop(); nextPly(tabId); break;
      case 'Home':       stop(); firstPly(tabId); break;
      case 'End':        stop(); lastPly(tabId); break;
      case ' ':          play(); break;
      case 'f': case 'F': flipBoard(tabId); break;
      default: return;
    }
    e.preventDefault();
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if g}
  <div class="game" aria-label={$t('ws.game.title')}>
    <GameView
      position={g.position}
      live={liveEval}
      orientation={g.state.orientation}
      evalVisible={g.state.evalVisible}
      shapes={g.shapes}
      onshapeschange={(s) => setPlyShapes(tabId, g.path, s)}
      autoShapes={engineHoverShapes}
      movable={moves.movable}
      dests={moves.dests}
      turnColor={moves.turnColor}
      onmove={(from, to, promotion) => playMove(tabId, { from, to, promotion })}
    />
    <GameDetails
      sections={composition(g.state, {
        info: infoHeight(g.info),
        explorer: explorerContentHeight(g.explorer.rows),
        engine: engineContentHeight(g.engineView.lines, g.engineView)
      })}
      plies={g.plies}
      engine={g.engine}
      ply={g.ply}
      tree={g.tree}
      path={g.path}
      orientation={g.state.orientation}
      explorer={g.explorer}
      onselectlibrary={(id) => setExplorerLibrary(tabId, id)}
      onexplorersettings={openDatabaseSettings}
      engineView={g.engineView}
      onengine={(on) => setEngineOn(tabId, on)}
      onselectengine={(id) => setEngineSource(tabId, id)}
      onenginelines={(n) => setEngineLines(tabId, n)}
      onenginedepth={(n) => setEngineDepth(tabId, n)}
      onenginesettings={openEngineSettings}
      onenginehover={onEngineHover}
      onengineplay={onEngineLineClick}
      plyCount={g.plies.length}
      onselectply={(n) => { stop(); goToPly(tabId, n); }}
      onselectpath={(p) => { stop(); goToPath(tabId, p); }}
      onvariationedit={(command, p) => { stop(); editVariation(tabId, command, p); }}
      {playing}
      info={g.info}
      onfavourite={() => toggleFavourite(tabId)}
      oneditinfo={() => openEdit('top')}
      onedittags={() => openEdit('tags')}
      dirty={g.dirty}
      onsave={() => saveTab(tabId)}
      ontoggleSection={(id) => toggleHidden(tabId, id)}
      oncollapse={(id) => toggleCollapsed(tabId, id)}
      onhide={(id) => toggleHidden(tabId, id)}
      onfirst={manual(firstPly)}
      onprev={manual(prevPly)}
      onnext={manual(nextPly)}
      onlast={manual(lastPly)}
      onflip={() => flipBoard(tabId)}
      onplay={play}
    />
  </div>

  {#if editing}
    <!--
      GI-M / GI-M2. Two entry points, one dialog: the Section's ⋯ menu opens it
      at the top, and the card's chip rail opens it scrolled to Tags and
      Collections. `editing` carries which, because arriving at the top when you
      pressed the tags is a different dialog from the one you asked for.
    -->
    <GameInfoDialog
      record={g.record}
      info={g.info}
      focus={editing}
      onclose={() => (editing = null)}
      onsave={(values) => { saveGameInfo(tabId, values); editing = null; }}
    />
  {/if}
{/if}

<style>
  .game {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    /* §5.5 — the workspace never scrolls. Regions handle their own. */
    overflow: hidden;
  }
</style>
