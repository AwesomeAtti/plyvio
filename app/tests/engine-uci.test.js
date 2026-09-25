/**
 * `engine/uci.js` — reading what a UCI engine prints.
 *
 * Every line fed in here was RECORDED FROM THE REAL ENGINE (the bundled
 * Stockfish 19 lite WASM build, run under Node; `fixtures/stockfish-uci.json`
 * says how). None of it is written by hand, so the parser is tested against
 * what it will actually be given.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  parseInfo, parseBestMove, pvToSan, rowsFrom, whiteRelative, turnOf,
  positionCommand, goDepthCommand, setOptionCommand
} from '$lib/engine/uci.js';

const FIXTURE = JSON.parse(readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/stockfish-uci.json'), 'utf8'
));
const CASE = Object.fromEntries(FIXTURE.cases.map((c) => [c.name, c]));

/** What the session does with a search's output: the latest usable line per multipv. */
function replay(c, lines = c.output) {
  const infos = new Map();
  for (const line of lines) {
    const info = parseInfo(line);
    if (info) infos.set(info.multipv, info);
  }
  return rowsFrom(c.fen, infos.values());
}

describe('reading a search', () => {
  it('ranks MultiPV lines best first, at the depth each reached', () => {
    const rows = replay(CASE['startpos-multipv3']);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(rows.every((r) => r.depth === 12)).toBe(true);
    expect(rows[0].pv[0]).toBe('e4');           // the engine's bestmove, e2e4
    expect(rows.map((r) => r.pv[0])).toEqual(['e4', 'd4', 'Nf3']);
    // White to move: the engine's own numbers, unchanged.
    expect(rows.map((r) => r.e)).toEqual([expect.any(Number), 25, 24]);
    expect(rows.every((r) => r.x === null)).toBe(true);
  });

  it('turns a Black-to-move score White-relative, like [%eval]', () => {
    // The engine printed `score cp -27` and `score cp -34`: Black, to move,
    // is worse. White-relative that is +0.27 and +0.34.
    const c = CASE['black-to-move-multipv2'];
    expect(c.output.some((l) => /multipv 1 score cp -27 .* pv g8f6/.test(l))).toBe(true);
    const rows = replay(c);
    expect(rows.map((r) => r.e)).toEqual([27, 34]);
    expect(rows.map((r) => r.pv[0])).toEqual(['Nf6', 'Nc6']);
    // Ranked from the mover's side: ascending White-relative scores for Black.
    expect(rows[0].e).toBeLessThanOrEqual(rows[1].e);
  });

  it('reads mate scores both ways, and for both sides to move', () => {
    const at = (name) => replay(CASE[name])[0];
    expect(at('white-mates-in-1')).toMatchObject({ e: null, x: 1, pv: ['Rd8#'] });
    expect(at('black-mates-in-1')).toMatchObject({ e: null, x: -1, pv: ['Rd1#'] });
    // `score mate -2`: the side to move is being mated.
    expect(at('black-to-move-is-mated')).toMatchObject({ x: 2 });      // White mates
    expect(at('white-to-move-is-mated')).toMatchObject({ x: -2 });     // Black mates
  });

  it('names castling and promotion in SAN', () => {
    expect(replay(CASE['queenside-castling-multipv2'])[0].pv[0]).toBe('O-O-O');   // e1c1
    expect(replay(CASE.promotion)[0].pv).toEqual(['a8=Q#']);                      // a7a8q
  });

  it('skips bound, currmove and string lines', () => {
    const c = CASE['bound-and-currmove-excerpt'];
    const bounds = c.output.filter((l) => /lowerbound|upperbound/.test(l));
    const currmoves = c.output.filter((l) => /currmove/.test(l));
    expect(bounds.length).toBeGreaterThan(1);
    expect(currmoves.length).toBeGreaterThan(1);
    for (const l of [...bounds, ...currmoves]) expect(parseInfo(l)).toBeNull();
    expect(parseInfo(CASE['startpos-multipv3'].output.find((l) => l.startsWith('info string')))).toBeNull();

    // Up to and including the first bound line, the shown line is still the
    // last EXACT one (depth 29); the bound doesn't replace it.
    const first = c.output.findIndex((l) => /bound/.test(l));
    const before = replay(c, c.output.slice(0, first + 1));
    expect(before[0]).toMatchObject({ depth: 29, e: 62 });
    // The next exact line does.
    expect(replay(c)[0]).toMatchObject({ depth: 30, e: 53 });
  });

  it('agrees with the engine’s own bestmove on every recorded search', () => {
    for (const c of FIXTURE.cases.filter((x) => !x.excerpt)) {
      const best = parseBestMove(c.output.at(-1));
      const top = [...c.output].reverse().map(parseInfo).find((i) => i?.multipv === 1);
      expect(top.pv[0], c.name).toBe(best);
    }
  });

  it('stops a line at a move it cannot play, rather than printing past it', () => {
    const c = CASE['startpos-multipv3'];
    const info = parseInfo(c.output.filter((l) => / multipv 1 /.test(l)).at(-1));
    const real = pvToSan(c.fen, info.pv);
    expect(real.length).toBe(info.pv.length);
    // The same real line with its third move replaced by one that isn't legal there.
    const broken = [...info.pv.slice(0, 2), 'e1e8', ...info.pv.slice(3)];
    expect(pvToSan(c.fen, broken)).toEqual(real.slice(0, 2));
    expect(pvToSan('not a fen', info.pv)).toEqual([]);
  });
});

describe('the small pieces', () => {
  it('reads bestmove, and nothing else', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e6')).toBe('e2e4');
    expect(parseBestMove('info depth 1')).toBeNull();
  });

  it('turns scores round for Black and leaves them for White', () => {
    expect(whiteRelative({ cp: 30 }, 'white')).toEqual({ e: 30, x: null });
    expect(whiteRelative({ cp: 30 }, 'black')).toEqual({ e: -30, x: null });
    expect(whiteRelative({ cp: 0 }, 'black')).toEqual({ e: 0, x: null });   // never −0
    expect(whiteRelative({ mate: 3 }, 'black')).toEqual({ e: null, x: -3 });
    expect(whiteRelative({ mate: 0 }, 'black')).toEqual({ e: null, x: 0 });
    expect(turnOf('8/8/8/8/8/8/8/K1k5 b - - 0 1')).toBe('black');
  });

  it('builds the commands the session sends', () => {
    expect(positionCommand('8/8/8/8/8/8/8/K1k5 w - - 0 1')).toBe('position fen 8/8/8/8/8/8/8/K1k5 w - - 0 1');
    expect(goDepthCommand(24)).toBe('go depth 24');
    expect(setOptionCommand('MultiPV', 3)).toBe('setoption name MultiPV value 3');
  });
});
