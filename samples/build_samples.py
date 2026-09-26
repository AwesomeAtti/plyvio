"""
Build the Plyvio sample databases.

Creates, beside one another:

    config.db          Plyvio configuration (schema reference v010 section 5)
    master-games.db    Library "Master Games" - hikaru.pgn, gothamchess-annotated.pgn
    sample-games.db    Library "Sample Games" - sample-games.pgn

Rules this build follows (see the working notes, sample-db-design.md):

  1. No field is added to the games table, except source_type/source_identifier
     (23 Sep, per-game source tracking, database-schema.md §2.3) -- schema-level
     provenance columns for Online imports. Every game here stays NULL, since none
     of these samples arrived through an Online import.
  2. No existing field is recreated; a value with a home is read from there.
  3. config.db resides beside the game databases, so game_db_path is a bare
     filename.

Games are imported strictly per v010 section 4: the PGN text is stored byte for
byte, the tags of section 1 are lifted into their fields, created_at is set, and
movetext is left NULL. Fields that only the Chess.com JSON route supplies
(rated, time_class, variant, accuracies) stay NULL.

Everything is deterministic: fixed timestamps and one seeded PRNG, so a rebuild
produces the same rows.

    python3 build_samples.py [--pgn-dir DIR] [--out-dir DIR]
"""

import argparse
import os
import random
import re
import sqlite3
import sys
from datetime import datetime, timedelta, timezone


SCHEMA_USER_VERSION = 12         # schema.js v012 -- catalog_engines dropped, 26 Sep
                                  # 2026 (database-schema.md doc lags the real schema
                                  # -- tracked gap, working/ACTIONS.md)

BUILD_TIME = "2026-09-12T12:00:00Z"

TAG_LINE = re.compile(r'^\[([A-Za-z0-9_]+)\s+"(.*)"\]\s*$')

# PGN tag -> games column. v010 section 1, plus section 4.1's two Chess.com tags.
TAG_TO_COLUMN = {
    "Event": "event",
    "Site": "site",
    "Date": "date",
    "Round": "round",
    "White": "white",
    "Black": "black",
    "Result": "result",
    "WhiteElo": "white_elo",
    "BlackElo": "black_elo",
    "ECO": "eco",
    "TimeControl": "time_control",
    "FEN": "fen",
    "Termination": "termination",
    "PlyCount": "ply_count",
    "CurrentPosition": "current_position",
    "Tournament": "tournament",
}

INTEGER_COLUMNS = {"white_elo", "black_elo", "ply_count"}


# --------------------------------------------------------------------------
# DDL
# --------------------------------------------------------------------------

GAME_DB_DDL = """
-- v010 section 1, plus source_type/source_identifier (23 Sep, per-game source
-- tracking) -- NULL here, since build_samples.py never does an Online import.
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
    source_type        TEXT,
    source_identifier  TEXT
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
"""

CONFIG_DB_DDL = """
-- v010 section 5.1, plus enabled and version.
CREATE TABLE libraries (
    id             INTEGER PRIMARY KEY,
    name           TEXT NOT NULL,
    game_db_path   TEXT NOT NULL,
    created_at     TEXT NOT NULL,
    last_opened_at TEXT,
    enabled        INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    version        TEXT
);

-- v010 section 5.2, plus sync_interval, last_synced_at and last_viewed_at.
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

-- v010 section 5.3, plus enabled, threads and hash_mb, plus kind/asset_url/
-- sha256/threads_max for engine Stage 2 (26 Sep 2026) -- see schema.js's own
-- comment on this table, kept in step by hand.
CREATE TABLE engines (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    version     TEXT,
    url         TEXT,
    kind        TEXT NOT NULL DEFAULT 'native' CHECK (kind IN ('native', 'wasm')),
    binary_path TEXT,
    asset_url   TEXT,
    sha256      TEXT,
    threads_max INTEGER CHECK (threads_max IS NULL OR threads_max >= 1),
    catalog_id  TEXT,  -- which catalogue entry produced this row, if any (schema v011)
    created_at  TEXT NOT NULL,
    enabled     INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    threads     INTEGER NOT NULL DEFAULT 1 CHECK (threads >= 1),
    hash_mb     INTEGER NOT NULL DEFAULT 256 CHECK (hash_mb >= 1),
    CHECK (kind != 'native' OR binary_path IS NOT NULL)
);

-- The curated list offered for download (settings section 3.4.8.1). Engines
-- had the same shape (catalog_engines) until it was dropped, unused, 26 Sep
-- 2026 (schema v012) -- the app's real engine catalogue is a static file
-- (settings/engines.js), never this table; see schema.js's own comment.
CREATE TABLE catalog_databases (
    id      INTEGER PRIMARY KEY,
    name    TEXT NOT NULL,
    version TEXT,
    games   INTEGER,
    players INTEGER,
    bytes   INTEGER
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
"""


