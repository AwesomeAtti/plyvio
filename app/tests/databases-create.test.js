/**
 * DB‑04/DB‑05/DB‑03r — Settings → Databases → Add database: create new.
 * `working/wireframes/settings-databases-add.html`, Rev G, G1 20 Sep 2026.
 *
 * The PWA storage worker is run in-process here (`tests/helpers/
 * pwa-in-process.js`), in this file only, so every other Databases test keeps
 * seeing storage unavailable, as jsdom (no Worker) gives it. jsdom has no
 * `'__TAURI_INTERNALS__' in window`, so every Create here runs the PWA path
 * (`createDatabase()`'s `isTauri()` branch) — a genuine round trip through
 * `backends/pwa.js`'s `openLibraryDatabase()`, not a stub.
 */

import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import AppShell from '../src/lib/components/AppShell.svelte';
import { stripTabs, activeId, workspaceState, openSettings } from '../src/lib/stores/tabs.js';
import { locale } from '../src/lib/stores/i18n.js';
import {
  objects, selectSection, resetSettings, resetDatabases, addObject, findObject
} from '../src/lib/stores/settings.js';
import { resetPool } from './helpers/pwa-in-process.js';

vi.mock('../src/lib/data/backends/sqlite-worker-port.js', async () =>
  (await import('./helpers/pwa-in-process.js')).workerPortMock());


const tick = () => new Promise((r) => setTimeout(r, 0));

/**
 * Wait for `predicate()` to become truthy — `confirmCreate()`'s click handler
 * isn't awaited by `fireEvent.click`, and `createDatabase()`'s PWA path
 * chains several dynamic `import()`s and a real round trip to the storage worker, so a
 * fixed number of `tick()`s is not reliably enough. Polls rather than
 * guessing a delay.
 */
async function waitFor(predicate, { timeout = 2000, interval = 10 } = {}) {
  const start = Date.now();
  for (;;) {
    const value = predicate();
    if (value) return value;
    if (Date.now() - start > timeout) throw new Error('waitFor: timed out');
    await new Promise((r) => setTimeout(r, interval));
  }
}

const DBS = [
  { id: 'db-1', name: 'Master Games', status: 'indexed', version: '2.1', enabled: true },
  { id: 'db-2', name: 'Sample Games', status: 'indexed', version: '1.0', enabled: true,
    location: '/Users/x/Library/Application Support/Plyvio/Libraries/sample-games.db' }
];

beforeEach(() => {
  resetPool();
  stripTabs.set([]);
  activeId.set('library');
  workspaceState.set({ library: { scratch: '' } });
  locale.set('en');
  resetSettings();
  resetDatabases();
  objects.update((o) => ({ ...o, databases: DBS.map((d) => ({ ...d })) }));
});
afterEach(cleanup);

async function renderDatabases() {
  const r = render(AppShell);
  openSettings();
  selectSection('databases');
  await tick();
  return r;
}

function draftFields(container) {
  const exp = container.querySelector('#settings-content .exp');
  const [nameInput, filenameInput] = exp.querySelectorAll('input.efield');
  const createBtn = [...exp.querySelectorAll('.actions .b')].find((b) => b.textContent.trim() === 'Create');
  const cancelBtn = [...exp.querySelectorAll('.actions .b')].find((b) => b.textContent.trim() === 'Cancel');
  return { exp, nameInput, filenameInput, createBtn, cancelBtn };
}

describe('DB‑04 — Add opens a draft row', () => {
  it('shows Name and Filename fields, both prefilled, Filename derived from Name', async () => {
    const { container } = await renderDatabases();
    await fireEvent.click(container.querySelector('#settings-content .chead .add'));
    await tick();
    const { nameInput, filenameInput } = draftFields(container);
    expect(nameInput.value).toBe('New Database');
    expect(filenameInput.value).toBe('new-database.db');
  });

  it('shows the default Libraries directory (or "Stored in this browser") as Location, not editable', async () => {
    const { container } = await renderDatabases();
    await fireEvent.click(container.querySelector('#settings-content .chead .add'));
    await tick();
    const { exp } = draftFields(container);
    expect(exp.textContent).toContain('Location');
    // jsdom is never Tauri — the PWA wording applies.
    expect(exp.textContent).toContain('Stored in this browser');
  });

  it('Filename auto-follows Name until Filename is edited directly', async () => {
    const { container } = await renderDatabases();
    await fireEvent.click(container.querySelector('#settings-content .chead .add'));
    await tick();
    let { nameInput, filenameInput } = draftFields(container);

    await fireEvent.input(nameInput, { target: { value: 'Correspondence 2026' } });
    await tick();
    ({ nameInput, filenameInput } = draftFields(container));
    expect(filenameInput.value).toBe('correspondence-2026.db');

    // Detach: typing into Filename directly stops it following Name.
    await fireEvent.input(filenameInput, { target: { value: 'custom-name.db' } });
    await tick();
    await fireEvent.input(nameInput, { target: { value: 'Something Else Entirely' } });
    await tick();
    ({ nameInput, filenameInput } = draftFields(container));
    expect(filenameInput.value).toBe('custom-name.db');
  });
});

