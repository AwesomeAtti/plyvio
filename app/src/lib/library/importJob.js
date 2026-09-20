/**
 * Adding games — the import job. §3.2.4.5
 *
 * Pure logic: no timers, no stores, no Svelte. `stores/importer.js` owns the
 * clock and the single lane; this module decides what an import IS — how many
 * games it involves, what went wrong, and what the user is told. Keeping the
 * two apart is what makes every outcome testable without waiting for one.
 *
 * THE DIALOG READS NOTHING (wireframe r5 §1). It collects a source and some
 * options and hands them over; it never opens a PGN. So there is no count, no
 * duplicate check and no validity check before the commit, and every failure
 * below is discovered here, during the import, rather than in the dialog.
 */

import { gameRowsFromPgnText } from '$lib/pgn/importPgn.js';

/* ---------------- outcomes ------------------------------------------ */

/**
 * The six results an import can have.
 *
 * `real` means what it says: actually read what was given, no simulation.
 * It is first because it is the ordinary state now that a real path exists
 * for Paste (`planRealPasteImport`, below) -- File and Online still have
 * none, so `OUTCOME_APPLIES` keeps `real` off those tabs until they do.
 *
 * The other five remain what they always were: a real importer derives its
 * result from the PGN, and until every tab has one, the result for that tab
 * has to be chosen instead. It is chosen in Settings → General → Prototype
 * (§ "Simulated import result"). That row is a prototype affordance and is
 * not specified: it exists so every path through §3.2.4.5 is reachable by
 * hand, including ones a real, well-formed import cannot easily reach.
 */
export const OUTCOMES = ['real', 'clean', 'problems', 'none', 'file', 'network'];

export const DEFAULT_OUTCOME = 'clean';

/** Which tabs each outcome can actually occur on. */
const OUTCOME_APPLIES = {
  real:     ['paste'],                     // File and Online: no real path yet
  clean:    ['file', 'online', 'paste'],
  problems: ['file', 'online', 'paste'],
  none:     ['file', 'online', 'paste'],
  file:     ['file'],                      // there is no file to fail to open
  network:  ['online']                     // nothing else touches the network
};

/**
 * An outcome that cannot happen on this tab falls back to "no games found".
 *
 * The alternative — refusing the import, or disabling the choice per tab —
 * would put a prototype control in the way of the thing it exists to
 * demonstrate. Falling back keeps every combination runnable and lands on the
 * one outcome that is always possible.
 */
export function resolveOutcome(tab, chosen) {
  const outcome = OUTCOMES.includes(chosen) ? chosen : DEFAULT_OUTCOME;
  return OUTCOME_APPLIES[outcome].includes(tab) ? outcome : 'none';
}

/* ---------------- source description --------------------------------- */

/**
 * A stable pseudo-count for a named file.
 *
 * The prototype never opens the file, so the number of games in it has to come
 * from somewhere; deriving it from the name means the same file always imports
 * the same number, which makes a demonstration repeatable and a test exact.
 */
export function gamesInFile(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return 200 + (h % 2801);
}

/** Games a pasted block appears to hold — one per tag-roster start. */
export function gamesInPaste(text) {
  const matches = String(text).match(/\[\s*Event\s/gi);
  return matches ? matches.length : (String(text).trim() ? 1 : 0);
}

const ONLINE_GAMES = 418;

/**
 * What the import is being asked to read, as one row per source.
 *
 * §2 of r3 — one source TYPE per import. Many files, or one paste, or one
 * online source; never a mixture. The list therefore never holds two kinds.
 */
export function describeSources(tab, draft) {
  if (tab === 'file') {
    return draft.files.map((f) => ({
      kind: 'file',
      label: f.name,
      detail: formatBytes(f.size),
      games: gamesInFile(f.name)
    }));
  }
  if (tab === 'paste') {
    if (!draft.text.trim()) return [];
    return [{
      kind: 'paste',
      labelKey: 'add.pastedText',
      detail: null,
      games: gamesInPaste(draft.text)
    }];
  }
  if (!draft.username.trim()) return [];
  return [{
    kind: 'online',
    label: `${sourceLabel(draft.source)} — ${draft.username.trim()}`,
    detail: null,
    games: ONLINE_GAMES
  }];
}

export const SOURCE_LABELS = { chesscom: 'chess.com', lichess: 'lichess' };
export const sourceLabel = (id) => SOURCE_LABELS[id] ?? id;

/** 4.1 MB — the only place bytes are rendered, so the rounding is one rule. */
export function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) return '';
  if (n < 1000) return `${n} B`;
  if (n < 1000 * 1000) return `${(n / 1000).toFixed(1)} kB`;
  if (n < 1000 * 1000 * 1000) return `${(n / 1000 / 1000).toFixed(1)} MB`;
  return `${(n / 1000 / 1000 / 1000).toFixed(1)} GB`;
}

/* ---------------- the plan -------------------------------------------- */

/**
 * The four failures a `problems` import reports.
 *
 * Line numbers are stable rather than random: a report the user can point at
 * twice is worth more than one that looks plausibly varied.
 */
