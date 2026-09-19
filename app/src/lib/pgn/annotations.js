/**
 * The comment layer.
 *
 * A PGN comment is free text with `[%command args]` tokens embedded in it. chessops
 * understands five of the commands Plyvio uses — `[%eval]`, `[%clk]`, `[%emt]`,
 * `[%csl]`, `[%cal]` — and returns them as typed fields, dropping everything it does
 * not recognize into the leftover `text`. That is enough to read a comment and not
 * enough to write one back: database-schema §3.1 replaces the whole of `movetext` on
 * every write, so anything the parser did not understand has to survive the trip.
 *
 * So this module owns the *token* layer and delegates the *values*:
 *
 *   - it scans the comment into ordered parts — text runs and commands — keeping the
 *     source text of each, which is what makes preservation provable;
 *   - for the five commands chessops defines, it hands the token straight back to
 *     chessops' own `parseComment`, so there is one grammar rather than two;
 *   - `[%engine]` and `[%bestmove]` are read by their own modules;
 *   - any other command is kept as an ordered part and re-emitted untouched.
 *
 * An unmodified annotation is written from its original text, verbatim. Only an
 * annotation something has changed is rebuilt, and a rebuild walks the same ordered
 * parts, so unrecognized commands keep both their spelling and their place.
 */

import { parseComment as parseChessopsComment } from 'chessops/pgn';
import { parseEngineContext, formatEngineContext } from './engineContext.js';
import { parseBestMove, formatBestMove } from './bestMove.js';

/** Commands whose values chessops defines. */
const CHESSOPS_COMMANDS = new Set(['eval', 'clk', 'emt', 'csl', 'cal']);

const isSpace = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r';

/**
 * Split a comment into ordered parts.
 *
 * Quoted values are honoured, so `options="a]b"` does not end the command early.
 *
 * @param {string} raw comment text, braces excluded
 * @returns {{kind: 'text'|'command', ...}[]}
 */
export const scanCommentParts = (raw) => {
  const parts = [];
  let text = '';
  let i = 0;
  const flushText = () => {
    // Whitespace between two commands is a separator, not content.
    if (text.trim()) parts.push({ kind: 'text', value: text });
    text = '';
  };

  while (i < raw.length) {
    if (raw[i] === '[' && raw[i + 1] === '%') {
      const start = i;
      let j = i + 2;
      while (j < raw.length && /[A-Za-z0-9_]/.test(raw[j])) j++;
      const name = raw.slice(i + 2, j);
      if (name) {
        // Scan to the closing bracket, skipping over quoted spans.
        let k = j;
        let quoted = false;
        let closed = false;
        while (k < raw.length) {
          const c = raw[k];
          if (quoted) {
            if (c === '\\') k++;
            else if (c === '"') quoted = false;
          } else if (c === '"') quoted = true;
          else if (c === ']') {
            closed = true;
            break;
          }
          k++;
        }
        if (closed) {
          let argsStart = j;
          while (argsStart < k && isSpace(raw[argsStart])) argsStart++;
          flushText();
          parts.push({
            kind: 'command',
            name,
            args: raw.slice(argsStart, k),
            raw: raw.slice(start, k + 1),
          });
          i = k + 1;
          continue;
        }
      }
    }
    text += raw[i];
    i++;
  }
  flushText();
  return parts;
};

const collapse = (s) => s.replace(/\s+/g, ' ').trim();

/** Ask chessops for the typed value of one of the five commands it defines. */
const chessopsValue = (name, args) => {
  const parsed = parseChessopsComment(`[%${name} ${args}]`);
  switch (name) {
    case 'eval':
      return parsed.evaluation ?? null;
    case 'clk':
      return parsed.clock ?? null;
    case 'emt':
      return parsed.emt ?? null;
    case 'csl':
    case 'cal':
      return parsed.shapes.length ? parsed.shapes : null;
    default:
      return null;
  }
};

/**
 * Read one comment.
 *
 * @param {string} raw comment text, braces excluded
 * @returns {object} an annotation
 */
