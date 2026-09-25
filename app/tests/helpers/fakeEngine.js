/**
 * A scripted UCI engine for tests — the transport shape `engine/session.js`
 * talks to (`createTransport({onLine, onError}) → {send, terminate}`).
 *
 * It answers the handshake on its own (`uci` → `uciok`, `isready` →
 * `readyok`) and records every command it is sent. Everything else it says
 * is whatever the test tells it to, via `emit()` — in these tests, lines
 * recorded from the real engine (`fixtures/stockfish-uci.json`).
 *
 * Replies are delivered asynchronously (a microtask), as a Worker's are, so
 * nothing re-enters the session from inside its own `send()`. `settle()`
 * waits for them.
 */
export function createFakeEngine() {
  const fake = {
    sent: [],
    starts: 0,
    terminated: 0,
    handlers: null,
    /** `true` answers a `stop` with a `bestmove` by itself. */
    autoBestmove: false,

    createTransport: (handlers) => {
      fake.starts += 1;
      fake.handlers = handlers;
      return {
        send(line) {
          fake.sent.push(line);
          if (line === 'uci') later(() => handlers.onLine('uciok'));
          else if (line === 'isready') later(() => handlers.onLine('readyok'));
          else if (line === 'stop' && fake.autoBestmove) later(() => handlers.onLine('bestmove 0000'));
        },
        terminate() { fake.terminated += 1; }
      };
    },

    /** Say something, as the engine. */
    emit(...lines) {
      for (const line of lines.flat()) fake.handlers.onLine(line);
    },

    fail(err = new Error('engine died')) {
      fake.handlers.onError(err);
    },

    /** The commands sent since the last `take()`, and forget them. */
    take() {
      const out = fake.sent;
      fake.sent = [];
      return out;
    }
  };
  const later = (fn) => queueMicrotask(fn);
  return fake;
}

/** Let queued engine replies arrive — every microtask, chained ones included. */
export function settle() {
  return new Promise((r) => setTimeout(r, 0));
}
