import { writable, derived, get } from 'svelte/store';
import { activeId } from './tabs.js';
import { GAMES } from '$lib/game/games.js';
import { pliesFor, engineFor } from '$lib/game/plies.js';
import { SECTIONS, DEFAULT_VISIBILITY } from '$lib/game/sections.js';
import { explorerRows, positionGames, explorerHeight } from '$lib/game/explorer.js';
import { positionStats, explorerLibraries } from '$lib/game/explorerMock.js';
import {
  engineSources, engineHeight, clampLines, clampDepth,
  ENGINE_DEFAULT_LINES, ENGINE_DEFAULT_DEPTH
} from '$lib/game/engine.js';
import { analyse, hasLegalMoves } from '$lib/game/engineMock.js';
import { objects } from './settings.js';
import { games as libraryGames, tags as libraryTags, collections as libraryCollections }
  from './library.js';
import { known, ratingText, resultText, infoContentHeight } from '$lib/game/info.js';

/**
 * Game Workspace state — §5.3, §2.3.
 *
 * Keyed by TAB id, not game id. §2.3 requires each tab to keep its own state,
 * and §5.3 makes the current ply the workspace's primary state: two tabs on
 * the same game must be able to sit at different plies, with independent
 * orientation and Section composition.
 */

export const gameStates = writable({});

/**
 * EDITS TO A GAME'S RECORD, as an overlay rather than a mutation.
 *
 * `GAMES` is a hand-maintained, read-only table standing in for rows the
 * database would hold, and it says so: the UI cannot add, remove or modify a
 * game. The Edit dialog does not change that — it records what a write WOULD
 * have changed, keyed by game id, and `activeGame` merges the overlay over the
 * row when it reads it.
 *
 * Which is also the honest model of the schema. §2.1 keeps `pgn` byte-for-byte
 * as received and treats the lifted columns as the editable copies, so editing
 * White changes a column and leaves the tag pair alone — a column and its tag
 * can legitimately disagree, and this overlay is exactly that disagreement.
 *
 * NOT PERSISTED. The prototype has no writable database; edits last the
 * session. Nothing here writes to `pgn`, here or anywhere.
 */
export const gameEdits = writable({});

/** The prototype has four real games; a library row is mapped onto one. */
function gameForLibraryId(libraryId) {
  if (!libraryId) return GAMES[0];
  let h = 0;
  for (let i = 0; i < libraryId.length; i++) h = (h * 31 + libraryId.charCodeAt(i)) | 0;
  return GAMES[Math.abs(h) % GAMES.length];
}

export function ensureGameState(tabId, libraryGameId = null) {
  const existing = get(gameStates)[tabId];
  if (existing) return existing;
  const game = gameForLibraryId(libraryGameId);
  const state = {
    gameId: game.id,
    /*
      The LIBRARY ROW this tab was opened from, kept rather than discarded.

      The game's own record (white, result, date…) lives on the game; the
      user's marks on it — favourite, tags, collections — live on the library
      row, because they are statements about this user's copy rather than about
      the game. Game Info draws both, so it needs the link.

      Null where a tab was opened without one; the card then draws the record
      and no marks, which is the honest reading of "not in a library".
    */
    libraryGameId,
    ply: 0,
    orientation: 'white',
    evalVisible: true,
    /*
      Which library the Explorer is reading. Per tab, like the ply and the
      orientation: two tabs on one game must be able to ask different libraries.
      The library explored is deliberately independent of the game's own — reading
      your own game against a master library is the Section's most useful case.
    */
    explorerLibraryId: 'db-1',
    /*
      The Engine Section, per tab like everything else here. `engineId` is left
      null rather than seeded: the source resolves to the first engine Settings
      offers, so a tab follows Settings until the user picks something in it,
      and an engine that is later turned off in Settings does not leave a tab
      pointing at nothing.

      `engineHold` is the retained result (Q8, EN-06). Switching off stops the
      search and keeps what it found, frozen with the settings that produced it;
      moving to another ply clears it, and coming back does not bring it back.
      Live analysis does not persist — not across navigation, and not to disk.
    */
    engineOn: false,
    engineId: null,
    engineLines: ENGINE_DEFAULT_LINES,
    engineDepth: ENGINE_DEFAULT_DEPTH,
    engineHold: null,
    sections: structuredClone(DEFAULT_VISIBILITY)
  };
  gameStates.update((s) => ({ ...s, [tabId]: state }));
  return state;
}