# --------------------------------------------------------------------------
# Sample content
# --------------------------------------------------------------------------

# Library name, database filename, and the PGN files that fill it.
LIBRARIES = [
    {
        "id": 2,
        "name": "Master Games",
        "file": "master-games.db",
        "version": "1.0",
        "created_at": "2026-09-02T18:30:00Z",
        "last_opened_at": None,                          # never opened
        "sources": [("hikaru.pgn", 2), ("gothamchess-annotated.pgn", 3)],
        "tags": ["Brilliancy", "To Analyse", "Miniature", "Blunder"],
        "collections": [
            ("Opening Prep", 0, None),
            ("Endgame Studies", 0, None),
            ("Hikaru as White", 1, '{"white": "Hikaru"}'),
        ],
    },
    {
        "id": 3,
        "name": "Sample Games",
        "file": "sample-games.db",
        "version": "1.0",
        "created_at": "2026-09-21T00:00:00Z",
        "last_opened_at": None,                          # never opened
        # A curated, hand-picked PGN (ten historical/reference games plus thirty of
        # AwesomeAtti's own Live Chess games), not a subscription sync — so there is no
        # subscription id to attach it to (None; see build_game_db()'s handling of it).
        "sources": [("sample-games.pgn", None)],
        "tags": ["Brilliancy", "To Analyse", "Miniature", "Blunder"],
        "collections": [
            ("Opening Prep", 0, None),
            ("Endgame Studies", 0, None),
        ],
    },
]

SUBSCRIPTIONS = [
    # id, name, source_identifier, library_id, enabled, interval,
    # last_checked_at, last_status, message, last_synced_at, last_viewed_at
    (2, "Hikaru", "hikaru", 2, 1, "hourly",
     "2026-09-12T11:00:00Z", "error", "Source temporarily unavailable",
     "2026-09-11T23:00:00Z", "2026-09-11T21:30:00Z"),
    (3, "GothamChess", "gothamchess", 2, 0, "weekly",
     None, "not_checked", None, None, None),
]

# No pre-installed engines -- matches production (Settings -> Engines'
# empty state, engine-stage2-plan.md's "No new first-launch UI"). The two
# placeholder rows here (a fake "Stockfish"/"Torch" pair) simulated engines
# that were never real; removed 26 Sep 2026 along with the rest of the
# native-engine mock (working/CLOSED.md).
ENGINES = []

CATALOG_DATABASES = [
    (1, "Lumbra's Gigabase", "1.4", 9_570_000, 526_000, 4_100_000_000),
    (2, "Caissabase 2024", "2024", 5_400_000, 321_000, 2_300_000_000),
    (3, "Ajedrez Data - OTB", "1.0", 4_270_000, 144_000, 1_800_000_000),
    (4, "MillionBase", "3.45", 3_450_000, 284_000, 1_500_000_000),
    (5, "Ajedrez Data - Correspondence", "1.0", 1_520_000, 40_000, 600_000_000),
]


PREFERENCES = [
    ("language", '"en"'),
    ("restore_open_games", "true"),
    ("theme", '"system"'),
    ("board_style", '"Default"'),
    ("piece_set", '"Merida"'),
]

UI_STATE = [
    ("library.sidebar_collapsed", "false"),
    ("library.folded_groups",
     '{"subscriptions": false, "collections": false, "tags": false}'),
    ("game.open_tabs", "[]"),
]

# How much of a library carries each feature.
SHARE_FAVORITE = 0.03
SHARE_TAGGED = 0.12
SHARE_COLLECTED = 0.10
SHARE_TRASHED = 0.004
SEED = 20260912


