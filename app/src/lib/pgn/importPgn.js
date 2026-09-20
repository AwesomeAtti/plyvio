/**
 * Reading a PGN document for import. database-schema.md §4.
 *
 * Deliberately light-touch: this file never parses a move. Splitting games
 * apart and reading tag pairs are the only two jobs here, and both stop at
 * the movetext's boundary rather than looking inside it.
 *
 * Splitting a game's own raw text uses only the two boundaries the PGN
 * standard itself defines (§8.1.1, §8.2): a single blank line ends the tag
 * pair section and starts the movetext, and the movetext ends at its
 * concluding game termination marker (`1-0`, `0-1`, `1/2-1/2`, or `*`) —
 * never by understanding a single move. Reading tag values is handed to
 * chessops' `parsePgn`, which is fed the raw text and never asked for its
 * `.moves` — no re-serializing, no move tree, no reason for its tolerant
 * (never-throwing) move parser to be relevant to import at all.
 */

import { parsePgn, emptyHeaders } from 'chessops/pgn';

/** PGN tag name → the `games` column it fills. database-schema.md §1. */
const TAG_FIELDS = {
  Event: 'event',
  Site: 'site',
  Date: 'date',
  Round: 'round',
  White: 'white',
  Black: 'black',
  Result: 'result',
  WhiteElo: 'white_elo',
  BlackElo: 'black_elo',
  ECO: 'eco',
  TimeControl: 'time_control',
  FEN: 'fen',
  Termination: 'termination',
  PlyCount: 'ply_count'
};

/** §2.2 — cast to INTEGER; the standard's own placeholders become NULL. */
const INTEGER_FIELDS = new Set(['white_elo', 'black_elo', 'ply_count']);

/** The standard initial position — an explicit `FEN` tag matching it means the same as no tag (§2.4). */
const STANDARD_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const TAG_LINE = /^\s*\[\w+\s+"(?:[^"\\]|\\.)*"\]\s*$/;

/** A bare game termination marker — PGN §8.2.6's own four values, as their own token. */
const RESULT_TOKEN = /(?:^|\s)(1-0|0-1|1\/2-1\/2|\*)(?=\s|$)/g;

/**
 * Split a PGN document into its individual games, each as its own original
 * text (tags + movetext, verbatim — surrounding blank lines trimmed).
 *
 * The algorithm is exactly the standard's own two rules, chained: read tag
 * lines until a blank line ends them (§8.1.1); read movetext — completely
 * unexamined — until a termination marker ends it (§8.2's own definition of
 * what movetext is). Then whatever follows, after blank lines, is either
 * end of document or the next game's tags, and the pair of rules repeats.
 *
 * FALSE MARKERS. A comment or a variation can contain text that happens to
 * look like a termination marker (`{ transposes to a game that ended 1-0 }`)
 * without this file ever reading comments or variations to know that. The
 * guard is cheap rather than a real parse: a genuine marker is followed, once
 * blank space is skipped, by either the end of the document or the `[` that
 * starts the next game's tags — nothing else. A candidate that fails this is
 * assumed to be inside a comment and skipped in favor of the next candidate
 * further on. This does not require tracking comment or variation nesting,
 * and it does not catch every case (a comment that itself contains a blank
 * line followed by bracket-shaped text before its own closing `}` would
 * still fool it) — accepted as out of scope rather than silently unhandled.
 */