function patch(tabId, fn) {
  gameStates.update((s) => {
    const cur = s[tabId];
    if (!cur) return s;
    return { ...s, [tabId]: { ...cur, ...fn(cur) } };
  });
}

export const gameById = (id) => GAMES.find((g) => g.id === id) || GAMES[0];

/**
 * The game and ply shown in the active tab.
 *
 * `plies` is read from the row's movetext rather than stored on it (§3 keeps the
 * moves and nothing derived from them), and is carried here so that everything
 * downstream indexes the same array instead of parsing its own.
 */
export const activeGame = derived(
  [gameStates, activeId, objects, libraryGames, libraryTags, libraryCollections, gameEdits],
  ([$s, $id, $objects, $libraryGames, $libraryTags, $libraryCollections, $gameEdits]) => {
  const st = $s[$id];
  if (!st) return null;
  /* The row, with any edits made this session laid over it. `pgn` is never in
     the overlay: the document as received is not editable, by design. */
  const base = gameById(st.gameId);
  const game = { ...base, ...($gameEdits?.[st.gameId] ?? {}) };
  const plies = pliesFor(game);
  const ply = Math.min(st.ply, plies.length - 1);

  /*
    The Explorer's rows for the position on the board. Computed here so the
    Section's height is known before the shell allocates — it is sized to content,
    so the row count is a layout input rather than something the component
    discovers after it renders.

    `positionStats` is mock (see explorerMock.js). Everything from `explorerRows`
    down treats it as §6 rows and does not know or care.
  */
  const libraries = explorerLibraries($objects?.databases ?? []);
  const library = libraries.find((l) => l.id === st.explorerLibraryId) ?? null;
  const played = plies[ply + 1]?.s ?? null;
  const stats = library ? positionStats(plies[ply]?.f, ply, library, played) : [];
  const rows = explorerRows(stats);

  /*
    The Engine Section's live view of the position on the board.

    Derived, not stored: the rows are a function of the position, the engine and
    its two settings, so there is nothing to keep in sync. What IS stored is
    whether the switch is on and, when it has just been turned off, the inputs
    that produced the rows still on screen — so that changing the line count
    afterwards does not quietly rewrite a stopped result (Q8).

    `analyse` is mock (see engineMock.js). Nothing below this line knows that.
  */
  const engineList = engineSources($objects?.engines ?? []);
  const engineSource = engineList.find((e) => e.id === st.engineId) ?? engineList[0] ?? null;
  const engineRunning = !!st.engineOn && !!engineSource;
  const hold = st.engineHold && st.engineHold.ply === ply ? st.engineHold : null;
  /*
    A retained result needs an engine to have produced it. If the one that did
    was turned off in Settings while the result was still on screen, the Section
    is back to having no engine at all — and showing its lines under a "no engine
    configured" message, at a height allocated for rows nobody is drawing, is
    worse than dropping them.
  */
  const engineInputs = engineRunning
    ? { engineId: engineSource.id, lines: st.engineLines, depth: st.engineDepth }
    : (engineSource ? hold : null);
  const engineLines = engineInputs ? analyse(plies[ply]?.f, engineInputs) : [];

  /*
    GAME INFO's view — the record, plus this user's marks on it.

    Two sources by design. `game` is the row §1 stores and is read-only here;
    `row` is the library's copy of the same game, which carries favourite, tags
    and collections. A game not opened from a library has no row, and the card
    draws the record alone rather than empty marks.

    `chips` is one list, tags and collections together in rail order, because
    the rail draws them as one horizontally scrolling line. Which kind each is
    survives as `kind`, since they are drawn with different icons.
  */
  const row = st.libraryGameId != null
    ? ($libraryGames ?? []).find((r) => r.id === st.libraryGameId) ?? null
    : null;
  const tagNames = ($libraryTags ?? []);
  const collectionNames = ($libraryCollections ?? []);
  const chips = row
    ? [
        ...(row.collections ?? (row.collection != null ? [row.collection] : []))
          .map((id) => collectionNames.find((c) => c.id === id))
          .filter(Boolean)
          .map((c) => ({ kind: 'collection', id: c.id, name: c.name })),
        ...(row.tags ?? [])
          .map((id) => tagNames.find((tg) => tg.id === id))
          .filter(Boolean)
          .map((tg) => ({ kind: 'tag', id: tg.id, name: tg.name }))
      ]
    : [];

  const info = {
    white: known(game.white),
    black: known(game.black),
    whiteElo: ratingText(game.white_elo),
    blackElo: ratingText(game.black_elo),
    result: resultText(game.result),
    date: known(game.date),
    site: known(game.site),
    event: known(game.event),
    round: known(game.round),
    favorite: !!row?.favorite,
    chips,
    hasRow: !!row
  };

  return {
    tabId: $id, state: st, game, plies, ply, position: plies[ply], engine: engineFor(game),
    info,
    engineView: {
      sources: engineList,
      source: engineSource,
      running: engineRunning,
      lines: engineLines,
      hasMoves: hasLegalMoves(plies[ply]?.f),
      lineCount: st.engineLines,
      depth: st.engineDepth,
      moveNumber: Math.floor(ply / 2) + 1,
      blackToMove: ply % 2 === 1
    },
    explorer: {
      libraries, library, rows, played,
      total: positionGames(stats),
      moveNumber: Math.floor(ply / 2) + 1,
      blackToMove: ply % 2 === 1
    }
  };
});

