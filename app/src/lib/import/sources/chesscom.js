/**
 * Chess.com source adapter. database-schema.md §4.1; `working/EXPLORATION.md`'s
 * "Online game import" section for the architecture and the decisions this
 * follows.
 *
 * PGN-first: the tag-lifted half of each row comes from the same
 * `gameFieldsFromPgn` every other import path uses (`pgn/importPgn.js`). Only
 * the JSON-only fields Chess.com's PGN never carries — confirmed against a
 * real archive, not just Chess.com's docs (`working/CLOSED.md`, 23 Sep) — are
 * overlaid here: `rated`, `time_class`, `variant` (from `rules`),
 * `white_accuracy`/`black_accuracy`, `tournament`, and the starting/current
 * position pair (`initial_setup`/`fen` in Chess.com's JSON, which map the
 * opposite way round from their own names — §4.1's own warning).
 *
 * v1 scope, approved 23 Sep: Chess.com only; the whole account, no date
 * filtering (`ACTIONS.md`'s still-parked "From" control — `draft.range` is
 * deliberately not read here); no de-duplication (deferred, post-import,
 * `EXPLORATION.md`); no custom `User-Agent` (CORS is confirmed open without
 * one, and no browser context can set one anyway, so the Chess.com-requested
 * header is a later nice-to-have, not a blocker — `EXPLORATION.md`).
 *
 * `source_type`/`source_identifier` (§2.3, added 23 Sep for per-game source
 * tracking) are also overlaid on every row here, not JSON-derived but from
 * the account being imported -- see `chessComRowFromApiGame`'s own doc.
 *
 * Incremental re-import (stage 2 of per-game source tracking, approved and
 * built 23 Sep, `EXPLORATION.md`): `fetchAllGames`'s optional `cursorDate`
 * skips archive months guaranteed already imported, and
 * `chessComRowsSinceCursor` resolves the one ambiguous day (the boundary
 * month's cursor date itself) by comparing the newly fetched games' own
 * `end_time` against what's already on record for that day. Both are
 * specific to how Chess.com's archive API and PGN extension tags are
 * shaped -- not generic import machinery, and not shared with any future
 * source's adapter. The two schema columns are the only part of this
 * feature meant to be reusable; see `data/games.js`'s
 * `latestGameDateForSource`/`gamePgnsForSourceOnDate`.
 */

import { gameFieldsFromPgn, headersFromPgn, STANDARD_START_FEN } from '$lib/pgn/importPgn.js';

export const SOURCE_TYPE = 'chess_com_player';

const API_ROOT = 'https://api.chess.com/pub/player';

/** Thrown when Chess.com has no account by that name — maps to the "no games found" outcome, not a network error. */
export class ChessComUserNotFoundError extends Error {}

/**
 * Chess.com treats a username case-insensitively; this is the one place
 * that normalization happens, so a request URL, a stored §2.3
 * `source_identifier`, and a cursor lookup against one all agree on the
 * same value regardless of how the user typed it.
 */
export const normalizeUsername = (username) => username.trim().toLowerCase();

async function getJson(url) {
  const res = await fetch(url);
  if (res.status === 404) throw new ChessComUserNotFoundError(url);
  if (!res.ok) throw new Error(`Chess.com API ${res.status} for ${url}`);
  return res.json();
}

/** The month-archive URLs Chess.com has for this player, oldest first. */
export async function fetchArchives(username) {
  const { archives } = await getJson(
    `${API_ROOT}/${encodeURIComponent(normalizeUsername(username))}/games/archives`
  );
  return archives;
}

/** One month's games, in Chess.com's own JSON shape. */
export async function fetchMonthGames(archiveUrl) {
  const { games } = await getJson(archiveUrl);
  return games;
}

/**
 * An archive URL's `{year, month}`, e.g.
 * `https://api.chess.com/pub/player/x/games/2026/08` → `{year: 2026, month: 8}`.
 * `null` for a URL that doesn't carry the shape Chess.com's own archive
 * list always uses (confirmed live against a real account's full archive
 * list, `working/CLOSED.md`, 23 Sep) -- a caller treats that as "can't
 * place this month, so don't skip it" rather than guessing.
 */
export function archiveMonthOf(url) {
  const m = /\/games\/(\d{4})\/(\d{2})(?:\/|$)/.exec(url);
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}

/** database-schema.md §2.2's `date` shape: `YYYY.MM.DD`, `?` for an unknown
 *  digit. `null` for anything that isn't a clean two digits of month -- an
 *  unknown-digit cursor date can't anchor a month to skip archives by. */
function monthOfDate(date) {
  const m = /^(\d{4})\.(\d{2})\.\d{2}$/.exec(date ?? '');
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}

const monthBefore = (a, b) => a.year < b.year || (a.year === b.year && a.month < b.month);

