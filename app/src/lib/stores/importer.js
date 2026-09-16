import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { games, collections, tags } from '$lib/stores/library.js';
import { makeImportedGames } from '$lib/library/mock.js';
import { planImport, notAddedCount, outcomeMessage } from '$lib/library/importJob.js';

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

function runWrite(p, elapsed) {
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
    collection: p.collections[0]?.id ?? null
  });
  games.update((all) => [...batch, ...all]);
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
