/**
 * One engine for the whole app — Stage 1 of `engine-stage1-plan.md`.
 *
 * Started the first time something asks for a search, then kept alive: a
 * WASM engine takes a moment to load and compile, and a UCI engine is built
 * to be reused across positions. Only one search runs at a time. The store
 * above decides which one — the active tab's — and says so by calling
 * `search()` again or `stop()`; this file never looks at tabs.
 *
 * THE RACE THIS EXISTS TO AVOID. An engine keeps printing `info` lines for
 * the position it was searching until it acknowledges `stop` with a
 * `bestmove`. Send the next `position`/`go` before that `bestmove`, and a
 * late line from the old position lands on the new one: a line for the
 * wrong board, under the right heading. So every change of request is
 * `stop` → WAIT for that search's `bestmove` → then `position` + `go`.
 * Everything printed between one `go` and its `bestmove` belongs to that
 * search and nothing else, which is what makes the attribution safe.
 *
 * Several requests arriving during that wait collapse to the last one.
 *
 * Updates reach the listener at most about five times a second (`flushMs`):
 * the first line of a search at once, then batched. A finished search is
 * always flushed at once, as `done`.
 */
import {
  parseInfo, rowsFrom,
  positionCommand, goDepthCommand, setOptionCommand
} from './uci.js';

/**
 * @param {object} opts
 * @param {(handlers: {onLine: Function, onError: Function}) => {send: Function, terminate: Function}} opts.createTransport
 * @param {number} [opts.hashMb]  set once, at the handshake
 * @param {number} [opts.flushMs] the shortest gap between two updates
 */
export function createEngineSession({
  createTransport,
  hashMb = 32,
  flushMs = 200,
  now = () => Date.now(),
  schedule = (fn, ms) => setTimeout(fn, ms),
  cancel = (h) => clearTimeout(h)
}) {
  let transport = null;
  let ready = false;          // `readyok` seen after the handshake
  let multipv = null;         // the MultiPV value last sent

  let wanted = null;          // the latest request, or null for "search nothing"
  let current = null;         // the request whose `go` is out, until its `bestmove`
  let stopping = false;       // `stop` sent for `current`
  let failedKey = null;       // the request that was live when the engine failed
  let finishedKey = null;     // the request whose search ran to its `bestmove`

  let infos = new Map();      // multipv → the latest usable `info` for `current`
  let lastFlush = -Infinity;
  let timer = null;

  function reset() {
    if (timer !== null) cancel(timer);
    timer = null;
    transport = null;
    ready = false;
    multipv = null;
    current = null;
    stopping = false;
    infos = new Map();
  }

  function fail(err) {
    console.error('Plyvio: the engine failed', err);
    const req = current ?? wanted;
    try { transport?.terminate(); } catch { /* already gone */ }
    reset();
    if (req) {
      failedKey = req.key;
      req.listener?.({ status: 'error', rows: [] });
    }
  }

  function flush(status = 'searching') {
    if (timer !== null) cancel(timer);
    timer = null;
    lastFlush = now();
    if (current) current.listener?.({ status, rows: rowsFrom(current.fen, infos.values()) });
  }

  function scheduleFlush() {
    if (timer !== null) return;
    const wait = lastFlush + flushMs - now();
    if (wait <= 0) flush();
    else timer = schedule(() => { timer = null; flush(); }, wait);
  }

  function onLine(line) {
    if (line === 'uciok') {
      transport.send(setOptionCommand('Hash', hashMb));
      transport.send('isready');
      return;
    }
    if (line === 'readyok') {
      ready = true;
      pump();
      return;
    }
    if (line.startsWith('bestmove')) {
      const finished = current;
      const wasStopped = stopping;
      if (finished && !wasStopped) {
        flush('done');
        finishedKey = finished.key;   // done: `pump` must not start it again
      }
      current = null;
      stopping = false;
      infos = new Map();
      pump();
      return;
    }
    if (!current || stopping) return;
    const info = parseInfo(line);
    if (!info) return;
    infos.set(info.multipv, info);
    scheduleFlush();
  }

  function start() {
    try {
      transport = createTransport({ onLine, onError: fail });
      transport.send('uci');
    } catch (err) {
      fail(err);
    }
  }

  /** Move the engine one step towards `wanted`. Called after every event. */
  function pump() {
    if (!transport) {
      if (wanted && wanted.key !== failedKey) start();
      return;
    }
    if (!ready) return;

    if (current) {
      if (wanted?.key !== current.key && !stopping) {
        stopping = true;
        /* Nothing more is reported for this search, not even a flush
           already scheduled from lines it printed before the stop. */
        if (timer !== null) cancel(timer);
        timer = null;
        transport.send('stop');
      }
      return;                     // wait for this search's `bestmove`
    }
    if (!wanted || wanted.key === finishedKey) return;

    if (multipv !== wanted.lines) {
      transport.send(setOptionCommand('MultiPV', wanted.lines));
      multipv = wanted.lines;
    }
    current = wanted;
    infos = new Map();
    lastFlush = -Infinity;
    transport.send(positionCommand(wanted.fen));
    transport.send(goDepthCommand(wanted.depth));
  }

  return {
    /**
     * Search `fen` to `depth` with `lines` principal variations, reporting
     * to `listener({status, rows})`. `key` names the request: asking again
     * with the key already being searched changes nothing.
     */
    search({ key, fen, lines, depth }, listener) {
      /* Already searching this, or already finished it: nothing to redo. */
      if (wanted?.key === key && (current?.key === key || !current)) {
        wanted.listener = listener;
        if (current) current.listener = listener;
        return;
      }
      wanted = { key, fen, lines, depth, listener };
      finishedKey = null;
      pump();
    },

    /** Stop searching. The engine stays loaded for the next request. */
    stop() {
      wanted = null;
      finishedKey = null;
      pump();
    },

    /** End the engine entirely (tests, and a later Stage's teardown). */
    dispose() {
      wanted = null;
      try { transport?.terminate(); } catch { /* already gone */ }
      reset();
      failedKey = null;
      finishedKey = null;
    },

    /** For tests and diagnostics: what the session is doing right now. */
    get state() {
      return {
        started: !!transport, ready,
        searching: current?.key ?? null, stopping, wanted: wanted?.key ?? null
      };
    }
  };
}
