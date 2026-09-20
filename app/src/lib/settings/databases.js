/**
 * Available databases — §3.4.8.
 *
 * The curated list offered for download. Distributed databases are Plyvio
 * database files that arrive ready to use: there is no indexing step, so an
 * entry moves from Available to Installed the moment its transfer completes.
 *
 * Counts are the published figures for each database. Sizes are the download
 * size, shown because at these magnitudes size is a decision the user makes
 * before starting, not a detail of the transfer.
 *
 * Whether this catalogue ships with the application or is fetched is not
 * settled; it is a constant here so the prototype works offline either way
 * (§1.1).
 */

export const AVAILABLE_DATABASES = [
  { id: 'avail-lumbra',    name: "Lumbra's Gigabase",            games: 9_570_000, players: 526_000, bytes: 4_100_000_000, version: '1.4' },
  { id: 'avail-caissa',    name: 'Caissabase 2024',              games: 5_400_000, players: 321_000, bytes: 2_300_000_000, version: '2024' },
  { id: 'avail-ajedrez',   name: 'Ajedrez Data — OTB',           games: 4_270_000, players: 144_000, bytes: 1_800_000_000, version: '1.0' },
  { id: 'avail-million',   name: 'MillionBase',                  games: 3_450_000, players: 284_000, bytes: 1_500_000_000, version: '3.45' },
  { id: 'avail-ajedrez-c', name: 'Ajedrez Data — Correspondence', games: 1_520_000, players: 40_000,  bytes: 600_000_000,   version: '1.0' }
];

/**
 * Compact counts. 9,570,000 in a 44px row's detail line is noise; 9.57M is the
 * figure someone actually compares against another database.
 */
export function formatCount(n) {
  if (n == null) return '';
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m >= 10 ? m.toFixed(1) : m.toFixed(2)}M`.replace(/\.?0+M$/, 'M');
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/**
 * Sizes span four orders of magnitude here — a personal database of 812 games
 * against a 4GB gigabase — so the unit is chosen per value rather than fixed.
 */
export function formatBytes(b) {
  if (b == null) return '';
  if (b >= 1_000_000_000) return `${(b / 1_000_000_000).toFixed(1)} GB`;
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)} MB`;
  if (b >= 1_000) return `${Math.round(b / 1_000)} kB`;
  return `${b} B`;
}

/**
 * The Installed row's detail line: what one database has that another does
 * not. Corrected 20 Sep 2026 — dropped the players figure (games · players ·
 * size -> games · size). `players` stays on the data model; it's just no
 * longer part of what this line renders.
 */
export function installedDetail(db) {
  return [
    `${formatCount(db.games)} games`,
    formatBytes(db.bytes)
  ].filter(Boolean).join(' · ');
}

/** The Available row's detail line — the same, the size being the download. */
export function availableDetail(db) {
  return installedDetail(db);
}

/** Mid-download, the line reports the transfer instead of the catalogue entry. */
export function downloadingDetail(db, pct) {
  const done = Math.round((db.bytes * pct) / 100);
  return `Downloading · ${formatBytes(done)} of ${formatBytes(db.bytes)}`;
}

/* ---------------- Add database: create new — DB‑04/DB‑05 ------------- */

/**
 * `working/wireframes/settings-databases-add.html` (Rev G, G1 20 Sep 2026).
 *
 * Pure, platform-agnostic validation for the Add-database draft: everything
 * here takes plain values and lists — never a store, a connection, or the
 * filesystem — so it can be unit-tested on its own and reused unchanged by
 * both the Tauri and PWA create flows in `stores/settings.js`, which supply
 * the `existingNames`/`existingFilenames` lists from whatever each platform
 * considers "existing" (registered Libraries only in the PWA; registered
 * Libraries plus a directory listing on disk for Tauri, per DB‑05's note).
 */

/** DB‑05: "Names are limited to 35 characters — this one is 39." */
export const MAX_NAME_LENGTH = 35;

/**
 * DB‑05: "confirmed at 200 bytes including .db" — a filesystem limit, so
 * counted in UTF‑8 bytes, not JS string length (`.length` counts UTF‑16
 * code units, which undercounts anything outside the Basic Multilingual
 * Plane and doesn't match what the filesystem actually enforces).
 */
export const MAX_FILENAME_BYTES = 200;

const FILENAME_SUFFIX = '.db';

/** UTF‑8 byte length of `str` — what a filesystem's own byte-based limit counts. */
export function utf8ByteLength(str) {
  return new TextEncoder().encode(String(str ?? '')).length;
}

