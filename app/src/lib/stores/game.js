import { writable, derived, get } from 'svelte/store';
import { activeId } from './tabs.js';
import { GAMES } from '$lib/mock-data/sample-games.js';
import {
  pliesFor, engineFor, treeFor, readGame,
  nodeAtPath, lineFrom, mainlinePath, pathKey, parsePathKey
} from '$lib/game/plies.js';
import { SECTIONS, DEFAULT_VISIBILITY } from '$lib/game/sections.js';
import { explorerRows, positionGames, explorerHeight, positionKey } from '$lib/game/explorer.js';
import { explorerLibraries, positionStats } from '$lib/game/explorerMock.js';
import {
  engineSources, engineHeight, clampLines, clampDepth,
  ENGINE_DEFAULT_LINES, ENGINE_DEFAULT_DEPTH
} from '$lib/game/engine.js';
import { analyse, hasLegalMoves } from '$lib/game/engineMock.js';
import { createEngineSession } from '$lib/engine/session.js';
import { createWorkerTransport } from '$lib/engine/workerTransport.js';
import { isBuiltinEngine, builtinEngineUrls } from '$lib/engine/builtin.js';
import { objects } from './settings.js';
import {
  games as libraryGames, tags as libraryTags, collections as libraryCollections,
  activeLibraryConnection, loadGames
} from './library.js';
import { known, ratingText, resultText, infoContentHeight } from '$lib/game/info.js';
import {
  readMovetextFor, writeMovetextFor, updateGameFields, readRecordFields, readPositionStats,
  findOrCreateTag, addTagToGame, removeTagFromGame,
  findOrCreateCollection, addGameToCollection, removeGameFromCollection,
  setFavorite, insertGame
} from '$lib/data/games.js';
import { explorerConnection, requestPersistentStorage } from '$lib/data/session.js';
import {
  readMovetext, resolveMovetext, writeMovetext, applyShapesToMovetext, appendMoveTree,
  applyTreeEdit, applyTreeEdits, variationEditsAt, remapPathThroughChange
} from '$lib/pgn/index.js';
import { destsForFen, turnFromFen, playMove as computeMove } from '$lib/game/moves.js';

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
 * A DRAFT — a tab's own content, held only in this session until `saveTab`
 * gives it a real row (`analysis-board-plan.md`'s Stage 3, "New Game", and
 * a board paste that doesn't land on an existing saved game). Keyed by a
 * fabricated id (`draft:<n>`, never a `games.id`), so a draft counts as
 * `isRealGameId()` below — its plies live in `realGames`, read the same way
 * a real game's are, computed once up front rather than fetched, since a
 * draft's whole content is already known the moment it exists.
 *
 * `draftSeeds` is not a Svelte store: nothing needs to react to it directly.
 * `gameForLibraryId`/`gameById` read it for the record fields (white/black/
 * event/…) a mock row would otherwise supply; `realGames` (below) holds the
 * plies/engine/site/round the same way a real game's fetch would.
 */
const isDraftId = (id) => typeof id === 'string' && id.startsWith('draft:');
let draftCounter = 0;
const draftSeeds = new Map();
const draftRecordFor = (draftId) => ({ id: draftId, ...(draftSeeds.get(draftId)?.fields ?? {}) });

/**
 * The prototype has four real games; a mock/sandbox library id is mapped
 * onto one by hash. A real `games.id` (a `number`, `isRealGameId()` below)
 * never reaches this function — `ensureGameState()` only calls it once it
 * has already established the tab is NOT reading a real database, so this
 * goes back to a plain string hash, its shape before the 21 Sep PWA
 * stopgap (removed 22 Sep — see `isRealGameId()`'s own comment) briefly
 * needed a numeric-id branch to stop the stopgap's own real-looking ids
 * from hashing wrong. A draft id (above) is the one other exception,
 * checked first rather than hashed like a mock id would be.
 */
function gameForLibraryId(libraryId) {
  if (isDraftId(libraryId)) return draftRecordFor(libraryId);
  if (!libraryId) return GAMES[0];
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
 * sentinel or `null`, which is also what `gameForLibraryId`'s hash is built
 * for. Plain `typeof` is the whole test again as of 22 Sep 2026: the PWA's
 * seeded Sample Games library is now a real, `config.db`-backed row
 * (`stores/settings.js`'s `ensureSampleGamesLibrary()`), so its ids are
 * genuine `games.id` values behind a genuine connection — there is no
 * longer a real-looking mock id this needs to special-case. See
 * `CLOSED.md` for the 21 Sep stopgap this replaces.
 */
const isRealGameId = (libraryGameId) => typeof libraryGameId === 'number' || isDraftId(libraryGameId);

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
      const { movetext, fen } = await readMovetextFor(connection, libraryGameId);
      const parsed = readGame(movetext, { fen });
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
 * The move TREE behind a tab's game, real or mock, before any of this
 * session's own played moves are folded in — what `computeDirty` compares
 * a shape override against (a position not yet touched this session has
 * nothing session-only to overlay), and what `mergedTreeForState` below
 * clones as its own starting point.
 */
function baseTreeForState(st) {
  return readsRealGame(st)
    ? (get(realGames).get(st.libraryGameId) ?? EMPTY_REAL_GAME).tree
    : treeFor(gameById(st.gameId));
}

/** A tree node, deep-cloned — `children` arrays copied so pushing onto one
 *  doesn't touch the base tree (`realGames`/the mock cache) it was cloned
 *  from; `.ply` itself is never mutated, so it's fine to share by reference. */
function cloneNode(node) {
  return { ply: node.ply, children: node.children.map(cloneNode) };
}

/**
 * The tree `activeGame` and the imperative ply-navigation functions below
 * both actually navigate — the tab's base tree, PLUS every move played
 * this session (`st.pendingMoves`, Stage 4/5 of `analysis-board-plan.md`)
 * attached at its own recorded branch point rather than only ever at the
 * mainline's end. Each pending entry is `{ parentPath, ply }`
 * (`playMove` below builds these); folded in order, since a later entry's
 * `parentPath` may name a node an earlier one in the same list just
 * created (a second move played onto a variation begun a moment before).
 *
 * Cloned once per call rather than mutating the base tree in place: the
 * base is shared (the `realGames` cache, or `game/plies.js`'s own WeakMap
 * for a mock row), and two tabs can be open on the same game with
 * different pending moves of their own.
 */
/**
 * Every move played and every tree edit made this session (promote,
 * demote, Make Main Line, delete), as ONE chronological sequence. Each
 * entry keeps its own `seq` (set once, at the moment it was recorded --
 * `playMove`/`editVariation` below both use `nextSeq`, a running total
 * since neither array ever shrinks except together, on save/discard).
 *
 * WHY this matters, and can't just be "fold every move, then replay every
 * tree edit": a move's own `parentPath` is recorded against the tree AS IT
 * STOOD the moment it was played -- which, if an edit happened first,
 * already reflects that edit. Folding moves as a block before any edit
 * replays would apply that post-edit path to a tree that hasn't been
 * edited yet, landing nowhere (silently dropped by `nodeAtPath` finding
 * nothing there). Replaying strictly in `seq` order is what keeps every
 * entry meaning exactly what it meant when it was made, whatever order
 * moves and edits actually happened in.
 */
function pendingEditsInOrder(st) {
  return [
    ...(st.pendingMoves ?? []).map((m) => ({ kind: 'move', ...m })),
    ...(st.pendingTreeEdits ?? []).map((e) => ({ kind: 'tree', seq: e.seq, edit: e }))
  ].sort((a, b) => a.seq - b.seq);
}

/** The `seq` the next recorded move or tree edit gets. */
const nextSeq = (st) => (st.pendingMoves ?? []).length + (st.pendingTreeEdits ?? []).length;

function mergedTreeForState(st) {
  const root = cloneNode(baseTreeForState(st));
  for (const edit of pendingEditsInOrder(st)) {
    if (edit.kind === 'move') {
      const parent = nodeAtPath(root, edit.parentPath);
      if (parent) parent.children.push({ ply: edit.ply, children: [] });
    } else {
      applyTreeEdit(root, edit.edit);
    }
  }
  return root;
}

/**
 * `pendingEditsInOrder`'s replay against the REAL document at save time
 * (`saveTab`/`createGameFromDraft`) -- the doc-tree counterpart of
 * `mergedTreeForState` above, using the real `appendMoveTree`/
 * `applyTreeEdits` (each called with a single-entry list, so moves and
 * tree edits interleave in the exact order they actually happened). Mutates `doc`
 * in place and returns it, same convention every other `pgn/movetext.js`
 * writer here uses.
 */
function applyPendingEdits(doc, st) {
  for (const edit of pendingEditsInOrder(st)) {
    if (edit.kind === 'move') appendMoveTree(doc, [{ parentPath: edit.parentPath, ply: edit.ply }]);
    else applyTreeEdits(doc, [edit.edit]);
  }
  return doc;
}

/** The node the cursor is actually on — `st.path` resolved against the
 *  merged tree, falling back to the root if a path somehow no longer
 *  resolves (defensive; not expected in normal use, see `nodeAtPath`). */
function currentNode(st, tree) {
  return nodeAtPath(tree, st.path ?? []) ?? tree;
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
  const fen = currentNode(st, mergedTreeForState(st)).ply?.f;
  const key = fen ? positionKey(fen) : null;
  if (!key) return;
  loadExplorerStats(tabId, st.explorerLibraryId, key);
}

export function ensureGameState(tabId, libraryGameId = null) {
  const existing = get(gameStates)[tabId];
  if (existing) return existing;
  const realGame = isRealGameId(libraryGameId);
  if (realGame) loadRealGame(libraryGameId);
  const game = gameForLibraryId(libraryGameId);
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
    /*
      The cursor — Stage 5 of `analysis-board-plan.md`. An array of
      child-indices from the tree's root (`game/plies.js`'s own path
      convention, chosen after checking Lichess's and En Croissant's own
      source: both address a position this same way, an array/string path
      rather than a flat ply-plus-overlay scheme). `[]` is the starting
      position; `[3,1,0]` is "4th mainline ply's 2nd variation's 1st move".
      `ply` is kept alongside it, always `path.length` — the DEPTH of the
      position the path resolves to, which is what every consumer that only
      ever meant "how many moves deep am I" still wants (the Evaluation
      Timeline's scrubber, the Explorer/Engine Sections' move-number
      arithmetic, the Game Controls counter): before Stage 5 the two were
      numerically identical, since nothing but the mainline existed, so
      keeping `ply` as a derived mirror rather than removing it is not a
      compromise — it is the same number, still meaning the same thing, for
      every caller that was never variation-aware and was never asked to
      become so.
    */
    path: [],
    ply: 0,
    orientation: 'white',
    evalVisible: true,
    /*
      Board annotations drawn or cleared during this tab's own SESSION —
      { [pathKey]: DrawShape[] } — `game/plies.js`'s own path-string
      convention, since Stage 5 — a per-POSITION override of whatever's
      already persisted, not the whole of what the board shows (`activeGame`
      overlays it onto the current node's own `.sh`, the decoded
      `%csl`/`%cal` — see that field's own comment). Tab-scoped like
      `path`/`orientation` above: a fresh tab on the same game starts with
      no overrides of its own, showing the persisted annotations plain,
      exactly as a second tab on the same game would. Set by
      `setPlyShapes`; `isDirty` below compares each overridden position
      against the BASE tree's own node at that path rather than treating
      presence alone as dirty, so opening a game that already carries
      annotations is not itself an edit.
    */
    shapes: {},
    /*
      Moves played on the board THIS SESSION, not yet saved —
      `analysis-board-plan.md`'s Stage 4, generalized by Stage 5 to branch
      from anywhere rather than only ever extending the mainline's own last
      ply. Each entry is `{ parentPath, ply }`: `ply` is a full ply object,
      the exact shape `game/plies.js` produces for a tree node
      (`{s,f,m,k,e,x,c,b,sh}`); `parentPath` is the PATH this move was
      played from, recorded at play time (`playMove` below) — so folding a
      list of these onto the base tree (`mergedTreeForState`) reproduces
      exactly where each one was actually played, mainline extension and
      variation alike. `mergedTreeForState`/`activeGame` both read the base
      tree and this overlay as one merged tree, so ply navigation, the move list
      and `saveTab` all see a played move as if it were already part of the
      game. Cleared on save (folded into the real movetext by
      `appendMoveTree` first) or when the tab closes with it discarded.
    */
    pendingMoves: [],
    /*
      Tree edits made THIS SESSION, not yet saved: Promote/Demote
      Variation, Make Main Line, Delete from Here, Delete Variation. Each
      entry is one `pgn/movetext.js` edit (`{ op: 'move-child' |
      'mainline' | 'delete', ... }`, from `variationEditsAt`) plus its
      `seq`, in the order they were made (`editVariation()` below);
      replayed the same way and order by `mergedTreeForState` (against
      this tab's own merged tree, so an edit sticks for the rest of the
      session) and by `saveTab`/`createGameFromDraft`'s own
      `applyTreeEdits` call (against the real document, after
      `appendMoveTree` -- an edit can target a path that only exists once
      this session's pending moves are folded in). Cleared on save or when
      the tab closes with it discarded, same as `pendingMoves`.
    */
    pendingTreeEdits: [],
    /*
      Staged Game Info edits — white/white_elo/black/black_elo/result/
      event/site/date/round — made in the Edit dialog but not yet saved.
      TAB-scoped, like `shapes` above, replacing the role `gameEdits` used
      to play: that store was keyed by GAME id, so an in-progress edit in
      one tab leaked into every other tab open on the same game, and for a
      library game it was invisible anyway (`activeGame`'s `record`
      preferred the real row over it). Set by `setPendingInfo`, applied as
      an overlay in `activeGame`'s own `record`, counted by `isDirty` below.
      See `analysis-board-plan.md`'s Stage 1 revision, 24 Sep.
    */
    pendingInfo: {},
    /*
      Which library the Explorer is reading. Per tab, like the ply and the
      orientation: two tabs on one game must be able to ask different libraries.
      The library explored is deliberately independent of the game's own — reading
      your own game against a master library is the Section's most useful case.

      Defaults to the first indexed-and-enabled entry `objects.databases` has
      right now, the same list `explorerLibraries` derives the picker from —
      not a literal id: `objects.databases` holds real `libraries.id`
      integers, not fixed sentinels. `null` when nothing is selectable yet
      (before `loadLibraries()` lands, or a fresh install/PWA visit with no
      Library at all — see `stores/settings.js`'s `ensureSampleGamesLibrary()`
      for the PWA's one exception);
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

/**
 * Give a fresh draft id its content — the primitive `stores/newGame.js`'s
 * two paths both use: a blank "New Game" board, and a board paste (a FEN or
 * single-game PGN, `pgn/pasteDetect.js`). Synchronous and side-effect-only
 * on `draftSeeds`/`realGames`; the caller still does `tabs.js`'s own
 * `openGame` — this file does not import `tabs.js` (see `closeGuard.js`'s
 * own comment on why the two don't import each other).
 *
 * @param {{movetext?: string, fen?: string|null, fields?: object}} [seed]
 *   omitted (or `{}`) for a blank board at the standard starting position.
 *   `fields` are `games` table column names (`white`, `black`, `event`, …
 *   never camelCase) — a pasted PGN's own tags, or nothing for a blank one.
 * @returns {string} the new draft id, e.g. `"draft:3"`.
 */
export function seedDraftGame(seed = {}) {
  draftCounter += 1;
  const draftId = `draft:${draftCounter}`;
  const movetext = seed.movetext ?? '';
  const fen = seed.fen ?? null;
  const fields = seed.fields ?? {};
  draftSeeds.set(draftId, { movetext, fen, fields });
  const parsed = readGame(movetext, { fen });
  realGames.update((m) => new Map(m).set(draftId, {
    status: 'ready', ...parsed, site: fields.site ?? null, round: fields.round ?? null
  }));
  return draftId;
}

/**
 * Paste's "Replace This Game" (`analysis-board-plan.md` Stage 3): the tab
 * stops reading whatever it was showing and reads a brand new draft
 * instead. The game it replaces — real, saved, or another draft — is never
 * written to; only this tab's own state changes, the same as closing it and
 * opening a new draft in its place would. `ply` resets to 0 since the
 * position underneath it is a different game entirely; annotation
 * overrides and staged Info edits are session state that belonged to the
 * OLD game and do not carry over.
 */
export function replaceTabWithDraft(tabId, seed = {}) {
  const draftId = seedDraftGame(seed);
  patch(tabId, () => ({
    libraryGameId: draftId, realGame: true, gameId: draftId,
    ply: 0, shapes: {}, pendingInfo: {}
  }));
  refreshExplorerStats(tabId);
  return draftId;
}

/**
 * A draft nobody has touched yet — no seed content, no session shapes, no
 * staged Info edits. The one case a board paste's confirm dialog skips:
 * loading straight into a tab that would lose nothing (`stores/
 * newGame.js`). Not the same question `isDirty` below answers — a draft is
 * ALWAYS dirty, blank or not (Stage 3: "unsaved but with dirty flag"),
 * because it has nowhere saved yet; this is narrower — has THIS specific
 * draft had anything actually done to it since it was created.
 */
export function isPristineDraft(tabId) {
  const st = get(gameStates)[tabId];
  if (!st || !isDraftId(st.libraryGameId)) return false;
  const seed = draftSeeds.get(st.libraryGameId);
  const blank = !seed || (!seed.movetext && !seed.fen && Object.keys(seed.fields ?? {}).length === 0);
  const untouched = Object.keys(st.shapes ?? {}).length === 0
    && Object.keys(st.pendingInfo ?? {}).length === 0
    && (st.pendingMoves?.length ?? 0) === 0
    && (st.pendingTreeEdits?.length ?? 0) === 0;
  return blank && untouched;
}

function patch(tabId, fn) {
  gameStates.update((s) => {
    const cur = s[tabId];
    if (!cur) return s;
    return { ...s, [tabId]: { ...cur, ...fn(cur) } };
  });
}

export const gameById = (id) => (isDraftId(id) ? draftRecordFor(id) : GAMES.find((g) => g.id === id) || GAMES[0]);

/**
 * The base `activeGame`'s `record` and `isDirty` both mean by "the game" —
 * the library row when this tab has a real one open (§2.1's lifted columns,
 * already loaded by `loadGames()`), the mock row otherwise. `pendingInfo` is
 * a separate, tab-scoped overlay laid over this, not part of it — see
 * `ensureGameState`'s own doc comment on that field.
 */
function baseRecordFor(st) {
  const game = gameById(st.gameId);
  const row = st.libraryGameId != null
    ? (get(libraryGames) ?? []).find((r) => r.id === st.libraryGameId) ?? null
    : null;
  return row ?? game;
}

/* ---------------------- the Engine Section, live (Stage 1) ---------------- */

/**
 * The engine the Section uses for a tab: the one it picked, or else the
 * first Settings offers (`engineSources` puts the built-in engine first).
 */
function engineSourceFor(st, engines) {
  const list = engineSources(engines ?? []);
  return list.find((e) => e.id === st?.engineId) ?? list[0] ?? null;
}

/**
 * What one search is for: the engine, the position (by PATH as well as
 * FEN — Q8 treats a round trip back to a position as a new visit, and a
 * transposition reached by another path as another position) and the two
 * settings. A result carrying a different key is not about what's on the
 * board now, and is never shown.
 */
const engineKeyFor = (st, sourceId, fen) =>
  `${sourceId}|${pathKey(st.path ?? [])}|${fen}|${st.engineLines}|${st.engineDepth}`;

/**
 * The live engine's results, per TAB — the same keyed-per-tab shape as
 * `explorerStats`: `{ key, status, rows }`, with `status` one of
 * `searching`, `done` or `error`. Only the built-in engine writes here; a
 * mock engine's lines are still computed on the spot by `engineMock.js`.
 */
export const engineAnalysis = writable({});

/*
  One engine for the app (`engine/session.js`), created the first time a
  search is wanted. `setEngineTransport` swaps what it talks to — the tests'
  scripted engine, or the real one under Node — and drops any session
  already running.
*/
const workerTransport = (handlers) => {
  const { script, wasm } = builtinEngineUrls();
  return createWorkerTransport(script, wasm, handlers);
};
let engineTransport = workerTransport;
let engine = null;
const engineSession = () => (engine ??= createEngineSession({ createTransport: engineTransport }));

export function setEngineTransport(createTransport = workerTransport) {
  engine?.dispose();
  engine = null;
  lastEngineRequest = null;
  engineTransport = createTransport;
}

/**
 * The search the app wants right now, or `null` for none: the ACTIVE tab's
 * position, when its Section is on and its engine is the built-in one, and
 * the position has a move to search. Only the active tab searches; switching
 * tabs asks for the new tab's position, and a tab whose Section is off, a
 * finished game, the Library or Settings ask for nothing.
 */
const engineRequest = derived(
  [gameStates, activeId, objects, realGames],
  ([$s, $id, $objects]) => {
    const st = $s[$id];
    if (!st?.engineOn) return null;
    const source = engineSourceFor(st, $objects?.engines);
    if (!source || !isBuiltinEngine(source.id)) return null;
    const fen = currentNode(st, mergedTreeForState(st)).ply?.f;
    if (!fen || !hasLegalMoves(fen)) return null;
    return {
      tabId: $id,
      key: engineKeyFor(st, source.id, fen),
      fen,
      lines: st.engineLines,
      depth: st.engineDepth
    };
  }
);

/*
  The one place the engine is told what to do. Event-driven: every change a
  search depends on — the position, the tab, the switch, the two settings,
  the engine picked, Settings turning an engine off — already changes one of
  `engineRequest`'s inputs, so no caller has to remember to ask.
*/
let lastEngineRequest = null;
engineRequest.subscribe((req) => {
  const id = req ? `${req.tabId}|${req.key}` : null;
  if (id === lastEngineRequest) return;
  lastEngineRequest = id;
  if (!req) {
    engine?.stop();
    return;
  }
  const { tabId, key } = req;
  engineAnalysis.update((s) => ({ ...s, [tabId]: { key, status: 'searching', rows: [] } }));
  engineSession().search(req, ({ status, rows }) => {
    engineAnalysis.update((s) =>
      s[tabId]?.key === key ? { ...s, [tabId]: { key, status, rows } } : s
    );
  });
});

/** The built-in engine's rows for a tab's current position, or `[]`. */
function liveEngineRows(entry, st, sourceId, fen) {
  return entry && fen && entry.key === engineKeyFor(st, sourceId, fen) ? entry.rows : [];
}

/**
 * The game and ply shown in the active tab.
 *
 * `plies` is read from the row's movetext rather than stored on it (§3 keeps the
 * moves and nothing derived from them), and is carried here so that everything
 * downstream indexes the same array instead of parsing its own.
 */
export const activeGame = derived(
  [gameStates, activeId, objects, libraryGames, libraryTags, libraryCollections,
    realGames, explorerStats, engineAnalysis],
  ([$s, $id, $objects, $libraryGames, $libraryTags, $libraryCollections,
    $realGames, $explorerStats, $engineAnalysis]) => {
  const st = $s[$id];
  if (!st) return null;
  /* `pgn` is never overlaid: the document as received is not editable, by
     design. Session edits to the record's OTHER fields are a tab-scoped
     overlay applied below, once `record`'s base (row-or-game) is known. */
  const game = gameById(st.gameId);

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
  const baseTree = real ? real.tree : treeFor(game);
  // Moves played this session (Stage 4/5) are folded in at their own
  // recorded branch point — see `ensureGameState`'s own comment on
  // `pendingMoves` and `mergedTreeForState`'s.
  const tree = mergedTreeForState(st);
  const path = st.path ?? [];
  const node = currentNode(st, tree);
  /*
    `plies`/`ply` stay the flat, MAINLINE-ONLY shape every pre-Stage-5
    reader still wants (the Evaluation Timeline's scrubber, the
    Explorer/Engine Sections' move-number arithmetic) — `game/plies.js`'s
    own header comment says why this never needed to become
    variation-aware. `ply` is the current PATH's DEPTH, not necessarily an
    index into `plies`: the two agree exactly while the cursor is on the
    mainline (Stage 4's own behaviour, before variations existed, still
    holds for that case), and `ply` keeps meaning "how many moves deep"
    even off it, which is all any of those callers ever asked of it.
  */
  const plies = lineFrom(tree).map((entry) => entry.ply);
  const gameEngine = real ? real.engine : engineFor(game);
  const ply = path.length;

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
  const played = node.children[0]?.ply?.s ?? null;
  const fen = node.ply?.f;
  const explorerCacheKey = library && fen ? `${library.id}|${positionKey(fen)}` : null;
  const explorerEntry = explorerCacheKey ? $explorerStats[$id] : null;
  const entry = explorerEntry?.key === explorerCacheKey ? explorerEntry : null;
  const stats = entry?.status === 'unavailable'
    ? positionStats(fen, ply, library, played)
    : (entry?.status === 'ready' ? entry.rows : []);
  const rows = explorerRows(stats);

  /*
    The Engine Section's live view of the position on the board.

    TWO KINDS OF ENGINE, one row shape (Stage 1 of `engine-stage1-plan.md`).
    The built-in engine really searches: `engineRequest` above starts it for
    the active tab, and its rows arrive in `engineAnalysis`, read here only
    when they are about the position on the board now. Every other engine in
    the list is still mock — Settings' Installed rows are simulated until
    Stage 3 gives desktop engines a transport — so its rows are computed on
    the spot by `engineMock.js`'s `analyse`, as before. Nothing below this
    block knows which kind it is looking at.

    What is stored besides: whether the switch is on and, once it has been
    turned off, the ROWS that were on screen (`engineHold`, Q8). A real search
    can't be re-run on demand to reproduce them, and a stopped result must
    not be quietly rewritten by a setting changed afterwards.
  */
  const engineList = engineSources($objects?.engines ?? []);
  const engineSource = engineSourceFor(st, $objects?.engines);
  const engineRunning = !!st.engineOn && !!engineSource;
  const hold = st.engineHold && pathKey(st.engineHold.path) === pathKey(path) ? st.engineHold : null;
  /*
    A retained result needs an engine to have produced it. If the one that did
    was turned off in Settings while the result was still on screen, the Section
    is back to having no engine at all — and showing its lines under a "no engine
    configured" message, at a height allocated for rows nobody is drawing, is
    worse than dropping them.
  */
  const engineLines = !engineRunning
    ? (engineSource && hold ? hold.rows ?? [] : [])
    : isBuiltinEngine(engineSource.id)
      ? liveEngineRows($engineAnalysis[$id], st, engineSource.id, node.ply?.f)
      : analyse(node.ply?.f, { engineId: engineSource.id, lines: st.engineLines, depth: st.engineDepth });

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
  /* `pendingInfo` (Stage 1 of `analysis-board-plan.md`) overlays the Edit
     dialog's own unsaved edits onto whichever base is real — the library
     row when this game has one, the mock row otherwise — so both the Info
     card and a reopened dialog show the same, current, unsaved value. */
  const infoBase = row ?? game;
  const record = { ...infoBase, ...(st.pendingInfo ?? {}) };
  const dirty = isDraftId(st.libraryGameId) ? true : computeDirty(st, infoBase, baseTree);
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
    tabId: $id, state: st, game, record, dirty, plies, ply, tree, path, position: node.ply, engine: gameEngine,
    /*
      This tab's drawn annotations for the position on the board right now
      — see `setPlyShapes`. A position this session has actually drawn on
      (even to clear it back to nothing) shows exactly that; one nobody has
      touched this session falls back to what's already persisted for it
      (the current node's own `.sh`, decoded from `%csl`/`%cal`), so a game
      opened with existing annotations shows them, and a save's result is
      visible immediately rather than only after the tab is closed and
      reopened. Keyed by PATH since Stage 5 (`game/plies.js`'s `pathKey`),
      not by the flat `ply` above — a variation position and a mainline
      position at the same depth are different positions and must not
      share a shapes key.
    */
    shapes: st.shapes?.[pathKey(path)] !== undefined ? st.shapes[pathKey(path)] : (node.ply?.sh ?? []),
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
      hasMoves: hasLegalMoves(node.ply?.f),
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
/**
 * Persist a favourite flip to the real database, in the background — the
 * write counterpart of `readFavoriteIds` (`loadGames()`'s own read).
 * Fire-and-forget, same shape as `loadRealGame`/`loadExplorerStats`: the
 * optimistic store update in `toggleFavourite` below has already applied by
 * the time this runs, so a failure here is logged and that optimistic state
 * is left standing rather than rolled back — there is no error affordance
 * to surface it to yet. No reload needed afterward (unlike
 * `persistGameInfo` below): a favourite is a plain boolean already fully
 * correct in `libraryGames` the moment the optimistic update lands, with no
 * "newly created row" gap the way a brand-new tag or collection has.
 */
function persistFavourite(gameId, on) {
  (async () => {
    try {
      const connection = await activeLibraryConnection();
      if (!connection) throw new Error('no database connection');
      await setFavorite(connection, gameId, !!on);
      requestPersistentStorage();
    } catch (err) {
      console.error(`Plyvio: failed to save favourite for game ${gameId}`, err);
    }
  })();
}

export function toggleFavourite(tabId) {
  const st = get(gameStates)[tabId];
  if (!st || st.libraryGameId == null) return;
  let next;
  libraryGames.update((rows) =>
    rows.map((r) => {
      if (r.id !== st.libraryGameId) return r;
      next = !r.favorite;
      return { ...r, favorite: next };
    })
  );
  if (next !== undefined) persistFavourite(st.libraryGameId, next);
}

/**
 * Commit GI-M's marks — tags, collections, and (same function family,
 * folded in alongside them per the agreed plan) favourite — to the real
 * database, in the background. Fire-and-forget, same shape as
 * `loadRealGame`/`loadExplorerStats`/`persistFavourite` above: the dialog
 * has already closed and `saveGameInfo`'s own optimistic store update has
 * already applied by the time this runs, so a failure here is logged and
 * that optimistic state is left standing rather than rolled back — there
 * is no error affordance to surface it to yet.
 *
 * Uses `activeLibraryConnection()` — the same connection `loadRealGame()`
 * already assumes a tab's `libraryGameId` belongs to (this file, above),
 * not a new assumption this introduces.
 *
 * Diffs against `prev` — the row's tags/collections BEFORE `saveGameInfo`'s
 * optimistic update overwrote them, captured by the caller — rather than
 * writing every name unconditionally: `findOrCreateTag`/
 * `findOrCreateCollection` are idempotent either way, but a diff is what
 * lets something the user REMOVED actually get removed
 * (`removeTagFromGame`/`removeGameFromCollection`), which re-adding
 * everything present would never do. Every token in `v.tags`/
 * `v.collections` — an existing one or one newly typed in the dialog
 * (`TokenField.svelte`'s `isNew` tokens carry a synthetic negative id, not
 * a real one) — is resolved by NAME through `findOrCreateTag`/
 * `findOrCreateCollection`, so a new tag is created for real and an
 * existing one is found rather than trusted from a possibly-synthetic
 * client-side id.
 *
 * Reloads via `loadGames()` on success — `loadGames()`'s own doc comment
 * already names "a future favorite/trash/tag/collection write" as a reason
 * to rerun it, and this is that write: `libraryTags`/`libraryCollections`
 * (what the Sidebar and the Edit dialog's own token field read) only pick
 * up a NEWLY CREATED tag or collection once something re-reads them, which
 * `saveGameInfo`'s own optimistic patch — session state only — cannot do.
 */
function persistGameInfo(gameId, prev, v) {
  (async () => {
    try {
      const connection = await activeLibraryConnection();
      if (!connection) throw new Error('no database connection');

      const [nextTagIds, nextCollectionIds] = await Promise.all([
        Promise.all((v.tags ?? []).map((t) => findOrCreateTag(connection, t.name))),
        Promise.all((v.collections ?? []).map((c) => findOrCreateCollection(connection, c.name)))
      ]);

      const prevTagIds = new Set(prev?.tags ?? []);
      const prevCollectionIds = new Set(prev?.collections ?? []);
      const nextTagSet = new Set(nextTagIds);
      const nextCollectionSet = new Set(nextCollectionIds);

      await Promise.all([
        ...nextTagIds
          .filter((id) => !prevTagIds.has(id))
          .map((id) => addTagToGame(connection, id, gameId)),
        ...[...prevTagIds]
          .filter((id) => !nextTagSet.has(id))
          .map((id) => removeTagFromGame(connection, id, gameId)),
        ...nextCollectionIds
          .filter((id) => !prevCollectionIds.has(id))
          .map((id) => addGameToCollection(connection, id, gameId)),
        ...[...prevCollectionIds]
          .filter((id) => !nextCollectionSet.has(id))
          .map((id) => removeGameFromCollection(connection, id, gameId)),
        setFavorite(connection, gameId, !!v.favorite)
      ]);
      requestPersistentStorage();

      await loadGames();
    } catch (err) {
      console.error(`Plyvio: failed to save tags/collections/favourite for game ${gameId}`, err);
    }
  })();
}

/**
 * Save the Edit dialog (GI-M).
 *
 * TWO DESTINATIONS, because the values have two owners. The game's record —
 * players, ratings, result, event, site, date, round — is staged into the
 * tab's own pending edits (`setPendingInfo`), on the same unsaved-until-Save
 * footing as board annotations, until Stage 1's save path exists to write it
 * for real. The user's marks on their copy — favourite, tags, collections —
 * go straight to the LIBRARY ROW, which is where they already live, where the
 * Library reads them from, and where a real write already lands (below).
 * Writing the marks onto the game would put one user's opinion into the
 * shared record of what happened, and they are not "unsaved" the way the
 * record's own fields are (`analysis-board-plan.md`'s Stage 1 revision).
 *
 * Collections are written as a full array, matching how a library row
 * already carries `collections` (many-to-many, the same shape as `tags`) and
 * how the Info card's own chips already read it back.
 *
 * The store update below is optimistic, same as always; `persistGameInfo`
 * (above) commits the same values to the real database in the background,
 * diffed against the row's state just before this update applied.
 */
export function saveGameInfo(tabId, v) {
  const st = get(gameStates)[tabId];
  if (!st) return;

  setPendingInfo(tabId, {
    white: v.white,
    white_elo: v.white_elo,
    black: v.black,
    black_elo: v.black_elo,
    result: v.result,
    event: v.event,
    site: v.site,
    date: v.date,
    round: v.round
  });

  if (st.libraryGameId == null) return;

  const prevRow = get(libraryGames).find((r) => r.id === st.libraryGameId);

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

  persistGameInfo(st.libraryGameId, prevRow, v);
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
 *
 * Pass the `engineView` too, and a running search that hasn't reported a
 * line for this position yet holds the height of the line count asked for,
 * rather than dropping to the floor for a moment on every move (the real
 * engine's first line arrives a few milliseconds after the search starts).
 */
export const engineContentHeight = (lines, view = null) =>
  engineHeight(view?.running && view?.hasMoves !== false && !lines.length ? view.lineCount : lines.length);

/**
 * Q2 — the Section cannot run without an engine. Turning it ON with no engine
 * selected is not refused here so much as impossible: the switch that would
 * request it is disabled, and this is the second place that holds.
 *
 * Turning it OFF freezes the rows on screen, with the settings that
 * produced them. Nothing is cleared; the rows dim and stay (EN-06). The
 * search itself stops because `engineRequest` no longer asks for one.
 */
export function setEngineOn(tabId, on) {
  const engines = get(objects)?.engines;
  const analysis = get(engineAnalysis)[tabId];
  patch(tabId, (cur) => {
    const source = engineSourceFor(cur, engines);
    if (!source) return { engineOn: false, engineHold: null };
    if (on) return { engineOn: true, engineHold: null };
    if (!cur.engineOn) return {};
    /* Freeze exactly what the Section is showing: the built-in engine's
       latest rows for this position, or the mock's. */
    const fen = currentNode(cur, mergedTreeForState(cur)).ply?.f;
    const rows = isBuiltinEngine(source.id)
      ? liveEngineRows(analysis, cur, source.id, fen)
      : analyse(fen, { engineId: source.id, lines: cur.engineLines, depth: cur.engineDepth });
    return {
      engineOn: false,
      engineHold: {
        path: cur.path, engineId: source.id, lines: cur.engineLines, depth: cur.engineDepth, rows
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

/**
 * Move the cursor to an exact PATH — Stage 5's own primitive, every other
 * function below is built from it. Clamped only in the sense that an
 * invalid path is simply refused (the caller's own responsibility to pass
 * one `nodeAtPath` can resolve; every function below computes its own
 * against the current merged tree, so this is never reached with a path
 * that doesn't exist).
 *
 * Leaving the position clears the Engine Section, on or off alike — and
 * returning does not bring it back. What an engine said about a position it is
 * no longer searching is not a fact about the game (Q8), and a stale line that
 * reappeared on a round trip would be indistinguishable from a live one.
 */
export function goToPath(tabId, path) {
  const st = get(gameStates)[tabId];
  if (!st) return;
  if (!nodeAtPath(mergedTreeForState(st), path)) return;
  patch(tabId, () => ({ path, ply: path.length, engineHold: null }));
  refreshExplorerStats(tabId);
}

/**
 * Jump to an ABSOLUTE MAINLINE ply number — what the Evaluation Timeline's
 * scrubber and the Game Controls Toolbar's own numeric transport both mean
 * by "go to ply N": always a position on the game's actual mainline,
 * whatever line the cursor currently shows (leaving a variation, exactly
 * as clicking a mainline move in the Moves Section does). Clamped to
 * `[0, mainline length]`, the same behaviour this had before Stage 5, when
 * the mainline was the only line there was.
 */
export function goToPly(tabId, ply) {
  const st = get(gameStates)[tabId];
  if (!st) return;
  const spine = mainlinePath(mergedTreeForState(st));
  const clamped = Math.max(0, Math.min(spine.length, ply));
  goToPath(tabId, spine.slice(0, clamped));
}

/**
 * Step along whatever line is currently on screen — Lichess's own
 * behaviour, confirmed from its source (`ui/analyse/src/navigate.ts`'s
 * `next()`: `ctrl.path + node.children[0].id`) and En Croissant's
 * (`state/store/tree.ts`'s `goToNext`: `position: [...position, 0]`), both
 * checked before this stage was scoped, 25 Sep. This is NOT "go to the
 * next mainline ply" — inside a variation, `nextPly` continues that
 * variation, and only leaves it if the user clicks a mainline move
 * directly (`goToPly`/`goToPath` above). A position with no children (the
 * end of whatever line it's on) simply doesn't move — the same clamped
 * behaviour `goToPly` always had at the mainline's own end.
 */
export function nextPly(tabId) {
  const st = get(gameStates)[tabId];
  if (!st) return;
  const tree = mergedTreeForState(st);
  const node = currentNode(st, tree);
  if (!node.children.length) return;
  goToPath(tabId, [...(st.path ?? []), 0]);
}

/** Back exactly the way the cursor got here — popping the last path
 *  segment, whatever line it names. Symmetric with `nextPly`: stepping
 *  forward then back returns to the same position, on the same line,
 *  mainline or variation. */
export function prevPly(tabId) {
  const st = get(gameStates)[tabId];
  if (!st) return;
  goToPath(tabId, (st.path ?? []).slice(0, -1));
}

/** The starting position — the root, always, regardless of what line was
 *  showing. */
export const firstPly = (tabId) => goToPath(tabId, []);

/**
 * The end of the game's actual MAINLINE — not "the end of whatever line is
 * currently showing". This is Lichess's own `last()`
 * (`treePath.fromNodeList(this.ctrl.mainline)`), confirmed from its
 * source 25 Sep: `End` always leaves a variation for the mainline's own
 * last move, the same as `goToPly` with a very large number always did
 * before Stage 5.
 */
export function lastPly(tabId) {
  const st = get(gameStates)[tabId];
  if (!st) return;
  goToPath(tabId, mainlinePath(mergedTreeForState(st)));
}

/**
 * The end of whatever line the cursor is currently on — no children left
 * to step into with `nextPly`. Before Stage 5 this only ever meant "the
 * mainline's own last ply", which was also the one position `moveInputs`/
 * `playMove` allowed play from; Stage 5 lifts that restriction (a move is
 * playable from anywhere, and starts a variation if it isn't already the
 * position's own next move — see `playMove` below), so today this is read
 * only by `GameWorkspace.svelte`'s autoplay, to know when to stop rather
 * than keep stepping into nothing.
 */
export function atLastPly(tabId) {
  const st = get(gameStates)[tabId];
  if (!st) return false;
  const node = currentNode(st, mergedTreeForState(st));
  return !node.children.length;
}

/* --------------------------------- moves --------------------------------- */

/**
 * Board interaction inputs for the position on the board right now — what
 * `ChessBoard.svelte` needs to turn pieces on at all. Movable from ANY
 * position, since Stage 5: only a mock/sandbox tab (there is nowhere to
 * save a move played on one) is refused — Stage 4's own restriction to the
 * mainline's own last ply is exactly the gap Stage 5 fills (`playMove`
 * below now starts a variation rather than refusing).
 */
export function moveInputs(tabId) {
  const st = get(gameStates)[tabId];
  if (!st || !readsRealGame(st)) {
    return { movable: false, dests: new Map(), turnColor: 'white' };
  }
  const fen = currentNode(st, mergedTreeForState(st)).ply?.f;
  if (!fen) return { movable: false, dests: new Map(), turnColor: 'white' };
  return { movable: true, dests: destsForFen(fen), turnColor: turnFromFen(fen) };
}

/**
 * Play one move from wherever the cursor is — Stage 4 restricted this to
 * the mainline's own last ply; Stage 5 lifts that, per the scoping agreed
 * 25 Sep (research on Lichess/Chess.com/ChessBase/En Croissant, all of
 * which allow play from any position). Three outcomes:
 *
 *   - the position already has a child with this exact SAN (the user
 *     replayed a move that's already there, mainline or an existing
 *     variation) — no new node, no dirty change, the cursor simply steps
 *     onto it. Without this, arrowing back and replaying the same move
 *     would silently fork a duplicate line every time;
 *   - otherwise, a NEW child is appended — the position's first child if
 *     it had none (extending the mainline, or continuing a variation
 *     already begun this session, Stage 4's whole scope generalized) or an
 *     additional one if it already had a mainline continuation (a genuine
 *     new variation). Recorded in `pendingMoves` as `{ parentPath, ply }`
 *     (see `ensureGameState`'s own comment on that field) and the cursor
 *     moves onto it, exactly like any other navigation;
 *   - the move is illegal, or this tab has nowhere to save to
 *     (`moveInputs` would already have kept the board from offering
 *     either) — refused silently (`null`), the board's own `dests` should
 *     already have ruled these out, but nothing here trusts it over the
 *     rules a second time.
 *
 * `promotion` is chessops' role name (`queen`/`rook`/`bishop`/`knight`);
 * required exactly when a pawn move lands on the last rank
 * (`ChessBoard.svelte` checks this itself, via `game/moves.js`'s own
 * `isPromotionMove`, before ever calling this with one).
 */
export function playMove(tabId, { from, to, promotion } = {}) {
  const st = get(gameStates)[tabId];
  if (!st || !readsRealGame(st)) return null;
  const tree = mergedTreeForState(st);
  const path = st.path ?? [];
  const node = currentNode(st, tree);
  const fen = node.ply?.f;
  if (!fen) return null;
  const result = computeMove(fen, { from, to, promotion });
  if (!result) return null;

  const existingIndex = node.children.findIndex((child) => child.ply.s === result.san);
  if (existingIndex !== -1) {
    goToPath(tabId, [...path, existingIndex]);
    return result;
  }

  const ply = {
    s: result.san, f: result.fenAfter, m: [result.from, result.to],
    k: result.check, e: null, x: null, c: null, b: null, sh: []
  };
  const childIndex = node.children.length;
  patch(tabId, (cur) => ({
    pendingMoves: [
      ...(cur.pendingMoves ?? []),
      { parentPath: path, ply, seq: nextSeq(cur) }
    ],
    path: [...path, childIndex],
    ply: path.length + 1,
    engineHold: null
  }));
  refreshExplorerStats(tabId);
  return result;
}

/* ------------------------------ variations -------------------------------- */

/** Fold every change one edit made, in order, over one other path.
 *  `null` once the path falls inside a deleted subtree. */
function remapThroughChanges(path, changes) {
  return changes.reduce((p, change) => (p ? remapPathThroughChange(p, change) : p), path);
}

/**
 * Which variation commands apply to the move at `path` right now, as the
 * Moves Section's context menu needs them: `{ promote, demote, mainline,
 * deleteFromHere, deleteVariation }`, each `true` or `false`. The menu
 * always shows all five and disables the ones that are `false`.
 */
export function variationCommands(tabId, path) {
  const st = get(gameStates)[tabId];
  const edits = st ? variationEditsAt(mergedTreeForState(st), path) : variationEditsAt(null, path);
  return Object.fromEntries(Object.entries(edits).map(([k, v]) => [k, !!v]));
}

/**
 * Run one variation command on the move at `path`: `'promote'`,
 * `'demote'`, `'mainline'`, `'deleteFromHere'` or `'deleteVariation'`
 * (the keys of `variationEditsAt` in `pgn/movetext.js`, which decides what
 * each one does and when it applies). A command that does not apply to
 * that move is a no-op, rather than recording an empty, dirtying edit.
 *
 * The edit is applied to a SCRATCH merged tree (never one anything else is
 * reading) to learn exactly which children moved or were removed. Those
 * changes then re-key every OTHER piece of this tab's state that addresses
 * the current tree: the cursor, drawn shapes (keyed by path) and a held
 * engine result. Anything inside a deleted subtree is dropped, and a
 * cursor inside one moves to the deleted move's parent position.
 * `pendingMoves` is deliberately not re-keyed: each entry is only ever
 * replayed against the tree as it stood at its own `seq` (see
 * `pendingEditsInOrder`). The edit itself is appended to
 * `pendingTreeEdits` exactly as given -- valid against the live tree right
 * now, which is what the replay reads it against later.
 */
export function editVariation(tabId, command, path) {
  const st = get(gameStates)[tabId];
  if (!st) return;
  const scratch = mergedTreeForState(st);
  const edit = variationEditsAt(scratch, path)[command];
  if (!edit) return;
  const changes = applyTreeEdit(scratch, edit);
  if (!changes.length) return;

  const remapped = remapThroughChanges(st.path ?? [], changes);
  const moved = !remapped;
  const cursor = remapped ?? changes.find((c) => c.op === 'delete').path.slice(0, -1);
  const shapes = {};
  for (const [key, value] of Object.entries(st.shapes ?? {})) {
    const next = remapThroughChanges(parsePathKey(key), changes);
    if (next) shapes[pathKey(next)] = value;
  }
  const holdPath = st.engineHold ? remapThroughChanges(st.engineHold.path, changes) : null;

  patch(tabId, (cur) => ({
    path: cursor,
    ply: cursor.length,
    shapes,
    engineHold: holdPath ? { ...cur.engineHold, path: holdPath } : null,
    pendingTreeEdits: [...(cur.pendingTreeEdits ?? []), { ...edit, seq: nextSeq(cur) }]
  }));
  if (moved) refreshExplorerStats(tabId);
}

/** Move a variation up one step at its own branch point. */
export const promoteVariation = (tabId, path) => editVariation(tabId, 'promote', path);
/** Move a line down one step at its branch point (a main-line move's own). */
export const demoteVariation = (tabId, path) => editVariation(tabId, 'demote', path);
/** Make this line the game's main line, cascading all the way to the root. */
export const makeMainLine = (tabId, path) => editVariation(tabId, 'mainline', path);
/** Delete this move and everything after it. */
export const deleteFromHere = (tabId, path) => editVariation(tabId, 'deleteFromHere', path);
/** Delete the whole line this move belongs to, from its first move. */
export const deleteVariation = (tabId, path) => editVariation(tabId, 'deleteVariation', path);

/* --------------------------------- board -------------------------------- */

export function flipBoard(tabId) {
  patch(tabId, (cur) => ({ orientation: cur.orientation === 'white' ? 'black' : 'white' }));
}

/**
 * Record what's drawn on the board for one POSITION — chessground's own
 * `DrawShape[]`, straight from its `drawable.onChange`, no translation.
 * Keyed by PATH (`game/plies.js`'s `pathKey`) since Stage 5, not by a flat
 * ply number: a variation position and a mainline position at the same
 * depth are different positions and must not share a key. Overlays
 * `cur.shapes` rather than replacing it, so drawing here does not lose
 * whatever is already recorded elsewhere. Not persisted anywhere yet
 * (Stage 2), gone with the tab; counted by `isDirty` below in the
 * meantime.
 */
export function setPlyShapes(tabId, path, shapes) {
  patch(tabId, (cur) => ({ shapes: { ...cur.shapes, [pathKey(path)]: shapes } }));
}

/**
 * Stage Game Info edits made in the dialog for later saving — see
 * `ensureGameState`'s doc comment on `pendingInfo` for why this replaced
 * `gameEdits`. Merges onto whatever's already staged rather than replacing
 * it outright, the same shape as `setPlyShapes` above, though today's only
 * caller (`saveGameInfo`) always supplies every field at once.
 */
export function setPendingInfo(tabId, fields) {
  patch(tabId, (cur) => ({ pendingInfo: { ...cur.pendingInfo, ...fields } }));
}

/**
 * `a` and `b` as a save would compare them — a Game Info field staged in
 * `pendingInfo` against the same field on the row/mock base it would
 * overwrite. The dialog always sends a trimmed string or `null`/a number,
 * never `undefined`, but the base can genuinely hold `null` for "not set"
 * where the dialog's own empty string means the same thing — treating
 * `null`/`undefined`/`''` as one value here is what stops an untouched
 * blank field from reading as a change.
 */
const fieldsEqual = (a, b) => (a ?? '') === (b ?? '');

/**
 * Whether a ply's SESSION shapes (a `setPlyShapes` override — the board's
 * current, interactive drawing for that ply) differ from the PERSISTED
 * shapes a fresh `readGame` would decode for it right now. Order-
 * independent: chessground reports a complete shape list on every change,
 * not a diff, so two draws that ended at the same set must compare equal
 * regardless of the order shapes happened to land in.
 */
function shapesDiffer(a, b) {
  const key = (s) => `${s.orig}|${s.dest ?? ''}|${s.brush}`;
  const setA = new Set((a ?? []).map(key));
  const setB = new Set((b ?? []).map(key));
  if (setA.size !== setB.size) return true;
  for (const k of setA) if (!setB.has(k)) return true;
  return false;
}

/**
 * True once anything in this tab differs from what a save would currently
 * write over it. Three categories today, more as later stages land:
 *
 *   - moves played, or tree edits made, this session (`pendingMoves`/
 *     `pendingTreeEdits`) — unconditionally dirty the moment either is
 *     non-empty, checked before either of the other two below ever runs;
 *   - board annotations — only a position this session has actually drawn
 *     on (`st.shapes` holds a session override for it, keyed by PATH since
 *     Stage 5) AND whose result differs from what's already persisted
 *     there (the BASE tree's own node at that path, `.sh`, decoded from
 *     `%csl`/`%cal` by `game/plies.js`). A position nobody touched this
 *     session is never dirty just because it happens to carry a
 *     previously-saved arrow — reopening a game that already has
 *     annotations is not itself an edit. A path this session's OWN pending
 *     moves OR a tree edit created or moved has no base node at that
 *     address at all (`nodeAtPath` on `tree` finds nothing there, or the
 *     wrong thing) — harmless: the bullet above already returns true
 *     before this loop ever runs, on any tab where that could occur;
 *   - staged Game Info fields — only those that actually differ from the
 *     record they'd replace, so reopening the dialog and hitting Save
 *     without changing anything does not manufacture a dirty tab.
 *
 * `tree` is passed in rather than resolved here because the two callers
 * already have it two different ways — `isDirty` reads it imperatively
 * from `realGames`/mock data (`baseTreeForState`), `dirtyTabs` reads it
 * reactively — and computing it a third way here would risk a third
 * answer. Always the BASE tree, never the merged one `activeGame` shows on
 * the board: see the pending-move case above for why the merged tree is
 * not needed here.
 *
 * The single flag Stage 1's save button, tab-close indicator and
 * confirmation dialog all read from (`analysis-board-plan.md`). Favourite/
 * tags/collections are deliberately not part of this — they commit for
 * real immediately, on their own existing path, on purpose (Stage 1's
 * revision, 24 Sep).
 */
function computeDirty(st, base, tree) {
  if ((st.pendingMoves?.length ?? 0) > 0) return true;
  if ((st.pendingTreeEdits?.length ?? 0) > 0) return true;
  const overrides = st.shapes ?? {};
  for (const key of Object.keys(overrides)) {
    const node = nodeAtPath(tree, parsePathKey(key));
    if (shapesDiffer(overrides[key], node?.ply?.sh)) return true;
  }
  const pending = st.pendingInfo ?? {};
  if (Object.keys(pending).length === 0) return false;
  return Object.entries(pending).some(([key, value]) => !fieldsEqual(base[key], value));
}

export function isDirty(tabId) {
  const st = get(gameStates)[tabId];
  if (!st) return false;
  if (isDraftId(st.libraryGameId)) return true;
  return computeDirty(st, baseRecordFor(st), baseTreeForState(st));
}

/**
 * Every tab currently dirty, reactively — what the tab strip's dot
 * indicator (`Tab.svelte`) reads, since it draws every open tab, not just
 * the active one that `activeGame`'s own `dirty` field covers. Depends on
 * `realGames` too now, alongside `gameStates`/`libraryGames` — a real
 * game's persisted shapes only exist once its movetext has loaded.
 */
export const dirtyTabs = derived(
  [gameStates, libraryGames, realGames],
  ([$states, $libraryGames, $realGames]) => {
  const ids = new Set();
  for (const [tabId, st] of Object.entries($states)) {
    if (isDraftId(st.libraryGameId)) { ids.add(tabId); continue; }
    const game = gameById(st.gameId);
    const row = st.libraryGameId != null
      ? ($libraryGames ?? []).find((r) => r.id === st.libraryGameId) ?? null
      : null;
    const real = readsRealGame(st) ? ($realGames.get(st.libraryGameId) ?? EMPTY_REAL_GAME) : null;
    const tree = real ? real.tree : treeFor(game);
    if (computeDirty(st, row ?? game, tree)) ids.add(tabId);
  }
  return ids;
});

/**
 * Write everything staged in this tab for real, then clear its dirty
 * state — the "what Save actually writes" half of `analysis-board-plan.md`'s
 * Stage 1. Two writers for an already-saved tab, same as the plan lays out:
 * `updateGameFields` for the nine header fields staged in `pendingInfo`,
 * `writeMovetextFor` for board annotations, folded into the resolved
 * movetext tree by `applyShapesToMovetext` before being serialized back by
 * `writeMovetext`. Neither runs unless it has something to write.
 *
 * A DRAFT tab (`isDraftId`) has nowhere real yet — `createGameFromDraft`
 * below is Stage 3's "New Game" create path, always run rather than gated
 * on `isDirty` (a draft is unconditionally dirty; see `isDirty`'s own
 * comment). Every other tab kind is unchanged from Stage 1/2.
 *
 * Called from the save button, `Cmd/Ctrl+S`, and the close-time
 * confirmation dialog.
 *
 * @returns {Promise<boolean>} whether anything was actually written.
 */
export async function saveTab(tabId) {
  const st = get(gameStates)[tabId];
  if (!st || st.libraryGameId == null) return false;
  if (!isDraftId(st.libraryGameId) && !isDirty(tabId)) return false;

  const connection = await activeLibraryConnection();
  if (!connection) {
    console.error(`Plyvio: no database connection to save tab ${tabId}`);
    return false;
  }

  if (isDraftId(st.libraryGameId)) return createGameFromDraft(tabId, st, connection);

  const pending = st.pendingInfo ?? {};
  const base = baseRecordFor(st);
  const changedFields = Object.fromEntries(
    Object.entries(pending).filter(([key, value]) => !fieldsEqual(base[key], value))
  );
  /*
    Presence, not length: a ply the user drew on and then fully erased is a
    key holding an empty array, not an absent key, and still has to reach
    `applyShapesToMovetext` -- that's what actually removes a previously-
    saved `%csl`/`%cal` (or correctly no-ops if there was nothing to
    remove; see that function's own `shouldWrite`). Checking `.length` here
    instead would treat "erased, save it" the same as "never touched",
    silently skip the write, and leave the stale annotation in place.
  */
  const hasShapes = Object.keys(st.shapes ?? {}).length > 0;
  const hasMoves = (st.pendingMoves ?? []).length > 0;
  const hasTreeEdits = (st.pendingTreeEdits ?? []).length > 0;

  try {
    if (Object.keys(changedFields).length) {
      await updateGameFields(connection, st.libraryGameId, changedFields);
    }

    if (hasShapes || hasMoves || hasTreeEdits) {
      const { movetext } = await readMovetextFor(connection, st.libraryGameId);
      const doc = resolveMovetext(readMovetext(movetext ?? ''));
      // Moves and tree edits are folded in FIRST, interleaved in the
      // exact order they happened (`applyPendingEdits` /
      // `pendingEditsInOrder` -- an edit can target a path that only
      // exists once an earlier move is folded in, and a move's own
      // `parentPath` is only valid against the doc as it stood before a
      // LATER edit). Shapes run last, since `st.shapes` is already keyed
      // by the POST-edit paths (`editVariation()` re-keys it the moment an
      // edit happens) that the doc's tree needs to already match before
      // shapes are applied by path.
      if (hasMoves || hasTreeEdits) applyPendingEdits(doc, st);
      if (hasShapes) applyShapesToMovetext(doc, st.shapes ?? {});
      await writeMovetextFor(connection, st.libraryGameId, writeMovetext(doc));
    }

    requestPersistentStorage();
    patch(tabId, () => ({ pendingInfo: {}, shapes: {}, pendingMoves: [], pendingTreeEdits: [] }));

    if (Object.keys(changedFields).length) await loadGames();
    if (hasShapes || hasMoves || hasTreeEdits) {
      // `loadRealGame` is load-once (`if (get(realGames).has(id)) return;`),
      // so the stale parse has to be evicted before asking for it again --
      // simply re-calling it would see the old entry and no-op.
      realGames.update((m) => {
        const next = new Map(m);
        next.delete(st.libraryGameId);
        return next;
      });
      loadRealGame(st.libraryGameId);
    }

    return true;
  } catch (err) {
    console.error(`Plyvio: failed to save tab ${tabId}`, err);
    throw err;
  }
}

/**
 * `saveTab`'s create branch — a draft tab has never had a row; this is what
 * gives it one. `insertGame` requires a non-null `pgn` (§4, `data/
 * games.js`) that a draft was never built from, so `pgn` gets a bare
 * placeholder result token and the real content goes where §3.1 actually
 * reads it first: `movetext`, written right after — the same
 * `writeMovetextFor`/`applyShapesToMovetext` pair the real-game branch
 * above already uses for its own shapes write, starting from the draft's
 * own seed movetext instead of a database read.
 *
 * Converts the tab in place once the row exists: `libraryGameId` becomes
 * the new real id, the draft's own entries in `draftSeeds`/`realGames` are
 * dropped, and `loadGames`/`loadRealGame` bring the tab onto the exact same
 * path an already-saved tab reads from — nothing downstream needs to know
 * this tab used to be a draft.
 */
async function createGameFromDraft(tabId, st, connection) {
  const draft = draftSeeds.get(st.libraryGameId) ?? { movetext: '', fen: null, fields: {} };
  const doc = resolveMovetext(readMovetext(draft.movetext ?? ''), { fen: draft.fen ?? null });
  // Moves/tree edits interleaved, then shapes -- see the real-game branch
  // (`saveTab`) for why: a shape on a position this draft's own pending
  // moves just created needs that position to already exist in `doc`, and
  // `applyPendingEdits` is what keeps a move and a later edit each
  // valid against the doc as it stood at their own moment.
  if ((st.pendingMoves ?? []).length || (st.pendingTreeEdits ?? []).length) applyPendingEdits(doc, st);
  if (Object.keys(st.shapes ?? {}).length) applyShapesToMovetext(doc, st.shapes ?? {});

  const fields = {
    ...draft.fields,
    ...(st.pendingInfo ?? {}),
    pgn: '*',
    fen: draft.fen ?? null,
    created_at: new Date().toISOString()
  };

  try {
    const newId = await insertGame(connection, fields);
    await writeMovetextFor(connection, newId, writeMovetext(doc));

    draftSeeds.delete(st.libraryGameId);
    realGames.update((m) => {
      const next = new Map(m);
      next.delete(st.libraryGameId);
      return next;
    });
    patch(tabId, () => ({
      libraryGameId: newId, gameId: newId,
      pendingInfo: {}, shapes: {}, pendingMoves: [], pendingTreeEdits: []
    }));

    requestPersistentStorage();
    await loadGames();
    loadRealGame(newId);

    return true;
  } catch (err) {
    console.error(`Plyvio: failed to create game for tab ${tabId}`, err);
    throw err;
  }
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
  engineAnalysis.set({});
}
