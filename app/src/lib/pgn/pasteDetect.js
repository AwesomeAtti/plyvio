/**
 * What a board paste (Ctrl/Cmd+V while a Game Workspace is open) actually
 * is, if anything — `analysis-board-plan.md`'s Stage 3.
 *
 * Pure and synchronous, and deliberately light-touch like `importPgn.js`:
 * a FEN is tried first (chessops' own validator, nothing hand-rolled), and
 * everything else goes through `splitPgnGames`' boundary-only split, never
 * a move parse of its own. `readGame` (chessops' tolerant parser) is the
 * one place actual move content is looked at, and only to tell a real game
 * apart from clipboard text that merely happens to reach here — never to
 * validate it move by move.
 *
 * Not re-exported from `pgn/index.js`: that barrel is imported by
 * `game/plies.js`, and this file imports `game/plies.js`'s own `readGame`
 * — adding it to the barrel would risk a cycle for no reason, since nothing
 * needs it from there.
 */

import { parseFen } from 'chessops/fen';
import { splitPgnGames, gameFieldsFromPgn } from './importPgn.js';
import { movetextOf } from '$lib/data/games.js';
import { readGame } from '$lib/game/plies.js';

/**
 * @param {string} rawText the clipboard's plain text.
 * @returns one of:
 *   `{type: 'none'}` — nothing paste-worthy found.
 *   `{type: 'fen', fen}` — a single valid FEN.
 *   `{type: 'pgn', movetext, fen, fields}` — one game's worth of movetext
 *     (tags stripped), its own starting `fen` (§2.2, `null` for the
 *     standard array) and its recognised header tags, `games`-table column
 *     names (`white`, `black`, `event`, … — never camelCase), ready to feed
 *     `stores/game.js`'s `seedDraftGame`/`replaceTabWithDraft` directly.
 *   `{type: 'multi', count}` — more than one game; the board paste target
 *     is for one position/game, not a batch — point the user at Add Games
 *     instead of guessing which one they meant.
 */
export function detectPaste(rawText) {
  const text = String(rawText ?? '').trim();
  if (!text) return { type: 'none' };

  // A FEN is one line; tried first so a bare position is never mistaken
  // for a headerless, tagless one-line "game" by the PGN path below.
  if (!/\r|\n/.test(text)) {
    try {
      parseFen(text).unwrap();
      return { type: 'fen', fen: text };
    } catch {
      // Not a FEN — fall through to the PGN path.
    }
  }

  const games = splitPgnGames(text);
  if (games.length === 0) return { type: 'none' };
  if (games.length > 1) return { type: 'multi', count: games.length };

  const gameText = games[0];
  const movetext = movetextOf(gameText);
  const fields = gameFieldsFromPgn(gameText, new Date().toISOString());
  const { pgn: _pgn, created_at: _createdAt, fen, ...headerFields } = fields;

  // A genuine game either names itself (a recognised tag) or actually
  // moves (more than just the starting position once resolved) — plain
  // text that happens to survive `splitPgnGames`' boundary-only split
  // (anything non-empty does) has neither and is not offered as a paste.
  const hasTags = Object.keys(headerFields).length > 0;
  const { plies } = readGame(movetext, { fen: fen ?? null });
  const hasMoves = plies.length > 1;
  if (!hasTags && !hasMoves) return { type: 'none' };

  return { type: 'pgn', movetext, fen: fen ?? null, fields: headerFields };
}
