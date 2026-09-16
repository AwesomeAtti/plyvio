/**
 * The round trip over real annotated data.
 *
 * `samples/pgn/gothamchess-annotated.pgn` is 533 games written by `samples/annotate.py`,
 * carrying `[%engine]`, `[%eval]`, `[%bestmove]` and `[%clk]`. Every game is read and
 * written back, and the two are compared byte for byte.
 *
 * The comparison uses `spacing: 'padded'` and `wrap: null` because that is the shape the
 * source is written in — chess.com pads its comment braces and puts a game's movetext on
 * one line. Those two settings are the whole of the difference between this file and the
 * form chessgui writes; nothing else about the document is allowed to move.
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { readMovetext, resolveMovetext, writeMovetext } from '../src/lib/pgn/movetext.js';
import { commandsOf } from '../src/lib/pgn/annotations.js';

const here = dirname(fileURLToPath(import.meta.url));
const CORPUS =
  process.env.CHESSGUI_CORPUS ?? resolve(here, '../../samples/pgn/gothamchess-annotated.pgn');

const available = existsSync(CORPUS);
const movetexts = available
  ? readFileSync(CORPUS, 'utf-8')
      .split(/\r?\n\r?\n/)
      .map((block) => block.trim())
      .filter((block) => block && !block.startsWith('['))
  : [];

const suite = available ? describe : describe.skip;

suite('the annotated corpus', () => {
  it('holds 533 games', () => {
    expect(movetexts).toHaveLength(533);
  });

  it('round-trips every game byte for byte', () => {
    const failures = [];
    for (const [index, source] of movetexts.entries()) {
      const written = writeMovetext(readMovetext(source), { spacing: 'padded', wrap: null });
      if (written !== source) failures.push(index);
    }
    expect(failures).toEqual([]);
  });

  it('loses no command from any game', () => {
    let engineContexts = 0;
    const counts = { eval: 0, bestmove: 0, clk: 0 };

    for (const source of movetexts) {
      const doc = readMovetext(source);
      if (doc.engine) engineContexts++;

      const seen = { eval: 0, bestmove: 0, clk: 0 };
      for (const node of doc.moves.mainlineNodes()) {
        for (const annotation of node.data.ann) {
          for (const command of commandsOf(annotation)) {
            if (command.name in seen) seen[command.name]++;
          }
        }
      }
      for (const name of Object.keys(seen)) counts[name] += seen[name];

      // The same counts must survive the write.
      const written = writeMovetext(doc, { spacing: 'padded', wrap: null });
      for (const name of Object.keys(seen)) {
        const occurrences = written.split(`[%${name} `).length - 1;
        expect(occurrences).toBe(seen[name]);
      }
    }

    expect(engineContexts).toBe(movetexts.length);
    expect(counts.bestmove).toBeGreaterThan(40000);
    expect(counts.eval).toBeGreaterThan(40000);
    expect(counts.clk).toBeGreaterThan(40000);
  });

  it('reads the engine context the annotator wrote', () => {
    const doc = readMovetext(movetexts[0]);
    expect(doc.engine).not.toBeNull();
    const keys = doc.engine.attributes.map((a) => a.key).sort();
    expect(keys).toEqual(['depth', 'hash', 'name', 'timestamp']);
  });

  /**
   * The 12 Sep decision as an empirical result rather than an assertion: a `[%bestmove]`
   * is a move for the side that has just moved, so it is legal in the position before the
   * move and — being the wrong side's move entirely — never legal in the position after.
   */
  it('finds every best move legal in the position the move was played from', () => {
    let total = 0;
    let legal = 0;
    for (const source of movetexts) {
      const resolved = resolveMovetext(readMovetext(source));
      for (const node of resolved.moves.mainlineNodes()) {
        for (const annotation of node.data.ann) {
          if (!annotation.bestmove) continue;
          total++;
          if (annotation.bestmove.legal) legal++;
          expect(annotation.bestmove.side).toBe(node.data.mover);
        }
      }
    }
    expect(total).toBeGreaterThan(40000);
    expect(legal).toBe(total);
  });

  it('finds none of them legal under the version 1.0 reading', () => {
    let total = 0;
    let legal = 0;
    for (const source of movetexts.slice(0, 50)) {
      const resolved = resolveMovetext(readMovetext(source), { bestMoveRefersTo: 'after' });
      for (const node of resolved.moves.mainlineNodes()) {
        for (const annotation of node.data.ann) {
          if (!annotation.bestmove) continue;
          total++;
          if (annotation.bestmove.legal) legal++;
        }
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(legal).toBe(0);
  });

  it('walks every game to its last move', () => {
    for (const source of movetexts) {
      const doc = readMovetext(source);
      const resolved = resolveMovetext(doc);
      expect(resolved.plyCount).toBe(
        [...doc.moves.mainlineNodes()].length,
        'a move was cut off as illegal',
      );
    }
  });
});
