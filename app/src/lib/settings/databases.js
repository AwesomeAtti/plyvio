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

/** The Installed row's detail line: what one database has that another does not. */
export function installedDetail(db) {
  return [
    `${formatCount(db.games)} games`,
    `${formatCount(db.players)} players`,
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
