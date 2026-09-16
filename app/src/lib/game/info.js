/**
 * Game Info — the card's values, §5.6.5.
 *
 * Pure functions, no DOM and no stores, for the same reason layout.js is: the
 * date and result forms were decided in the wireframe round and are the kind of
 * thing a later "tidy-up" silently changes, so they are asserted in tests rather
 * than trusted to a template.
 *
 * Nothing here invents data. Every value is a column the schema already stores
 * (§1); what this file decides is how an ABSENT one reads, which PGN writes as
 * `?` or `*` and the card must never show verbatim.
 */
import { sectionHeight } from './layout.js';

/* PGN's own placeholders. `?` fills an unknown tag; `*` is a result that has
   not been decided — an adjourned or ongoing game, not a missing value. */
const UNKNOWN_RE = /^[?\s]*$/;

/**
 * The result, in its PLAIN PGN FORM — `1-0`, `0-1`, `1/2-1/2`, no spaces.
 *
 * Deliberately NOT §5.4.1's `½-½` substitution, which is used elsewhere in the
 * application: this card is a reading of the game's record, and the record says
 * `1/2-1/2`. Decided in the G1 round (§6 row 6), along with rejecting the
 * spaced form `1 - 0` considered briefly.
 *
 * Returns null for `*`, which the card draws as a dimmed absence rather than as
 * a fourth data point.
 */
export function resultText(result) {
  const v = (result ?? '').trim();
  if (!v || v === '*' || UNKNOWN_RE.test(v)) return null;
  return v;
}

/**
 * Month abbreviations for the date form below.
 *
 * i18n keys rather than literals so `août` is available to French, while the
 * ORDER of the fields stays fixed — see formatGameDate.
 */
export const MONTH_KEYS = [
  'month.jan', 'month.feb', 'month.mar', 'month.apr', 'month.may', 'month.jun',
  'month.jul', 'month.aug', 'month.sep', 'month.oct', 'month.nov', 'month.dec'
];

/**
 * `2026.08.30` → `{ day: 30, monthIndex: 7, year: 2026 }`, or as much of it as
 * the value actually carries.
 *
 * A FIXED FORM, NOT A LOCALE-DEPENDENT ONE (§6 row 7). Intl.DateTimeFormat
 * would reorder the fields per locale — `Aug 30, 2026` in en-US — and the
 * decision was one form everywhere. The month WORD comes from i18n; the order
 * does not.
 *
 * PGN allows a partially unknown date (`2026.??.??`). It degrades to whatever
 * part is known rather than falling all the way to unknown: a game whose year
 * is recorded knows more than one whose date is absent entirely.
 */
export function parseGameDate(date) {
  const v = (date ?? '').trim();
  if (!v) return null;
  const [y, m, d] = v.split('.');
  const year = /^\d{4}$/.test(y) ? Number(y) : null;
  if (year === null) return null;
  const monthIndex = /^\d{1,2}$/.test(m) && +m >= 1 && +m <= 12 ? Number(m) - 1 : null;
  const day = monthIndex !== null && /^\d{1,2}$/.test(d) && +d >= 1 && +d <= 31 ? Number(d) : null;
  return { year, monthIndex, day };
}

/**
 * The date as the card prints it: `30 Aug 2026`, `Aug 2026`, or `2026`.
 *
 * `month` is the caller's lookup — pass a function taking a MONTH_KEYS entry —
 * so this file stays free of the i18n store.
 */
export function formatGameDate(date, month = (k) => k) {
  const p = parseGameDate(date);
  if (!p) return null;
  if (p.monthIndex === null) return String(p.year);
  const mon = month(MONTH_KEYS[p.monthIndex]);
  if (p.day === null) return `${mon} ${p.year}`;
  return `${p.day} ${mon} ${p.year}`;
}

/** A PGN tag value that is present and not a `?` placeholder. */
export function known(value) {
  const v = (value ?? '').trim();
  return v && !UNKNOWN_RE.test(v) ? v : null;
}

/** A rating is drawn only where it is a number. `0` is not a rating. */
export function ratingText(elo) {
  const n = Number(elo);
  return Number.isFinite(n) && n > 0 ? String(n) : null;
}

/**
 * THE CARD HAS EXACTLY TWO HEIGHTS — three rows, or four with the chip rail.
 *
 * Not a range. The rail scrolls sideways rather than wrapping, so a fourth tag
 * costs nothing and no height between the two is reachable. This is why the
 * Section declares a floor of 3 rows and a ceiling of 4 rather than "sized to
 * content" in the open sense.
 */
export function infoRows(hasChips) {
  return hasChips ? 4 : 3;
}

export function infoContentHeight(hasChips) {
  return sectionHeight(infoRows(hasChips));
}
