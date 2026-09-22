/**
 * The storage worker's protocol: `sqlite-host.js`'s `createHost()`/`serve()`
 * reached through the real `worker-client.js`, in-process
 * (`tests/helpers/pwa-in-process.js`). What these pin down is what a real
 * Worker boundary adds on top of a plain `Connection`: replies matched to
 * requests, errors that survive the trip, one shared database per file, and
 * transactions that fail as a whole.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { call, storageStatus } from '../src/lib/data/backends/worker-client.js';
import { createHost, serve } from '../src/lib/data/backends/sqlite-host.js';
import { DataError } from '../src/lib/data/connection.js';
import { resetPool, poolFileNames, portPair } from './helpers/pwa-in-process.js';

vi.mock('../src/lib/data/backends/sqlite-worker-port.js', async () =>
  (await import('./helpers/pwa-in-process.js')).workerPortMock());

let n = 0;
const freshName = () => `/t-${++n}.db`;
const TABLE = [{ sql: 'create table t (id integer primary key, v text)' }];

beforeEach(() => resetPool());

describe('open', () => {
  it('reports a new file as fresh, and runs init only then', async () => {
    const name = freshName();
    const a = await call('open', { name, init: TABLE });
    expect(a.fresh).toBe(true);
    await call('run', { handle: a.handle, sql: 'insert into t (v) values (?)', params: ['x'] });
    await call('close', { handle: a.handle });

    const b = await call('open', { name, init: TABLE });
    expect(b.fresh).toBe(false);
    expect(await call('value', { handle: b.handle, sql: 'select count(*) from t' })).toBe(1);
  });

  it('two opens of the same new file, sent together, both see the initialised tables', async () => {
    const name = freshName();
    const [a, b] = await Promise.all([
      call('open', { name, init: TABLE }),
      call('open', { name, init: TABLE })
    ]);
    expect([a.fresh, b.fresh]).toEqual([true, false]);
    expect(await call('value', { handle: b.handle, sql: 'select count(*) from t' })).toBe(0);
  });

  it('a failing init leaves no file behind', async () => {
    const name = freshName();
    await expect(call('open', { name, init: [...TABLE, { sql: 'not sql' }] })).rejects.toThrow(/syntax error/);
    expect(poolFileNames()).not.toContain(name);
  });
});

describe('one database per file, shared between handles', () => {
  it('a write through one handle is visible through the other', async () => {
    const name = freshName();
    const a = await call('open', { name, init: TABLE });
    const b = await call('open', { name, init: TABLE });
    expect(a.handle).not.toBe(b.handle);
    await call('run', { handle: a.handle, sql: "insert into t (v) values ('shared')" });
    expect(await call('value', { handle: b.handle, sql: 'select v from t' })).toBe('shared');
  });

  it('closing one handle leaves the other working; a closed handle is refused', async () => {
    const name = freshName();
    const a = await call('open', { name, init: TABLE });
    const b = await call('open', { name, init: TABLE });
    await call('close', { handle: a.handle });
    expect(await call('value', { handle: b.handle, sql: 'select count(*) from t' })).toBe(0);
    await expect(call('all', { handle: a.handle, sql: 'select 1' })).rejects.toBeInstanceOf(DataError);
  });
});

describe('the Connection operations', () => {
  it('all / get / value / run answer the way connection.js specifies', async () => {
    const { handle } = await call('open', { name: freshName(), init: TABLE });
    await call('run', { handle, sql: 'insert into t (v) values (?), (?)', params: ['a', 'b'] });
    expect(await call('all', { handle, sql: 'select v from t order by id' })).toEqual([{ v: 'a' }, { v: 'b' }]);
    expect(await call('get', { handle, sql: 'select v from t where v = ?', params: ['b'] })).toEqual({ v: 'b' });
    expect(await call('get', { handle, sql: "select v from t where v = 'z'" })).toBeNull();
    expect(await call('value', { handle, sql: "select v from t where v = 'z'" })).toBeNull();
  });

  it('replies are matched to their own requests when many are in flight', async () => {
    const { handle } = await call('open', { name: freshName(), init: TABLE });
    const answers = await Promise.all(
      Array.from({ length: 25 }, (_, i) => call('value', { handle, sql: 'select ?', params: [i] }))
    );
    expect(answers).toEqual(Array.from({ length: 25 }, (_, i) => i));
  });

  it("SQLite's own error message survives the trip", async () => {
    const { handle } = await call('open', { name: freshName(), init: TABLE });
    await expect(call('all', { handle, sql: 'select * from missing' })).rejects.toThrow(/no such table: missing/);
  });

  it('an unknown operation is a DataError', async () => {
    await expect(call('drop everything')).rejects.toBeInstanceOf(DataError);
  });
});

describe('batch', () => {
  it('commits every statement together', async () => {
    const { handle } = await call('open', { name: freshName(), init: TABLE });
    await call('batch', { handle, statements: [
      { sql: 'insert into t (v) values (?)', params: ['1'] },
      { sql: 'insert into t (v) values (?)', params: ['2'] }
    ] });
    expect(await call('value', { handle, sql: 'select count(*) from t' })).toBe(2);
  });

  it('rolls back every statement when one fails', async () => {
    const { handle } = await call('open', { name: freshName(), init: TABLE });
    await expect(call('batch', { handle, statements: [
      { sql: 'insert into t (v) values (?)', params: ['kept?'] },
      { sql: 'insert into missing values (1)' }
    ] })).rejects.toThrow(/no such table/);
    expect(await call('value', { handle, sql: 'select count(*) from t' })).toBe(0);
  });
});

describe('status', () => {
  it("is 'ready' when the host started", async () => {
    expect(await storageStatus()).toBe('ready');
  });

  it('reports why storage failed to start, and every operation fails with it', async () => {
    const [client, worker] = portPair();
    const startup = Promise.reject(Object.assign(new Error('held by another tab'), { status: 'locked-elsewhere' }));
    serve(worker, startup);

    const ask = (op, args = {}) => new Promise((resolve) => {
      client.addEventListener('message', (e) => { if (e.data.id === op) resolve(e.data); });
      client.postMessage({ id: op, op, args });
    });
    expect((await ask('status')).result).toBe('locked-elsewhere');
    const reply = await ask('open');
    expect(reply.ok).toBe(false);
    expect(reply.error.message).toBe('held by another tab');
  });

  it('a host with no store behind it still refuses unknown handles cleanly', () => {
    const host = createHost({ sqlite3: null, store: null });
    expect(() => host.handle('run', { handle: 99, sql: 'select 1' })).toThrow(DataError);
  });
});
