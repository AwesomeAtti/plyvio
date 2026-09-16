import { describe, expect, it } from 'vitest';
import {
  engineSummary,
  formatEngineContext,
  getEngineNumber,
  getEngineString,
  makeEngineContext,
  parseEngineAttributes,
  parseEngineContext,
  removeEngineAttribute,
  setEngineAttribute,
} from '../src/lib/pgn/engineContext.js';

const SPEC = 'name="Stockfish 18.1" timestamp="2026-09-08T13:49:00Z" depth=24 hash=4096 threads=8 multipv=1';

describe('[%engine] attributes', () => {
  it('reads the extension’s own example', () => {
    const context = parseEngineContext(SPEC);
    expect(engineSummary(context)).toEqual({
      name: 'Stockfish 18.1',
      timestamp: '2026-09-08T13:49:00Z',
      depth: 24,
      hash: 4096,
      threads: 8,
      multipv: 1,
      options: null,
      unrecognized: [],
    });
  });

  it('keeps attributes in source order', () => {
    const context = parseEngineContext('depth=10 name="Stockfish 16" hash=512');
    expect(context.attributes.map((a) => a.key)).toEqual(['depth', 'name', 'hash']);
  });

  it('accepts attributes in any order', () => {
    const a = parseEngineContext('name="X" depth=3');
    const b = parseEngineContext('depth=3 name="X"');
    expect(engineSummary(a)).toEqual(engineSummary(b));
  });

  it('distinguishes quoted strings from bare numbers', () => {
    const [name, depth] = parseEngineAttributes('name="Stockfish 16" depth=10');
    expect(name).toMatchObject({ value: 'Stockfish 16', quoted: true });
    expect(depth).toMatchObject({ value: '10', quoted: false });
  });

  it('does not end a value at a space or a bracket inside quotes', () => {
    const context = parseEngineContext('options="UCI_Chess960=false;Use NNUE=true" name="X"');
    expect(getEngineString(context, 'options')).toBe('UCI_Chess960=false;Use NNUE=true');
    expect(getEngineString(context, 'name')).toBe('X');
  });

  it('reads an escaped quotation mark', () => {
    const context = parseEngineContext('name="a \\"b\\" c"');
    expect(getEngineString(context, 'name')).toBe('a "b" c');
  });

  it('returns null for an absent attribute rather than throwing', () => {
    const context = parseEngineContext('depth=24');
    expect(getEngineString(context, 'name')).toBeNull();
    expect(getEngineNumber(context, 'hash')).toBeNull();
  });

  it('reports an unrecognized attribute without rejecting the command', () => {
    const context = parseEngineContext('name="X" nodes=123456 depth=24');
    const summary = engineSummary(context);
    expect(summary.name).toBe('X');
    expect(summary.depth).toBe(24);
    expect(summary.unrecognized).toEqual([{ key: 'nodes', value: '123456' }]);
  });
});

describe('writing [%engine] back', () => {
  it('returns the source text unchanged when nothing was touched', () => {
    const odd = 'depth=24    name="Stockfish 18.1"';
    expect(formatEngineContext(parseEngineContext(odd))).toBe(odd);
  });

  it('preserves an unrecognized attribute, in place, across an edit', () => {
    const context = parseEngineContext('name="X" nodes=123456 depth=10');
    setEngineAttribute(context, 'depth', 24);
    expect(formatEngineContext(context)).toBe('name="X" nodes=123456 depth=24');
  });

  it('quotes by the extension’s table, not by the value’s shape', () => {
    const context = parseEngineContext('');
    setEngineAttribute(context, 'name', 'Stockfish 18.1');
    setEngineAttribute(context, 'depth', 24);
    setEngineAttribute(context, 'timestamp', '2026-09-12T00:00:00Z');
    expect(formatEngineContext(context)).toBe(
      'name="Stockfish 18.1" depth=24 timestamp="2026-09-12T00:00:00Z"',
    );
  });

  it('escapes a quotation mark it writes', () => {
    const context = parseEngineContext('');
    setEngineAttribute(context, 'name', 'a "b"');
    expect(formatEngineContext(context)).toBe('name="a \\"b\\""');
  });

  it('sets an existing attribute in place and appends a new one', () => {
    const context = parseEngineContext('name="X" depth=10');
    setEngineAttribute(context, 'depth', 24);
    setEngineAttribute(context, 'threads', 8);
    expect(formatEngineContext(context)).toBe('name="X" depth=24 threads=8');
  });

  it('removes an attribute', () => {
    const context = parseEngineContext('name="X" depth=10 hash=512');
    removeEngineAttribute(context, 'depth');
    expect(formatEngineContext(context)).toBe('name="X" hash=512');
  });

  it('builds a context in the documented attribute order', () => {
    const context = makeEngineContext({ depth: 24, name: 'Stockfish 18.1', multipv: 1 });
    expect(formatEngineContext(context)).toBe('name="Stockfish 18.1" depth=24 multipv=1');
  });

  it('round-trips the extension’s example', () => {
    const context = parseEngineContext(SPEC);
    expect(formatEngineContext(parseEngineContext(formatEngineContext(context)))).toBe(SPEC);
  });
});
