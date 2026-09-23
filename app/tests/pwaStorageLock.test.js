/**
 * stores/pwaStorageLock.js — the gate behind SecondWindowGate.svelte.
 * ACTIONS.md, "PWA: a second window can't open the board once OPFS lands".
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

let tauri = false;
const storageStatusMock = vi.fn();

vi.mock('$lib/data/session.js', () => ({
  isTauri: () => tauri
}));
vi.mock('$lib/data/backends/worker-client.js', () => ({
  storageStatus: (...args) => storageStatusMock(...args)
}));

const {
  storageLockedElsewhere, checkStorageLock, retryStorageLock
} = await import('../src/lib/stores/pwaStorageLock.js');

beforeEach(() => {
  tauri = false;
  storageStatusMock.mockReset();
  storageLockedElsewhere.set(false);
});

describe('checkStorageLock()', () => {
  it('never checks, and never blocks, on Tauri', async () => {
    tauri = true;
    await checkStorageLock();
    expect(storageStatusMock).not.toHaveBeenCalled();
    expect(get(storageLockedElsewhere)).toBe(false);
  });

  it('stays unblocked when storage is ready', async () => {
    storageStatusMock.mockResolvedValue('ready');
    await checkStorageLock();
    expect(get(storageLockedElsewhere)).toBe(false);
  });

  it('blocks when another window holds storage', async () => {
    storageStatusMock.mockResolvedValue('locked-elsewhere');
    await checkStorageLock();
    expect(get(storageLockedElsewhere)).toBe(true);
  });

  it('does not use this gate for a different storage failure', async () => {
    // 'unavailable' (no OPFS support at all) is a distinct, unhandled case —
    // this gate is only for the second-window lock.
    storageStatusMock.mockResolvedValue('unavailable');
    await checkStorageLock();
    expect(get(storageLockedElsewhere)).toBe(false);
  });
});

describe('retryStorageLock()', () => {
  it('reloads the page — the only way to re-attempt the lock', () => {
    const reload = vi.fn();
    retryStorageLock({ location: { reload } });
    expect(reload).toHaveBeenCalledOnce();
  });
});
