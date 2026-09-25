/**
 * `engine/session.js` — one engine for the app, driven through a scripted
 * transport (`helpers/fakeEngine.js`) so every ordering can be forced. What
 * the fake says back is recorded real engine output (`fixtures/stockfish-uci.json`).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createEngineSession } from '$lib/engine/session.js';
import { createFakeEngine, settle } from './helpers/fakeEngine.js';

const FIXTURE = JSON.parse(readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/stockfish-uci.json'), 'utf8'
));
const CASE = Object.fromEntries(FIXTURE.cases.map((c) => [c.name, c]));
const START = CASE['startpos-multipv3'];
const BLACK = CASE['black-to-move-multipv2'];
const MATE = CASE['white-mates-in-1'];

const req = (c, over = {}) => ({ key: c.name, fen: c.fen, lines: c.multipv, depth: c.depth, ...over });
const infos = (c) => c.output.filter((l) => l.startsWith('info'));
const bestmove = (c) => c.output.at(-1);

let fake;
let clock;
let timers;
let session;

beforeEach(() => {
  fake = createFakeEngine();
  clock = 0;
  timers = [];
  session = createEngineSession({
    createTransport: fake.createTransport,
    now: () => clock,
    schedule: (fn, ms) => { const t = { at: clock + ms, fn }; timers.push(t); return t; },
    cancel: (t) => { timers = timers.filter((x) => x !== t); }
  });
});

/** Advance the fake clock, running whatever timers come due. */
function advance(ms) {
  clock += ms;
  for (const t of timers.filter((x) => x.at <= clock)) {
    timers = timers.filter((x) => x !== t);
    t.fn();
  }
}

describe('starting', () => {
  it('does nothing until something is asked for', () => {
    expect(fake.starts).toBe(0);
    session.stop();
    expect(fake.starts).toBe(0);
  });

  it('shakes hands before the first search, then keeps the engine', async () => {
    session.search(req(START), () => {});
    expect(fake.take()).toEqual(['uci']);            // nothing else before `uciok`
    await settle();
    expect(fake.take()).toEqual([
      'setoption name Hash value 32', 'isready',
      'setoption name MultiPV value 3',
      `position fen ${START.fen}`, 'go depth 12'
    ]);
    fake.emit(bestmove(START));
    session.search(req(BLACK), () => {});
    // Same engine, no second handshake; MultiPV changes, so it is re-sent.
    expect(fake.take()).toEqual([
      'setoption name MultiPV value 2', `position fen ${BLACK.fen}`, 'go depth 12'
    ]);
    expect(fake.starts).toBe(1);
  });

  it('sends MultiPV only when it changes', async () => {
    session.search(req(START), () => {});
    await settle();
    fake.emit(bestmove(START));
    fake.take();
    session.search(req(START, { key: 'again', depth: 14 }), () => {});
    expect(fake.take()).toEqual([`position fen ${START.fen}`, 'go depth 14']);
  });
});

describe('reporting', () => {
  it('streams rows, then reports the finished search as done', async () => {
    const updates = [];
    session.search(req(START), (u) => updates.push(u));
    await settle();
    fake.emit(infos(START));
    fake.emit(bestmove(START));
    expect(updates.length).toBeGreaterThanOrEqual(2);
    expect(updates[0].status).toBe('searching');
    const last = updates.at(-1);
    expect(last.status).toBe('done');
    expect(last.rows.map((r) => r.pv[0])).toEqual(['e4', 'd4', 'Nf3']);
    expect(last.rows.every((r) => r.depth === 12)).toBe(true);
  });

  it('reports the first line at once, then at most one update per 200ms', async () => {
    const updates = [];
    session.search(req(START), (u) => updates.push(u));
    await settle();
    const lines = infos(START).filter((l) => !l.startsWith('info string'));
    fake.emit(lines[0]);
    expect(updates).toHaveLength(1);                 // leading edge: no wait
    fake.emit(lines.slice(1, 10));
    expect(updates).toHaveLength(1);                 // batched
    advance(199);
    expect(updates).toHaveLength(1);
    advance(1);
    expect(updates).toHaveLength(2);                 // one flush for all nine
    expect(timers).toHaveLength(0);
  });
});