/**
 * Game Info is sized to content too — but to one of only TWO heights, three
 * rows or four. The rail scrolls sideways rather than wrapping, so a fourth
 * chip costs nothing and nothing in between is reachable.
 */
export const infoHeight = (info) => infoContentHeight((info?.chips?.length ?? 0) > 0);

/**
 * The favourite, toggled from the card's meta row.
 *
 * It writes to the LIBRARY ROW, not to the game: the mark is this user's
 * statement about their copy. A game opened without a row has nothing to write
 * to, and the control is not drawn.
 */
export function toggleFavourite(tabId) {
  const st = get(gameStates)[tabId];
  if (!st || st.libraryGameId == null) return;
  libraryGames.update((rows) =>
    rows.map((r) => (r.id === st.libraryGameId ? { ...r, favorite: !r.favorite } : r))
  );
}

/**
 * Save the Edit dialog (GI-M).
 *
 * TWO DESTINATIONS, because the values have two owners. The game's record —
 * players, ratings, result, event, site, date, round — goes to the overlay
 * above. The user's marks on their copy — favourite, tags, collections — go to
 * the LIBRARY ROW, which is where they already live and where the Library reads
 * them from. Writing the marks onto the game would put one user's opinion into
 * the shared record of what happened.
 *
 * COLLECTIONS ARE TRUNCATED TO ONE, which is a model mismatch rather than a
 * decision: a library row carries a single `collection` id, while GI-M's form
 * offers a token field for several — the same shape the Add Games dialog
 * offers. One of the two is wrong and it is not this function's to settle, so
 * it writes the first and does not pretend the rest were stored.
 */
export function saveGameInfo(tabId, v) {
  const st = get(gameStates)[tabId];
  if (!st) return;

  gameEdits.update((e) => ({
    ...e,
    [st.gameId]: {
      ...(e[st.gameId] ?? {}),
      white: v.white,
      white_elo: v.white_elo,
      black: v.black,
      black_elo: v.black_elo,
      result: v.result,
      event: v.event,
      site: v.site,
      date: v.date,
      round: v.round
    }
  }));

  if (st.libraryGameId == null) return;
  libraryGames.update((rows) =>
    rows.map((r) =>
      r.id === st.libraryGameId
        ? {
            ...r,
            favorite: !!v.favorite,
            tags: (v.tags ?? []).map((x) => x.id),
            collection: (v.collections ?? [])[0]?.id ?? null
          }
        : r
    )
  );
}

/** The Section is sized to content; the shell needs that height to allocate. */
export const explorerContentHeight = (rows) => explorerHeight(rows.length);

export function setExplorerLibrary(tabId, libraryId) {
  patch(tabId, () => ({ explorerLibraryId: libraryId }));
}

/**
 * The Engine Section is sized to content too: one to three lines, or a state
 * message at the floor. Same arrangement as the Explorer — the shell needs the
 * height before the component renders.
 */
