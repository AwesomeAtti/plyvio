/**
 * The transport for an engine that runs as a Web Worker — the bundled
 * Stockfish WASM build (`static/engines/stockfish-19-lite/`).
 *
 * A transport carries UCI text and nothing else: `send(line)` one way,
 * `onLine(line)` the other, `onError(err)` if the engine can't start or
 * dies, `terminate()` to end it. `session.js` is written against that shape
 * only, so Stage 3's native engines add a Tauri transport beside this one
 * and nothing above it changes.
 *
 * Stockfish.js runs as a CLASSIC worker (`new Worker(url)`), takes each UCI
 * command as a `postMessage` string and posts each line of output back.
 */

/**
 * Start the worker at `url`.
 *
 * `wasmUrl` is passed in the URL's fragment, which is how Stockfish.js is
 * told where its `.wasm` is (its own loader reads `self.location.hash`).
 * Left out, it derives the path from `location.origin` inside the worker,
 * and an app served from a custom scheme (the desktop webview) is where an
 * origin is least safe to rely on. The fragment is never sent to a server,
 * and the service worker's cache ignores it, so the precached file answers.
 */
export function createWorkerTransport(url, wasmUrl, { onLine, onError }) {
  const worker = new Worker(wasmUrl ? `${url}#${encodeURIComponent(wasmUrl)}` : url);
  worker.onmessage = (e) => {
    if (typeof e.data !== 'string') return;
    for (const line of e.data.split('\n')) if (line) onLine(line);
  };
  worker.onerror = (e) => {
    e.preventDefault?.();
    onError(new Error(e.message || 'engine worker failed'));
  };
  return {
    send: (line) => worker.postMessage(line),
    terminate: () => worker.terminate()
  };
}
