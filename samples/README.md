# Sample data

`build_samples.py` turns the PGN files in `pgn/` into the sample databases
the prototype ships with — `master-games.db` (Library "Master Games") and
`sample-games.db` (Library "Sample Games"). `annotate.py` produces one of
those PGN files by running an existing game collection through Stockfish.

## `pgn/` is not in the repository

It's 4.8MB of third-party game collections and is excluded by `.gitignore`
(`samples/pgn/`). It has to exist locally before running `build_samples.py`.

| File | Used by | What it is |
|---|---|---|
| `hikaru.pgn` | `master-games.db` | Chess.com games for the player `hikaru` |
| `gothamchess-annotated.pgn` | `master-games.db` | 533 games, Stockfish-annotated by `annotate.py` (adds `[%engine]`, `[%eval]`, `[%bestmove]` per move) — the only sample games carrying full engine annotations, used to exercise the comment banner, the Evaluation Bar's populated state, etc. |
| `sample-games.pgn` | `sample-games.db` | 40 curated games, provided directly rather than fetched: ten historical/reference games (several with real prose commentary, NAGs and chess.com's own `[%c_effect]` move-quality tags — no engine data) plus thirty of AwesomeAtti's own Live Chess games. Not reproducible via the fetch steps below; see "The curated sample-games.pgn" further down. |

`build_samples.py`'s seed data (`source_type = 'chess_com_player'`) confirms
`hikaru.pgn` and `gothamchess-annotated.pgn`'s source games are Chess.com
player exports, matching their filenames; the exact historical fetch command
for either isn't recorded anywhere in this project's notes, so treat the
steps below as *how to fetch equivalent data today*, not a replay of the
original one.

## Fetching player games from Chess.com

Chess.com's public Published-Data API needs no auth:

```
GET https://api.chess.com/pub/player/<username>/games/archives
```

returns a list of monthly archive URLs; each one has a `/pgn` variant, e.g.

```
GET https://api.chess.com/pub/player/hikaru/games/2026/08/pgn
```

Concatenate the months you want into `hikaru.pgn`.

## Regenerating the annotated file

```bash
# Stockfish must be on PATH (or pass --engine /path/to/stockfish)
python3 annotate.py <source>.pgn gothamchess-annotated.pgn
```

See `annotate.py --help` for the depth/hash/engine-path options. The source
PGN for this one is presumably a GothamChess (`GMHikaru`'s frequent guest and
Chess.com personality Levy Rozman) game export, fetched the same way as
above with `username=GothamChess`, but that isn't confirmed by anything in
this project's records — check before assuming it's exact.

## Building the databases

```bash
python3 build_samples.py            # reads ./pgn, writes ./ (config.db, master-games.db, sample-games.db)
```

The `.db` files are also excluded from git (`samples/*.db` in the root
`.gitignore`) — they're regenerated from `pgn/` for local development, not
shipped in the repository. Run `build_samples.py` after fetching `pgn/` to
get working copies.

## The curated `sample-games.pgn`

Unlike the other two files, `sample-games.pgn` isn't a bulk Chess.com export
and the steps above don't reproduce it. It's a hand-picked set AwesomeAtti
supplied directly: ten historical/reference games (a few carrying real prose
commentary, NAGs and chess.com's own `[%c_effect]` move-quality tags — an
annotation `annotations.js` doesn't define and so keeps verbatim as an
unrecognized command rather than rendering specially) plus thirty of
AwesomeAtti's own Live Chess games against practice opponents. Thirty of the
forty carry no engine annotation; the other ten (the GothamChess-vs-AwesomeAtti
games) turned out to already carry `[%eval]`/`[%bestmove]` on every move, same
as `gothamchess-annotated.pgn`. If this file is ever replaced, do it by hand,
the same way it arrived.
