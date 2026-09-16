import { describe, expect, it } from 'vitest';
import { parseComment as parseChessopsComment } from 'chessops/pgn';
import {
  commandsOf,
  formatAnnotation,
  parseAnnotation,
  removeCommand,
  scanCommentParts,
  setCommand,
  setText,
} from '../src/lib/pgn/annotations.js';
import { setEngineAttribute } from '../src/lib/pgn/engineContext.js';

describe('scanning a comment', () => {
  it('splits text and commands, keeping order', () => {
    const parts = scanCommentParts('Good choice. [%eval +0.20,24] [%bestmove e2e4]');
    expect(parts.map((p) => p.kind)).toEqual(['text', 'command', 'command']);
    expect(parts[0].value.trim()).toBe('Good choice.');
    expect(parts[1]).toMatchObject({ name: 'eval', args: '+0.20,24' });
    expect(parts[2]).toMatchObject({ name: 'bestmove', args: 'e2e4' });
  });

  it('keeps text that follows a command', () => {
    const parts = scanCommentParts('[%eval +0.20] and then some prose');
    expect(parts.map((p) => p.kind)).toEqual(['command', 'text']);
  });

  it('does not end a command at a bracket inside a quoted value', () => {
    const parts = scanCommentParts('[%engine options="a]b;c" name="X"]');
    expect(parts).toHaveLength(1);
    expect(parts[0].args).toBe('options="a]b;c" name="X"');
  });

  it('leaves an unterminated command as text', () => {
    const parts = scanCommentParts('[%eval +0.20');
    expect(parts).toEqual([{ kind: 'text', value: '[%eval +0.20' }]);
  });

  it('leaves an ordinary bracket alone', () => {
    const parts = scanCommentParts('see [Kasparov 1985] for this');
    expect(parts.map((p) => p.kind)).toEqual(['text']);
  });
});

describe('reading a comment', () => {
  it('reads all seven commands from one comment', () => {
    const annotation = parseAnnotation(
      'Note. [%engine name="Stockfish 18.1" depth=24] [%eval +0.20,24] [%bestmove e2e4] ' +
        '[%clk 0:09:57] [%emt 0:00:03] [%csl Gc4,Rf7] [%cal Gc4c7]',
    );
    expect(annotation.text).toBe('Note.');
    expect(annotation.engine).not.toBeNull();
    expect(annotation.bestmove.uci).toBe('e2e4');
    expect(annotation.evaluation).toEqual({ pawns: 0.2, depth: 24 });
    expect(annotation.clock).toBe(9 * 60 + 57);
    expect(annotation.emt).toBe(3);
    expect(annotation.shapes).toHaveLength(3);
    expect(commandsOf(annotation).map((c) => c.name)).toEqual([
      'engine', 'eval', 'bestmove', 'clk', 'emt', 'csl', 'cal',
    ]);
  });

  it('reads a mate evaluation', () => {
    expect(parseAnnotation('[%eval #3]').evaluation).toEqual({ mate: 3, depth: undefined });
  });

  it('agrees with chessops on the commands chessops defines', () => {
    const raw = '[%eval -1.25,30] [%clk 0:02:50.1] [%emt 0:00:12] [%csl Ra1] [%cal Ba1h8]';
    const ours = parseAnnotation(raw);
    const theirs = parseChessopsComment(raw);
    expect(ours.evaluation).toEqual(theirs.evaluation);
    expect(ours.clock).toBe(theirs.clock);
    expect(ours.emt).toBe(theirs.emt);
    expect(ours.shapes).toEqual(theirs.shapes);
  });

  it('keeps an unrecognized command instead of discarding it', () => {
    const annotation = parseAnnotation('[%eval +0.20] [%zzz whatever it is] tail');
    expect(annotation.unrecognized).toEqual([
      { name: 'zzz', args: 'whatever it is', raw: '[%zzz whatever it is]' },
    ]);
    expect(annotation.text).toBe('tail');
  });

  it('takes the first of a repeated command and keeps both', () => {
    const annotation = parseAnnotation('[%eval +0.20] [%eval +0.30]');
    expect(annotation.evaluation).toEqual({ pawns: 0.2, depth: undefined });
    expect(commandsOf(annotation)).toHaveLength(2);
  });

  it('reads an empty comment', () => {
    const annotation = parseAnnotation('');
    expect(annotation.text).toBe('');
    expect(commandsOf(annotation)).toHaveLength(0);
  });
});

describe('writing a comment back', () => {
  it('returns the source text verbatim when nothing was touched', () => {
    for (const raw of [
      'Good choice. [%eval +0.20,24] [%bestmove e2e4]',
      '  [%clk 0:02:50.1]   [%eval 0.07]  ',
      '[%zzz unknown] prose [%eval +0.1]',
    ]) {
      expect(formatAnnotation(parseAnnotation(raw))).toBe(raw);
    }
  });

  it('keeps an unrecognized command, in place, across an edit', () => {
    const annotation = parseAnnotation('[%eval +0.20] [%zzz keep me] [%clk 0:09:57]');
    setCommand(annotation, 'bestmove', 'e2e4');
    const written = formatAnnotation(annotation);
    expect(written).toBe('[%eval +0.20] [%zzz keep me] [%clk 0:09:57] [%bestmove e2e4]');
    expect(parseAnnotation(written).unrecognized).toHaveLength(1);
  });

  it('replaces a command in place rather than appending a second one', () => {
    const annotation = parseAnnotation('[%eval +0.20] [%bestmove e2e4] [%clk 0:09:57]');
    setCommand(annotation, 'bestmove', 'd2d4');
    expect(formatAnnotation(annotation)).toBe('[%eval +0.20] [%bestmove d2d4] [%clk 0:09:57]');
  });

  it('carries an [%engine] edit through the comment', () => {
    const annotation = parseAnnotation('[%engine name="X" nodes=99 depth=10] rest');
    setEngineAttribute(annotation.engine, 'depth', 24);
    expect(formatAnnotation(annotation)).toBe('[%engine name="X" nodes=99 depth=24] rest');
  });

  it('removes a command', () => {
    const annotation = parseAnnotation('[%eval +0.20] [%clk 0:09:57]');
    removeCommand(annotation, 'clk');
    expect(formatAnnotation(annotation)).toBe('[%eval +0.20]');
  });

  it('changes the free text without moving the commands', () => {
    const annotation = parseAnnotation('Old note. [%eval +0.20] [%zzz x]');
    setText(annotation, 'New note.');
    expect(formatAnnotation(annotation)).toBe('New note. [%eval +0.20] [%zzz x]');
  });

  it('drops a closing brace, which PGN cannot carry inside a comment', () => {
    expect(formatAnnotation(parseAnnotation('a } b'))).toBe('a  b');
  });

  it('survives two read/write cycles unchanged', () => {
    const raw = 'Note. [%engine name="X" nodes=1] [%eval #-2,30] [%zzz q] [%cal Gc4c7]';
    const once = formatAnnotation(parseAnnotation(raw));
    const twice = formatAnnotation(parseAnnotation(once));
    expect(once).toBe(raw);
    expect(twice).toBe(raw);
  });
});
