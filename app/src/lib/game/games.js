/**
 * The Game Workspace's sample games — a hand-maintained table, not a generated one.
 *
 * Each entry is a row of `games` as schema §1 and §4 describe one: `pgn` holds the
 * original document, read-only and never patched, and the columns beside it hold the
 * values §4 lifted out of its tag pairs at import. Those columns exist so that a search
 * need not read every `pgn` in the database to answer a simple question, and they are
 * the editable copies — the same relationship `movetext` has to `pgn`. Editing a game's
 * White would change the column and leave the tag pair alone, so a column and its tag
 * can legitimately disagree. They agree on every row here only because these four were
 * imported and never edited; field editing is not a feature of this version.
 *
 * Nothing is precomputed. Positions, the squares a move ran between, check and
 * evaluations are read from the movetext at runtime by `$lib/game/plies.js`, which is
 * the point of the exercise — the prototype validates the schema by reading what the
 * schema actually stores.
 *
 * `movetext` IS NULL ON EVERY ROW, which is what §3.1's precedence is for: a reader
 * takes `movetext` when it is present and parses `pgn` when it is not. Every row in
 * `samples/` is in the same state — 0 of 1,130 sample games carry a movetext, because
 * import writes `pgn` and leaves the column NULL — so this is what a real row looks
 * like, and the PGN branch is the one both paths exercise. A row with a movetext of
 * its own is what appears once something writes one back, which nothing yet does.
 *
 * THE `id` IS A ROW NUMBER, NOT A NAME. Schema §1 declares it INTEGER and §2.1 says it
 * "identifies a row, not a game — it carries no meaning derived from the game and is not
 * stable across a re-import". These rows carried slugs until that was read properly:
 * `kasparov-topalov-1999` by hand, and a generated `gc-<date>-<opponent>` on the
 * annotated set, which is a composite of two of the row's own columns — exactly what the
 * clause forbids. `master-games.db` stores integers, and a mock row exists to look like a
 * row from such a file, so these are integers too. Nothing may read meaning out of one:
 * a game is found by its tags, the way a query would find it.
 *
 * NO `opening` FIELD. These rows carried one until it was dropped as stale: §1 of the
 * schema has no such column, nothing in the application ever read it, and the four
 * classics held opening names while every annotated row held an empty string. `eco` is
 * the classification code and, per §2.2, is "the code only, not an opening name". The
 * Chess.com `ECOUrl` tag in each `pgn` is where a name would come from if a column for
 * one is ever specified.
 *
 * READ-ONLY. The UI cannot add, remove or modify a game. New sample games are added
 * here by hand, and that is the only way one arrives.
 *
 * FOUR HISTORICAL GAMES AND ONE ANNOTATED ONE. The four classics carry no [%eval] or
 * [%bestmove] — they predate engines — so on those the Evaluation Bar draws its neutral
 * fill throughout (§5.4.1 already specifies that state: an empty bar at 50% would read
 * as "equal", which is a claim). Annotating them means running an engine over them,
 * which has not been done, and is an accepted sample-data gap.
 *
 * TWENTY-FIVE MORE ANNOTATED GAMES live in `annotated.js` and are spread into GAMES below.
 * They are the same kind of row and are read the same way; they sit in their own file only
 * because 126 KB of PGN in this one would contradict the "hand-maintained" claim above. The
 * Library lists them as itself — see `$lib/library/mock.js`, which builds its rows from this
 * array rather than inventing names, so a row that says GothamChess is a game that exists.
 *
 * Row 1 is here to close the other half of that gap: it is a real game
 * from `samples/pgn/gothamchess-annotated.pgn`, where every ply carries [%clk], [%eval]
 * and [%bestmove] and the document declares its [%engine]. Without it nothing in the
 * application exercises the comment control, the comment banner or the Evaluation Bar's
 * populated state, and a feature no shipped data reaches is a feature nobody can check.
 */

import { ANNOTATED } from './annotated.js';

