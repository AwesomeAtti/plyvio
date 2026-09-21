/**
 * The switcher's selection persists across a restart — 20 Sep 2026, on
 * request. `stores/libraries.js`'s `selectLibrary()` writes the chosen id
 * to `config.db`'s `ui_state` table; `loadActiveLibrarySelection()` reads
 * it back on mount (`AppShell.svelte`, chained after `loadLibraries()`).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

vi.mock('$lib/data/session.js', () => ({
  configConnection: vi.fn(),
  libraryConnection: vi.fn(),
  isTauri: () => false
}));
vi.mock('$lib/data/config.js', async (importOriginal) => ({
  ...(await importOriginal()),
  readUiState: vi.fn(),
  writeUiState: vi.fn()
}));

const { objects } = await import('../src/lib/stores/settings.js');
const {
  activeLibraryId, selectLibrary, loadActiveLibrarySelection
} = await import('../src/lib/stores/libraries.js');
const { configConnection } = await import('$lib/data/session.js');
const { readUiState, writeUiState } = await import('$lib/data/config.js');

const DBS = [
  { id: 1, name: 'Alpha', status: 'indexed', enabled: true },
  { id: 2, name: 'Beta', status: 'indexed', enabled: true }
];

beforeEach(() => {
  objects.update((o) => ({ ...o, databases: DBS.map((d) => ({ ...d })) }));
  activeLibraryId.set(1);
  configConnection.mockReset();
  readUiState.mockReset();
  writeUiState.mockReset();
});

describe('selectLibrary — persists the choice', () => {
  it('writes the chosen id to ui_state, keyed activeLibraryId', async () => {
    const connection = {};
    configConnection.mockResolvedValue(connection);
    selectLibrary(2);
    await Promise.resolve();
    await Promise.resolve();
    expect(writeUiState).toHaveBeenCalledWith(connection, 'activeLibraryId', 2);
  });

  it('does not throw when there is no connection to persist to', async () => {
    configConnection.mockResolvedValue(null);
    expect(() => selectLibrary(2)).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(writeUiState).not.toHaveBeenCalled();
  });
});

describe('loadActiveLibrarySelection — restores it on mount', () => {
  it('applies a persisted id that still names a selectable library', async () => {
    configConnection.mockResolvedValue({});
    readUiState.mockResolvedValue({ activeLibraryId: 2 });
    await loadActiveLibrarySelection();
    expect(get(activeLibraryId)).toBe(2);
  });

  it('leaves the current selection alone when nothing was ever persisted', async () => {
    configConnection.mockResolvedValue({});
    readUiState.mockResolvedValue({});
    await loadActiveLibrarySelection();
    expect(get(activeLibraryId)).toBe(1);
  });

  it('leaves the current selection alone when the persisted id no longer exists', async () => {
    configConnection.mockResolvedValue({});
    readUiState.mockResolvedValue({ activeLibraryId: 999 });
    await loadActiveLibrarySelection();
    expect(get(activeLibraryId)).toBe(1);
  });

  it('leaves the current selection alone when the persisted id is no longer selectable', async () => {
    objects.update((o) => ({
      ...o,
      databases: [DBS[0], { ...DBS[1], enabled: false }]
    }));
    configConnection.mockResolvedValue({});
    readUiState.mockResolvedValue({ activeLibraryId: 2 });
    await loadActiveLibrarySelection();
    expect(get(activeLibraryId)).toBe(1);
  });

  it('is a no-op with no connection available', async () => {
    configConnection.mockResolvedValue(null);
    await loadActiveLibrarySelection();
    expect(get(activeLibraryId)).toBe(1);
    expect(readUiState).not.toHaveBeenCalled();
  });
});
