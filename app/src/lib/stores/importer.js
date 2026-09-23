import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { games, collections, tags, connectionForLibrary, loadGames } from '$lib/stores/library.js';
import { activeLibraryId } from '$lib/stores/libraries.js';
import { requestPersistentStorage } from '$lib/data/session.js';
import { makeImportedGames } from '$lib/library/mock.js';
import { planImport, planRealOnlineImport, applyImportRules, notAddedCount, outcomeMessage, sourceLabel } from '$lib/library/importJob.js';
import { insertGames, latestGameDateForSource, gamePgnsForSourceOnDate } from '$lib/data/games.js';
import {
  SOURCE_TYPE, fetchAllGames, chessComRowsSinceCursor, latestEndTimeFromPgns,
  normalizeUsername, ChessComUserNotFoundError
} from '$lib/import/sources/chesscom.js';

/**
 * The import lane. §3.2.4.5
 *
 * EXACTLY ONE IMPORT AT A TIME. No queue, no parallelism, no activity
 * popover: one lane means one line in the Status Bar, which is why the Status
 * Bar is sufficient on its own and nothing else had to be built to report
 * progress. The visible consequence is that Add Games is disabled while an
 * import runs (`canStart` below), and that is the whole of it.
 *
 * EVENT-DRIVEN, NOT POLLED. Nothing watches this store for change; the runner
 * schedules its own next step and pushes state when it has some. A cancelled
 * or finished job clears its timer rather than being left to be noticed.
 *
 * PRESENTATIONAL. No PGN is read. The games appended are generated (see
 * `makeImportedGames`), so the Content Table fills and the counts climb —
 * which is the point, because r5 §4 makes the Library itself the receipt and
 * drops the result banner entirely.
 */

/** 'idle' | 'downloading' | 'writing' | 'done' */
export const phase = writable('idle');

/** The plan being run, or the last one that finished. */
export const plan = writable(null);

/** Games written so far in the current job. */
export const written = writable(0);

/** Games seen so far by the download phase — indeterminate, so no total. */
export const downloaded = writable(0);

/** Set when a finished import has something the user has not answered. */
export const notice = writable(null);   // { kind: 'clean'|'attention', plan }

/** True while the import report dialog is open. */
export const reportOpen = writable(false);

export const running = derived(phase, ($p) => $p === 'downloading' || $p === 'writing');

/** §3.2.4.5 — one lane, so the entry point closes while one is in flight. */
export const canStart = derived(running, ($r) => !$r);

/* ---------------- timing --------------------------------------------- */

/*
 * A whole import takes about the same wall-clock time regardless of size,
 * because the prototype is demonstrating the shape of the interaction rather
 * than the speed of a parser. Slow enough to watch, short enough to repeat.
 */
export const DOWNLOAD_MS = 1800;
export const WRITE_MS = 2600;
export const TICK_MS = 100;
const CLEAN_NOTICE_MS = 8000;           // r5 §4 — it removes itself

let timer = null;
let noticeTimer = null;

/* The last request, kept so a failed download can be retried without the user
   re-entering it. Nothing else re-runs: a network failure is the only outcome
   where the request was sound and nothing was written. */
let lastRequest = null;

/* Invalidates an in-flight Chess.com fetch when the user cancels or the lane
   resets mid-download -- `fetch()` itself is not aborted here (no
   AbortController wired up, out of this slice's scope), so this is what
   stops a fetch that finally settles AFTER a cancel from overwriting the
   cancelled state with a write. */
let onlineFetchToken = 0;

function clearTimers() {
  if (timer) { clearTimeout(timer); timer = null; }
}

function schedule(fn, ms) {
  clearTimers();
  timer = setTimeout(fn, ms);
}

/* ---------------- running -------------------------------------------- */

/**
 * Start an import. Returns false when one is already running, which is the
 * single-lane rule expressed once, here, rather than trusted to the disabled
 * button that expresses it in the interface.
 */
export function startImport(request) {
  if (get(running)) return false;

  const p = planImport(request);

  /* `needsOnlineFetch` is `planImport`'s marker for the one real online path
     that exists so far (Chess.com, `import/sources/chesscom.js`) -- there is
     no plan yet to check `.sources` on, because nothing has been fetched. */
  if (p.needsOnlineFetch) {
    lastRequest = request;
    clearNotice();
    plan.set(null);
    written.set(0);
    downloaded.set(0);
    onlineFetchToken++;
    phase.set('downloading');
    runRealOnlineDownload(p);
    return true;
  }

  if (!p.sources.length) return false;

  lastRequest = request;
  clearNotice();
  plan.set(p);
  written.set(0);
  downloaded.set(0);

  if (p.download) {
    phase.set('downloading');
    runDownload(p, 0);
  } else {
    phase.set('writing');
    runWrite(p, 0);
  }
  return true;
}