describe('DB‑05 — validation, one shared message area', () => {
  it('refuses a duplicate Name: red ring on Name, Create disabled, one message', async () => {
    const { container } = await renderDatabases();
    await fireEvent.click(container.querySelector('#settings-content .chead .add'));
    await tick();
    let { nameInput, createBtn } = draftFields(container);
    await fireEvent.input(nameInput, { target: { value: 'Sample Games' } });
    await tick();
    ({ nameInput, createBtn } = draftFields(container));
    expect(nameInput.className).toContain('err');
    expect(createBtn.disabled).toBe(true);
    const msg = container.querySelector('#settings-content .formmsg');
    expect(msg.textContent).toContain('Sample Games');
    expect(msg.textContent).toContain('already exists');
  });

  it('refuses a Name over 35 characters', async () => {
    const { container } = await renderDatabases();
    await fireEvent.click(container.querySelector('#settings-content .chead .add'));
    await tick();
    let { nameInput } = draftFields(container);
    await fireEvent.input(nameInput, { target: { value: 'Master Games Reference Collection 2026' } });
    await tick();
    const msg = container.querySelector('#settings-content .formmsg');
    expect(msg.textContent).toContain('35 characters');
    expect(container.querySelector('#settings-content .actions .b.pri').disabled).toBe(true);
  });

  it('refuses a Filename collision once Name is otherwise valid', async () => {
    const { container } = await renderDatabases();
    await fireEvent.click(container.querySelector('#settings-content .chead .add'));
    await tick();
    let { nameInput, filenameInput } = draftFields(container);
    await fireEvent.input(nameInput, { target: { value: 'New One' } });
    await tick();
    ({ nameInput, filenameInput } = draftFields(container));
    await fireEvent.input(filenameInput, { target: { value: 'sample-games.db' } });
    await tick();
    ({ filenameInput } = draftFields(container));
    expect(filenameInput.className).toContain('err');
    const msg = container.querySelector('#settings-content .formmsg');
    expect(msg.textContent).toContain('sample-games.db');
    expect(container.querySelector('#settings-content .actions .b.pri').disabled).toBe(true);
  });

  it('Create is enabled once both fields are valid', async () => {
    const { container } = await renderDatabases();
    await fireEvent.click(container.querySelector('#settings-content .chead .add'));
    await tick();
    expect(container.querySelector('#settings-content .formmsg')).toBeNull();
    expect(container.querySelector('#settings-content .actions .b.pri').disabled).toBe(false);
  });
});

describe('DB‑04 — Create', () => {
  it('creates the database, closes the draft, and the row becomes real (Location only, no Version, no Filename)', async () => {
    const { container } = await renderDatabases();
    await fireEvent.click(container.querySelector('#settings-content .chead .add'));
    await tick();
    let { nameInput, createBtn } = draftFields(container);
    await fireEvent.input(nameInput, { target: { value: 'Correspondence 2026' } });
    await tick();
    ({ createBtn } = draftFields(container));
    await fireEvent.click(createBtn);
    const created = await waitFor(() => get(objects).databases.find((d) => d.name === 'Correspondence 2026'));
    await tick();

    // Draft expander is gone — Create collapses the row.
    expect(container.querySelector('#settings-content .exp')).toBeNull();

    expect(created).toBeTruthy();
    expect(created.draft).toBeUndefined();
    expect(created.enabled).toBe(true);
    expect(created.version).toBeTruthy();

    // Re-expand: DB‑03r (Rev H) shows Name, Location — no Version, no Filename.
    const row = [...container.querySelectorAll('#settings-content .box .r')]
      .find((r) => r.querySelector('.nm').textContent.trim() === 'Correspondence 2026');
    await fireEvent.click(row.querySelector('.cv'));
    await tick();
    const exp = container.querySelector('#settings-content .exp');
    expect(exp.textContent).not.toContain('Version');
    expect(exp.textContent).toContain('Location');
    expect(exp.textContent).not.toContain('Filename');
    expect(exp.querySelectorAll('input.efield').length).toBe(0);
  });

  it('actually writes to the PWA store — a fresh openLibraryDatabase for the new id reads it back', async () => {
    const { container } = await renderDatabases();
    await fireEvent.click(container.querySelector('#settings-content .chead .add'));
    await tick();
    let { nameInput, createBtn } = draftFields(container);
    await fireEvent.input(nameInput, { target: { value: 'Written To Disk' } });
    await tick();
    ({ createBtn } = draftFields(container));
    await fireEvent.click(createBtn);
    const created = await waitFor(() => get(objects).databases.find((d) => d.name === 'Written To Disk'));

    expect(created).toBeTruthy();
    expect(created.location).toBeNull(); // PWA — no filesystem path

    const { openLibraryDatabase } = await import('../src/lib/data/backends/pwa.js');
    const { identify, GAME_TABLES } = await import('../src/lib/data/identify.js');
    const conn = await openLibraryDatabase(created.id);
    const identity = await identify(conn);
    expect(identity.kind).toBe('games');
    expect(GAME_TABLES.every((t) => identity.tables.includes(t))).toBe(true);
    expect(await conn.value('select count(*) from games')).toBe(0);
  });

  it("registers the new PWA database in config.db's libraries table (ADR 0004)", async () => {
    const { container } = await renderDatabases();
    await fireEvent.click(container.querySelector('#settings-content .chead .add'));
    await tick();
    let { nameInput, createBtn } = draftFields(container);
    await fireEvent.input(nameInput, { target: { value: 'Registered Library' } });
    await tick();
    ({ createBtn } = draftFields(container));
    await fireEvent.click(createBtn);
    const created = await waitFor(() => get(objects).databases.find((d) => d.name === 'Registered Library'));

    // The config-assigned id, not the nextId('db') fallback — config.db has
    // a real connection in this test environment (the in-process PWA
    // backend), so
    // createDatabase() prefers it, same as the Tauri branch always has.
    expect(typeof created.id).toBe('number');

    const { configConnection } = await import('../src/lib/data/session.js');
    const { readLibraries } = await import('../src/lib/data/config.js');
    const libraries = await readLibraries(await configConnection());
    const registered = libraries.find((l) => l.id === created.id);
    expect(registered).toBeTruthy();
    expect(registered.name).toBe('Registered Library');
    expect(registered.path).toBeTruthy(); // NOT NULL sentinel — not a real filesystem path on PWA
  });
});

