/**
 * `[%engine]` — the PGN Engine Evaluation Context Extension.
 *
 * The extension's rules, restated only where the code depends on them:
 *
 *   - attributes are `key=value` pairs, in any order;
 *   - string values are enclosed in double quotation marks, numeric values are not;
 *   - every attribute is optional;
 *   - an application ignores attributes it does not recognize, and *preserves them
 *     when rewriting a PGN*.
 *
 * The last rule is why this module keeps every attribute it reads, in the order it
 * read them, with the text it read them from. Recognized attributes get a typed
 * reading as well; unrecognized ones simply ride along.
 */

/** Attributes the extension defines, and how their values are written. */
export const ENGINE_ATTRIBUTES = {
  name: 'string',
  timestamp: 'string',
  depth: 'number',
  hash: 'number',
  threads: 'number',
  multipv: 'number',
  options: 'string',
};

const isSpace = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r';

/**
 * Scan `key=value` pairs, honouring double-quoted values so that a `]` or a space
 * inside `options="..."` does not end the attribute or the command.
 *
 * @param {string} args the text after `[%engine `, without the closing `]`
 * @returns {{key: string, value: string, quoted: boolean, raw: string}[]}
 */
export const parseEngineAttributes = (args) => {
  const attributes = [];
  let i = 0;
  while (i < args.length) {
    while (i < args.length && isSpace(args[i])) i++;
    if (i >= args.length) break;
    const start = i;

    while (i < args.length && args[i] !== '=' && !isSpace(args[i])) i++;
    const key = args.slice(start, i);
    if (!key) break;

    if (args[i] !== '=') {
      // An attribute with no value. Not defined by the extension; kept verbatim.
      attributes.push({ key, value: '', quoted: false, raw: args.slice(start, i), valued: false });
      continue;
    }
    i++; // '='

    let value = '';
    let quoted = false;
    if (args[i] === '"') {
      quoted = true;
      i++;
      while (i < args.length) {
        if (args[i] === '\\' && i + 1 < args.length) {
          value += args[i + 1];
          i += 2;
          continue;
        }
        if (args[i] === '"') {
          i++;
          break;
        }
        value += args[i];
        i++;
      }
    } else {
      const vs = i;
      while (i < args.length && !isSpace(args[i])) i++;
      value = args.slice(vs, i);
    }
    attributes.push({ key, value, quoted, raw: args.slice(start, i), valued: true });
  }
  return attributes;
};

const escapeQuoted = (value) => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const formatAttribute = (attribute) => {
  if (attribute.raw !== undefined && !attribute.modified) return attribute.raw;
  if (!attribute.valued) return attribute.key;
  return attribute.quoted
    ? `${attribute.key}="${escapeQuoted(attribute.value)}"`
    : `${attribute.key}=${attribute.value}`;
};

/**
 * @param {string} args the text after `[%engine `
 * @returns {object} an engine context
 */
export const parseEngineContext = (args) => ({
  attributes: parseEngineAttributes(args),
  raw: args,
  modified: false,
});

/** Rebuild the `[%engine]` argument text. Untouched attributes keep their own spelling. */
export const formatEngineContext = (context) => {
  if (!context.modified) return context.raw;
  return context.attributes.map(formatAttribute).join(' ');
};

/** The attribute record for `key`, or `null`. */
export const getEngineAttribute = (context, key) =>
  context.attributes.find((a) => a.key === key) ?? null;

/** The string value of `key`, or `null`. */
export const getEngineString = (context, key) => {
  const attribute = getEngineAttribute(context, key);
  return attribute && attribute.valued ? attribute.value : null;
};

/** The numeric value of `key`, or `null` when absent or not a number. */
export const getEngineNumber = (context, key) => {
  const value = getEngineString(context, key);
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Set an attribute, keeping its position when it already exists and appending it
 * otherwise. Quoting follows the extension's table for known attributes, and the
 * value's own type for the rest.
 */
export const setEngineAttribute = (context, key, value) => {
  const declared = ENGINE_ATTRIBUTES[key];
  const quoted = declared ? declared === 'string' : typeof value !== 'number';
  const existing = getEngineAttribute(context, key);
  if (existing) {
    existing.value = String(value);
    existing.quoted = quoted;
    existing.valued = true;
    existing.modified = true;
  } else {
    context.attributes.push({ key, value: String(value), quoted, valued: true, modified: true });
  }
  context.modified = true;
  return context;
};

/** Remove an attribute. */
export const removeEngineAttribute = (context, key) => {
  const index = context.attributes.findIndex((a) => a.key === key);
  if (index >= 0) {
    context.attributes.splice(index, 1);
    context.modified = true;
  }
  return context;
};

/**
 * A rendering view: the defined attributes typed, and everything else listed as it
 * was read so that a caller can display or preserve it without knowing what it is.
 */
export const engineSummary = (context) => ({
  name: getEngineString(context, 'name'),
  timestamp: getEngineString(context, 'timestamp'),
  depth: getEngineNumber(context, 'depth'),
  hash: getEngineNumber(context, 'hash'),
  threads: getEngineNumber(context, 'threads'),
  multipv: getEngineNumber(context, 'multipv'),
  options: getEngineString(context, 'options'),
  unrecognized: context.attributes
    .filter((a) => !(a.key in ENGINE_ATTRIBUTES))
    .map((a) => ({ key: a.key, value: a.value })),
});

/** Build a context from scratch, in the extension's documented attribute order. */
export const makeEngineContext = (values) => {
  const context = { attributes: [], raw: '', modified: true };
  for (const key of Object.keys(ENGINE_ATTRIBUTES)) {
    if (values[key] !== undefined && values[key] !== null) setEngineAttribute(context, key, values[key]);
  }
  return context;
};
