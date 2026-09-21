import { writable, derived, get } from 'svelte/store';
import { activeId } from './tabs.js';
import { GAMES } from '$lib/mock-data/sample-games.js';
import { pliesFor, engineFor, readGame } from '$lib/game/plies.js';
import { SECTIONS, DEFAULT_VISIBILITY } from '$lib/game/sections.js';
import { explorerRows, positionGames, explorerHeight, positionKey } from '$lib/game/explorer.js';
import { explorerLibraries, positionStats } from '$lib/game/explorerMock.js';
import {
  engineSources, engineHeight, clampLines, clampDepth,
  ENGINE_DEFAULT_LINES, ENGINE_DEFAULT_DEPTH
} from '$lib/game/engine.js';
import { analyse, hasLegalMoves } from '$lib/game/engineMock.js';
import { objects } from './settings.js';
import {
  games as libraryGames, tags as libraryTags, collections as libraryCollections,
  activeLibraryConnection
} from './library.js';
import { known, ratingText, resultText, infoContentHeight } from '$lib/game/info.js';
import { readMovetextFor, readRecordFields, readPositionStats } from '$lib/data/games.js';
import { explorerConnection, isTauri } from '$lib/data/session.js';
import { activeLibraryId } from './libraries.js';

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
  /*
    A NUMERIC id is a row key, not a string to hash. `charCodeAt` does not
    exist on a number, so the loop below never ran for one and every such tab
    resolved to `GAMES[0]` — harmless while the only numeric ids were real
    database rows (which never reach this function), wrong the moment the PWA
    stopgap started handing out `sample-games.js`'s own ids. Resolve by id
    where the id names a row, and fall through to the hash otherwise so a
    tab opened on a generated stress row still gets a game rather than
    nothing.
  */
  if (typeof libraryId === 'number') {
    return GAMES.find((g) => g.id === libraryId) ?? GAMES[0];
  }
  let h = 0;
  for (let i = 0; i < libraryId.length; i++) h = (h * 31 + libraryId.charCodeAt(i)) | 0;
  return GAMES[Math.abs(h) % GAMES.length];
}

/**
 * Does this tab's `libraryGameId` name a row in the REAL game database?
 *
 * A real `games.id` is a SQLite integer (`readGames()`'s rows, and the
 * library rows built from them) — a `number`. The test suite's fixture
 * tabs, and any tab opened with no library row at all, use a string
 * sentinel or `null`, which is also what `gameForLibraryId`'s hash was
 * built for.
 *
 * `typeof` alone is NO LONGER the whole test. It was, until the PWA
 * stopgap in `stores/library.js`'s `loadGames()` began filling `games`
 * from `library/mock.js`'s `realRows()` — whose ids are
 * `sample-games.js`'s own 1–40, integers like any other. A tab opened on
 * one of those took the real-database path, found no connection, and sat
 * on `EMPTY_REAL_GAME`: a board at the starting position with no moves,
 * which is what an opened Sample Games game looked like. `mockLibraryGame`
 * below is the second half of the test.
 */
const isRealGameId = (libraryGameId) => typeof libraryGameId === 'number';

/**
 * The `sample-games.js` row a library id names, when the active library is
 * the PWA's seeded Sample Games row and there is no real database behind it.
 *
 * MIRRORS `loadGames()`'s own stopgap condition (`!isTauri()` and the seeded
 * `db-2`) deliberately and in full, rather than inferring "mock" from a
 * failed connection: on desktop a connection that fails is a fault to show,
 * not a cue to display some other game's moves. Desktop never reaches this —
 * `isTauri()` is true there — so its path is unchanged.
 *
 * TEMPORARY, and paired with that stopgap: both come out together when the
 * PWA gets real per-library storage. See ACTIONS.md, "Remove the
 * `loadGames()` PWA stopgap and its `isTauri()` exception".
 */
function mockLibraryGame(libraryGameId) {
  if (!isRealGameId(libraryGameId)) return null;
  if (isTauri() || get(activeLibraryId) !== 'db-2') return null;
  return GAMES.find((g) => g.id === libraryGameId) ?? null;
}