describe('DB‑04 — Cancel', () => {
  it('discards the draft with nothing written', async () => {
    const { container } = await renderDatabases();
    const before = get(objects).databases.length;
    await fireEvent.click(container.querySelector('#settings-content .chead .add'));
    await tick();
    expect(get(objects).databases.length).toBe(before + 1);

    let { nameInput, cancelBtn } = draftFields(container);
    await fireEvent.input(nameInput, { target: { value: 'Never Created' } });
    await tick();
    ({ cancelBtn } = draftFields(container));
    await fireEvent.click(cancelBtn);
    await tick();

    expect(get(objects).databases.length).toBe(before);
    expect(get(objects).databases.some((d) => d.name === 'Never Created')).toBe(false);
    expect(container.querySelector('#settings-content .exp')).toBeNull();
  });
});

describe('loadLibraries() — PWA merge (a real Library survives a reload)', () => {
  it('keeps db-1/db-2 and adds the real row back in, with connectionForLibrary() able to open it', async () => {
    const { createDatabase, loadLibraries } = await import('../src/lib/stores/settings.js');
    const { connectionForLibrary } = await import('../src/lib/stores/library.js');
    const id = addObject('databases');
    await createDatabase(id, { name: 'Survives Reload', filename: 'survives-reload.db' });
    const created = get(objects).databases.find((d) => d.name === 'Survives Reload');
    expect(created).toBeTruthy();

    // Simulate a reload: drop it from the in-memory store the way a fresh
    // page load would start (only the two seeded rows), then let
    // loadLibraries() rebuild the real half from config.db, same as
    // AppShell's own mount effect does.
    objects.update((all) => ({
      ...all,
      databases: all.databases.filter((db) => db.id === 'db-1' || db.id === 'db-2')
    }));
    await loadLibraries();

    const after = get(objects).databases;
    expect(after.some((d) => d.id === 'db-1' && d.name === 'Master Games')).toBe(true);
    expect(after.some((d) => d.id === 'db-2' && d.name === 'Sample Games')).toBe(true);
    const reloaded = after.find((d) => d.id === created.id);
    expect(reloaded).toBeTruthy();
    expect(reloaded.name).toBe('Survives Reload');
    // Not the 'indexeddb' sentinel — null, so it reads "Stored in this
    // browser" and connectionForLibrary()'s `'location' in db` gate opens it.
    expect(reloaded.location).toBeNull();

    const conn = await connectionForLibrary(created.id);
    expect(conn).toBeTruthy();
    expect(await conn.value('select count(*) from games')).toBe(0);
    await conn.close();
  });

  it('does not wipe an in-progress draft row', async () => {
    const { loadLibraries } = await import('../src/lib/stores/settings.js');
    const draftId = addObject('databases');
    await loadLibraries();
    const draft = findObject('databases', draftId);
    expect(draft).toBeTruthy();
    expect(draft.draft).toBe(true);
  });
});

describe('createDatabase() — the store function directly', () => {
  it('returns the validation error and writes nothing on failure', async () => {
    const { createDatabase } = await import('../src/lib/stores/settings.js');
    const id = addObject('databases');
    const before = get(objects).databases.length;
    const error = await createDatabase(id, { name: 'Sample Games', filename: 'sample-games-2.db' });
    expect(error).toMatchObject({ field: 'name' });
    expect(get(objects).databases.length).toBe(before);
    expect(findObject('databases', id).draft).toBe(true);
  });

  it('does nothing for an id that is not a draft', async () => {
    const { createDatabase } = await import('../src/lib/stores/settings.js');
    const before = JSON.stringify(get(objects).databases);
    const error = await createDatabase('db-1', { name: 'x', filename: 'x.db' });
    expect(error).toBeNull();
    expect(JSON.stringify(get(objects).databases)).toBe(before);
  });
});