const FAILURES = [
  { line: 8412,  reasonKey: 'add.fail.unterminated' },
  { line: 19077, reasonKey: 'add.fail.illegal', vars: { move: '24…Nxe4' } },
  { line: 22140, reasonKey: 'add.fail.noResult' },
  { line: 24908, reasonKey: 'add.fail.unbalanced' }
];

const SKIPPED_DUPLICATES = 8;

/**
 * Turn a dialog state into an import.
 *
 * Returns a plan the runner executes and the report renders — everything that
 * is knowable about the import before it starts, which in this design is
 * everything except the passage of time.
 */
let jobSeq = 0;

/**
 * Paste, for real. §4.3 (a plain PGN document) applied directly: the pasted
 * text is already in memory (the dialog reads nothing, but the lane may),
 * so there is no async step and no simulated outcome here at all -- every
 * paste is read for what it actually is.
 *
 * No duplicate detection yet (open per database-schema.md, unspecified --
 * the product spec's own open item on this): every game the text yields is
 * added. An empty or unparseable paste yields no rows, which resolves to
 * the same 'no games found' outcome the simulated tabs already use, so the
 * rest of the lane (the message, the Status Bar, the report) does not need
 * to know this import was real rather than simulated.
 */
function planRealPasteImport({ draft, destination, duplicates, tags, collections }) {
  const seed = 900000 + (++jobSeq) * 7919;
  const rows = gameRowsFromPgnText(draft.text);

  if (!rows.length) {
    return {
      tab: 'paste', sources: [], destination, duplicates, tags, collections, seed,
      outcome: 'none',
      total: 0, added: 0, skipped: 0, failures: [], failedSources: [],
      download: false, rows: []
    };
  }

  const sources = [{ kind: 'paste', labelKey: 'add.pastedText', detail: null, games: rows.length }];
  return {
    tab: 'paste', sources, destination, duplicates, tags, collections, seed,
    outcome: 'clean',
    total: rows.length, added: rows.length, skipped: 0, failures: [], failedSources: [],
    download: false, rows
  };
}

export function planImport({ tab, draft, outcome, destination, duplicates, tags, collections }) {
  const resolved = resolveOutcome(tab, outcome);
  if (resolved === 'real') {
    return planRealPasteImport({ draft, destination, duplicates, tags, collections });
  }

  const sources = describeSources(tab, draft);
  const seed = 900000 + (++jobSeq) * 7919;
  const declared = sources.reduce((n, s) => n + s.games, 0);

  /* The three whole-source failures. Nothing is added, and the import as a
     whole failed, because in this revision an import has only one source
     type and — for paste and online — only one source (r5 §3). */
  if (resolved === 'none' || resolved === 'file' || resolved === 'network') {
    return {
      tab, sources, destination, duplicates, tags, collections, seed,
      outcome: resolved,
      total: 0, added: 0, skipped: 0, failures: [],
      failedSources: sources.map((s) => ({ ...s, errorKind: resolved })),
      download: tab === 'online'
    };
  }

  const failures = resolved === 'problems' ? FAILURES : [];
  const skipped = resolved === 'problems' ? SKIPPED_DUPLICATES : 0;
  const added = Math.max(0, declared - failures.length - skipped);

  return {
    tab, sources, destination, duplicates, tags, collections, seed,
    outcome: resolved,
    total: declared,
    added,
    skipped,
    failures,
    failedSources: [],
    /* An online import has two phases where the others have one: the download
       has no reliable total until it finishes, the write has one from the
       start (r4 §4). */
    download: tab === 'online'
  };
}

/* ---------------- what the user is told -------------------------------- */

/**
 * One outcome, one sentence. r5 §3.
 *
 * A misspelled username, an empty account, a paste that was an email and a
 * .pgn holding only comments are the same outcome and get the same words: the
 * causes differ, what the user does about them does not, and in most cases the
 * import cannot tell which applies. Only the two failures where the source was
 * never read at all are named differently — and each is named for the thing
 * that went wrong, in two words.
 */
export function outcomeMessage(plan) {
  const first = plan.sources[0];
  const name = first?.label ?? '';
  switch (plan.outcome) {
    case 'file':    return { key: 'add.err.file', vars: { name } };
    case 'network': return { key: 'add.err.network' };
    case 'none':
      if (plan.tab === 'paste')  return { key: 'add.none.paste' };
      if (plan.tab === 'online') return { key: 'add.none.online', vars: { name } };
      return { key: 'add.none.file', vars: { name } };
    default:
      return null;
  }
}

/** True when the import ended with something the user has not seen. */
export function needsAttention(plan) {
  return Boolean(plan) && (plan.outcome !== 'clean');
}

/** How many games an unsuccessful import failed to add, for the status line. */
export function notAddedCount(plan) {
  if (!plan) return 0;
  if (plan.outcome === 'problems') return plan.failures.length + plan.skipped;
  return plan.total || plan.sources.reduce((n, s) => n + s.games, 0);
}