describe('changing position: stop, wait for bestmove, then search', () => {
  it('never lets a late line from the old position reach the new one', async () => {
    const a = [];
    const b = [];
    session.search(req(START), (u) => a.push(u));
    await settle();
    fake.emit(infos(START).slice(0, 5));
    fake.take();

    session.search(req(BLACK), (u) => b.push(u));
    // Only `stop`: the new position waits for the old search's bestmove.
    expect(fake.take()).toEqual(['stop']);

    // The old search is still talking. None of it is reported to anybody.
    const aBefore = a.length;
    fake.emit(infos(START).slice(5));
    advance(1000);
    expect(a.length).toBe(aBefore);
    expect(b).toHaveLength(0);

    fake.emit(bestmove(START));
    expect(a.length).toBe(aBefore);                  // a stopped search is not "done"
    expect(fake.take()).toEqual([
      'setoption name MultiPV value 2', `position fen ${BLACK.fen}`, 'go depth 12'
    ]);
    fake.emit(infos(BLACK), bestmove(BLACK));
    expect(b.at(-1).rows.map((r) => r.pv[0])).toEqual(['Nf6', 'Nc6']);
  });

  it('collapses several quick changes into one stop and one search, the last', async () => {
    session.search(req(START), () => {});
    await settle();
    fake.take();
    session.search(req(BLACK), () => {});
    session.search(req(MATE), () => {});
    session.search(req(START, { key: 'start-again' }), () => {});
    session.search(req(BLACK, { key: 'black-again' }), () => {});
    expect(fake.take()).toEqual(['stop']);
    fake.emit('bestmove e2e4');
    expect(fake.take()).toEqual([
      'setoption name MultiPV value 2', `position fen ${BLACK.fen}`, 'go depth 12'
    ]);
    expect(session.state.searching).toBe('black-again');
  });

  it('asking again for what is already running changes nothing', async () => {
    const first = vi.fn();
    const second = vi.fn();
    session.search(req(START), first);
    await settle();
    fake.take();
    session.search(req(START), second);
    expect(fake.take()).toEqual([]);
    fake.emit(infos(START));
    expect(second).toHaveBeenCalled();               // the newer listener hears it
    expect(first).not.toHaveBeenCalled();
  });

  it('asking again for a finished search does not re-run it', async () => {
    session.search(req(START), () => {});
    await settle();
    fake.emit(infos(START), bestmove(START));
    fake.take();
    session.search(req(START), () => {});
    expect(fake.take()).toEqual([]);
  });
});

describe('stopping', () => {
  it('stops the search and keeps the engine for next time', async () => {
    const updates = [];
    session.search(req(START), (u) => updates.push(u));
    await settle();
    fake.emit(infos(START).slice(0, 4));
    fake.take();
    const n = updates.length;
    session.stop();
    expect(fake.take()).toEqual(['stop']);
    fake.emit(bestmove(START));
    expect(updates.length).toBe(n);                  // no `done` for a stopped search
    expect(fake.take()).toEqual([]);                 // and nothing new started

    // The same position again is a new search, on the same engine.
    session.search(req(START), () => {});
    expect(fake.take()).toEqual([`position fen ${START.fen}`, 'go depth 12']);
    expect(fake.starts).toBe(1);
  });

  it('a stop during the handshake just means no search', async () => {
    session.search(req(START), () => {});
    session.stop();
    await settle();
    expect(fake.take()).toEqual(['uci', 'setoption name Hash value 32', 'isready']);
  });
});

describe('failing', () => {
  it('reports an engine that cannot start, and does not retry the same request', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    let starts = 0;
    const broken = createEngineSession({
      createTransport: () => { starts += 1; throw new Error('no Worker here'); }
    });
    const updates = [];
    broken.search(req(START), (u) => updates.push(u));
    expect(updates).toEqual([{ status: 'error', rows: [] }]);
    broken.search(req(START), (u) => updates.push(u));
    expect(starts).toBe(1);
    // A different request tries again.
    broken.search(req(BLACK), (u) => updates.push(u));
    expect(starts).toBe(2);
    errors.mockRestore();
  });

  it('reports an engine that dies mid-search, and starts afresh for the next request', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const updates = [];
    session.search(req(START), (u) => updates.push(u));
    await settle();
    fake.emit(infos(START).slice(0, 3));
    fake.fail();
    expect(updates.at(-1)).toEqual({ status: 'error', rows: [] });
    expect(fake.terminated).toBe(1);
    session.search(req(BLACK), () => {});
    expect(fake.starts).toBe(2);
    expect(fake.take().at(-1)).toBe('uci');
    errors.mockRestore();
  });
});
