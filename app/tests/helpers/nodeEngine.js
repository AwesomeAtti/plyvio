/**
 * The REAL engine, under Node, run as a child process in the transport shape
 * `engine/session.js` uses — the same `.js`/`.wasm` pair Settings → Engines
 * installs (engine Stage 2), as a committed test fixture rather than a live
 * download or Stage 1's app-bundled copy (`static/engines/`, retired).
 *
 * `fixtures/stockfish-19-lite-wasm-single/` was downloaded once from the live
 * `engines-v1` release and its SHA-256 checked against the manifest's pinned
 * hash (`settings/engines.js`'s `WASM_ENGINES[0].sha256`) before being
 * unzipped and committed — not fetched on every test run, so this suite
 * stays fast and offline. Refresh it the same way (download, verify, unzip,
 * replace these two files) only if the manifest's `assetUrl`/`sha256` ever
 * changes to a new build.
 *
 * Stockfish.js runs as a UCI program on stdin/stdout when Node runs it as
 * the main script. The two files are copied, byte for byte, into a temp
 * folder with a `{"type":"commonjs"}` package.json beside them: this app's
 * own package.json says `"type": "module"`, and the engine's loader is
 * CommonJS. Nothing about the engine is changed or rebuilt.
 */
import { spawn } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/stockfish-19-lite-wasm-single');
const NAME = 'stockfish-19-lite-single';

export function nodeEngineTransport() {
  const dir = mkdtempSync(path.join(tmpdir(), 'plyvio-engine-'));
  copyFileSync(path.join(DIR, `${NAME}.js`), path.join(dir, `${NAME}.js`));
  copyFileSync(path.join(DIR, `${NAME}.wasm`), path.join(dir, `${NAME}.wasm`));
  writeFileSync(path.join(dir, 'package.json'), '{"type":"commonjs"}\n');

  return ({ onLine, onError }) => {
    const child = spawn(process.execPath, [`${NAME}.js`], { cwd: dir });
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).replace(/\r$/, '');
        buf = buf.slice(i + 1);
        if (line) onLine(line);
      }
    });
    child.on('error', onError);
    return {
      send: (line) => child.stdin.write(`${line}\n`),
      terminate: () => {
        child.kill();
        rmSync(dir, { recursive: true, force: true });
      }
    };
  };
}