/**
 * Does this tab read the real database, or `sample-games.js`?
 *
 * Decided ONCE, when the tab's state is built, and carried on the state —
 * not recomputed per read. A tab is opened from a library and keeps that
 * row (`libraryGameId`); switching the switcher afterwards must not change
 * what an already-open tab is showing. Falls back to the id test for a
 * state built before this field existed.
 */
const readsRealGame = (st) => st.realGame ?? isRealGameId(st.libraryGameId);

/**
 * A REAL game's movetext, read and parsed — §5.3's other half.
 *
 * The Info card reads its identity fields off the library row directly
 * (`activeGame` below, `record = row ?? game`), because those columns are
 * already loaded by `loadGames()`. The board, move list and engine banner
 * need the full movetext, which is not: `games.movetext`/`games.pgn` are not
 * columns `readGames()` selects (§3.2.4.2's eight are list columns, not the
 * document), so they need their own fetch, once per game, on demand rather
 * than up front for every row the Library lists.
 *
 * Keyed by libraryGameId — the real `games.id` — never by tab: two tabs
 * opened on the same game share one fetch and one parse, the same sharing
 * `plies.js`'s WeakMap gives mock rows for free (a `Map` here because a real
 * game has no row object to hang a WeakMap entry off until this resolves it).
 *
 * NOT a Svelte store on its own; `realGames` below is, and this module holds
 * only the fetch that fills it in.
 */

/** What an absent or not-yet-loaded real game looks like: the starting
 *  position and nothing else — the same shape `readGame()` already produces
 *  for a blank movetext, reused rather than hand-written a second time —
 *  plus `site`/`round` unset, the same "don't know yet" as everything else
 *  here until the fetch below lands. */
const EMPTY_REAL_GAME = { ...readGame(''), site: null, round: null };

export const realGames = writable(new Map());

/**
 * Fetch and parse a real game's movetext, once, into `realGames`.
 *
 * Fire-and-forget: `ensureGameState` calls this without awaiting, so a tab's
 * state exists synchronously as it always has, and `activeGame` — which
 * depends on `realGames` — recomputes on its own once this settles.
 *
 * A missing connection (outside Tauri) or a read/parse failure lands on the
 * same `EMPTY_REAL_GAME` shape as a blank movetext would, under
 * `status: 'error'` so nothing retries it on the next ply move. The board
 * then shows the starting position and nothing else — sparse rather than
 * wrong, the same call the Info card's `known()` already makes for a field
 * it doesn't have. The failure itself is not silent: it goes to the console
 * for whoever is debugging, even though the UI stays quiet.
 */
function loadRealGame(libraryGameId) {
  if (get(realGames).has(libraryGameId)) return;
  realGames.update((m) => new Map(m).set(libraryGameId, { status: 'loading', ...EMPTY_REAL_GAME }));
  (async () => {
    try {
      const connection = await activeLibraryConnection();
      /* No connection (outside Tauri, before one opens, or no active library
         with a real database behind it) is not "this game has no moves" — it
         is "there is no way to know yet", the same as a read that throws.
         Treating it as ready-with-nothing would tell a caller the fetch
         succeeded when it never ran. */
      if (!connection) throw new Error('no database connection');
      const { movetext } = await readMovetextFor(connection, libraryGameId);
      const parsed = readGame(movetext);
      /*
        `site`/`round` are fetched alongside the movetext — same id, same tab-
        open moment — but their own failure is caught separately and does not
        take the movetext down with it: a game whose moves loaded fine
        shouldn't go to the empty/error state just because its Round didn't.
        They degrade to `null`, the same as a game that genuinely has none.
      */
      let record = { site: null, round: null };
      try {
        record = await readRecordFields(connection, libraryGameId);
      } catch (fieldErr) {
        console.error(`Plyvio: failed to load site/round for game ${libraryGameId}`, fieldErr);
      }
      realGames.update((m) => new Map(m).set(libraryGameId, {
        status: 'ready', ...parsed, site: record.site ?? null, round: record.round ?? null
      }));
    } catch (err) {
      console.error(`Plyvio: failed to load game ${libraryGameId}`, err);
      realGames.update((m) =>
        new Map(m).set(libraryGameId, { status: 'error', ...EMPTY_REAL_GAME })
      );
    }
  })();
}