export const parseAnnotation = (raw) => {
  const parts = scanCommentParts(raw);
  const annotation = {
    raw,
    parts,
    text: collapse(parts.filter((p) => p.kind === 'text').map((p) => p.value).join(' ')),
    engine: null,
    bestmove: null,
    evaluation: null,
    clock: null,
    emt: null,
    shapes: [],
    unrecognized: [],
    dirty: false,
  };

  for (const part of parts) {
    if (part.kind !== 'command') continue;
    if (part.name === 'engine') {
      part.value = parseEngineContext(part.args);
      if (!annotation.engine) annotation.engine = part.value;
    } else if (part.name === 'bestmove') {
      part.value = parseBestMove(part.args);
      if (!annotation.bestmove) annotation.bestmove = part.value;
    } else if (CHESSOPS_COMMANDS.has(part.name)) {
      part.value = chessopsValue(part.name, part.args);
      if (part.name === 'eval' && !annotation.evaluation) annotation.evaluation = part.value;
      if (part.name === 'clk' && annotation.clock === null) annotation.clock = part.value;
      if (part.name === 'emt' && annotation.emt === null) annotation.emt = part.value;
      if ((part.name === 'csl' || part.name === 'cal') && part.value) {
        annotation.shapes = annotation.shapes.concat(part.value);
      }
    } else {
      annotation.unrecognized.push({ name: part.name, args: part.args, raw: part.raw });
    }
  }
  return annotation;
};

/** Every command in the annotation, in source order. */
export const commandsOf = (annotation) => annotation.parts.filter((p) => p.kind === 'command');

const formatCommand = (part) => {
  if (part.name === 'engine' && part.value) {
    const args = formatEngineContext(part.value);
    if (part.value.modified) return args ? `[%engine ${args}]` : '[%engine]';
    return part.raw;
  }
  if (part.name === 'bestmove' && part.value && part.modified) {
    return `[%bestmove ${formatBestMove(part.value)}]`;
  }
  if (part.modified) return part.args ? `[%${part.name} ${part.args}]` : `[%${part.name}]`;
  return part.raw;
};

/**
 * Rebuild a comment from its parts, in source order.
 *
 * A comment may not contain `}` — PGN has no escape for it — so any that reaches this
 * point is dropped, as chessops does.
 */
export const formatAnnotation = (annotation) => {
  if (!annotation.dirty && !annotation.parts.some((p) => p.modified || (p.value && p.value.modified))) {
    return annotation.raw.replace(/\}/g, '');
  }
  const pieces = [];
  for (const part of annotation.parts) {
    if (part.kind === 'text') {
      const value = collapse(part.value);
      if (value) pieces.push(value);
    } else {
      pieces.push(formatCommand(part));
    }
  }
  return pieces.join(' ').replace(/\}/g, '');
};

/** An empty annotation, ready to be written into. */
export const emptyAnnotation = () => parseAnnotation('');

/**
 * Set a command's arguments, keeping its position when it is already present and
 * appending it otherwise.
 */
export const setCommand = (annotation, name, args) => {
  const existing = annotation.parts.find((p) => p.kind === 'command' && p.name === name);
  const part = existing ?? { kind: 'command', name, args: '', raw: '' };
  part.args = String(args);
  part.modified = true;
  if (!existing) annotation.parts.push(part);
  if (name === 'engine') part.value = parseEngineContext(part.args);
  else if (name === 'bestmove') part.value = parseBestMove(part.args);
  else if (CHESSOPS_COMMANDS.has(name)) part.value = chessopsValue(name, part.args);
  annotation.dirty = true;
  return refresh(annotation);
};

/** Remove every occurrence of a command. */
export const removeCommand = (annotation, name) => {
  annotation.parts = annotation.parts.filter((p) => !(p.kind === 'command' && p.name === name));
  annotation.dirty = true;
  return refresh(annotation);
};

/** Replace the annotation's free text, keeping every command where it is. */
export const setText = (annotation, value) => {
  const first = annotation.parts.find((p) => p.kind === 'text');
  if (first) {
    first.value = value;
    annotation.parts = annotation.parts.filter((p) => p.kind === 'command' || p === first);
  } else {
    annotation.parts.unshift({ kind: 'text', value });
  }
  annotation.dirty = true;
  return refresh(annotation);
};

/** Re-derive the typed views after a change, in place, so the caller keeps its reference. */
const refresh = (annotation) => {
  const rebuilt = parseAnnotation(formatAnnotation(annotation));
  annotation.parts = rebuilt.parts;
  annotation.text = rebuilt.text;
  annotation.engine = rebuilt.engine;
  annotation.bestmove = rebuilt.bestmove;
  annotation.evaluation = rebuilt.evaluation;
  annotation.clock = rebuilt.clock;
  annotation.emt = rebuilt.emt;
  annotation.shapes = rebuilt.shapes;
  annotation.unrecognized = rebuilt.unrecognized;
  annotation.dirty = true;
  return annotation;
};

/** Mark an annotation as needing to be rebuilt rather than copied verbatim. */
export const touch = (annotation) => {
  annotation.dirty = true;
  return annotation;
};