export const engineContentHeight = (lines) => engineHeight(lines.length);

/**
 * Q2 — the Section cannot run without an engine. Turning it ON with no engine
 * selected is not refused here so much as impossible: the switch that would
 * request it is disabled, and this is the second place that holds.
 *
 * Turning it OFF freezes the inputs behind what is on screen. Nothing is
 * cleared; the rows dim and stay (EN-06).
 */
export function setEngineOn(tabId, on) {
  const sources = engineSources(get(objects)?.engines ?? []);
  patch(tabId, (cur) => {
    const source = sources.find((e) => e.id === cur.engineId) ?? sources[0] ?? null;
    if (!source) return { engineOn: false, engineHold: null };
    return on
      ? { engineOn: true, engineHold: null }
      : {
          engineOn: false,
          engineHold: {
            ply: cur.ply, engineId: source.id, lines: cur.engineLines, depth: cur.engineDepth
          }
        };
  });
}

/** A retained result belongs to the engine that produced it; changing the
    engine discards it rather than relabelling it. */
export function setEngineSource(tabId, engineId) {
  patch(tabId, () => ({ engineId, engineHold: null }));
}

export function setEngineLines(tabId, n) {
  patch(tabId, () => ({ engineLines: clampLines(n) }));
}

export function setEngineDepth(tabId, n) {
  patch(tabId, () => ({ engineDepth: clampDepth(n) }));
}

/* ------------------------------ §5.3 ply navigation ---------------------- */

export function goToPly(tabId, ply) {
  const st = get(gameStates)[tabId];
  if (!st) return;
  const max = pliesFor(gameById(st.gameId)).length - 1;
  /*
    Leaving the position clears the Engine Section, on or off alike — and
    returning does not bring it back. What an engine said about a position it is
    no longer searching is not a fact about the game (Q8), and a stale line that
    reappeared on a round trip would be indistinguishable from a live one.
  */
  patch(tabId, () => ({ ply: Math.max(0, Math.min(max, ply)), engineHold: null }));
}

export const nextPly = (tabId) => goToPly(tabId, (get(gameStates)[tabId]?.ply ?? 0) + 1);
export const prevPly = (tabId) => goToPly(tabId, (get(gameStates)[tabId]?.ply ?? 0) - 1);
export const firstPly = (tabId) => goToPly(tabId, 0);
export const lastPly = (tabId) => goToPly(tabId, Number.MAX_SAFE_INTEGER);

export function atLastPly(tabId) {
  const st = get(gameStates)[tabId];
  return !!st && st.ply >= pliesFor(gameById(st.gameId)).length - 1;
}

/* --------------------------------- board -------------------------------- */

export function flipBoard(tabId) {
  patch(tabId, (cur) => ({ orientation: cur.orientation === 'white' ? 'black' : 'white' }));
}

/**
 * §5.4.1 — hiding the bar renders nothing into its slot; it does not reclaim
 * the space. The board must not move.
 */
export function toggleEvalBar(tabId) {
  patch(tabId, (cur) => ({ evalVisible: !cur.evalVisible }));
}

/* -------------------------------- sections ------------------------------- */

export function toggleCollapsed(tabId, sectionId) {
  patch(tabId, (cur) => ({
    sections: {
      ...cur.sections,
      [sectionId]: { ...cur.sections[sectionId], collapsed: !cur.sections[sectionId].collapsed }
    }
  }));
}

export function toggleHidden(tabId, sectionId) {
  const def = SECTIONS.find((s) => s.id === sectionId);
  if (!def?.hideable) return;          // a Section may permit collapse but not hiding
  patch(tabId, (cur) => ({
    sections: {
      ...cur.sections,
      [sectionId]: { ...cur.sections[sectionId], hidden: !cur.sections[sectionId].hidden }
    }
  }));
}

/** Section definitions merged with this tab's collapse/hide state. */
export function composition(state, contentHeights = {}) {
  return SECTIONS.map((s) => ({
    ...s,
    ...(contentHeights[s.id] !== undefined ? { contentHeight: contentHeights[s.id] } : {}),
    ...(state?.sections?.[s.id] ?? {})
  }));
}

export function resetGameState() {
  gameStates.set({});
}
