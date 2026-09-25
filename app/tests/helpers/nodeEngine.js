/**
 * The REAL bundled engine, under Node — `static/engines/stockfish-19-lite/`,
 * run as a child process, in the transport shape `engine/session.js` uses.
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

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../static/engines/stockfish-19-lite');
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
