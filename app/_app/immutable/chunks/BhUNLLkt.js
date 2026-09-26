var e=12,t=`
CREATE TABLE games (
    id                 INTEGER PRIMARY KEY,
    pgn                TEXT NOT NULL,
    event              TEXT,
    site               TEXT,
    date               TEXT,
    round              TEXT,
    white              TEXT,
    black              TEXT,
    result             TEXT,
    white_elo          INTEGER,
    black_elo          INTEGER,
    eco                TEXT,
    time_control       TEXT,
    fen                TEXT,
    termination        TEXT,
    ply_count          INTEGER,
    tournament         TEXT,
    current_position   TEXT,
    variant            TEXT,
    rated              INTEGER,
    white_accuracy     REAL,
    black_accuracy     REAL,
    time_class         TEXT,
    created_at         TEXT,
    movetext           TEXT,
    -- database-schema.md §1, added 23 Sep for per-game source tracking (§2.3):
    -- provenance of an Online import. NULL for Paste/File.
    source_type        TEXT,
    source_identifier  TEXT
);

-- Derived data (database-schema.md §6) -- reconstructible from games, never a
-- source of truth. A fresh database is created WITHOUT rows in it; only the PWA's
-- Sample Games seed (backends/pwa.js, via game/buildPositions.js) populates it
-- today, mirroring what samples/build_positions.py does for the desktop .db
-- files. That PWA population is a STOPGAP until indexing has a UI trigger
-- (see game/buildPositions.js); the table itself stays. Column order matches section 6.1 exactly, pos+move primary key included.
CREATE TABLE positions (
    pos    TEXT    NOT NULL,
    move   TEXT    NOT NULL,
    games  INTEGER NOT NULL,
    white  INTEGER NOT NULL,
    draws  INTEGER NOT NULL,
    black  INTEGER NOT NULL,
    PRIMARY KEY (pos, move)
) WITHOUT ROWID;

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
`,n=`
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
    -- kind/asset_url/sha256/threads_max added for engine Stage 2 (26 Sep 2026,
    -- engine-stage2-plan.md): a WASM engine has no OS binary to invoke, so
    -- binary_path is relaxed to nullable and required only for kind = 'native'.
    -- 'native' is the default so every pre-Stage-2 row keeps its meaning.
    kind        TEXT NOT NULL DEFAULT 'native' CHECK (kind IN ('native', 'wasm')),
    binary_path TEXT,
    asset_url   TEXT,
    sha256      TEXT,
    threads_max INTEGER CHECK (threads_max IS NULL OR threads_max >= 1),
    -- catalog_id added 26 Sep 2026 (engine Stage 2 by-hand bug: an installed
    -- row was being matched back to its catalogue entry by display name,
    -- which is user-editable and collided with an unrelated same-named row).
    -- The catalogue entry's own permanent id (settings/engines.js's
    -- WASM_ENGINES, or a future native catalogue in Stage 3), stamped at
    -- install time. NULL for anything not installed via the in-app
    -- catalogue (a manually configured engine, or seed/sample data) -- such
    -- a row never hides a catalogue entry, which is correct.
    catalog_id  TEXT,
    created_at  TEXT NOT NULL,
    enabled     INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    threads     INTEGER NOT NULL DEFAULT 1 CHECK (threads >= 1),
    hash_mb     INTEGER NOT NULL DEFAULT 256 CHECK (hash_mb >= 1),
    CHECK (kind != 'native' OR binary_path IS NOT NULL)
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
`;function r(e){return String(e??``).split(`
`).filter(e=>!e.trim().startsWith(`--`)).join(`
`).split(`;`).map(e=>e.trim()).filter(Boolean)}export{n as CONFIG_DB_DDL,t as GAME_DB_DDL,e as SCHEMA_USER_VERSION,r as splitSqlStatements};