/**
 * `str`, cut to at most `maxBytes` UTF‑8 bytes without splitting a multi-byte
 * character in half. Backs off byte-by-byte from a hard slice until the tail
 * decodes cleanly, which is the well-known way to truncate UTF‑8 safely
 * without a codepoint-boundary table.
 */
function truncateUtf8Bytes(str, maxBytes) {
  const full = new TextEncoder().encode(String(str ?? ''));
  if (full.length <= maxBytes) return String(str ?? '');
  let bytes = full.slice(0, maxBytes);
  while (bytes.length > 0) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      bytes = bytes.slice(0, -1);
    }
  }
  return '';
}

/** The last path segment — `/a/b/my-games.db` or `a\\b\\my-games.db` → `my-games.db`. */
export function basename(path) {
  if (!path) return '';
  const parts = String(path).split(/[\\/]/);
  return parts[parts.length - 1] ?? '';
}

/**
 * Name → filename base. Lowercase, diacritics stripped, anything that isn't
 * `a`–`z`/`0`–`9` collapsed to a single `-`, leading/trailing `-` trimmed.
 * Never empty — a name that slugifies to nothing (all punctuation, or empty)
 * falls back to `database` rather than producing a bare `.db`.
 */
export function slugify(name) {
  const slug = String(name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'database';
}

/**
 * DB‑04: Filename auto-follows a slugified Name until the user types into
 * Filename directly. The full slug is kept (DB‑05's note: Rev G's field-wrap
 * fix means an over-length value clips visually rather than being cut for
 * storage) and only trimmed if it would actually break the 200-byte limit —
 * which the 35-character Name cap makes rare outside names with many
 * multi-byte characters.
 */
export function deriveFilename(name) {
  const budget = MAX_FILENAME_BYTES - utf8ByteLength(FILENAME_SUFFIX);
  return `${truncateUtf8Bytes(slugify(name), budget)}${FILENAME_SUFFIX}`;
}

/**
 * Name validation: the 35-character limit, then a case-insensitive duplicate
 * check against `existingNames` (matching `libraries.name`'s own uniqueness
 * expectation and Tags' `COLLATE NOCASE`, §database-schema.md). Length before
 * duplicate — a name over-limit can't actually match an existing (already
 * valid) name, so the order rarely matters, but a structural problem reads
 * first when it does.
 *
 * @returns {{field: 'name', key: string, params: object}|null}
 */
export function validateDatabaseName(name, existingNames = []) {
  const clean = String(name ?? '').trim();
  if (clean.length > MAX_NAME_LENGTH) {
    return {
      field: 'name',
      key: 'settings.databaseNameTooLong',
      params: { max: MAX_NAME_LENGTH, length: clean.length }
    };
  }
  const lower = clean.toLowerCase();
  if (existingNames.some((n) => String(n ?? '').trim().toLowerCase() === lower)) {
    return { field: 'name', key: 'settings.databaseNameDuplicate', params: { name: clean } };
  }
  return null;
}

/**
 * Filename validation: the 200-UTF‑8-byte limit, then an exact collision
 * check against `existingFilenames` — checked on what would actually land on
 * disk, not the display Name (DB‑05's note: two different Names could still
 * slugify to the same filename).
 *
 * @returns {{field: 'filename', key: string, params: object}|null}
 */
export function validateDatabaseFilename(filename, existingFilenames = []) {
  const clean = String(filename ?? '').trim();
  if (utf8ByteLength(clean) > MAX_FILENAME_BYTES) {
    return { field: 'filename', key: 'settings.databaseFilenameTooLong', params: { max: MAX_FILENAME_BYTES } };
  }
  if (existingFilenames.some((f) => String(f ?? '').trim() === clean)) {
    return { field: 'filename', key: 'settings.databaseFilenameDuplicate', params: { filename: clean } };
  }
  return null;
}

/**
 * DB‑05: the one shared check behind the draft row's single message area.
 * Name is checked before Filename — "fixing it reveals the next one rather
 * than showing both at once" — so a Filename problem is invisible for as
 * long as Name still has one of its own.
 *
 * @returns {{field: 'name'|'filename', key: string, params: object}|null}
 */
export function validateDraftDatabase({ name, filename, existingNames = [], existingFilenames = [] }) {
  return validateDatabaseName(name, existingNames) ?? validateDatabaseFilename(filename, existingFilenames);
}
