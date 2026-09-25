/**
 * Desktop's engine list: `loadEngines()` replaces the list with `config.db`'s
 * rows and then adds the built-in engine back, since it is not one of them
 * (Stage 1, `engine-stage1-plan.md` approach item 6). The picker still offers
 * it first.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

vi.mock('$lib/data/session.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getBackend: () => 'tauri',
  configConnection: vi.fn(async () => ({}))
}));
vi.mock('$lib/data/config.js', async (importOriginal) => ({
  ...(await importOriginal()),
  readEngines: vi.fn(async () => [
    { id: 1, name: 'Stockfish', version: '17.1', binaryPath: '/usr/local/bin/stockfish',
      hashMb: 512, threads: 4, enabled: true },
    { id: 2, name: 'Torch', version: '3', binaryPath: '/usr/local/bin/torch',
      hashMb: 256, threads: 2, enabled: false }
  ])
}));

const { objects, loadEngines, setEngineEnabled } = await import('../src/lib/stores/settings.js');
const { engineSources } = await import('$lib/game/engine.js');
const { BUILTIN_ENGINE, BUILTIN_ENGINE_ID } = await import('$lib/engine/builtin.js');

const SEED = structuredClone(get(objects).engines);
beforeEach(() => {
  objects.update((o) => ({ ...o, engines: structuredClone(SEED) }));
});

describe('loadEngines() on desktop', () => {
  it('appends the built-in engine after config.db’s rows', async () => {
    await loadEngines();
    const engines = get(objects).engines;
    expect(engines.map((e) => e.id)).toEqual([1, 2, BUILTIN_ENGINE_ID]);
    expect(engines[2]).toEqual({ ...BUILTIN_ENGINE });
  });

  it('keeps the built-in engine’s switch as it was', async () => {
    setEngineEnabled(BUILTIN_ENGINE_ID, false);
    await loadEngines();
    expect(get(objects).engines.find((e) => e.id === BUILTIN_ENGINE_ID).enabled).toBe(false);
  });

  it('still has the picker offer it first', async () => {
    await loadEngines();
    // config.db's rows carry no `status`, so only the built-in engine is
    // offered today; the rule is what matters: built-in first, whatever the order.
    const withStatus = get(objects).engines.map((e) => ({ status: 'ready', ...e }));
    expect(engineSources(withStatus).map((e) => e.id)).toEqual([BUILTIN_ENGINE_ID, 1]);
  });
});
