// jsdom has no layout engine and no ResizeObserver. Both are needed because the
// Tab Bar's overflow decision is driven by measured widths. We polyfill the
// observer and let each test declare the widths it wants to simulate.
/**
 * Svelte 5 shares ONE ResizeObserver across every clientWidth/clientHeight
 * binding, so an observer tracks a set of elements, not one. A polyfill that
 * keeps a single `el` silently reports only the most recently observed
 * element, and every other binding measures 0.
 */
class RO {
  constructor(cb) {
    this.cb = cb;
    this.els = new Set();
    RO.instances.push(this);
  }
  observe(el) { this.els.add(el); queueMicrotask(() => this.fire()); }
  unobserve(el) { this.els.delete(el); }
  disconnect() { this.els.clear(); }

  fire() {
    const entries = [...this.els]
      .filter((el) => el && el.isConnected)
      .map((el) => {
        const box = [{ inlineSize: el.clientWidth, blockSize: el.clientHeight }];
        return {
          target: el,
          contentRect: { width: el.clientWidth, height: el.clientHeight },
          borderBoxSize: box,
          contentBoxSize: box,
          devicePixelContentBoxSize: box
        };
      });
    if (entries.length) this.cb(entries, this);
  }

  static instances = [];

  /** Fire every live observer; a stale callback must not block the others. */
  static flush() {
    for (const i of RO.instances) {
      try { i.fire(); } catch { /* ignore torn-down components */ }
    }
  }
}

globalThis.ResizeObserver = RO;
globalThis.__RO__ = RO;

if (!globalThis.CSS) globalThis.CSS = {};
if (!globalThis.CSS.escape) globalThis.CSS.escape = (s) => String(s).replace(/["\\]/g, '\\$&');

Element.prototype.scrollIntoView = function () {};

// jsdom implements no Fullscreen API. The absence is an artifact of the test
// environment, not of any browser the app targets, so stub enough of it that
// the Full Screen menu item is reachable.
if (typeof document !== 'undefined' && !document.fullscreenEnabled) {
  Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
  Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true });
  document.exitFullscreen = () => Promise.resolve();
  Element.prototype.requestFullscreen = function () { return Promise.resolve(); };
}

/*
 * jsdom implements no canvas, so any getContext() call prints a "Not
 * implemented" notice to stderr. Chessground asks for one while measuring the
 * board, once per mounted board, which buried the run in ~150 identical lines.
 *
 * Nothing under test draws to a canvas — the board is asserted through its DOM,
 * not its pixels — so a null-returning stub is honest here: it is what a
 * browser returns for an unsupported context type, and it is the branch
 * Chessground already handles.
 */
HTMLCanvasElement.prototype.getContext = () => null;

Element.prototype.scrollBy = function ({ left = 0 } = {}) { this.scrollLeft += left; };

// Let tests set clientWidth / scrollWidth on specific elements.
export function fakeSize(el, { clientWidth, scrollWidth, clientHeight = 40 }) {
  const def = (k, v) => Object.defineProperty(el, k, { value: v, configurable: true });
  if (clientWidth !== undefined) def('clientWidth', clientWidth);
  if (scrollWidth !== undefined) def('scrollWidth', scrollWidth);
  def('clientHeight', clientHeight);
}
