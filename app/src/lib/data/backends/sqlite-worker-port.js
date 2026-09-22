/**
 * Starts the storage worker. Its own module so the tests can replace it
 * (`vi.mock`) with an in-process port onto the same host code
 * (`tests/helpers/pwa-in-process.js`); jsdom has no Worker and no OPFS.
 *
 * The `new Worker(new URL(...), { type: 'module' })` expression must stay
 * written out in one piece: it's the pattern Vite recognises to bundle
 * `sqlite-worker.js` as a separate worker chunk.
 *
 * @returns {Worker}
 */
export const spawnSqliteWorker = () => {
  if (typeof Worker === 'undefined') throw new Error('Web Workers are unavailable here');
  return new Worker(new URL('./sqlite-worker.js', import.meta.url), { type: 'module' });
};
