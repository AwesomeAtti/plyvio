/**
 * The REAL bundled engine — `static/engines/stockfish-19-lite/`, unmodified,
 * run under Node (`helpers/nodeEngine.js`). Nothing is mocked: the same
 * session, parser and store the app uses, against Stockfish itself.
 *
 * What this cannot cover is the one browser-only piece, the Web Worker
 * transport (`engine/workerTransport.js`); that is checked by hand in each
 * browser and in the desktop app.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { createEngineSession } from '$lib/engine/session.js';
import { evalScore } from '$lib/game/layout.js';
import { activeId } from '../src/lib/stores/tabs.js';
import {
  activeGame, engineAnalysis, ensureGameState, resetGameState, seedDraftGame,
  setEngineOn, setEngineDepth, setEngineTransport
} from '../src/lib/stores/game.js';
import { nodeEngineTransport } from './helpers/nodeEngine.js';

const MATE_IN_ONE = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';     // 1. Rd8#

const until = async (fn, ms = 20000) => {
  const end = Date.now() + ms;
  while (!fn()) {
    if (Date.now() > end) throw new Error('timed out waiting for the engine');
    await new Promise((r) => setTimeout(r, 20));
  }
};

describe('Stockfish 19 lite (WASM), for real', () => {
  let session;
  afterEach(() => {
    session?.dispose();
    resetGameState();
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
