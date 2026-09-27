/**
 * A `time_control` value as the application draws it. database-schema.md §2.2
 * stores the PGN tag's own text (§9.6.1 of the standard), never a number; this
 * is the one place that text is turned into something a reader recognises.
 *
 * ONE COMPACT FORM, minutes and increment: `180` → `3+0`, `60+1` → `1+1`,
 * `30` → `½+0`, the notation players already use for a speed. Daily games
 * (`1/86400`, one move per period) read as days per move: `1d`. The Content
 * Table's Time column is sized for six characters of it (§4.4.2), which covers
 * every sudden-death and increment form up to `999+99`.
 *
 * Any other form the standard allows — multi-period (`40/7200:3600`),
 * sandclock (`*60`) — is returned verbatim rather than guessed at. It is rare
 * in the sources Plyvio imports from, and a verbatim value is still correct,
 * only longer.
 */

/* §9.6.1's placeholders: `?` is unknown, `-` is no time control at all. */
const ABSENT = new Set(['', '?', '-']);

const SUDDEN_DEATH = /^(\d+)(?:\+(\d+))?$/;
const PER_MOVE = /^1\/(\d+)$/;
const DAY = 86400;

/* Base times under a whole minute that are common online: 15, 30, 45 s. */
const QUARTERS = { 15: '¼', 30: '½', 45: '¾' };

/** Seconds → minutes as drawn: `180` → `3`, `30` → `½`, `90` → `1½`, `20` → `20s`. */
function minutes(seconds) {
  const whole = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (rest === 0) return String(whole);
  if (QUARTERS[rest]) return `${whole || ''}${QUARTERS[rest]}`;
  return `${seconds}s`;
}

/**
 * @param {string|null|undefined} timeControl a stored `time_control`, verbatim.
 * @returns {string|null} null when the game records no time control.
 */
export function formatTimeControl(timeControl) {
  const v = (timeControl ?? '').trim();
  if (ABSENT.has(v)) return null;

  const sd = SUDDEN_DEATH.exec(v);
  if (sd) return `${minutes(Number(sd[1]))}+${sd[2] ?? 0}`;

  const pm = PER_MOVE.exec(v);
  if (pm && Number(pm[1]) % DAY === 0) return `${Number(pm[1]) / DAY}d`;

  return v;
}

/** database-schema.md §2.3's `time_class` values — anything else is not drawn. */
export const TIME_CLASSES = ['bullet', 'blitz', 'rapid', 'classical', 'daily'];