/**
 * The plies behind a tab's game, real or mock — what `activeGame` and the
 * imperative ply-navigation functions below both need, kept in one place so
 * the two do not each grow their own idea of where a game's moves come from.
 */
function pliesForState(st) {
  if (readsRealGame(st)) {
    return (get(realGames).get(st.libraryGameId) ?? EMPTY_REAL_GAME).plies;
  }
  return pliesFor(gameById(st.gameId));
}

/**
 * The Explorer Section's position statistics, real — §6 of the schema.
 *
 * Keyed by TAB, not by position: a session can visit thousands of distinct
 * positions across a game, where it opens at most a few dozen real games, so
 * unlike `realGames` above this does not accumulate one entry per position
 * ever seen. Each tab holds only the one result its Explorer is currently
 * showing; a new ply or a new library selection simply overwrites it.
 *
 * `{ key, status, rows }` — `key` is `${libraryId}|${posKey}`, what the
 * fetch below was answering, so a stale response (ply navigation can outrun
 * a query that hasn't returned) is recognisable and dropped rather than
 * overwriting a newer, unrelated answer.
 */
export const explorerStats = writable({});

/**
 * Fetch one position's stats for a tab's selected library, into
 * `explorerStats`. Same fire-and-forget shape as `loadRealGame`.
 *
 * THREE OUTCOMES, not two, and `status` carries which:
 *
 *   `loading`      the read is in flight; nothing is known yet
 *   `ready`        a `positions` table answered — `rows` is its answer,
 *                  `[]` included, which is §6.3's genuine out-of-book state
 *   `unavailable`  there was nothing to ask: no connection (the PWA, which
 *                  has no database to open at all), or a database carrying
 *                  no `positions` table (§6's valid case —
 *                  `readPositionStats` returns `null` for it)
 *
 * The old shape collapsed all of those to `[]`, which is why the Section has
 * drawn its empty state on every position since it moved onto this path: no
 * sample database carries the table, so every read was "unavailable" wearing
 * "out of book"'s clothes. `activeGame` reads `unavailable` and falls back
 * to `explorerMock.js` — see there.
 *
 * `loading` deliberately does NOT fall back. A desktop database that does
 * answer would otherwise flash invented rows for the length of a round trip
 * and then replace them with real ones.
 */
function loadExplorerStats(tabId, libraryId, posKey) {
  const cacheKey = `${libraryId}|${posKey}`;
  if (get(explorerStats)[tabId]?.key === cacheKey) return;

  explorerStats.update((s) => ({ ...s, [tabId]: { key: cacheKey, status: 'loading', rows: [] } }));

  (async () => {
    let rows = null;
    try {
      const connection = await explorerConnection(libraryId);
      rows = connection ? await readPositionStats(connection, posKey) : null;
    } catch (err) {
      console.error(`Plyvio: failed to load Explorer stats for ${libraryId}`, err);
      /* A thrown read is "could not ask", the same as no table: it is not
         evidence that the position was never played. */
      rows = null;
    }
    const status = rows ? 'ready' : 'unavailable';
    /* The tab may by now be asking about a different position or library —
       ply navigation is faster than a round trip. Only the still-wanted
       answer is written. */
    explorerStats.update((s) =>
      s[tabId]?.key === cacheKey
        ? { ...s, [tabId]: { key: cacheKey, status, rows: rows ?? [] } }
        : s
    );
  })();
}

/**
 * Ask the Explorer to refetch: called whenever a tab's ply or its selected
 * library changes (`ensureGameState`, `goToPly`, `setExplorerLibrary` — the
 * only three places either one does). Reads current state fresh via `get`
 * rather than taking it as a parameter, so it is correct however it is
 * called: before or after the caller's own `patch`.
 *
 * No-ops when the selected library has nothing real behind it (an
 * unconfigured Settings slot, an Available-for-download catalogue entry —
 * `library` is mock-only for those) — `explorerStats` for the tab is left
 * exactly as it was rather than cleared to an empty flash for a selection
 * that was never going to answer.
 */
