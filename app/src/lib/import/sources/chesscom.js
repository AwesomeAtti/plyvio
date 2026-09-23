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
 */

import { gameFieldsFromPgn, STANDARD_START_FEN } from '$lib/pgn/importPgn.js';

export const SOURCE_TYPE = 'chess_com_player';

const API_ROOT = 'https://api.chess.com/pub/player';

/** Thrown when Chess.com has no account by that name — maps to the "no games found" outcome, not a network error. */
export class ChessComUserNotFoundError extends Error {}

async function getJson(url) {
  const res = await fetch(url);
  if (res.status === 404) throw new ChessComUserNotFoundError(url);
  if (!res.ok) throw new Error(`Chess.com API ${res.status} for ${url}`);
  return res.json();
}

/** The month-archive URLs Chess.com has for this player, oldest first. */
export async function fetchArchives(username) {
  const { archives } = await getJson(
    `${API_ROOT}/${encodeURIComponent(username.trim().toLowerCase())}/games/archives`
  );
  return archives;
}

/** One month's games, in Chess.com's own JSON shape. */
export async function fetchMonthGames(archiveUrl) {
  const { games } = await getJson(archiveUrl);
  return games;
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
 */
export async function fetchAllGames(username, { onMonth } = {}) {
  const archives = await fetchArchives(username);
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
 *   §2.3's `source_identifier`, normalized the same way `fetchArchives` builds
 *   the request URL (`trim().toLowerCase()`) so the value written here always
 *   matches what was actually fetched, regardless of how the user typed it.
 */
export function chessComRowFromApiGame(apiGame, createdAt, username) {
  if (!SUPPORTED_RULES.has(apiGame.rules)) return null;

  const fields = gameFieldsFromPgn(apiGame.pgn, createdAt);

  // §2.3 — per-game source tracking, added 23 Sep. Always populated for an
  // Online import, regardless of whether a Subscription exists for this
  // account (`working/EXPLORATION.md`, "Per-game source tracking").
  fields.source_type = SOURCE_TYPE;
  fields.source_identifier = username.trim().toLowerCase();

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
