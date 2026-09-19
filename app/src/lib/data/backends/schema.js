/**
 * DDL for a fresh database — what `pwa.js` runs the first time it opens with no
 * IndexedDB snapshot to deserialize yet.
 *
 * Ported from `samples/build_samples.py`'s `GAME_DB_DDL`/`CONFIG_DB_DDL`, which is the
 * schema's other implementation (Python, for building the desktop sample `.db` files).
 * Keep the two in step by hand — there's no single source both languages generate from.
 *
 * `GAME_DB_DDL` omits nothing from `database-schema.md` §1–§4 and §7 that the
 * application's repository layer (`data/games.js`) reads or writes. It leaves out §6's
 * `positions` table (derived data, no read/write path in `data/games.js` yet — see
 * `readPositionStats`'s own comment) and does not need one for a fresh database to be
 * valid; §6 says plainly a game database without one still is.
 *
 * `CONFIG_DB_DDL` covers `preferences`, `ui_state`, `subscriptions`, plus `libraries`
 * and `engines` — the last two exist here only so `subscriptions.library_id`'s foreign
 * key resolves and so a query against either table (`identify()`'s `CONFIG_TABLES`
 * check, `explorerConnection`'s `readLibraries` call) finds a real, empty table rather
 * than failing. Deliberately NOT wired to real reads/writes from the PWA yet — see
 * `session.js`'s `configConnection` and `stores/settings.js`'s `loadLibraries`/
 * `loadEngines` guards. A `libraries.game_db_path`/filesystem-path row and an
 * `engines.binary_path`/UCI-binary row don't map onto this interim architecture's
 * single in-browser database; both need their own PWA-shaped design before either
 * table gets real content, not a mechanical copy of the desktop shape. It leaves out
 * `catalog_databases`/`catalog_engines` — nothing in `data/config.js` reads them; the
 * download catalogues are a static file today (`settings/databases.js`,
 * `settings/engines.js`), unrelated to this seam.
 */

/** The schema revision a fresh database is created at. Matches `identify.js`'s
 *  `SCHEMA_USER_VERSION` and `samples/build_samples.py`'s `SCHEMA_USER_VERSION`. */
export const SCHEMA_USER_VERSION = 9;

export const GAME_DB_DDL = `
CREATE TABLE games (
    id               INTEGER PRIMARY KEY,
    pgn              TEXT NOT NULL,
    event            TEXT,
    site             TEXT,
    date             TEXT,
    round            TEXT,
    white            TEXT,
    black            TEXT,
    result           TEXT,
    white_elo        INTEGER,
    black_elo        INTEGER,
    eco              TEXT,
    time_control     TEXT,
    fen              TEXT,
    termination      TEXT,
    ply_count        INTEGER,
    tournament       TEXT,
    current_position TEXT,
    variant          TEXT,
    rated            INTEGER,
    white_accuracy   REAL,
    black_accuracy   REAL,
    time_class       TEXT,
    created_at       TEXT,
    movetext         TEXT
);

-- A row means the game is a favorite.
CREATE TABLE favorites (
    game_id INTEGER PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE
);

-- A row means the game is in the Trash.
CREATE TABLE trash (
    game_id INTEGER PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE tags (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE tag_games (
    tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    PRIMARY KEY (tag_id, game_id)
) WITHOUT ROWID;
CREATE INDEX tag_games_by_game ON tag_games (game_id);

CREATE TABLE collections (
    id       INTEGER PRIMARY KEY,
    name     TEXT NOT NULL UNIQUE COLLATE NOCASE,
    smart    INTEGER NOT NULL DEFAULT 0 CHECK (smart IN (0, 1)),
    criteria TEXT,
    CHECK (smart = 1 OR criteria IS NULL)
);

-- Membership of regular Collections only; a Smart Collection computes its own.
CREATE TABLE collection_games (
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    game_id       INTEGER NOT NULL REFERENCES games(id)       ON DELETE CASCADE,
    PRIMARY KEY (collection_id, game_id)
) WITHOUT ROWID;
CREATE INDEX collection_games_by_game ON collection_games (game_id);

-- Which games arrived through which subscription. subscription_id is
-- config.db subscriptions.id; SQLite cannot enforce a key in another file.
CREATE TABLE subscription_games (
    subscription_id INTEGER NOT NULL,
    game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    PRIMARY KEY (subscription_id, game_id)
) WITHOUT ROWID;
CREATE INDEX subscription_games_by_game ON subscription_games (game_id);
`;

export const CONFIG_DB_DDL = `
CREATE TABLE libraries (
    id             INTEGER PRIMARY KEY,
    name           TEXT NOT NULL,
    game_db_path   TEXT NOT NULL,
    created_at     TEXT NOT NULL,
    last_opened_at TEXT,
    enabled        INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    version        TEXT
);

CREATE TABLE subscriptions (
    id                  INTEGER PRIMARY KEY,
    name                TEXT NOT NULL,
    source_type         TEXT NOT NULL,
    source_identifier   TEXT NOT NULL,
    library_id          INTEGER NOT NULL REFERENCES libraries(id),
    enabled             INTEGER NOT NULL DEFAULT 1,
    created_at          TEXT NOT NULL,
    last_checked_at     TEXT,
    last_status         TEXT NOT NULL DEFAULT 'not_checked',
    last_status_message TEXT,
    sync_interval       TEXT NOT NULL DEFAULT 'daily'
                        CHECK (sync_interval IN ('hourly', 'daily', 'weekly', 'manual')),
    last_synced_at      TEXT,
    last_viewed_at      TEXT
);

CREATE TABLE engines (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    version     TEXT,
    url         TEXT,
    binary_path TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    enabled     INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    threads     INTEGER NOT NULL DEFAULT 1 CHECK (threads >= 1),
    hash_mb     INTEGER NOT NULL DEFAULT 256 CHECK (hash_mb >= 1)
);

-- What the user chose in Settings.
CREATE TABLE preferences (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL CHECK (json_valid(value)),
    updated_at TEXT NOT NULL
);

-- Where the user left off. Not a setting.
CREATE TABLE ui_state (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL CHECK (json_valid(value)),
    updated_at TEXT NOT NULL
);
`;
