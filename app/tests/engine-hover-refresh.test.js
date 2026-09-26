/**
 * Engine Section hover preview -- two behaviours found and changed by hand,
 * both 25 Sep (AwesomeAtti), both in `GameWorkspace.svelte`'s hover wiring:
 *
 * 1. REFRESHING AFTER A CLICK, not just on a fresh hover. Click a line, and
 *    the pointer is left sitting over the SAME row -- no
 *    pointerenter/pointerleave fires, because it never moved. The old code
 *    captured the hovered LINE OBJECT at pointerenter and cleared it on
 *    path change; with no new pointer event, the board's annotation either
 *    froze on the old line or went blank, staying wrong until the pointer
 *    physically left the row and came back. Fixed by tracking the hovered
 *    RANK instead and re-deriving the line from `engineView.lines` on
 *    every render, so the annotation tracks whatever that row is
 *    currently showing.
 *
 * 2. NO PREVIEW WHILE THE ENGINE IS OFF. A retained row (switched off, Q8)
 *    still reports hover and still plays on click, same as a live one --
 *    but drawing board arrows for a line that isn't actually being
 *    searched right now reads as live when it isn't. On request: hover on
 *    a retained row draws nothing; click is unaffected.
 *
 * Both need the real `@lichess-org/chessground` (not a mock double) so the
 * assertions are against its own `drawable.autoShapes`, the same technique
 * `ChessBoard.test.js` uses -- kept in its own file, rather than added to
 * `game.test.js`, so this capture wrapper doesn't shadow the real,
 * unmocked chessground the rest of that file deliberately exercises.
 *
 * A real (`kind: 'wasm'`) engine is required for either line to have a
 * search result at all -- a scripted transport (`helpers/fakeEngine.js`)
 * stands in, as it does throughout `game.test.js`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { render, fireEvent } from '@testing-library/svelte';

let capturedApi = null;
vi.mock('@lichess-org/chessground', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Chessground: (el, config) => {
      capturedApi = actual.Chessground(el, config);
      return capturedApi;
    }
  };
});

const { default: AppShell } = await import('../src/lib/components/AppShell.svelte');
const { openGame } = await import('../src/lib/stores/tabs.js');
const {
  activeGame, seedDraftGame, setEngineOn, setEngineSource, setEngineTransport, resetGameState
} = await import('../src/lib/stores/game.js');
const { engineHoverAutoShapes } = await import('../src/lib/game/engine.js');
const { objects } = await import('../src/lib/stores/settings.js');
const { createFakeEngine, settle } = await import('./helpers/fakeEngine.js');

const openDraftTab = () => openGame('Engine hover-refresh test', seedDraftGame());

function tick() {
  return new Promise((r) => setTimeout(r, 0));
}

const ENGINE_ID = 'engine-hover-refresh-test-real';
const REAL_ENGINE = Object.freeze({
  id: ENGINE_ID, name: 'Stockfish', version: '19 lite', status: 'ready',
  protocol: 'UCI', kind: 'wasm', threads: 1, hashMb: 32, enabled: true
});

let fake;
beforeEach(() => {
  fake = createFakeEngine();
  setEngineTransport(fake.createTransport);
  objects.update((o) => ({ ...o, engines: [{ ...REAL_ENGINE }] }));
});
afterEach(() => {
  resetGameState();
  objects.update((o) => ({ ...o, engines: [] }));
  setEngineTransport();
});

describe('Engine Section hover preview refreshes after a click (bug found 25 Sep)', () => {
  it('updates the board annotation to the new position\'s line, with no re-hover', async () => {
    capturedApi = null;
    fake.autoBestmove = true;   // let a mid-search 'stop' resolve on its own
    const { container } = render(AppShell);
    const id = openDraftTab();
    await tick();
    setEngineSource(id, ENGINE_ID);
    setEngineOn(id, true);
    await tick();
    await settle();
    fake.emit('info depth 12 multipv 1 score cp 20 pv e2e4 e7e5 g1f3', 'bestmove e2e4');
    await tick();

    expect(capturedApi).not.toBeNull();

    const before = get(activeGame);
    const beforeLine = before.engineView.lines[0];
    expect(beforeLine).toBeTruthy();

    const row = container.querySelector('#sec-engine-body .row');
    expect(row).toBeTruthy();

    // Hover: the annotation should match the line hovered, before anything
    // is clicked -- exactly what the pure function would draw for this
    // position and line.
    await fireEvent.pointerEnter(row);
    const beforeShapes = capturedApi.state.drawable.autoShapes;
    expect(beforeShapes).toEqual(engineHoverAutoShapes(before.position.f, beforeLine));
    expect(beforeShapes.length).toBeGreaterThan(0);

    // Click WITHOUT leaving the row first -- no pointerleave/pointerenter
    // fires, exactly the reported scenario (the pointer never moved).
    await fireEvent.click(row);
    await tick();
    await settle();
    // The new position's own line, from the scripted engine -- a different
    // top move, so the test would fail on sight if the annotation stayed
    // frozen on the old one.
    fake.emit('info depth 12 multipv 1 score cp -15 pv c7c5 g1f3 d7d6', 'bestmove c7c5');
    await tick();

    const after = get(activeGame);
    // The move actually played.
    expect(after.path.length).toBe(before.path.length + 1);

    const afterLine = after.engineView.lines[0];
    expect(afterLine).toBeTruthy();
    // A different position really does have a different top line here --
    // otherwise this test would pass by accident even with the old, frozen
    // behaviour.
    expect(afterLine.pv[0]).not.toBe(beforeLine.pv[0]);

    // The bug: with the pointer never having left the row, the board's
    // annotation must now reflect the NEW position's rank-1 line -- not
    // the old (pre-move) squares, and not blank.
    const afterShapes = capturedApi.state.drawable.autoShapes;
    expect(afterShapes).toEqual(engineHoverAutoShapes(after.position.f, afterLine));
    expect(afterShapes.length).toBeGreaterThan(0);
    expect(afterShapes).not.toEqual(beforeShapes);
  });
});


describe('Engine hover preview draws nothing while the engine is off (on request, 25 Sep)', () => {
  it('a retained (dimmed) row still plays on click, but draws no board annotation on hover', async () => {
    capturedApi = null;
    const { container } = render(AppShell);
    const id = openDraftTab();
    await tick();
    setEngineSource(id, ENGINE_ID);
    setEngineOn(id, true);
    await tick();
    await settle();
    fake.emit('info depth 12 multipv 1 score cp 20 pv e2e4 e7e5 g1f3', 'bestmove e2e4');
    await tick();

    const running = get(activeGame);
    const runningLine = running.engineView.lines[0];
    expect(runningLine).toBeTruthy();

    const row = container.querySelector('#sec-engine-body .row');
    await fireEvent.pointerEnter(row);
    // While it's actually running, hover draws as before -- this is the
    // control case, so a regression in behaviour 1 above would show up
    // here too.
    expect(capturedApi.state.drawable.autoShapes.length).toBeGreaterThan(0);
    await fireEvent.pointerLeave(row);

    // Q8 -- switching off retains the rows (dimmed), it doesn't clear them.
    setEngineOn(id, false);
    await tick();
    const retained = get(activeGame);
    expect(retained.engineView.running).toBe(false);
    expect(retained.engineView.lines.length).toBeGreaterThan(0);
    const retainedRow = container.querySelector('#sec-engine-body .body.stale .row');
    expect(retainedRow).toBeTruthy();

    await fireEvent.pointerEnter(retainedRow);
    // The preference: no preview while nothing is actually searching.
    expect(capturedApi.state.drawable.autoShapes).toEqual([]);

    // Click is unaffected -- a retained row still plays its move.
    const before = get(activeGame);
    await fireEvent.click(retainedRow);
    const after = get(activeGame);
    expect(after.path.length).toBe(before.path.length + 1);
  });
});