# --------------------------------------------------------------------------
# PGN reading
# --------------------------------------------------------------------------

def split_games(text):
    """Yield each game's PGN text, exactly as it appears in the file."""
    parts = text.split('[Event "')

    for part in parts[1:]:
        yield '[Event "' + part.rstrip() + "\n"


def read_tags(game_text):
    """The tag pair section as a dict. Movetext is left alone."""
    tags = {}

    for line in game_text.splitlines():
        line = line.strip()

        if not line:
            break

        match = TAG_LINE.match(line)

        if match:
            tags[match.group(1)] = match.group(2)

    return tags


def as_integer(value):
    """v010 section 2.2: cast to INTEGER; '-' and '?' become NULL."""
    if value is None:
        return None

    value = value.strip()

    if not value.lstrip("-").isdigit():
        return None

    return int(value)


def import_time(tags):
    """
    games.created_at - when this row was added to this database.

    The sample dates it an hour after the game finished, so Recently Added
    and the Date column hold plausible, ordered values.
    """
    date = tags.get("EndDate") or tags.get("UTCDate") or tags.get("Date")
    time = tags.get("EndTime") or tags.get("UTCTime") or "12:00:00"

    try:
        stamp = datetime.strptime(f"{date} {time}", "%Y.%m.%d %H:%M:%S")
        stamp = stamp.replace(tzinfo=timezone.utc) + timedelta(hours=1)
        return stamp.strftime("%Y-%m-%dT%H:%M:%SZ")
    except (TypeError, ValueError):
        return BUILD_TIME


def game_row(game_text, tags):
    """One games row: the PGN, the lifted tags, created_at. movetext is NULL."""
    row = {column: None for column in TAG_TO_COLUMN.values()}
    row["pgn"] = game_text

    for tag, column in TAG_TO_COLUMN.items():
        if tag not in tags:
            continue

        value = tags[tag]
        row[column] = as_integer(value) if column in INTEGER_COLUMNS else value

    row["created_at"] = import_time(tags)

    return row


# --------------------------------------------------------------------------
# Building
# --------------------------------------------------------------------------

def connect(path):
    if os.path.exists(path):
        os.remove(path)

    connection = sqlite3.connect(path)
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute(f"PRAGMA user_version = {SCHEMA_USER_VERSION}")

    return connection


def build_game_db(library, pgn_dir, out_dir):
    path = os.path.join(out_dir, library["file"])
    db = connect(path)
    db.executescript(GAME_DB_DDL)

    columns = ["pgn"] + list(TAG_TO_COLUMN.values()) + ["created_at"]
    statement = (
        f"INSERT INTO games ({', '.join(columns)}) "
        f"VALUES ({', '.join('?' for _ in columns)})"
    )

    game_ids = []
    counts = {}

    for pgn_file, subscription_id in library["sources"]:
        source = os.path.join(pgn_dir, pgn_file)

        with open(source, encoding="utf-8") as handle:
            text = handle.read()

        imported = 0

        for game_text in split_games(text):
            tags = read_tags(game_text)
            row = game_row(game_text, tags)

            cursor = db.execute(statement, [row[column] for column in columns])
            game_id = cursor.lastrowid

            # subscription_id is None for a source that was not imported through a
            # subscription sync (a curated/pasted PGN, say) -- nothing to record in
            # subscription_games for those rows.
            if subscription_id is not None:
                db.execute(
                    "INSERT INTO subscription_games (subscription_id, game_id) "
                    "VALUES (?, ?)",
                    (subscription_id, game_id),
                )

            game_ids.append(game_id)
            imported += 1

        counts[pgn_file] = imported

    add_library_features(db, library, game_ids)

    db.commit()
    db.execute("VACUUM")
    db.close()

    return path, counts


