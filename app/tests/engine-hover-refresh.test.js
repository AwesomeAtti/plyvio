/**
 * Engine Section hover preview -- refreshing after a click, not just on a
 * fresh hover.
 *
 * Found by hand 25 Sep (AwesomeAtti), right after the hover/click feature
 * itself (ACTIONS.md) was confirmed working: click a line, and the pointer
 * is left sitting over the SAME row -- no pointerenter/pointerleave fires,
 * because it never moved. `GameWorkspace.svelte` used to capture the
 * hovered LINE OBJECT at pointerenter and clear it on path change; with no
 * new pointer event, the board's annotation either froze on the old line
 * or went blank, and stayed wrong until the pointer physically left the
 * row and came back. Fixed by tracking the hovered RANK instead and
 * re-deriving the line from `engineView.lines` on every render, so the
 * annotation tracks whatever that row is currently showing.
 *
 * This needs the real `@lichess-org/chessground` (not a mock double) so the
 * assertions are against its own `drawable.autoShapes`, the same technique
 * `ChessBoard.test.js` uses -- kept in its own file, rather than added to
 * `game.test.js`, so this capture wrapper doesn't shadow the real,
 * unmocked chessground the rest of that file deliberately exercises.
 */
import { describe, it, expect, vi } from 'vitest';
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
const { activeGame, seedDraftGame, setEngineOn, setEngineSource } = await import(
  '../src/lib/stores/game.js'
);
const { engineHoverAutoShapes } = await import('../src/lib/game/engine.js');

const openDraftTab = () => openGame('Engine hover-refresh test', seedDraftGame());

function tick() {
  return new Promise((r) => setTimeout(r, 0));
}

describe('Engine Section hover preview refreshes after a click (bug found 25 Sep)', () => {
  it('updates the board annotation to the new position\'s line, with no re-hover', async () => {
    capturedApi = null;
    const { container } = render(AppShell);
    const id = openDraftTab();
    await tick();
    setEngineSource(id, 'engine-1');
    setEngineOn(id, true);
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
    await tick();

    const after = get(activeGame);
    // The move actually played.
    expect(after.path.length).toBe(before.path.length + 1);

    const afterLine = after.engineView.lines[0];
    expect(afterLine).toBeTruthy();
    // A different position really does have a different top line here
    // (mock lines are position-derived) -- otherwise this test would pass
    // by accident even with the old, frozen behaviour.
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