export function splitPgnGames(text) {
  const source = String(text ?? '');
  const len = source.length;
  const games = [];
  let pos = 0;

  const isSpace = (i) => i < len && /\s/.test(source[i]);

  while (pos < len) {
    while (isSpace(pos)) pos++;
    if (pos >= len) break;
    const gameStart = pos;

    // Tag pair section: consume tag lines up to (and including) the blank
    // line that ends them. A malformed game with no blank line at all stops
    // at its first non-tag, non-blank line instead — movetext starts there.
    let lineStart = pos;
    while (lineStart < len) {
      const nl = source.indexOf('\n', lineStart);
      const lineEnd = nl === -1 ? len : nl;
      const line = source.slice(lineStart, lineEnd);
      if (line.trim() === '') { lineStart = lineEnd + 1; break; }
      if (!TAG_LINE.test(line)) break;
      lineStart = lineEnd + 1;
    }
    const movetextStart = Math.min(lineStart, len);

    // Movetext: find the first termination marker that survives the
    // false-marker guard above. None found means the rest of the document
    // belongs to this game (a malformed or truncated game is still stored —
    // §1 requires only `pgn`, not a valid ending).
    RESULT_TOKEN.lastIndex = movetextStart;
    let gameEnd = len;
    let match;
    while ((match = RESULT_TOKEN.exec(source))) {
      const afterMarker = match.index + match[0].length;
      let after = afterMarker;
      while (isSpace(after)) after++;
      if (after >= len || source[after] === '[') {
        gameEnd = afterMarker;
        break;
      }
      // Otherwise: a marker-shaped substring inside something else (most
      // likely a comment) — keep scanning from where this match left off.
    }

    const chunk = source.slice(gameStart, gameEnd).trim();
    if (chunk) games.push(chunk);
    pos = gameEnd;
  }

  return games;
}

/**
 * One game's insertable row fields — everything `data/games.js`'s
 * `insertGame` needs — from its own PGN text. §4's own rule, applied:
 * stores `pgn` verbatim, lifts each tag §1 defines a field for, sets
 * `created_at`, leaves `movetext` unset (NULL).
 *
 * Tag values come from chessops' `parsePgn`, given this game's whole text
 * (tags and movetext together — chessops needs the movetext to know where
 * the tag section's implicit trailing rules apply, e.g. a synthesized
 * `Result` from the movetext's own termination marker when no `[Result]`
 * tag was written). Its `.moves` is never read: this function only ever
 * looks at `.headers`, so a game whose movetext chessops cannot make sense
 * of still contributes whatever tags it has.
 *
 * A tag this document does not carry is simply absent from the result —
 * `insertGame` stores NULL for it, per §2's "every other field may be
 * NULL" (§4: "Application fields with no source value remain NULL").
 *
 * @param {string} gameText one game's own PGN text, as `splitPgnGames` returns it.
 * @param {string} createdAt an ISO 8601 timestamp — this row's `created_at`.
 */
export function gameFieldsFromPgn(gameText, createdAt) {
  const fields = { pgn: gameText, created_at: createdAt };

  let headers;
  try {
    [{ headers } = {}] = parsePgn(gameText, emptyHeaders);
  } catch {
    headers = undefined;
  }
  if (!headers) return fields;

  for (const [tag, field] of Object.entries(TAG_FIELDS)) {
    if (!headers.has(tag)) continue;
    const value = headers.get(tag);

    if (INTEGER_FIELDS.has(field)) {
      const n = Number.parseInt(value, 10);
      fields[field] = Number.isFinite(n) ? n : null;
    } else if (field === 'fen') {
      fields.fen = value === STANDARD_START_FEN ? null : value;
    } else {
      fields[field] = value;
    }
  }

  return fields;
}

/**
 * Every game in a PGN document — pasted text or a `.pgn` file's contents —
 * as rows ready for `insertGames`. One document may hold many games; this
 * is the one function that turns raw text into that many rows.
 *
 * Two independent steps, deliberately not one: `splitPgnGames` (no parsing
 * at all — just the standard's own boundaries) decides what `pgn` is for
 * each game; `gameFieldsFromPgn` (chessops, headers only) decides what the
 * rest of the row is. A game that stored cleanly in the first step is never
 * lost because the second step found nothing useful in its tags.
 *
 * @param {string} text a whole PGN document, one or more games.
 * @param {string} [createdAt] defaults to now — the moment the import runs.
 * @returns {Array<Record<string, unknown>>}
 */
export function gameRowsFromPgnText(text, createdAt = new Date().toISOString()) {
  return splitPgnGames(text).map((chunk) => gameFieldsFromPgn(chunk, createdAt));
}
