/**
 * Subscriptions — SU‑A, accepted 4 Sep. Not yet specified.
 *
 * The row pattern of §3.4.8.1 and §3.4.8.2, with ONE boxed group. There is no
 * Installed / Available split because there is no catalogue: a subscription
 * names a feed on one of two sources, and nothing is ever fetched from a list.
 *
 * TERMINOLOGY. Avoid "account". It happens to be true of chess.com and
 * lichess, but the thing a subscription points at is a FEED — a future source
 * might identify one by URL, by event, or by something else entirely. "Source"
 * is the provider; "feed" is what on it. Pending confirmation.
 */

/** §3.2.3.3 — exactly two sources, each with its own brand mark. */
export const SOURCES = {
  chesscom: { id: 'chesscom', label: 'Chess.com' },
  lichess:  { id: 'lichess',  label: 'Lichess' }
};

export const INTERVALS = ['Hourly', 'Daily', 'Weekly', 'Manual'];

/**
 * The trailing status slot, ranked exactly as §3.2.3.3 ranks it in the Library
 * Sidebar — error ▸ syncing ▸ new games ▸ nothing. One subscription must not
 * read one way in Settings and another way in the Library.
 */
export function statusOf(sub) {
  if (sub.state === 'error')   return { kind: 'error',   key: 'sub.error' };
  if (sub.state === 'syncing') return { kind: 'syncing', key: 'sub.syncing' };
  if (sub.newGames > 0)        return { kind: 'new',     key: 'sub.newGames', n: sub.newGames };
  return null;
}

/** interval · last synced. The two facts that differ between subscriptions. */
export function detailOf(sub, t) {
  const last = sub.lastSynced ? t('sub.lastSynced', { when: sub.lastSynced }) : t('sub.never');
  return `${sub.interval} · ${last}`;
}
