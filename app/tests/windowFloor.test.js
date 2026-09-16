import { describe, it, expect, vi } from 'vitest';
import {
  computeClamp, ownsWindow, enforceWindowFloor, MIN_WIDTH, MIN_HEIGHT
} from '../src/lib/windowFloor.js';

const box = (iw, ih, cw = 0, ch = 28) => ({
  innerWidth: iw, innerHeight: ih,
  outerWidth: iw + cw, outerHeight: ih + ch
});

describe('§2.4 the floor is 800 x 600', () => {
  it('exposes the specified minimum', () => {
    expect(MIN_WIDTH).toBe(800);
    expect(MIN_HEIGHT).toBe(600);
  });

  it('does nothing when the window already satisfies the floor', () => {
    expect(computeClamp(box(1200, 800))).toBeNull();
    expect(computeClamp(box(800, 600))).toBeNull();      // exactly at the floor
  });

  it('clamps a too-narrow window', () => {
    const t = computeClamp(box(640, 700));
    expect(t.width).toBe(800);                            // + 0px horizontal chrome
    expect(t.height).toBe(728);                           // unchanged: 700 + 28
  });

  it('clamps a too-short window', () => {
    const t = computeClamp(box(1000, 400));
    expect(t.height).toBe(628);                           // 600 + 28 chrome
  });

  it('clamps both axes at once', () => {
    const t = computeClamp(box(500, 300));
    expect(t).toEqual({ width: 800, height: 628 });
  });

  it('adds window chrome back, so the VIEWPORT gets the full minimum', () => {
    // 16px of border, 60px of title bar
    const t = computeClamp(box(700, 500, 16, 60));
    expect(t.width).toBe(MIN_WIDTH + 16);
    expect(t.height).toBe(MIN_HEIGHT + 60);
  });

  it('never shrinks a window that is oversized on the other axis', () => {
    const t = computeClamp(box(500, 900));
    expect(t.width).toBe(800);
    expect(t.height).toBe(928);                           // preserved, not reduced
  });
});

describe('platform gating', () => {
  const fakeWin = (displayMode) => ({
    matchMedia: (q) => ({ matches: q.includes(displayMode) }),
    navigator: {}
  });

  it('claims the window in standalone display mode', () => {
    expect(ownsWindow(fakeWin('standalone'))).toBe(true);
  });

  it('claims it in window-controls-overlay too', () => {
    expect(ownsWindow(fakeWin('window-controls-overlay'))).toBe(true);
  });

  it('does NOT claim it in a browser tab', () => {
    expect(ownsWindow(fakeWin('browser'))).toBe(false);
  });

  it('honours the iOS/macOS Safari standalone flag', () => {
    const w = { matchMedia: () => ({ matches: false }), navigator: { standalone: true } };
    expect(ownsWindow(w)).toBe(true);
  });

  it('is inert without matchMedia', () => {
    expect(ownsWindow({})).toBe(false);
  });
});

describe('enforcement wiring', () => {
  function harness({ standalone = true, obeys = true, ...size }) {
    const listeners = {};
    const win = {
      innerWidth: size.iw, innerHeight: size.ih,
      outerWidth: size.iw, outerHeight: size.ih + 28,
      matchMedia: (q) => ({ matches: standalone && q.includes('standalone') }),
      navigator: {},
      addEventListener: (t, fn) => { listeners[t] = fn; },
      removeEventListener: (t) => { delete listeners[t]; },
      requestAnimationFrame: (fn) => { fn(); return 1; },
      cancelAnimationFrame: () => {},
      resizeTo: vi.fn((w, h) => {
        if (!obeys) return;
        win.outerWidth = w; win.outerHeight = h;
        win.innerWidth = w; win.innerHeight = h - 28;
      })
    };
    return { win, listeners };
  }

  it('snaps an undersized window up on launch', () => {
    const { win } = harness({ iw: 640, ih: 480 });
    enforceWindowFloor(win);
    expect(win.resizeTo).toHaveBeenCalledWith(800, 628);
    expect(win.innerWidth).toBe(800);
    expect(win.innerHeight).toBe(600);
  });

  it('leaves a compliant window alone', () => {
    const { win } = harness({ iw: 1200, ih: 800 });
    enforceWindowFloor(win);
    expect(win.resizeTo).not.toHaveBeenCalled();
  });

  it('snaps back when the user drags below the floor', () => {
    const { win, listeners } = harness({ iw: 1200, ih: 800 });
    enforceWindowFloor(win);
    win.innerWidth = 500; win.outerWidth = 500;
    listeners.resize();
    expect(win.resizeTo).toHaveBeenCalledWith(800, 828);
  });

  it('does nothing at all in a browser tab', () => {
    const { win, listeners } = harness({ iw: 640, ih: 480, standalone: false });
    enforceWindowFloor(win);
    expect(win.resizeTo).not.toHaveBeenCalled();
    expect(listeners.resize).toBeUndefined();
  });

  it('gives up after repeated refusals instead of looping forever', () => {
    const { win, listeners } = harness({ iw: 640, ih: 480, obeys: false });
    enforceWindowFloor(win, { maxFailures: 3 });
    expect(win.resizeTo).toHaveBeenCalledTimes(1);        // the launch attempt
    listeners.resize();
    listeners.resize();
    expect(win.resizeTo).toHaveBeenCalledTimes(3);
    listeners.resize();
    listeners.resize();
    listeners.resize();
    expect(win.resizeTo).toHaveBeenCalledTimes(3);        // disabled, not retried
  });

  it('teardown removes the listener', () => {
    const { win, listeners } = harness({ iw: 1200, ih: 800 });
    const stop = enforceWindowFloor(win);
    expect(listeners.resize).toBeTypeOf('function');
    stop();
    expect(listeners.resize).toBeUndefined();
  });

  it('survives a window with no resizeTo', () => {
    const { win } = harness({ iw: 640, ih: 480 });
    delete win.resizeTo;
    expect(() => enforceWindowFloor(win)).not.toThrow();
  });
});
