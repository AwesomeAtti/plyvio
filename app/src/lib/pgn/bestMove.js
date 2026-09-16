/**
 * `[%bestmove]` — the PGN Engine Best Move Extension.
 *
 * ---------------------------------------------------------------------------
 * THE MEANING LIVES HERE, AND NOWHERE ELSE.
 *
 * A `[%bestmove]` sits in a comment that follows a move. Two readings of which
 * position its value belongs to have been in play:
 *
 *   'before'  the position the move was played from — the engine's choice for the
 *             side that has just moved, so the mover's own alternative.
 *             Extension v1.1, the decision of 12 Sep, and what `samples/annotate.py`
 *             writes.
 *
 *   'after'   the position the move led to — the engine's choice for the opponent,
 *             so the reply. Extension v1.0, as first published.
 *
 * The two cannot be told apart from syntax alone: either way the value is a legal-
 * looking UCI move in an ordinary comment. Flip the constant below and every
 * consumer follows; nothing else in this package encodes the choice.
 * ---------------------------------------------------------------------------
 */

/** @type {'before' | 'after'} */
export const BESTMOVE_REFERS_TO = 'before';

/** Which extension version the constant above corresponds to. */
export const BESTMOVE_EXTENSION_VERSION = BESTMOVE_REFERS_TO === 'before' ? '1.1' : '1.0';

/** True when a `[%bestmove]` names a move for the side that played the move it follows. */
export const bestMoveIsMoversOwn = () => BESTMOVE_REFERS_TO === 'before';

const UCI = /^(?:[a-h][1-8][a-h][1-8][qrbnQRBN]?|[PNBRQK]@[a-h][1-8])$/;

/**
 * @param {string} args the text after `[%bestmove `
 * @returns {{uci: string, raw: string, wellFormed: boolean}}
 */
export const parseBestMove = (args) => {
  const uci = args.trim();
  return { uci, raw: args, wellFormed: UCI.test(uci) };
};

/** @returns {string} the `[%bestmove]` argument text */
export const formatBestMove = (bestmove) => bestmove.uci;

/**
 * Choose the position a `[%bestmove]` is to be read against.
 *
 * @param {{before: object, after: object}} positions the positions either side of the
 *        move the comment follows
 * @param {'before'|'after'} [refersTo] override, for reading a file of known provenance
 */
export const positionForBestMove = ({ before, after }, refersTo = BESTMOVE_REFERS_TO) =>
  refersTo === 'before' ? before : after;

/**
 * The colour a `[%bestmove]` names a move for, given the side that played the move the
 * comment follows.
 */
export const sideForBestMove = (mover, refersTo = BESTMOVE_REFERS_TO) =>
  refersTo === 'before' ? mover : mover === 'white' ? 'black' : 'white';
