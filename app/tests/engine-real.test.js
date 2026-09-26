/**
 * The REAL engine, unmodified, run under Node (`helpers/nodeEngine.js`) from
 * a committed test fixture (engine Stage 2, `engine-stage2-plan.md`) — the
 * same files a real install would fetch and verify, not Stage 1's app-bundled
 * copy (retired). Nothing is mocked: the same session, parser and store the
 * app uses, against Stockfish itself.
 *
 * What this cannot cover is the one browser-only piece, the Web Worker
 * transport (`engine/workerTransport.js`); that is checked by hand in each
 * browser and in the desktop app.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { createEngineSession } from '$lib/engine/session.js';
import { evalScore } from '$lib/game/layout.js';
import { activeId } from '../src/lib/stores/tabs.js';
import {
  activeGame, engineAnalysis, ensureGameState, resetGameState, seedDraftGame,
  setEngineOn, setEngineDepth, setEngineTransport
} from '../src/lib/stores/game.js';
import { objects } from '../src/lib/stores/settings.js';
import { nodeEngineTransport } from './helpers/nodeEngine.js';

const MATE_IN_ONE = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';     // 1. Rd8#

/*
  Engine Stage 2 (`engine-stage2-plan.md`) stops seeding any engine by
  default — `objects.engines` starts with only the two native mock rows, and
  the store-driven test below picks whatever `engineSourceFor()` falls back
  to. Without a real (`kind: 'wasm'`) row present, that fallback is a mock
  row, `engineRequest` never starts a search, and the test hangs until its
  own timeout. So this describe block seeds one real row, the same way
  `game.test.js`'s Stage 2 describe block does, string id deliberately (no
  `config.db` write to avoid).
*/
const REAL_ENGINE_ID = 'engine-real-test-real';
const REAL_ENGINE = Object.freeze({
  id: REAL_ENGINE_ID, name: 'Stockfish', version: '19 lite', status: 'ready',
  protocol: 'UCI', kind: 'wasm', threads: 1, threadsMax: 1, hashMb: 32, enabled: true
});

const until = async (fn, ms = 20000) => {
  const end = Date.now() + ms;
  while (!fn()) {
    if (Date.now() > end) throw new Error('timed out waiting for the engine');
    await new Promise((r) => setTimeout(r, 20));
  }
};

describe('Stockfish 19 lite (WASM), for real', () => {
  let session;
  beforeEach(() => {
    objects.update((o) => ({
      ...o,
      engines: [{ ...REAL_ENGINE }, ...o.engines.filter((e) => e.id !== REAL_ENGINE_ID)]
    }));
  });
  afterEach(() => {
    session?.dispose();
    resetGameState();
    objects.update((o) => ({ ...o, engines: o.engines.filter((e) => e.id !== REAL_ENGINE_ID) }));
    setEngineTransport();
  });

  it('finds the mate in one, and says so as M1', async () => {
    session = createEngineSession({ createTransport: nodeEngineTransport() });
    let last = null;
    session.search({ key: 'm1', fen: MATE_IN_ONE, lines: 1, depth: 10 }, (u) => { last = u; });
    await until(() => last?.status === 'done');
    expect(last.rows[0]).toMatchObject({ rank: 1, e: null, x: 1, pv: ['Rd8#'] });
    expect(evalScore(last.rows[0])).toBe('M1');
  }, 30000);

  it('drives the Engine Section through the store, end to end', async () => {
    setEngineTransport(nodeEngineTransport());
    ensureGameState('r1', seedDraftGame({ fen: MATE_IN_ONE }));
    activeId.set('r1');
    setEngineDepth('r1', 10);
    setEngineOn('r1', true);
    await until(() => get(engineAnalysis).r1?.status === 'done');
    const v = get(activeGame).engineView;
    expect(v.running).toBe(true);
    expect(v.lines[0].pv[0]).toBe('Rd8#');
    expect(evalScore(v.lines[0])).toBe('M1');                // what the Section and the Bar print
    expect(v.lines.every((l) => l.depth === 10)).toBe(true);
  }, 30000);
});
