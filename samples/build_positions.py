"""
Populate the `positions` table (database-schema.md §6) in one or more
existing game databases, from the games already in them.

Sample-data tooling only, independent of the Tauri build and of the running
application — the app only ever READS `positions` (§6: "a game database
without one is valid; it simply cannot answer position queries"). Nothing
here is imported by the app, its build, or `build_samples.py`; it runs
afterwards, against the `.db` files that script already produced.

Derived, reconstructible data (§6: "every row in it is reconstructible from
the games... never a source of truth"), so this drops and rebuilds the
whole table on every run rather than trying to update it incrementally —
the same stance `build_samples.py` takes on the databases themselves.

Requires python-chess (`pip install chess`) — already a dependency of
`annotate.py` in this folder, so this introduces nothing new to the project,
only to whichever interpreter runs it.

    python3 build_positions.py [DB ...]

With no arguments, targets every *.db beside this script except config.db
(which holds no games table).
"""

import argparse
import glob
import io
import os
import sqlite3
import sys

import chess
import chess.pgn


POSITIONS_DDL = """
CREATE TABLE positions (
    pos    TEXT    NOT NULL,
    move   TEXT    NOT NULL,
    games  INTEGER NOT NULL,
    white  INTEGER NOT NULL,
    draws  INTEGER NOT NULL,
    black  INTEGER NOT NULL,
    PRIMARY KEY (pos, move)
) WITHOUT ROWID;
"""

# database-schema.md §6.3: a game with no recorded result still counts in
# `games`, but contributes to no side's score — so `*`, and anything that
# is not one of these three exact strings, simply has no entry here.
RESULT_SIDE = {"1-0": "white", "0-1": "black", "1/2-1/2": "draws"}


def position_key(board):
    """
    database-schema.md §6.2: the first four FEN fields — piece placement,
    side to move, castling availability, en passant target square.

    `en_passant="legal"` is python-chess's own name for the same deviation
    from strict FEN §6.2 calls out explicitly: the en passant field is
    populated only when an en passant capture is actually legal, not
    whenever the last move happened to be a double pawn push. Passed
    explicitly so this stays correct even if a future python-chess release
    changes its default.
    """
    fields = board.fen(en_passant="legal").split(" ")
    return " ".join(fields[:4])


def game_text(pgn, movetext):
    """
    database-schema.md §3.1's precedence: `movetext` when the row carries
    one, else `pgn`. `chess.pgn.read_game` accepts either shape — a full
    document with tag pairs, or bare movetext — so nothing here needs to
    know which branch it took.
    """
    return movetext if movetext is not None else pgn


def positions_in_game(text, result):
    """
    Walk one game's main line — variations are not part of this table, the
    same choice Plyvio's own reader (game/plies.js) makes for the board —
    and yield this game's contribution: one (pos, move, side) per distinct
    position it reached, crediting only the FIRST time it reaches a given
    position.

    §6.3: "A game contributes at most once to any position." A game that
    transposes back into a position it already passed through must not be
    counted a second time there, however many times it revisits it or
    whichever move it plays on a later visit — crediting a later visit
    instead of the first would silently swap out which move the position's
    stats speak for, in a game that already answered that question once.
    """
    game = chess.pgn.read_game(io.StringIO(text))
    if game is None:
        return

    board = game.board()
    seen = set()
    side = RESULT_SIDE.get(result)

    for node in game.mainline():
        pos = position_key(board)
        move_san = board.san(node.move)
        board.push(node.move)

        if pos in seen:
            continue
        seen.add(pos)

        yield pos, move_san, side


def build_positions(db_path):
    db = sqlite3.connect(db_path)
    db.execute("DROP TABLE IF EXISTS positions")
    db.executescript(POSITIONS_DDL)

    # (pos, move) -> [games, white, draws, black]
    totals = {}
    skipped = 0

    rows = db.execute("SELECT pgn, movetext, result FROM games").fetchall()

    for pgn, movetext, result in rows:
        text = game_text(pgn, movetext)

        try:
            contributions = list(positions_in_game(text, result))
        except Exception as err:  # noqa: BLE001 — one bad game must not stop the build
            skipped += 1
            print(f"    skipping unreadable game: {err}", file=sys.stderr)
            continue

        for pos, move, side in contributions:
            counts = totals.setdefault((pos, move), [0, 0, 0, 0])
            counts[0] += 1
            if side == "white":
                counts[1] += 1
            elif side == "draws":
                counts[2] += 1
            elif side == "black":
                counts[3] += 1

    db.executemany(
        "INSERT INTO positions (pos, move, games, white, draws, black) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        [(pos, move, g, w, d, b) for (pos, move), (g, w, d, b) in totals.items()],
    )

    db.commit()
    db.execute("VACUUM")
    db.close()

    return len(rows), skipped, len(totals)


def default_targets():
    here = os.path.dirname(os.path.abspath(__file__))
    return sorted(
        path for path in glob.glob(os.path.join(here, "*.db"))
        if os.path.basename(path) != "config.db"
    )


def main():
    parser = argparse.ArgumentParser(
        description="Populate the `positions` table in one or more game databases."
    )
    parser.add_argument(
        "databases", nargs="*",
        help="Game database file(s). Defaults to every *.db beside this "
             "script except config.db (which has no games table)."
    )
    args = parser.parse_args()

    targets = args.databases or default_targets()

    if not targets:
        sys.exit("No game databases found.")

    for path in targets:
        if not os.path.exists(path):
            sys.exit(f"Missing database: {path}")

        print(os.path.basename(path))
        read, skipped, position_count = build_positions(path)
        counted = read - skipped
        tail = f", {skipped} skipped" if skipped else ""
        print(f"    {counted} game(s) read{tail}")
        print(f"    {position_count} (position, move) row(s) written")


if __name__ == "__main__":
    main()