function refreshExplorerStats(tabId) {
  const st = get(gameStates)[tabId];
  if (!st || !st.explorerLibraryId) return;
  const fen = pliesForState(st)[st.ply]?.f;
  const key = fen ? positionKey(fen) : null;
  if (!key) return;
  loadExplorerStats(tabId, st.explorerLibraryId, key);
}

export function ensureGameState(tabId, libraryGameId = null) {
  const existing = get(gameStates)[tabId];
  if (existing) return existing;
  const mockRow = mockLibraryGame(libraryGameId);
  const realGame = !mockRow && isRealGameId(libraryGameId);
  if (realGame) loadRealGame(libraryGameId);
  const game = mockRow ?? gameForLibraryId(libraryGameId);
  const state = {
    gameId: game.id,
    /*
      Whether this tab's moves come from the database or from
      `sample-games.js` — see `readsRealGame`. Resolved here so the answer
      cannot change under an open tab.
    */
    realGame,
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

      Defaults to the first indexed-and-enabled entry `objects.databases` has
      right now, the same list `explorerLibraries` derives the picker from —
      not a literal id, which stopped meaning anything once `objects.databases`
      could hold real `libraries.id` integers instead of only `'db-1'`/`'db-2'`.
      `null` when nothing is selectable yet (outside Tauri before
      `loadLibraries()` lands, or a fresh install with no Library at all);
      `refreshExplorerStats` already no-ops on a falsy `explorerLibraryId`.
    */
    explorerLibraryId: explorerLibraries(get(objects).databases ?? [])[0]?.id ?? null,
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
  refreshExplorerStats(tabId);
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
  [gameStates, activeId, objects, libraryGames, libraryTags, libraryCollections, gameEdits,
    realGames, explorerStats],
  ([$s, $id, $objects, $libraryGames, $libraryTags, $libraryCollections, $gameEdits,
    $realGames, $explorerStats]) => {
  const st = $s[$id];
  if (!st) return null;
  /* The row, with any edits made this session laid over it. `pgn` is never in
     the overlay: the document as received is not editable, by design. */
  const base = gameById(st.gameId);
  const game = { ...base, ...($gameEdits?.[st.gameId] ?? {}) };

  /*
    THE FIX: a real library game's board, move list, engine banner and
    Info card's `site`/`round` all read what `loadRealGame` fetched for it,
    not the mock row's — the mock row is still consulted for `gameId`/edits,
    which stay a session-only overlay regardless. `real` is null for a tab
    with no library row (a sandbox tab, or a test), which keeps the mock
    path exactly as it was for those.
  */
  const real = readsRealGame(st)
    ? ($realGames.get(st.libraryGameId) ?? { status: 'loading', ...EMPTY_REAL_GAME })
    : null;
  const loading = !!real && real.status !== 'ready';
  const plies = real ? real.plies : pliesFor(game);
  const gameEngine = real ? real.engine : engineFor(game);
  const ply = Math.min(st.ply, plies.length - 1);

  /*
    The Explorer's rows for the position on the board. Real — §6 of the
    schema, read through `data/games.js`'s `readPositionStats` —
    `refreshExplorerStats` (called from `ensureGameState`, `goToPly` and
    `setExplorerLibrary`, the only three places a tab's ply or library
    selection changes) keeps `explorerStats` current for the tab; this only
    reads it. `explorerCacheKey` not matching what's stored means the fetch
    for the position now on the board hasn't landed (or there's nothing to
    fetch — no library selected, or no FEN yet), and `stats` is `[]`.

    STOPGAP — `status: 'unavailable'` falls back to `explorerMock.js`.

    §5.6.3 says the Section reads figures held by the game database and does
    not derive them, and that remains the specification: this does not change
    the clause, it diverges from it while nothing can answer the query. No
    sample database carries a `positions` table (`build_samples.py` predates
    §6) and the PWA has no database to open at all, so without this the
    Section draws its empty state on every position of every game — which it
    has done since the read path landed.

    It retires ITSELF, per database rather than per platform. `unavailable`
    stops occurring for any library whose database carries the table, so
    desktop leaves the mock behind the moment the samples are rebuilt with
    one, with no code change; the PWA keeps it until it has real storage.
    Removal is tracked in ACTIONS.md.
  */
  const libraries = explorerLibraries($objects?.databases ?? []);
  const library = libraries.find((l) => l.id === st.explorerLibraryId) ?? null;
  const played = plies[ply + 1]?.s ?? null;
  const fen = plies[ply]?.f;
  const explorerCacheKey = library && fen ? `${library.id}|${positionKey(fen)}` : null;
  const explorerEntry = explorerCacheKey ? $explorerStats[$id] : null;
  const entry = explorerEntry?.key === explorerCacheKey ? explorerEntry : null;
  const stats = entry?.status === 'unavailable'
    ? positionStats(fen, ply, library, played)
    : (entry?.status === 'ready' ? entry.rows : []);
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
        ...(row.collections ?? [])
          .map((id) => collectionNames.find((c) => c.id === id))
          .filter(Boolean)
          .map((c) => ({ kind: 'collection', id: c.id, name: c.name })),
        ...(row.tags ?? [])
          .map((id) => tagNames.find((tg) => tg.id === id))
          .filter(Boolean)
          .map((tg) => ({ kind: 'tag', id: tg.id, name: tg.name }))
      ]
    : [];

  /*
    Record fields the Info card draws. `site`/`round` are the two §1 fields
    `row` (the library row, built from `readGames()`'s eight list columns)
    never carries, real game or not — they come from `real` instead, the
    same per-game fetch that loaded the movetext, for a real game; the mock
    row for everything else. A null here is a game that genuinely has no
    Round, not a fallback — see `readRecordFields`.
  */
  const record = row ?? game;
  const info = {
    white: known(record.white),
    black: known(record.black),
    whiteElo: ratingText(record.whiteElo ?? record.white_elo),
    blackElo: ratingText(record.blackElo ?? record.black_elo),
    result: resultText(record.result),
    date: known(record.date),
    site: known(real ? real.site : game.site),
    event: known(record.event),
    round: known(real ? real.round : game.round),
    favorite: !!row?.favorite,
    chips,
    hasRow: !!row
  };

  return {
    tabId: $id, state: st, game, plies, ply, position: plies[ply], engine: gameEngine,
    /*
      True while a real game's movetext hasn't landed yet (or failed to).
      Nothing reads this today — the board/move list/engine sections render
      the starting position underneath it either way, deliberately, rather
      than carrying loading chrome for a local read that is normally a few
      milliseconds — but it is here for a component that later wants to.
    */
    loading,
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
 * Collections are written as a full array, matching how a library row
 * already carries `collections` (many-to-many, the same shape as `tags`) and
 * how the Info card's own chips already read it back.
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
            collections: (v.collections ?? []).map((c) => c.id)
          }
        : r
    )
  );
}

