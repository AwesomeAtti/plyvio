/**
 * A movetext reader and writer for Plyvio, wrapping chessops and adding the two
 * comment commands chessops does not define: `[%engine]` and `[%bestmove]`.
 */

export {
  readMovetext,
  writeMovetext,
  resolveMovetext,
  plyCount,
  MovetextError,
} from './movetext.js';

export {
  parseAnnotation,
  formatAnnotation,
  emptyAnnotation,
  scanCommentParts,
  commandsOf,
  setCommand,
  removeCommand,
  setText,
  touch,
} from './annotations.js';

export {
  ENGINE_ATTRIBUTES,
  parseEngineContext,
  formatEngineContext,
  parseEngineAttributes,
  getEngineAttribute,
  getEngineString,
  getEngineNumber,
  setEngineAttribute,
  removeEngineAttribute,
  engineSummary,
  makeEngineContext,
} from './engineContext.js';

export {
  BESTMOVE_REFERS_TO,
  BESTMOVE_EXTENSION_VERSION,
  bestMoveIsMoversOwn,
  parseBestMove,
  formatBestMove,
  positionForBestMove,
  sideForBestMove,
} from './bestMove.js';

export {
  splitPgnGames,
  gameFieldsFromPgn,
  gameRowsFromPgnText,
} from './importPgn.js';

export {
  shapesToArgs,
  setShapes,
  applyShapesToMovetext,
} from './boardAnnotations.js';