export const GAMES = [
  {
    id: 1,
    white: 'GothamChess', white_elo: 3065,
    black: 'EmperorSixSeven', black_elo: 2828,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.29', round: '-', result: '1-0',
    eco: 'B20',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.29"]
[Round "-"]
[White "GothamChess"]
[Black "EmperorSixSeven"]
[Result "1-0"]
[CurrentPosition "4r2r/1R6/1p1k2p1/p1p1p2p/P1Bpn2P/1P1P4/2P1N1P1/1R2K3 b - - 0 35"]
[Timezone "UTC"]
[ECO "B20"]
[ECOUrl "https://www.chess.com/openings/Sicilian-Defense-Mengarini-Variation-2...g6"]
[UTCDate "2026.08.29"]
[UTCTime "20:06:58"]
[WhiteElo "3065"]
[BlackElo "2828"]
[TimeControl "60"]
[Termination "GothamChess won by resignation"]
[StartTime "20:06:58"]
[EndDate "2026.08.29"]
[EndTime "20:08:26"]
[Link "https://www.chess.com/game/live/173716266994"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:47:45Z"] } 1. e4 { [%clk 0:00:59.9] [%eval 0.43] [%bestmove e2e4] } 1... c5 { [%clk 0:00:59.3] [%eval 0.39] [%bestmove c7c6] } 2. a3 { [%clk 0:00:59.3] [%eval -0.01] [%bestmove g1f3] } 2... g6 { [%clk 0:00:58.5] [%eval -0.04] [%bestmove g7g6] } 3. Nc3 { [%clk 0:00:59] [%eval -0.11] [%bestmove g1f3] } 3... Bg7 { [%clk 0:00:58.1] [%eval -0.12] [%bestmove b8c6] } 4. Bc4 { [%clk 0:00:58.7] [%eval -0.18] [%bestmove f1c4] } 4... Nc6 { [%clk 0:00:57.6] [%eval -0.25] [%bestmove b8c6] } 5. d3 { [%clk 0:00:58.4] [%eval -0.26] [%bestmove d2d3] } 5... e6 { [%clk 0:00:55.4] [%eval -0.13] [%bestmove e7e6] } 6. Ba2 { [%clk 0:00:58.2] [%eval -0.30] [%bestmove c1f4] } 6... Nf6 { [%clk 0:00:54.2] [%eval -0.12] [%bestmove g8e7] } 7. Bd2 { [%clk 0:00:57.9] [%eval -0.08] [%bestmove g1f3] } 7... d5 { [%clk 0:00:53.3] [%eval 0.07] [%bestmove d7d6] } 8. h4 { [%clk 0:00:56.1] [%eval -0.54] [%bestmove f2f4] } 8... h5 { [%clk 0:00:51.9] [%eval -0.61] [%bestmove e8g8] } 9. Bg5 { [%clk 0:00:55.4] [%eval -0.74] [%bestmove g1f3] } 9... d4 { [%clk 0:00:48.9] [%eval -0.25] [%bestmove e8g8] } 10. Nce2 { [%clk 0:00:55.1] [%eval -0.23] [%bestmove c3e2] } 10... Qb6 { [%clk 0:00:47.8] [%eval -0.10] [%bestmove d8c7] } 11. Rb1 { [%clk 0:00:52.5] [%eval -0.26] [%bestmove a1b1] } 11... Ng4 { [%clk 0:00:47] [%eval -0.36] [%bestmove a7a5] } 12. Nf3 { [%clk 0:00:50.1] [%eval -0.39] [%bestmove c2c3] } 12... Nce5 { [%clk 0:00:45.9] [%eval -0.12] [%bestmove a7a5] } 13. Nd2 { [%clk 0:00:48.5] [%eval -0.57] [%bestmove f3e5] } 13... Bd7 { [%clk 0:00:42.2] [%eval -0.60] [%bestmove b6c7] } 14. Nc4 { [%clk 0:00:47.5] [%eval -0.83] [%bestmove b2b4] } 14... Nxc4 { [%clk 0:00:41.2] [%eval -0.74] [%bestmove e5c4] } 15. Bxc4 { [%clk 0:00:47.4] [%eval -0.64] [%bestmove a2c4] } 15... Bb5 { [%clk 0:00:40.1] [%eval -0.21] [%bestmove e8g8] } 16. Bb3 { [%clk 0:00:45.6] [%eval -0.91] [%bestmove c4b5] } 16... a5 { [%clk 0:00:38.8] [%eval -0.79] [%bestmove e8g8] } 17. a4 { [%clk 0:00:45.3] [%eval -1.23] [%bestmove d1d2] } 17... Bc6 { [%clk 0:00:38.1] [%eval -0.54] [%bestmove c5c4] } 18. Qd2 { [%clk 0:00:43.7] [%eval -0.53] [%bestmove d1d2] } 18... Qc7 { [%clk 0:00:37.2] [%eval -0.47] [%bestmove e8g8] } 19. f3 { [%clk 0:00:42.6] [%eval -0.45] [%bestmove f2f3] } 19... Nf6 { [%clk 0:00:32.5] [%eval 0.05] [%bestmove g4e5] } 20. Qf4 { [%clk 0:00:41.4] [%eval -0.03] [%bestmove b1a1] } 20... Qxf4 { [%clk 0:00:30.1] [%eval -0.07] [%bestmove c7f4] } 21. Bxf4 { [%clk 0:00:41.1] [%eval -0.12] [%bestmove g5f4] } 21... O-O-O { [%clk 0:00:29] [%eval 0.35] [%bestmove b7b5] } 22. Bc4 { [%clk 0:00:38.8] [%eval -0.75] [%bestmove e2g1] } 22... b6 { [%clk 0:00:27.9] [%eval 0.56] [%bestmove c6a4] } 23. b3 { [%clk 0:00:37] [%eval 0.10] [%bestmove c2c3] } 23... Nd7 { [%clk 0:00:27.4] [%eval 0.37] [%bestmove f6e8] } 24. Ba6+ { [%clk 0:00:36.1] [%eval 0.27] [%bestmove c4a6] } 24... Bb7 { [%clk 0:00:26.3] [%eval 0.26] [%bestmove c6b7] } 25. Bb5 { [%clk 0:00:35.7] [%eval 0.32] [%bestmove a6b5] } 25... e5 { [%clk 0:00:24.3] [%eval 0.51] [%bestmove d7b8] } 26. Bg5 { [%clk 0:00:34.8] [%eval 0.36] [%bestmove f4d2] } 26... f6 { [%clk 0:00:23.9] [%eval 0.35] [%bestmove f7f6] } 27. Bd2 { [%clk 0:00:34.7] [%eval 0.35] [%bestmove g5d2] } 27... Nf8 { [%clk 0:00:22.6] [%eval 0.56] [%bestmove g7h6] } 28. Bc4 { [%clk 0:00:33.6] [%eval 0.65] [%bestmove e1g1] } 28... Kc7 { [%clk 0:00:21.8] [%eval 0.72] [%bestmove c8b8] } 29. f4 { [%clk 0:00:33.1] [%eval 0.83] [%bestmove c2c3] } 29... Kd6 { [%clk 0:00:21.2] [%eval 1.21] [%bestmove f8d7] } 30. fxe5+ { [%clk 0:00:32.4] [%eval 1.15] [%bestmove e1g1] } 30... fxe5 { [%clk 0:00:21.1] [%eval 1.43] [%bestmove f6e5] } 31. Bg5 { [%clk 0:00:31.9] [%eval 0.60] [%bestmove e1g1] } 31... Re8 { [%clk 0:00:20.1] [%eval 2.19] [%bestmove d8d7] } 32. Rf1 { [%clk 0:00:31.6] [%eval 1.36] [%bestmove e1g1] } 32... Ne6 { [%clk 0:00:19.4] [%eval 2.98] [%bestmove f8d7] } 33. Rf7 { [%clk 0:00:29.5] [%eval 3.48] [%bestmove f1f7] } 33... Nxg5 { [%clk 0:00:18.7] [%eval 3.38] [%bestmove e6g5] } 34. Rxg7 { [%clk 0:00:27.4] [%eval 3.25] [%bestmove f7g7] } 34... Nxe4 { [%clk 0:00:15.5] [%eval 4.57] [%bestmove h8h7] } 35. Rxb7 { [%clk 0:00:25.5] [%eval 3.93] [%bestmove g7b7] } 1-0`
  },
  {
    id: 2,
    white: 'Kasparov, Garry', white_elo: 2812,
    black: 'Topalov, Veselin', black_elo: 2700,
    event: 'Hoogovens Group A', site: 'Wijk aan Zee NED',
    date: '1999.01.20', round: '4', result: '1-0',
    eco: 'B07',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Hoogovens Group A"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[Round "4"]
[White "Kasparov, Garry"]
[Black "Topalov, Veselin"]
[Result "1-0"]
[WhiteElo "2812"]
[BlackElo "2700"]
[ECO "B07"]
[Opening "Pirc Defence, Byrne Variation"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6
Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4
15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21.
Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5
27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4
33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4
39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`
  },
  {
    id: 3,
    white: 'Morphy, Paul', white_elo: null,
    black: 'Duke of Brunswick and Count Isouard', black_elo: null,
    event: 'Casual Game', site: 'Paris FRA',
    date: '1858.11.02', round: '-', result: '1-0',
    eco: 'C41',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Casual Game"]
[Site "Paris FRA"]
[Date "1858.11.02"]
[Round "-"]
[White "Morphy, Paul"]
[Black "Duke of Brunswick and Count Isouard"]
[Result "1-0"]
[WhiteElo "?"]
[BlackElo "?"]
[ECO "C41"]
[Opening "Philidor Defence"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7
14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`
  },
  {
    id: 4,
    white: 'Byrne, Donald', white_elo: null,
    black: 'Fischer, Robert J', black_elo: null,
    event: 'Third Rosenwald Trophy', site: 'New York, NY USA',
    date: '1956.10.17', round: '8', result: '0-1',
    eco: 'D97',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Third Rosenwald Trophy"]
[Site "New York, NY USA"]
[Date "1956.10.17"]
[Round "8"]
[White "Byrne, Donald"]
[Black "Fischer, Robert J"]
[Result "0-1"]
[WhiteElo "?"]
[BlackElo "?"]
[ECO "D97"]
[Opening "Grünfeld Defence, Russian Variation"]

1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8.
e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7
Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1
Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3
Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8
b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+
39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2# 0-1`
  },
  {
    id: 5,
    white: 'Fischer, Robert J', white_elo: 2785,
    black: 'Spassky, Boris V', black_elo: 2660,
    event: 'World Championship 28th', site: 'Reykjavik ISL',
    date: '1972.07.23', round: '6', result: '1-0',
    eco: 'D59',
    ply_count: null,
    movetext: null,
    pgn: `[Event "World Championship 28th"]
[Site "Reykjavik ISL"]
[Date "1972.07.23"]
[Round "6"]
[White "Fischer, Robert J"]
[Black "Spassky, Boris V"]
[Result "1-0"]
[WhiteElo "2785"]
[BlackElo "2660"]
[ECO "D59"]
[Opening "Queen’s Gambit Declined, Tartakower"]

1. c4 e6 2. Nf3 d5 3. d4 Nf6 4. Nc3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 8. cxd5
Nxd5 9. Bxe7 Qxe7 10. Nxd5 exd5 11. Rc1 Be6 12. Qa4 c5 13. Qa3 Rc8 14. Bb5 a6
15. dxc5 bxc5 16. O-O Ra7 17. Be2 Nd7 18. Nd4 Qf8 19. Nxe6 fxe6 20. e4 d4 21.
f4 Qe7 22. e5 Rb8 23. Bc4 Kh8 24. Qh3 Nf8 25. b3 a5 26. f5 exf5 27. Rxf5 Nh7
28. Rcf1 Qd8 29. Qg3 Re7 30. h4 Rbb7 31. e6 Rbc7 32. Qe5 Qe8 33. a4 Qd8 34.
R1f2 Qe8 35. R2f3 Qd8 36. Bd3 Qe8 37. Qe4 Nf6 38. Rxf6 gxf6 39. Rxf6 Kg8 40.
Bc4 Kh8 41. Qf4 1-0`
  },
  ...ANNOTATED
];