/**
 * Which of `archives` (Chess.com's own list, oldest first) are worth
 * requesting given `cursorDate` -- the account's latest known `date`
 * already on record (`data/games.js`'s `latestGameDateForSource`), or
 * `null` for a first import, which skips nothing.
 *
 * Only whole months strictly BEFORE the cursor's month are dropped: those
 * games are guaranteed already imported, because a prior import of this
 * account always fetched a month whole, never partially (Chess.com has no
 * partial-month response, `EXPLORATION.md`). The cursor's own month is kept
 * and fetched in full -- it can still hold games newer than `cursorDate`,
 * and `chessComRowsSinceCursor` below is what tells those apart from what's
 * already known.
 */
export function archivesFromCursor(archives, cursorDate) {
  const cursorMonth = monthOfDate(cursorDate);
  if (!cursorMonth) return archives;
  return archives.filter((url) => {
    const month = archiveMonthOf(url);
    return !month || !monthBefore(month, cursorMonth);
  });
}

/**
 * Every game Chess.com has for this player — whole account, oldest first, no
 * date range (v1 scope, above). Fetched one month at a time, in sequence,
 * rather than in parallel: Chess.com's own guidance is to avoid bursts of
 * concurrent requests, and a real account's month count is small enough (a
 * decade of daily play is roughly 120 requests) that fetching in order costs
 * nothing a user would notice.
 *
 * `onMonth(monthGameCount, totalSoFar)` fires after each month completes, so
 * the caller can drive the Status Bar's indeterminate "Downloading — N games"
 * count (§4.4.5) without this module knowing anything about stores or
 * Svelte.
 *
 * `cursorDate` (stage 2, `EXPLORATION.md`'s "Per-game source tracking"),
 * when given, skips requesting any month `archivesFromCursor` rules out
 * before fetching starts -- so `totalSoFar`/`onMonth` only ever count what
 * this call actually requested, same as a first import.
 */
export async function fetchAllGames(username, { onMonth, cursorDate } = {}) {
  const archives = archivesFromCursor(await fetchArchives(username), cursorDate);
  const games = [];
  for (const url of archives) {
    const monthGames = await fetchMonthGames(url);
    games.push(...monthGames);
    onMonth?.(monthGames.length, games.length);
  }
  return games;
}

/** §2.3 — the only two variants Plyvio's board can render. Anything else is skipped, not stored with a guessed shape. */
const SUPPORTED_RULES = new Set(['chess', 'chess960']);

/**
 * One Chess.com API game object → an `insertGames`-ready row, or `null`.
 *
 * `null` covers two cases the caller tells apart by nothing more than the
 * result: a `rules` value outside `SUPPORTED_RULES` (bughouse, crazyhouse,
 * kingofthehill, threecheck — none representable by `variant` §2.3 or by
 * Plyvio's board), which this v1 slice skips silently rather than storing
 * with a wrong shape or growing the schema's `variant` enum speculatively
 * (`EXPLORATION.md`, agreed 23 Sep); and a `pgn` chessops cannot parse at
 * all, which `gameFieldsFromPgn` already tolerates by returning only the
 * structural fields.
 *
 * @param {object} apiGame one entry from a Chess.com monthly archive's `games` array.
 * @param {string} createdAt ISO 8601 timestamp — this row's `created_at`.
 * @param {string} username the account being imported — database-schema.md
 *   §2.3's `source_identifier`, run through `normalizeUsername` so the value
 *   written here always matches what was actually fetched, regardless of how
 *   the user typed it.
 */
export function chessComRowFromApiGame(apiGame, createdAt, username) {
  if (!SUPPORTED_RULES.has(apiGame.rules)) return null;

  const fields = gameFieldsFromPgn(apiGame.pgn, createdAt);

  // §2.3 — per-game source tracking, added 23 Sep. Always populated for an
  // Online import, regardless of whether a Subscription exists for this
  // account (`working/EXPLORATION.md`, "Per-game source tracking").
  fields.source_type = SOURCE_TYPE;
  fields.source_identifier = normalizeUsername(username);

  if (typeof apiGame.rated === 'boolean') fields.rated = apiGame.rated ? 1 : 0;
  if (apiGame.time_class) fields.time_class = apiGame.time_class;
  if (apiGame.rules === 'chess960') fields.variant = 'freestyle';
  if (apiGame.tournament) fields.tournament = apiGame.tournament;

  const acc = apiGame.accuracies;
  if (acc && typeof acc.white === 'number') fields.white_accuracy = acc.white;
  if (acc && typeof acc.black === 'number') fields.black_accuracy = acc.black;

  // §4.1: Chess.com's `fen` is the FINAL position and its `initial_setup` is
  // the STARTING position — mapping either by its own name would store the
  // wrong one. Chess.com's PGN carries neither as a tag (confirmed live,
  // `CLOSED.md`, 23 Sep), so this is the only source for both.
  if (typeof apiGame.fen === 'string') fields.current_position = apiGame.fen;
  if (typeof apiGame.initial_setup === 'string') {
    fields.fen = apiGame.initial_setup === STANDARD_START_FEN ? null : apiGame.initial_setup;
  }

  return fields;
}