function runDownload(p, elapsed) {
  if (!browser) { finishDownload(p); return; }
  const next = elapsed + TICK_MS;

  /* The download is indeterminate — a count that climbs, with no total, is the
     honest rendering of "we do not know yet how many there are" (r4 §4). */
  downloaded.set(Math.round((next / DOWNLOAD_MS) * (p.total || 400)));

  if (next >= DOWNLOAD_MS) { finishDownload(p); return; }
  schedule(() => runDownload(p, next), TICK_MS);
}

function finishDownload(p) {
  /* A download that fails has written nothing, so Try again is safe and needs
     no report — the one failure in this design with a one-click remedy. */
  if (p.outcome === 'network') { finish(p); return; }
  phase.set('writing');
  runWrite(p, 0);
}

/**
 * Stage 2's read side (`EXPLORATION.md`, "Per-game source tracking"): the
 * account's latest known `date` already on record in `destination`, and,
 * for that one boundary date, the latest end time already known -- both
 * best-effort. Any failure here (no connection, a query error, a database
 * predating these columns) falls back to `{ cursorDate: null,
 * knownEndTimeOnCursorDate: null }`, the same as a genuine first import:
 * `fetchAllGames`/`chessComRowsSinceCursor` both treat a null cursor as
 * "fetch and keep everything", never as a reason to fail the download.
 */
async function resolveCursor(destination, username) {
  try {
    const connection = await connectionForLibrary(destination);
    if (!connection) return { cursorDate: null, knownEndTimeOnCursorDate: null };
    const identifier = normalizeUsername(username);
    const cursorDate = await latestGameDateForSource(connection, SOURCE_TYPE, identifier);
    if (!cursorDate) return { cursorDate: null, knownEndTimeOnCursorDate: null };
    const pgns = await gamePgnsForSourceOnDate(connection, SOURCE_TYPE, identifier, cursorDate);
    return { cursorDate, knownEndTimeOnCursorDate: latestEndTimeFromPgns(pgns) };
  } catch (err) {
    console.error('Plyvio: failed to resolve the Chess.com incremental-import cursor', err);
    return { cursorDate: null, knownEndTimeOnCursorDate: null };
  }
}

/**
 * Chess.com's real download-then-write path. `p` here is `planImport`'s
 * marker for `{ tab: 'online', draft: { source: 'chesscom' } }` -- not a
 * plan yet, because nothing is knowable about the import (row count
 * included -- the variant-scope skip in `chessComRowFromApiGame` means it
 * is not even the game count Chess.com itself reports) until the fetch
 * finishes.
 *
 * `downloaded` climbs with each month Chess.com returns -- a real count, not
 * `runDownload`'s paced simulation -- so the Status Bar's existing
 * `kind: 'downloading'` rendering needs no change to show real progress. An
 * incremental re-import (`resolveCursor` found a cursor) climbs from fewer
 * months, honestly: the total was never meant to be the account's whole
 * history, only what this run actually asked for.
 *
 * A missing account (`ChessComUserNotFoundError`) resolves the same way an
 * empty paste does: `planRealOnlineImport({ rows: [] })`, the outcome the
 * rest of the lane already renders as "no games found". Any other failure --
 * offline, Chess.com down, a malformed response -- is the one outcome
 * nothing was written for, so Retry (`retryImport`) is safe.
 */
async function runRealOnlineDownload(p) {
  const { draft, destination, duplicates, tags, collections } = p;
  const sourceDescription = `${sourceLabel(draft.source)} — ${draft.username.trim()}`;
  const token = onlineFetchToken;

  if (!browser) {
    finish(planRealOnlineImport({ sourceDescription, rows: [], destination, duplicates, tags, collections }));
    return;
  }

  const { cursorDate, knownEndTimeOnCursorDate } = await resolveCursor(destination, draft.username);

  let finalPlan;
  try {
    const createdAt = new Date().toISOString();
    const apiGames = await fetchAllGames(draft.username, {
      cursorDate,
      onMonth: (_count, total) => downloaded.set(total)
    });
    const rows = chessComRowsSinceCursor(apiGames, createdAt, draft.username, cursorDate, knownEndTimeOnCursorDate)
      .map((row) => applyImportRules(row))
      .filter(Boolean);
    finalPlan = planRealOnlineImport({ sourceDescription, rows, destination, duplicates, tags, collections });
  } catch (err) {
    if (err instanceof ChessComUserNotFoundError) {
      finalPlan = planRealOnlineImport({ sourceDescription, rows: [], destination, duplicates, tags, collections });
    } else {
      console.error('Plyvio: failed to fetch Chess.com games', err);
      const failedSource = { kind: 'online', label: sourceDescription, detail: null, games: 0 };
      finalPlan = {
        tab: 'online', sources: [failedSource], destination, duplicates, tags, collections, seed: 0,
        outcome: 'network',
        total: 0, added: 0, skipped: 0, failures: [],
        failedSources: [{ ...failedSource, errorKind: 'network' }],
        download: false
      };
    }
  }

  /* The user cancelled while this was in flight -- `cancelImport()` already
     set phase to 'done' and posted its own notice; don't clobber it now that
     the fetch has finally settled. */
  if (token !== onlineFetchToken) return;

  plan.set(finalPlan);
  phase.set('writing');
  runWrite(finalPlan, 0);
}