/** The Section is sized to content; the shell needs that height to allocate. */
export const explorerContentHeight = (rows) => explorerHeight(rows.length);

export function setExplorerLibrary(tabId, libraryId) {
  patch(tabId, () => ({ explorerLibraryId: libraryId }));
  refreshExplorerStats(tabId);
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
  const max = pliesForState(st).length - 1;
  /*
    Leaving the position clears the Engine Section, on or off alike — and
    returning does not bring it back. What an engine said about a position it is
    no longer searching is not a fact about the game (Q8), and a stale line that
    reappeared on a round trip would be indistinguishable from a live one.
  */
  patch(tabId, () => ({ ply: Math.max(0, Math.min(max, ply)), engineHold: null }));
  refreshExplorerStats(tabId);
}

export const nextPly = (tabId) => goToPly(tabId, (get(gameStates)[tabId]?.ply ?? 0) + 1);
export const prevPly = (tabId) => goToPly(tabId, (get(gameStates)[tabId]?.ply ?? 0) - 1);
export const firstPly = (tabId) => goToPly(tabId, 0);
export const lastPly = (tabId) => goToPly(tabId, Number.MAX_SAFE_INTEGER);

export function atLastPly(tabId) {
  const st = get(gameStates)[tabId];
  return !!st && st.ply >= pliesForState(st).length - 1;
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
  realGames.set(new Map());
  explorerStats.set({});
}