/**
 * A stored game's own `EndDate`/`EndTime` tags, combined into a Unix
 * timestamp comparable with the API's `end_time` field -- stage 2's
 * same-day tie-break (`EXPLORATION.md`). Both are Chess.com PGN extension
 * tags, not part of §1's mapped fields, so they're read straight from
 * `headersFromPgn` rather than through `gameFieldsFromPgn`.
 *
 * Chess.com always exports in UTC -- confirmed live against a real
 * account's full month, every game carrying `Timezone "UTC"` with zero
 * exceptions (`working/CLOSED.md`, 23 Sep) -- so `EndDate`+`EndTime` read
 * as UTC directly reproduce `end_time` exactly: cross-checked against 381
 * real games live, zero mismatches, zero missing tags. No timezone
 * conversion beyond that `Z` is needed or correct.
 *
 * @param {string} pgn a stored game's own `pgn` column, verbatim.
 * @returns {number|null} null when either tag is missing or unparseable --
 *   `latestEndTimeFromPgns` treats that the same as "nothing known".
 */
export function endTimeFromPgn(pgn) {
  const headers = headersFromPgn(pgn ?? '');
  const date = headers?.get('EndDate');
  const time = headers?.get('EndTime');
  if (!date || !time) return null;
  const ms = Date.parse(`${date.replaceAll('.', '-')}T${time}Z`);
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

/**
 * The latest of several stored games' `endTimeFromPgn` -- the boundary
 * date's "known up to here" mark stage 2's same-day tie-break compares
 * newly fetched games against. `null` when none of `pgns` yields a
 * parseable end time (including an empty list -- nothing known for that
 * day, so nothing to drop against it).
 *
 * @param {string[]} pgns `data/games.js`'s `gamePgnsForSourceOnDate` result.
 */
export function latestEndTimeFromPgns(pgns) {
  let latest = null;
  for (const pgn of pgns) {
    const t = endTimeFromPgn(pgn);
    if (t !== null && (latest === null || t > latest)) latest = t;
  }
  return latest;
}

/**
 * `apiGames` → mapped rows, incremental-aware: combines the per-game
 * mapping (`chessComRowFromApiGame`) with stage 2's boundary-day drop in
 * one call, so `stores/importer.js` doesn't have to juggle each apiGame's
 * `end_time` alongside its mapped row itself.
 *
 * Only a row dated exactly `cursorDate` needs the end-time comparison at
 * all: `archivesFromCursor` already kept whole months out of the fetch
 * entirely, so anything reaching this function dated before `cursorDate` is
 * guaranteed already known (dropped here too, since the boundary month's
 * fetch is still whole and may include earlier-in-month games) and anything
 * dated after it is unambiguously new (kept without comparison). A row this
 * function can't confidently place -- no `date` at all, or an end time that
 * can't be read on either side of the comparison -- is KEPT rather than
 * dropped: de-duplication is a separate, later feature (`EXPLORATION.md`),
 * this is a best-effort skip, and a false drop would silently lose a real
 * game where a false keep only risks an ordinary, already-handled
 * duplicate.
 *
 * @param {object[]} apiGames raw Chess.com API game objects, any month(s).
 * @param {string} createdAt this batch's `created_at`.
 * @param {string} username the account being imported.
 * @param {string|null} cursorDate the account's latest known `date` already
 *   on record, or null for a first import (nothing to drop).
 * @param {number|null} knownEndTimeOnCursorDate `latestEndTimeFromPgns`
 *   over `gamePgnsForSourceOnDate(connection, SOURCE_TYPE, identifier,
 *   cursorDate)`'s result -- the latest end time already on record for
 *   `cursorDate` specifically. Ignored when `cursorDate` is null.
 */
export function chessComRowsSinceCursor(apiGames, createdAt, username, cursorDate, knownEndTimeOnCursorDate) {
  const mapped = apiGames
    .map((apiGame) => ({ row: chessComRowFromApiGame(apiGame, createdAt, username), endTime: apiGame.end_time }))
    .filter((m) => m.row);

  if (!cursorDate) return mapped.map((m) => m.row);

  return mapped
    .filter(({ row, endTime }) => {
      const { date } = row;
      if (!date || date > cursorDate) return true;
      if (date < cursorDate) return false;
      // date === cursorDate: the one ambiguous day.
      if (knownEndTimeOnCursorDate == null) return true;
      if (typeof endTime !== 'number') return true;
      return endTime > knownEndTimeOnCursorDate;
    })
    .map((m) => m.row);
}