function runWrite(p, elapsed) {
  /* A real import (currently: Paste -- see importJob.js's planRealPasteImport)
     carries its own rows, already read and parsed, and needs one real write
     to the database rather than a paced, fabricated one. */
  if (Array.isArray(p.rows)) { runRealWrite(p); return; }

  if (!browser || p.added === 0) { finish(p); return; }
  const next = elapsed + TICK_MS;
  const target = Math.min(p.added, Math.round((next / WRITE_MS) * p.added));
  const batch = target - get(written);

  if (batch > 0) {
    appendGames(p, get(written), batch);
    written.set(target);
  }

  if (next >= WRITE_MS) { written.set(p.added); finish(p); return; }
  schedule(() => runWrite(p, next), TICK_MS);
}

/**
 * Rows arrive in the Content Table as they are written.
 *
 * This is the most direct evidence an import can offer that it is working,
 * and — with no banner — it is most of what tells the user it worked at all.
 */
function appendGames(p, from, count) {
  const batch = makeImportedGames(count, {
    offset: from,
    seed: p.seed,
    tags: p.tags.map((t) => t.id),
    collections: p.collections.map((c) => c.id)
  });
  games.update((all) => [...batch, ...all]);
}

/**
 * Write a real import's rows to `p.destination` -- the library chosen in
 * Add Games' own picker (`AddGamesDialog.svelte`, defaulted to whichever
 * library is active when the dialog opens, but independently selectable
 * from it) -- through the same seam `loadGames()` reads from --
 * `insertGame`/`insertGames` in `data/games.js`, over whatever connection
 * `connectionForLibrary()` gives either backend. 20 Sep 2026: this used to
 * ignore `destination` entirely and always write to whichever library was
 * ACTIVE, regardless of what the dialog said -- a real gap, not a design
 * choice; fixed here. One shot, not paced like `appendGames`'s simulated
 * animation: a paste is small enough that there is nothing to show
 * progress against.
 *
 * THIS FUNCTION'S JOB ENDS AT THE COMMIT. It used to also splice the
 * inserted rows straight into `games` itself -- an optimistic update meant
 * to show the result immediately -- but that let this write race a
 * `loadGames()` already in flight from the library switch that got the user
 * here (whichever one's reads resolved LAST would win, even if it started
 * first, silently reverting a real write back to empty). `games` now has
 * exactly one writer, `loadGames()` -- this just asks for a reload, and only
 * when there is something for the Library view to show differently: when
 * the destination IS the library currently on screen. Writing to a library
 * you're not looking at leaves `games` untouched; switching to it later
 * already reloads correctly, per `activeLibraryId.subscribe` in
 * `stores/library.js`.
 *
 * Tags and Collections chosen in the dialog are attached to the returned
 * rows for the Content Table's own display, the same as `appendGames`
 * does -- not yet written to `tag_games`/`collection_games` themselves;
 * see `registerOrganisation`'s own comment, which this does not change.
 * (`loadGames()`'s own read doesn't know about them yet either, for the
 * same reason -- this reload doesn't regress that, it's the same gap as
 * before.)
 *
 * `connectionForLibrary()` resolving null (no real backend available, or
 * the chosen destination has no real database behind it -- see `stores/
 * library.js`) leaves the games unwritten; nothing here pretends otherwise,
 * but `finish(p)` still runs so the lane always reaches 'done'.
 */
async function runRealWrite(p) {
  if (!browser || p.added === 0) { finish(p); return; }
  try {
    const connection = await connectionForLibrary(p.destination);
    if (connection) {
      const inserted = await insertGames(connection, p.rows);
      written.set(inserted.length);
      requestPersistentStorage();
      if (p.destination === get(activeLibraryId)) await loadGames();
    }
  } catch (err) {
    console.error('Plyvio: failed to write imported games', err);
  }
  finish(p);
}

/* ---------------- finishing ------------------------------------------- */