def add_library_features(db, library, game_ids):
    """Favorites, trash, tags and collections, seeded so a rebuild matches."""
    rnd = random.Random(SEED + library["id"])

    for name in library["tags"]:
        db.execute("INSERT INTO tags (name) VALUES (?)", (name,))

    for name, smart, criteria in library["collections"]:
        db.execute(
            "INSERT INTO collections (name, smart, criteria) VALUES (?, ?, ?)",
            (name, smart, criteria),
        )

    tag_ids = [row[0] for row in db.execute("SELECT id FROM tags ORDER BY id")]
    static_collections = [
        row[0] for row in
        db.execute("SELECT id FROM collections WHERE smart = 0 ORDER BY id")
    ]

    for game_id in game_ids:
        if rnd.random() < SHARE_FAVORITE:
            db.execute("INSERT INTO favorites (game_id) VALUES (?)", (game_id,))

        if rnd.random() < SHARE_TRASHED:
            db.execute("INSERT INTO trash (game_id) VALUES (?)", (game_id,))

        if rnd.random() < SHARE_TAGGED:
            db.execute(
                "INSERT INTO tag_games (tag_id, game_id) VALUES (?, ?)",
                (rnd.choice(tag_ids), game_id),
            )

        if rnd.random() < SHARE_COLLECTED:
            db.execute(
                "INSERT INTO collection_games (collection_id, game_id) "
                "VALUES (?, ?)",
                (rnd.choice(static_collections), game_id),
            )


def build_config_db(out_dir):
    path = os.path.join(out_dir, "config.db")
    db = connect(path)
    db.executescript(CONFIG_DB_DDL)

    for library in LIBRARIES:
        db.execute(
            "INSERT INTO libraries "
            "(id, name, game_db_path, created_at, last_opened_at, enabled, version) "
            "VALUES (?, ?, ?, ?, ?, 1, ?)",
            (
                library["id"],
                library["name"],
                library["file"],          # beside config.db
                library["created_at"],
                library["last_opened_at"],
                library["version"],
            ),
        )

    for row in SUBSCRIPTIONS:
        (subscription_id, name, identifier, library_id, enabled, interval,
         checked, status, message, synced, viewed) = row

        db.execute(
            "INSERT INTO subscriptions "
            "(id, name, source_type, source_identifier, library_id, enabled, "
            " created_at, last_checked_at, last_status, last_status_message, "
            " sync_interval, last_synced_at, last_viewed_at) "
            "VALUES (?, ?, 'chess_com_player', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (subscription_id, name, identifier, library_id, enabled,
             "2026-09-01T10:00:00Z", checked, status, message, interval,
             synced, viewed),
        )

    db.executemany(
        "INSERT INTO engines "
        "(id, name, version, url, binary_path, created_at, enabled, threads, hash_mb) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ENGINES,
    )

    db.executemany(
        "INSERT INTO catalog_databases (id, name, version, games, players, bytes) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        CATALOG_DATABASES,
    )

    db.executemany(
        "INSERT INTO preferences (key, value, updated_at) VALUES (?, ?, ?)",
        [(key, value, BUILD_TIME) for key, value in PREFERENCES],
    )

    db.executemany(
        "INSERT INTO ui_state (key, value, updated_at) VALUES (?, ?, ?)",
        [(key, value, BUILD_TIME) for key, value in UI_STATE],
    )

    db.commit()
    db.execute("VACUUM")
    db.close()

    return path


def report(path):
    db = sqlite3.connect(path)
    tables = [
        row[0] for row in
        db.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    ]

    size = os.path.getsize(path) / 1_000_000
    print(f"\n{os.path.basename(path)}  ({size:.1f} MB)")

    for table in tables:
        count = db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"    {table:<20} {count:>6}")

    db.close()


def main():
    parser = argparse.ArgumentParser(description="Build the Plyvio sample databases.")
    parser.add_argument("--pgn-dir", default="pgn", help="Folder holding the PGN files")
    parser.add_argument("--out-dir", default=".", help="Where the databases are written")
    args = parser.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)

    for library in LIBRARIES:
        for pgn_file, _ in library["sources"]:
            source = os.path.join(args.pgn_dir, pgn_file)

            if not os.path.exists(source):
                sys.exit(f"Missing PGN file: {source}")

    config_path = build_config_db(args.out_dir)

    for library in LIBRARIES:
        path, counts = build_game_db(library, args.pgn_dir, args.out_dir)
        summary = ", ".join(f"{n} from {f}" for f, n in counts.items())
        print(f"{library['name']}: {summary}")

    report(config_path)

    for library in LIBRARIES:
        report(os.path.join(args.out_dir, library["file"]))


if __name__ == "__main__":
    main()
