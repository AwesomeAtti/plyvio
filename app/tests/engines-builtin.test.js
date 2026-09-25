/**
 * The engine bundled with the app, as Settings → Engines shows it — Stage 1
 * of `engine-stage1-plan.md`, Q1/Q6/Q7. An Installed row like any other, with
 * a working switch; its settings fixed and shown read-only; no Remove. The
 * mock rows and the Available catalogue beside it are exactly as they were.
 *
 * The PWA's list is `objects`' seed, tested here; desktop's is rebuilt by
 * `loadEngines()`, tested in `engines-builtin-desktop.test.js`.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import AppShell from '../src/lib/components/AppShell.svelte';
import { stripTabs, activeId, workspaceState, openSettings } from '../src/lib/stores/tabs.js';
import { locale } from '../src/lib/stores/i18n.js';
import {
  objects, selectSection, resetSettings, resetDatabases, availableEngines, setEngineEnabled
} from '../src/lib/stores/settings.js';
import { AVAILABLE_ENGINES } from '../src/lib/settings/engines.js';
import { engineSources } from '$lib/game/engine.js';
import { BUILTIN_ENGINE, BUILTIN_ENGINE_ID } from '$lib/engine/builtin.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
const SEED = structuredClone(get(objects).engines);     // before any test touches it

beforeEach(() => {
  stripTabs.set([]);
  activeId.set('library');
  workspaceState.set({ library: { scratch: '' } });
  locale.set('en');
  resetSettings();
  resetDatabases();
  objects.update((o) => ({ ...o, engines: structuredClone(SEED) }));
});
afterEach(cleanup);

async function renderEngines() {
  const r = render(AppShell);
  openSettings();
  selectSection('engines');
  await tick();
  return r;
}

const installedRows = (container) =>
  [...container.querySelectorAll('#settings-content .box')][0].querySelectorAll(':scope > .r');
const builtinRow = (container) =>
  [...installedRows(container)].find((r) => r.querySelector('.ver')?.textContent.trim() === '19 lite');

describe('the list', () => {
  it('seeds the built-in engine ahead of the two mock rows, which are unchanged', () => {
    expect(SEED.map((e) => e.id)).toEqual([BUILTIN_ENGINE_ID, 'engine-1', 'engine-2']);
    expect(SEED[0]).toEqual({ ...BUILTIN_ENGINE });
    expect(SEED[0]).toMatchObject({
      name: 'Stockfish', version: '19 lite', status: 'ready', protocol: 'UCI',
      threads: 1, hashMb: 32, enabled: true, builtin: true
    });
    expect(SEED[1]).toMatchObject({ id: 'engine-1', name: 'Stockfish', version: '17.1', threads: 4, hashMb: 512 });
    expect(SEED[2]).toMatchObject({ id: 'engine-2', name: 'Torch', version: '3', enabled: false });
  });

  it('leaves the Available catalogue exactly as it was', () => {
    expect(get(availableEngines).map((e) => e.id)).toEqual(AVAILABLE_ENGINES.map((e) => e.id));
  });

  it('is offered first by the Engine Section’s picker, and not at all once switched off', () => {
    expect(engineSources(get(objects).engines).map((e) => e.id)).toEqual([BUILTIN_ENGINE_ID, 'engine-1']);
    setEngineEnabled(BUILTIN_ENGINE_ID, false);
    expect(engineSources(get(objects).engines).map((e) => e.id)).toEqual(['engine-1']);
  });
});

describe('the row', () => {
  it('appears under Installed, with its version and what it runs as', async () => {
    const { container } = await renderEngines();
    expect(installedRows(container)).toHaveLength(3);
    const row = builtinRow(container);
    expect(row.querySelector('.nm').textContent.trim()).toBe('Stockfish');
    expect(row.querySelector('.dt').textContent.trim()).toBe('UCI · 1 thread · 32 MB');
  });

  it('has a working switch', async () => {
    const { container } = await renderEngines();
    const tg = builtinRow(container).querySelector('.tg');
    expect(tg.getAttribute('aria-checked')).toBe('true');
    await fireEvent.click(tg);
    expect(get(objects).engines.find((e) => e.id === BUILTIN_ENGINE_ID).enabled).toBe(false);
    expect(builtinRow(container).querySelector('.tg').getAttribute('aria-checked')).toBe('false');
    await fireEvent.click(builtinRow(container).querySelector('.tg'));
    expect(get(objects).engines.find((e) => e.id === BUILTIN_ENGINE_ID).enabled).toBe(true);
  });

  it('Q7 — expands to read-only values, and offers no Remove', async () => {
    const { container } = await renderEngines();
    await fireEvent.click(builtinRow(container).querySelector('.cv'));
    const exp = container.querySelector('#settings-content .exp');
    expect(exp.querySelectorAll('input, select, button').length).toBe(0);
    const pairs = [...exp.querySelectorAll('.er')].map((r) => [
      r.querySelector('.k').textContent.trim(), r.querySelector('.v').textContent.trim()
    ]);
    expect(pairs).toEqual([
      ['Name', 'Stockfish'], ['Version', '19 lite'], ['Threads', '1'], ['Hash size', '32 MB']
    ]);
  });

  it('leaves the mock rows’ controls and Remove as they were', async () => {
    const { container } = await renderEngines();
    const mock = [...installedRows(container)].find((r) => r.querySelector('.ver').textContent.trim() === '17.1');
    await fireEvent.click(mock.querySelector('.cv'));
    const exp = container.querySelector('#settings-content .exp');
    expect(exp.querySelectorAll('select').length).toBe(2);
    expect(exp.querySelector('input').value).toBe('Stockfish');
    expect(exp.querySelector('.dan')).toBeTruthy();
  });
});