function finish(p) {
  clearTimers();
  phase.set('done');
  registerOrganisation(p);

  const kind = p.outcome === 'clean' ? 'clean' : 'attention';
  notice.set({ kind, plan: p });

  /* Clean: about eight seconds, then it removes itself. Nothing is lost if it
     is missed, because the table, the counts and the Sidebar already show the
     result. Problems: it stays until answered (r5 §4). */
  if (kind === 'clean' && browser) {
    noticeTimer = setTimeout(() => {
      const n = get(notice);
      if (n && n.kind === 'clean') notice.set(null);
    }, CLEAN_NOTICE_MS);
  }
}

/**
 * Tags and collections created in the dialog become real Sidebar rows.
 *
 * They are applied to the games that were actually added — a skipped duplicate
 * is not tagged, and neither is a game that could not be read — which is why a
 * failed import registers nothing.
 */
function registerOrganisation(p) {
  if (!p.added) return;
  if (p.tags.length) {
    tags.update((all) => {
      const known = new Set(all.map((t) => t.id));
      const added = p.tags.filter((t) => !known.has(t.id)).map((t) => ({ id: t.id, name: t.name }));
      return added.length ? [...all, ...added] : all;
    });
  }
  if (p.collections.length) {
    collections.update((all) => {
      const known = new Set(all.map((c) => c.id));
      const added = p.collections
        .filter((c) => !known.has(c.id))
        .map((c) => ({ id: c.id, name: c.name, smart: false }));
      return added.length ? [...all, ...added] : all;
    });
  }
}

/**
 * Cancelling keeps what was already written and says how many.
 *
 * The alternative is rolling back a half-million rows, which is slower than
 * the import itself. During a download nothing has been written, so there is
 * nothing to keep.
 */
export function cancelImport() {
  if (!get(running)) return false;
  clearTimers();
  onlineFetchToken++;   // invalidate any in-flight Chess.com fetch
  const kept = get(written);
  const p = get(plan);
  phase.set('done');
  notice.set({ kind: 'cancelled', plan: p, kept });
  return true;
}

export function clearNotice() {
  if (noticeTimer) { clearTimeout(noticeTimer); noticeTimer = null; }
  notice.set(null);
  reportOpen.set(false);
}

export function openReport() { reportOpen.set(true); }

/**
 * Retry the last import. Offered only after a network failure, because that is
 * the only one where the request was sound and nothing was written — every
 * other failure needs the user to change something first.
 */
export function retryImport() {
  if (!lastRequest || get(running)) return false;
  return startImport(lastRequest);
}

export const canRetry = derived(notice, ($n) => $n?.plan?.outcome === 'network');

/** Closing the report answers the notice, so both clear together. */
export function closeReport() { clearNotice(); }

export function resetImporter() {
  clearTimers();
  onlineFetchToken++;   // invalidate any in-flight Chess.com fetch
  lastRequest = null;
  if (noticeTimer) { clearTimeout(noticeTimer); noticeTimer = null; }
  phase.set('idle');
  plan.set(null);
  written.set(0);
  downloaded.set(0);
  notice.set(null);
  reportOpen.set(false);
}

/* ---------------- the status line ------------------------------------- */

/**
 * What the Status Bar's right slot shows, as data rather than as a string.
 *
 * §3.2.4.4 gave that slot two claimants — `1 selected` and `Offline — sync
 * paused`. Import is a third, and the precedence has to be stated rather than
 * discovered (r2 §2, specified in §3.2.4.4):
 *
 *   1  import running      the only thing with no other representation
 *   2  unanswered outcome  the user has not seen it yet
 *   3  offline             a standing condition, nothing is waiting
 *   4  row selected        already visible as a highlighted row
 */
export const statusSlot = derived(
  [phase, plan, written, downloaded, notice],
  ([$phase, $plan, $written, $downloaded, $notice]) => {
    if ($phase === 'downloading') {
      return { kind: 'downloading', count: $downloaded, cancellable: true };
    }
    if ($phase === 'writing') {
      return {
        kind: 'writing',
        count: $written,
        total: $plan?.added ?? 0,
        fraction: $plan?.added ? $written / $plan.added : 0,
        cancellable: true
      };
    }
    if ($notice?.kind === 'cancelled') {
      return { kind: 'cancelled', count: $notice.kept };
    }
    if ($notice?.kind === 'clean') {
      return { kind: 'added', count: $notice.plan.added };
    }
    if ($notice?.kind === 'attention') {
      /* A whole-source failure carries its own sentence (§3.2.4.5). "N games
         were not added" would describe games that were never read — a file
         that could not be opened, or a paste with no games in it. */
      return {
        kind: 'attention',
        count: notAddedCount($notice.plan),
        outcome: $notice.plan.outcome,
        message: outcomeMessage($notice.plan)
      };
    }
    return null;
  }
);
