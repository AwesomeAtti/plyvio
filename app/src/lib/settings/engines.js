/**
 * Available engines — §3.4.8.2.
 *
 * The curated list offered for download, following §3.4.8.1's shape for
 * Databases. An engine is a binary: it downloads and it is ready, so
 * acquisition is one phase here too.
 *
 * SAMPLE DATA. The engine names are real; the versions and download sizes are
 * representative figures for the prototype, not a published catalogue. They
 * are stated in one place so replacing them is one edit.
 */

export const AVAILABLE_ENGINES = [
  { id: 'avail-berserk',  name: 'Berserk',           version: '13',    bytes: 42_000_000, protocol: 'UCI' },
  { id: 'avail-ethereal', name: 'Ethereal',          version: '14.25', bytes: 38_000_000, protocol: 'UCI' },
  { id: 'avail-koivisto', name: 'Koivisto',          version: '9',     bytes: 35_000_000, protocol: 'UCI' },
  { id: 'avail-lc0',      name: 'Leela Chess Zero',  version: '0.31',  bytes: 71_000_000, protocol: 'UCI' },
  { id: 'avail-rubi',     name: 'Rubichess',         version: '2.4',   bytes: 29_000_000, protocol: 'UCI' }
];

/**
 * The real, downloadable WASM catalogue — engine Stage 2
 * (`engine-stage2-plan.md`, "The manifest's one engine"). One entry today;
 * a future entry is another row in this same array (kind/platform decide
 * which platforms offer it), never a restructuring — see the plan's
 * "Naming and organizing multiple engines and platforms."
 *
 * `bytes` is the zip's own size (what the Available row's download line
 * shows); `threadsMax` is copied onto the `engines` row at install time and
 * bounds the Threads control in place of `THREAD_OPTIONS` (Q4).
 * `assetUrl`/`sha256` are the confirmed, live values recorded in the plan.
 */
export const WASM_ENGINES = [
  {
    id: 'stockfish-19-lite',
    name: 'Stockfish',
    version: '19 lite',
    kind: 'wasm',
    platform: 'wasm',
    protocol: 'UCI',
    assetUrl: 'https://github.com/AwesomeAtti/plyvio/releases/download/engines-v1/stockfish-19-lite-wasm-single.zip',
    sha256: 'c2d2c1068116c9b75fb61a5f481a6cb1c3a49bb3c60b05bbc041d489d8afa7be',
    bytes: 1_209_947,
    threadsMax: 1
  }
];

/** Defaults a downloaded engine arrives with. Both are tunable afterwards. */
export const DEFAULT_THREADS = 1;
export const DEFAULT_HASH = 256;

/** Megabytes are stored; `MB` is added when they are drawn. */
export const formatHash = (mb) => (mb === null || mb === undefined ? '—' : `${mb} MB`);

export const THREAD_OPTIONS = [1, 2, 4, 8, 16];
export const HASH_OPTIONS = [64, 128, 256, 512, 1024];

export function formatBytes(b) {
  if (b == null) return '';
  if (b >= 1_000_000_000) return `${(b / 1_000_000_000).toFixed(1)} GB`;
  if (b >= 1_000_000) return `${Math.round(b / 1_000_000)} MB`;
  if (b >= 1_000) return `${Math.round(b / 1_000)} kB`;
  return `${b} B`;
}

/**
 * The Installed row's detail line — what the engine is set to run as, which is
 * the part that differs between one installed engine and another.
 */
export function installedDetail(e) {
  return [
    e.protocol ?? 'UCI',
    `${e.threads} ${Number(e.threads) === 1 ? 'thread' : 'threads'}`,
    formatHash(e.hashMb)
  ].filter(Boolean).join(' · ');
}

/** The Available row's detail line — the protocol and what it costs to fetch. */
export function availableDetail(e) {
  return `${e.protocol ?? 'UCI'} · ${formatBytes(e.bytes)} download`;
}

export function downloadingDetail(e, pct) {
  const done = Math.round((e.bytes * pct) / 100);
  return `Downloading · ${formatBytes(done)} of ${formatBytes(e.bytes)}`;
}
