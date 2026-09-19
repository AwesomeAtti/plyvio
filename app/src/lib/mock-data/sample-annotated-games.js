/**
 * The annotated sample games — twenty-five games from `samples/pgn/gothamchess-annotated.pgn`,
 * every ply carrying [%clk], [%eval] and [%bestmove] under a document-level [%engine].
 *
 * WHY THESE LIVE IN THEIR OWN FILE. `games.js` is a hand-maintained table and says so; a
 * hundred and twenty-six kilobytes of PGN pasted into it would make that claim false. These
 * were lifted out of the corpus once, by a throwaway script, and are committed as data. They
 * are edited the same way every other sample row is — by hand, here — and nothing regenerates
 * them at build time.
 *
 * THE SHAPE IS A ROW, NOT A GAME. `pgn` holds the document; `movetext` and `ply_count` are
 * NULL, which is what every row in `samples/` looks like after an import (§4) and what §3.1's
 * precedence exists to resolve. Positions, evaluations and best moves are read at runtime.
 *
 * HOW THE TWENTY-FIVE WERE CHOSEN. Coverage, not the first twenty-five in the file: both
 * colours (12 White / 13 Black), all three results including three draws, twenty-five distinct
 * ECO codes, ten games containing a mate score, and a length range from 31 plies to 271 — the
 * two ends of the density study the Moves Section was drawn against. Nine games in the corpus
 * run shorter than 31 plies and were left out, because a sample-data test asserts every shipped
 * game reads more than thirty plies out of its PGN.
 *
 * The corpus holds 533 games. The rest stay in `samples/` and are the test suite's, not the
 * application's.
 */

export const ANNOTATED = [
  {
    id: 6,
    white: 'mmgchess', white_elo: 2974,
    black: 'GothamChess', black_elo: 3021,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.04', round: '-', result: '0-1',
    eco: 'A04',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.04"]
[Round "-"]
[White "mmgchess"]
[Black "GothamChess"]
[Result "0-1"]
[CurrentPosition "8/4p3/2k3r1/8/1p6/1K6/3N4/8 w - - 0 50"]
[Timezone "UTC"]
[ECO "A04"]
[ECOUrl "https://www.chess.com/openings/Reti-Opening-Kingside-Fianchetto-Variation-2.g3-Bg7-3.Bg2-d6-4.O-O"]
[UTCDate "2026.08.04"]
[UTCTime "20:06:16"]
[WhiteElo "2974"]
[BlackElo "3021"]
[TimeControl "60"]
[Termination "GothamChess won by resignation"]
[StartTime "20:06:16"]
[EndDate "2026.08.04"]
[EndTime "20:07:55"]
[Link "https://www.chess.com/game/live/172533671086"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:50:18Z"] } 1. Nf3 { [%clk 0:00:59.9] [%eval 0.25] [%bestmove e2e4] } 1... g6 { [%clk 0:00:58.7] [%eval 0.61] [%bestmove g8f6] } 2. g3 { [%clk 0:00:59.6] [%eval 0.15] [%bestmove e2e4] } 2... Bg7 { [%clk 0:00:58.4] [%eval 0.23] [%bestmove d7d5] } 3. Bg2 { [%clk 0:00:59.5] [%eval 0.01] [%bestmove d2d4] } 3... d6 { [%clk 0:00:58.1] [%eval 0.42] [%bestmove e7e5] } 4. O-O { [%clk 0:00:59.3] [%eval 0.15] [%bestmove d2d4] } 4... Bd7 { [%clk 0:00:58] [%eval 0.65] [%bestmove e7e5] } 5. d3 { [%clk 0:00:59] [%eval 0.13] [%bestmove d2d4] } 5... Qc8 { [%clk 0:00:57.9] [%eval 0.37] [%bestmove c7c5] } 6. Nbd2 { [%clk 0:00:58.8] [%eval 0.07] [%bestmove d3d4] } 6... Bh3 { [%clk 0:00:57.6] [%eval 0.32] [%bestmove c7c5] } 7. e4 { [%clk 0:00:58.5] [%eval 0.06] [%bestmove g2h3] } 7... h5 { [%clk 0:00:57.2] [%eval 0.55] [%bestmove c7c5] } 8. Bxh3 { [%clk 0:00:55.8] [%eval 0.39] [%bestmove c2c3] } 8... Qxh3 { [%clk 0:00:57.1] [%eval 0.54] [%bestmove c8h3] } 9. Ng5 { [%clk 0:00:55.6] [%eval 0.22] [%bestmove c2c3] } 9... Qg4 { [%clk 0:00:56.4] [%eval 0.28] [%bestmove h3g4] } 10. h4 { [%clk 0:00:55.5] [%eval 0.16] [%bestmove f2f4] } 10... Bf6 { [%clk 0:00:55.5] [%eval 0.53] [%bestmove g4d1] } 11. Ngf3 { [%clk 0:00:52.5] [%eval 0.34] [%bestmove g5f3] } 11... g5 { [%clk 0:00:54.4] [%eval 0.96] [%bestmove c7c5] } 12. hxg5 { [%clk 0:00:48] [%eval -0.08] [%bestmove f3g5] } 12... Bxg5 { [%clk 0:00:52.9] [%eval 0.06] [%bestmove f6g5] } 13. Nxg5 { [%clk 0:00:46.9] [%eval -0.07] [%bestmove f3g5] } 13... Qxg5 { [%clk 0:00:52.8] [%eval -0.17] [%bestmove g4g5] } 14. Nc4 { [%clk 0:00:46.1] [%eval -0.80] [%bestmove g1g2] } 14... Qg6 { [%clk 0:00:51.7] [%eval -0.62] [%bestmove g5g7] } 15. Kg2 { [%clk 0:00:44] [%eval -0.68] [%bestmove g1g2] } 15... Nc6 { [%clk 0:00:51.2] [%eval -0.63] [%bestmove b8c6] } 16. Rh1 { [%clk 0:00:43.5] [%eval -0.61] [%bestmove b2b4] } 16... O-O-O { [%clk 0:00:50.3] [%eval -0.53] [%bestmove g8f6] } 17. c3 { [%clk 0:00:43.1] [%eval -1.50] [%bestmove h1h4] } 17... Nf6 { [%clk 0:00:49.9] [%eval -1.14] [%bestmove g8f6] } 18. Qf3 { [%clk 0:00:41.5] [%eval -1.26] [%bestmove d1f3] } 18... h4 { [%clk 0:00:49.1] [%eval -1.09] [%bestmove h5h4] } 19. Qf5+ { [%clk 0:00:40.7] [%eval -1.22] [%bestmove f3f5] } 19... Qxf5 { [%clk 0:00:48.2] [%eval -1.24] [%bestmove g6f5] } 20. exf5 { [%clk 0:00:40.6] [%eval -1.32] [%bestmove e4f5] } 20... hxg3 { [%clk 0:00:47.8] [%eval -1.42] [%bestmove d6d5] } 21. Rxh8 { [%clk 0:00:40.2] [%eval -2.05] [%bestmove c1g5] } 21... Rxh8 { [%clk 0:00:47.5] [%eval -2.02] [%bestmove d8h8] } 22. fxg3 { [%clk 0:00:39.9] [%eval -2.05] [%bestmove f2g3] } 22... Rh5 { [%clk 0:00:46] [%eval -1.87] [%bestmove h8h5] } 23. Ne3 { [%clk 0:00:39] [%eval -1.66] [%bestmove d3d4] } 23... Ne5 { [%clk 0:00:43.8] [%eval -1.65] [%bestmove c6e5] } 24. d4 { [%clk 0:00:38.5] [%eval -1.18] [%bestmove d3d4] } 24... Nd3 { [%clk 0:00:43.3] [%eval -1.32] [%bestmove e5d3] } 25. Bd2 { [%clk 0:00:36.9] [%eval -1.17] [%bestmove b2b3] } 25... Nxb2 { [%clk 0:00:42.6] [%eval -1.21] [%bestmove d3b2] } 26. g4 { [%clk 0:00:35.6] [%eval -1.41] [%bestmove c3c4] } 26... Rh8 { [%clk 0:00:40.9] [%eval -1.53] [%bestmove h5h7] } 27. Rb1 { [%clk 0:00:34.7] [%eval -1.65] [%bestmove c3c4] } 27... Nd3 { [%clk 0:00:39.3] [%eval -1.23] [%bestmove b2d3] } 28. Nf1 { [%clk 0:00:31.9] [%eval -3.87] [%bestmove d2e1] } 28... Ne4 { [%clk 0:00:37.9] [%eval -2.13] [%bestmove f6g4] } 29. Be3 { [%clk 0:00:29.1] [%eval -1.22] [%bestmove d2e3] } 29... Nxc3 { [%clk 0:00:34.9] [%eval 0.00] [%bestmove h8h4] } 30. Rb3 { [%clk 0:00:28.6] [%eval 0.55] [%bestmove b1b3] } 30... Nxa2 { [%clk 0:00:31.6] [%eval 0.77] [%bestmove d3e1] } 31. Rxd3 { [%clk 0:00:25.5] [%eval 0.64] [%bestmove b3d3] } 31... Nb4 { [%clk 0:00:31.4] [%eval 0.74] [%bestmove a2b4] } 32. Rb3 { [%clk 0:00:24.3] [%eval 0.66] [%bestmove d3a3] } 32... a5 { [%clk 0:00:30.6] [%eval 0.64] [%bestmove a7a5] } 33. g5 { [%clk 0:00:22.9] [%eval 0.41] [%bestmove e3d2] } 33... Rg8 { [%clk 0:00:29.7] [%eval 0.54] [%bestmove b7b6] } 34. Bd2 { [%clk 0:00:21.9] [%eval 0.07] [%bestmove g2f3] } 34... c5 { [%clk 0:00:28.2] [%eval 1.13] [%bestmove b4c2] } 35. dxc5 { [%clk 0:00:21.1] [%eval 0.72] [%bestmove d4c5] } 35... dxc5 { [%clk 0:00:28.1] [%eval 0.86] [%bestmove d6c5] } 36. Ng3 { [%clk 0:00:20.3] [%eval 0.65] [%bestmove f1g3] } 36... b6 { [%clk 0:00:27.2] [%eval 1.07] [%bestmove c8d7] } 37. Ne4 { [%clk 0:00:19.8] [%eval 0.99] [%bestmove g3e4] } 37... Kd7 { [%clk 0:00:26.5] [%eval 1.09] [%bestmove c8d7] } 38. Bxb4 { [%clk 0:00:18.8] [%eval -0.47] [%bestmove b3h3] } 38... axb4 { [%clk 0:00:26.1] [%eval 0.00] [%bestmove c5b4] } 39. Kf3 { [%clk 0:00:18.6] [%eval 0.00] [%bestmove g2g3] } 39... Kc6 { [%clk 0:00:25.3] [%eval 0.00] [%bestmove d7c6] } 40. Rd3 { [%clk 0:00:18.3] [%eval -1.15] [%bestmove f3f4] } 40... b5 { [%clk 0:00:24] [%eval 0.04] [%bestmove c5c4] } 41. Rd1 { [%clk 0:00:17.9] [%eval -0.58] [%bestmove d3b3] } 41... b3 { [%clk 0:00:23.4] [%eval -0.37] [%bestmove c5c4] } 42. Kf4 { [%clk 0:00:17.6] [%eval -1.04] [%bestmove d1g1] } 42... c4 { [%clk 0:00:23] [%eval -1.60] [%bestmove c5c4] } 43. Ke3 { [%clk 0:00:16.9] [%eval -1.89] [%bestmove d1c1] } 43... b4 { [%clk 0:00:22.6] [%eval -2.17] [%bestmove b5b4] } 44. Kd4 { [%clk 0:00:16.4] [%eval -4.97] [%bestmove d1g1] } 44... Rd8+ { [%clk 0:00:21.9] [%eval -5.11] [%bestmove g8d8] } 45. Kxc4 { [%clk 0:00:14.3] [%eval -4.79] [%bestmove d4c4] } 45... Rxd1 { [%clk 0:00:21.8] [%eval -4.81] [%bestmove d8d1] } 46. Kxb3 { [%clk 0:00:14.1] [%eval -5.10] [%bestmove c4b3] } 46... Rf1 { [%clk 0:00:20.9] [%eval -4.16] [%bestmove d1g1] } 47. g6 { [%clk 0:00:12.4] [%eval -4.93] [%bestmove g5g6] } 47... fxg6 { [%clk 0:00:18.6] [%eval -4.34] [%bestmove f7g6] } 48. fxg6 { [%clk 0:00:12.3] [%eval -4.55] [%bestmove f5g6] } 48... Rg1 { [%clk 0:00:18.1] [%eval -4.02] [%bestmove c6d5] } 49. Nd2 { [%clk 0:00:09.5] [%eval -5.20] [%bestmove b3b4] } 49... Rxg6 { [%clk 0:00:16.9] [%eval -4.90] [%bestmove c6c5] } 0-1`
  },
  {
    id: 7,
    white: 'Arifars', white_elo: 3031,
    black: 'GothamChess', black_elo: 3062,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.08', round: '-', result: '1-0',
    eco: 'A13',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.08"]
[Round "-"]
[White "Arifars"]
[Black "GothamChess"]
[Result "1-0"]
[CurrentPosition "r7/pp1qk3/n2pNN1r/2pP1Q2/2P3p1/P5Pp/1P3P1P/R3R1K1 b - - 0 26"]
[Timezone "UTC"]
[ECO "A13"]
[ECOUrl "https://www.chess.com/openings/English-Opening-Agincourt-Defense-2.Nf3"]
[UTCDate "2026.08.08"]
[UTCTime "02:28:13"]
[WhiteElo "3031"]
[BlackElo "3062"]
[TimeControl "60"]
[Termination "Arifars won by resignation"]
[StartTime "02:28:13"]
[EndDate "2026.08.08"]
[EndTime "02:29:16"]
[Link "https://www.chess.com/game/live/172683336836"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:48:48Z"] } 1. Nf3 { [%clk 0:00:57.4] [%eval 0.19] [%bestmove d2d4] } 1... e6 { [%clk 0:00:58.5] [%eval 0.21] [%bestmove d7d5] } 2. c4 { [%clk 0:00:57.3] [%eval 0.35] [%bestmove g2g3] } 2... g5 { [%clk 0:00:58] [%eval 0.75] [%bestmove d7d5] } 3. g3 { [%clk 0:00:57.2] [%eval 0.86] [%bestmove d2d4] } 3... g4 { [%clk 0:00:57.6] [%eval 1.00] [%bestmove f8g7] } 4. Ng1 { [%clk 0:00:56.7] [%eval 0.42] [%bestmove f3h4] } 4... h5 { [%clk 0:00:57.4] [%eval 0.70] [%bestmove d7d5] } 5. d4 { [%clk 0:00:56.5] [%eval 0.28] [%bestmove h2h3] } 5... h4 { [%clk 0:00:56.4] [%eval 0.25] [%bestmove h5h4] } 6. Bg2 { [%clk 0:00:55.7] [%eval -0.70] [%bestmove b1c3] } 6... h3 { [%clk 0:00:55.4] [%eval -0.41] [%bestmove h4h3] } 7. Bf1 { [%clk 0:00:55.1] [%eval -0.78] [%bestmove g2e4] } 7... f5 { [%clk 0:00:55.1] [%eval 0.30] [%bestmove d7d5] } 8. Nc3 { [%clk 0:00:55] [%eval -0.03] [%bestmove e2e4] } 8... c5 { [%clk 0:00:54.4] [%eval 0.25] [%bestmove d7d5] } 9. d5 { [%clk 0:00:54] [%eval 0.18] [%bestmove e2e4] } 9... Bg7 { [%clk 0:00:54.2] [%eval -0.37] [%bestmove d7d6] } 10. e4 { [%clk 0:00:52.9] [%eval -0.52] [%bestmove e2e4] } 10... Na6 { [%clk 0:00:49.4] [%eval 0.90] [%bestmove d7d6] } 11. exf5 { [%clk 0:00:50.1] [%eval 0.69] [%bestmove e4f5] } 11... exf5 { [%clk 0:00:48.5] [%eval 0.61] [%bestmove e6f5] } 12. Bd3 { [%clk 0:00:49.6] [%eval 0.57] [%bestmove f1d3] } 12... d6 { [%clk 0:00:47.9] [%eval 0.47] [%bestmove d7d6] } 13. Nge2 { [%clk 0:00:48.8] [%eval 0.40] [%bestmove g1e2] } 13... Nf6 { [%clk 0:00:45.2] [%eval 1.25] [%bestmove d8f6] } 14. a3 { [%clk 0:00:46.9] [%eval 0.45] [%bestmove e1g1] } 14... Kf7 { [%clk 0:00:44.8] [%eval 2.04] [%bestmove f6d7] } 15. O-O { [%clk 0:00:46.2] [%eval 2.04] [%bestmove d1c2] } 15... Bd7 { [%clk 0:00:44.3] [%eval 2.69] [%bestmove f6d7] } 16. Qc2 { [%clk 0:00:46.1] [%eval 2.59] [%bestmove d1c2] } 16... Kg6 { [%clk 0:00:42.3] [%eval 4.32] [%bestmove d8e8] } 17. Nf4+ { [%clk 0:00:45] [%eval 3.98] [%bestmove e2f4] } 17... Kf7 { [%clk 0:00:42.1] [%eval 4.52] [%bestmove g6f7] } 18. Bxf5 { [%clk 0:00:44] [%eval 4.01] [%bestmove f4e6] } 18... Bxf5 { [%clk 0:00:41.1] [%eval 4.49] [%bestmove a6c7] } 19. Qxf5 { [%clk 0:00:43.9] [%eval 3.89] [%bestmove c2f5] } 19... Qd7 { [%clk 0:00:41] [%eval 4.25] [%bestmove a6c7] } 20. Ne6 { [%clk 0:00:43.3] [%eval 3.69] [%bestmove c3e4] } 20... Bh6 { [%clk 0:00:39.7] [%eval 6.78] [%bestmove h8h5] } 21. Bg5 { [%clk 0:00:41.7] [%eval 7.03] [%bestmove c3e4] } 21... Bxg5 { [%clk 0:00:38] [%eval 6.38] [%bestmove h6g5] } 22. Nxg5+ { [%clk 0:00:41.6] [%eval 6.48] [%bestmove c3e4] } 22... Kg7 { [%clk 0:00:37.7] [%eval 6.48] [%bestmove f7g7] } 23. Ne6+ { [%clk 0:00:41.2] [%eval 6.68] [%bestmove g5e6] } 23... Kf7 { [%clk 0:00:37.1] [%eval 8.11] [%bestmove d7e6] } 24. Ne4 { [%clk 0:00:40.9] [%eval 8.70] [%bestmove c3e4] } 24... Rh6 { [%clk 0:00:35.3] [%eval 9.07] [%bestmove d7e7] } 25. Rfe1 { [%clk 0:00:38.8] [%eval 5.75] [%bestmove e4f6] } 25... Ke7 { [%clk 0:00:30.1] [%eval 10.17] [%bestmove d7e7] } 26. Nxf6 { [%clk 0:00:36.2] [%eval 10.34] [%bestmove e4f6] } 1-0`
  },
  {
    id: 8,
    white: 'navpad', white_elo: 2980,
    black: 'GothamChess', black_elo: 3049,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.08', round: '-', result: '0-1',
    eco: 'C10',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.08"]
[Round "-"]
[White "navpad"]
[Black "GothamChess"]
[Result "0-1"]
[CurrentPosition "4rrk1/p5p1/1p4Qp/3b1p2/6n1/2K5/PP3q2/R3R3 b - - 1 26"]
[Timezone "UTC"]
[ECO "C10"]
[ECOUrl "https://www.chess.com/openings/French-Defense-Rubinstein-Variation-4.Nxe4-Nf6"]
[UTCDate "2026.08.08"]
[UTCTime "02:11:04"]
[WhiteElo "2980"]
[BlackElo "3049"]
[TimeControl "60"]
[Termination "GothamChess won by resignation"]
[StartTime "02:11:04"]
[EndDate "2026.08.08"]
[EndTime "02:12:09"]
[Link "https://www.chess.com/game/live/172682958078"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:49:01Z"] } 1. e4 { [%clk 0:00:59.9] [%eval 0.26] [%bestmove d2d4] } 1... e6 { [%clk 0:00:59.3] [%eval 0.36] [%bestmove c7c5] } 2. d4 { [%clk 0:00:59.4] [%eval 0.31] [%bestmove d2d4] } 2... d5 { [%clk 0:00:58.9] [%eval 0.31] [%bestmove d7d5] } 3. Nd2 { [%clk 0:00:58.9] [%eval 0.21] [%bestmove b1c3] } 3... dxe4 { [%clk 0:00:58.5] [%eval 0.59] [%bestmove c7c5] } 4. Nxe4 { [%clk 0:00:58.4] [%eval 0.58] [%bestmove d2e4] } 4... Nf6 { [%clk 0:00:58.4] [%eval 0.59] [%bestmove b8d7] } 5. Ng5 { [%clk 0:00:57.8] [%eval -0.74] [%bestmove e4f6] } 5... c5 { [%clk 0:00:57.7] [%eval -0.73] [%bestmove c7c5] } 6. c3 { [%clk 0:00:57.4] [%eval -0.91] [%bestmove g5f3] } 6... cxd4 { [%clk 0:00:57.1] [%eval -1.04] [%bestmove c5d4] } 7. cxd4 { [%clk 0:00:57.3] [%eval -2.47] [%bestmove d1d4] } 7... Nc6 { [%clk 0:00:56.6] [%eval -1.46] [%bestmove f8b4] } 8. N1f3 { [%clk 0:00:56.8] [%eval -2.19] [%bestmove g5f3] } 8... h6 { [%clk 0:00:56.1] [%eval -2.96] [%bestmove h7h6] } 9. Nxf7 { [%clk 0:00:56.2] [%eval -2.96] [%bestmove g5h3] } 9... Kxf7 { [%clk 0:00:56] [%eval -3.15] [%bestmove e8f7] } 10. Bd3 { [%clk 0:00:55.9] [%eval -3.23] [%bestmove a2a3] } 10... Bb4+ { [%clk 0:00:55.1] [%eval -3.31] [%bestmove f8b4] } 11. Bd2 { [%clk 0:00:55.1] [%eval -3.48] [%bestmove c1d2] } 11... Bxd2+ { [%clk 0:00:54.3] [%eval -3.85] [%bestmove h8f8] } 12. Qxd2 { [%clk 0:00:55] [%eval -3.57] [%bestmove d1d2] } 12... Rf8 { [%clk 0:00:52.9] [%eval -3.38] [%bestmove h8f8] } 13. O-O { [%clk 0:00:54.4] [%eval -3.50] [%bestmove e1g1] } 13... Kg8 { [%clk 0:00:52.3] [%eval -3.60] [%bestmove f7g8] } 14. Rfe1 { [%clk 0:00:54] [%eval -3.57] [%bestmove f1e1] } 14... Qd6 { [%clk 0:00:51.2] [%eval -3.67] [%bestmove f6d5] } 15. Qe3 { [%clk 0:00:53.2] [%eval -3.43] [%bestmove f3e5] } 15... b6 { [%clk 0:00:50.2] [%eval -3.25] [%bestmove c8d7] } 16. Ne5 { [%clk 0:00:52.5] [%eval -3.26] [%bestmove a1c1] } 16... Nxd4 { [%clk 0:00:47.5] [%eval -2.24] [%bestmove c8b7] } 17. Qg3 { [%clk 0:00:51.9] [%eval -3.11] [%bestmove a1d1] } 17... Nf5 { [%clk 0:00:45.8] [%eval -2.60] [%bestmove c8b7] } 18. Qg6 { [%clk 0:00:48.7] [%eval -3.94] [%bestmove g3f3] } 18... Bb7 { [%clk 0:00:42.5] [%eval -4.02] [%bestmove c8b7] } 19. Bc4 { [%clk 0:00:47.4] [%eval -3.88] [%bestmove d3f5] } 19... Bd5 { [%clk 0:00:39.4] [%eval -4.07] [%bestmove b7d5] } 20. Bd3 { [%clk 0:00:44.5] [%eval -4.61] [%bestmove a1d1] } 20... Rae8 { [%clk 0:00:38.1] [%eval -4.47] [%bestmove f5e7] } 21. Ng4 { [%clk 0:00:35.4] [%eval -5.02] [%bestmove a1d1] } 21... Nxg4 { [%clk 0:00:34.2] [%eval -4.69] [%bestmove f6g4] } 22. Bxf5 { [%clk 0:00:34.7] [%eval #-3] [%bestmove g6g4] } 22... Qxh2+ { [%clk 0:00:31.5] [%eval #-2] [%bestmove d6h2] } 23. Kf1 { [%clk 0:00:33.3] [%eval #-2] [%bestmove g1f1] } 23... Qxg2+ { [%clk 0:00:30] [%eval -12.53] [%bestmove d5c4] } 24. Ke2 { [%clk 0:00:32] [%eval -13.08] [%bestmove f1e2] } 24... exf5+ { [%clk 0:00:29.3] [%eval -14.63] [%bestmove e6f5] } 25. Kd2 { [%clk 0:00:31.6] [%eval -19.07] [%bestmove g6e6] } 25... Qxf2+ { [%clk 0:00:28.3] [%eval -19.60] [%bestmove g2f2] } 26. Kc3 { [%clk 0:00:30.5] [%eval #-4] [%bestmove d2d3] } 0-1`
  },
  {
    id: 9,
    white: 'A4RookA3', white_elo: 2906,
    black: 'GothamChess', black_elo: 3074,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.08', round: '-', result: '0-1',
    eco: 'A46',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.08"]
[Round "-"]
[White "A4RookA3"]
[Black "GothamChess"]
[Result "0-1"]
[CurrentPosition "r4r1k/1bpnqp1p/1p1p2p1/p2Pp3/2P1P3/6Pn/PP1N1PNP/R2QRBK1 w - - 2 17"]
[Timezone "UTC"]
[ECO "A46"]
[ECOUrl "https://www.chess.com/openings/Indian-Game-London-System-3...b6-4.Nbd2"]
[UTCDate "2026.08.08"]
[UTCTime "02:20:28"]
[WhiteElo "2906"]
[BlackElo "3074"]
[TimeControl "60"]
[Termination "GothamChess won by resignation"]
[StartTime "02:20:28"]
[EndDate "2026.08.08"]
[EndTime "02:21:12"]
[Link "https://www.chess.com/game/live/172683164846"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:48:55Z"] } 1. Nf3 { [%clk 0:00:59.8] [%eval 0.25] [%bestmove d2d4] } 1... e6 { [%clk 0:00:58.5] [%eval 0.32] [%bestmove d7d5] } 2. d4 { [%clk 0:00:58.8] [%eval 0.29] [%bestmove c2c4] } 2... Nf6 { [%clk 0:00:57.5] [%eval 0.32] [%bestmove d7d5] } 3. Bf4 { [%clk 0:00:58.3] [%eval 0.20] [%bestmove c2c4] } 3... b6 { [%clk 0:00:57.2] [%eval 0.23] [%bestmove c7c5] } 4. Nbd2 { [%clk 0:00:56.7] [%eval 0.24] [%bestmove e2e3] } 4... Nh5 { [%clk 0:00:56.7] [%eval 0.62] [%bestmove c8b7] } 5. Bg5 { [%clk 0:00:55.9] [%eval 0.32] [%bestmove f4g5] } 5... Be7 { [%clk 0:00:55.8] [%eval 0.17] [%bestmove f7f6] } 6. Bxe7 { [%clk 0:00:55.2] [%eval 0.24] [%bestmove h2h4] } 6... Qxe7 { [%clk 0:00:55.7] [%eval 0.24] [%bestmove d8e7] } 7. e4 { [%clk 0:00:54.7] [%eval 0.21] [%bestmove g2g3] } 7... Bb7 { [%clk 0:00:54.2] [%eval 0.45] [%bestmove c8b7] } 8. g3 { [%clk 0:00:53.6] [%eval 0.48] [%bestmove g2g3] } 8... d6 { [%clk 0:00:53] [%eval 0.43] [%bestmove h5f6] } 9. Bd3 { [%clk 0:00:52.9] [%eval 0.33] [%bestmove e4e5] } 9... Nd7 { [%clk 0:00:52.3] [%eval 0.31] [%bestmove b8d7] } 10. O-O { [%clk 0:00:52.2] [%eval 0.17] [%bestmove d1e2] } 10... O-O { [%clk 0:00:51.4] [%eval 0.28] [%bestmove g7g6] } 11. Re1 { [%clk 0:00:51.8] [%eval 0.25] [%bestmove f1e1] } 11... e5 { [%clk 0:00:51] [%eval 0.21] [%bestmove e6e5] } 12. d5 { [%clk 0:00:50.8] [%eval -0.18] [%bestmove d3f1] } 12... g6 { [%clk 0:00:49.6] [%eval -0.29] [%bestmove g7g6] } 13. Nh4 { [%clk 0:00:47] [%eval -0.21] [%bestmove a2a3] } 13... Nf4 { [%clk 0:00:47.6] [%eval 0.03] [%bestmove a7a5] } 14. Bf1 { [%clk 0:00:44.3] [%eval -0.08] [%bestmove d2f3] } 14... Kh8 { [%clk 0:00:45.1] [%eval 0.06] [%bestmove f4h5] } 15. c4 { [%clk 0:00:41.6] [%eval -0.32] [%bestmove d2f3] } 15... a5 { [%clk 0:00:44] [%eval -0.51] [%bestmove a7a5] } 16. Ng2 { [%clk 0:00:41] [%eval -5.83] [%bestmove d2f3] } 16... Nh3+ { [%clk 0:00:42.9] [%eval -6.64] [%bestmove f4h3] } 0-1`
  },
  {
    id: 10,
    white: 'GothamChess', white_elo: 3042,
    black: 'navpad', black_elo: 2987,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.08', round: '-', result: '1-0',
    eco: 'A15',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.08"]
[Round "-"]
[White "GothamChess"]
[Black "navpad"]
[Result "1-0"]
[CurrentPosition "1rbqr1k1/4ppbp/3p1Bp1/2pP4/P1n1P3/3B1N1P/5PP1/RN1Q1RK1 b - - 0 17"]
[Timezone "UTC"]
[ECO "A15"]
[ECOUrl "https://www.chess.com/openings/English-Opening-Anglo-Indian-Kings-Indian-Defense...5.e3-d6-6.d4-Nbd7"]
[UTCDate "2026.08.08"]
[UTCTime "02:10:40"]
[WhiteElo "3042"]
[BlackElo "2987"]
[TimeControl "60"]
[Termination "GothamChess won by resignation"]
[StartTime "02:10:40"]
[EndDate "2026.08.08"]
[EndTime "02:11:01"]
[Link "https://www.chess.com/game/live/172682949462"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:49:02Z"] } 1. b3 { [%clk 0:00:59.9] [%eval -0.27] [%bestmove d2d4] } 1... Nf6 { [%clk 0:00:58.6] [%eval 0.03] [%bestmove e7e5] } 2. Bb2 { [%clk 0:00:59.8] [%eval 0.11] [%bestmove c1b2] } 2... d6 { [%clk 0:00:58.2] [%eval 0.17] [%bestmove g7g6] } 3. e3 { [%clk 0:00:59.7] [%eval 0.11] [%bestmove d2d4] } 3... Nbd7 { [%clk 0:00:57.8] [%eval 0.15] [%bestmove g7g6] } 4. Nf3 { [%clk 0:00:59.4] [%eval 0.16] [%bestmove g1f3] } 4... g6 { [%clk 0:00:57.5] [%eval 0.16] [%bestmove e7e5] } 5. d4 { [%clk 0:00:59.3] [%eval 0.17] [%bestmove d2d4] } 5... Bg7 { [%clk 0:00:57] [%eval 0.11] [%bestmove f8g7] } 6. c4 { [%clk 0:00:59.1] [%eval 0.13] [%bestmove c2c4] } 6... O-O { [%clk 0:00:56.9] [%eval 0.10] [%bestmove e8g8] } 7. Be2 { [%clk 0:00:58.5] [%eval -0.01] [%bestmove f1e2] } 7... Re8 { [%clk 0:00:56.6] [%eval -0.03] [%bestmove f8e8] } 8. O-O { [%clk 0:00:58.1] [%eval -0.04] [%bestmove b1c3] } 8... c6 { [%clk 0:00:56.3] [%eval 0.16] [%bestmove c7c6] } 9. d5 { [%clk 0:00:57.7] [%eval -0.77] [%bestmove h2h3] } 9... c5 { [%clk 0:00:55.5] [%eval 0.78] [%bestmove c6d5] } 10. Bd3 { [%clk 0:00:56.9] [%eval 0.50] [%bestmove d1c2] } 10... a6 { [%clk 0:00:55] [%eval 0.73] [%bestmove e7e6] } 11. a4 { [%clk 0:00:55.7] [%eval 0.39] [%bestmove a2a4] } 11... Rb8 { [%clk 0:00:54.6] [%eval 0.80] [%bestmove d7f8] } 12. a5 { [%clk 0:00:55.2] [%eval 0.34] [%bestmove b1c3] } 12... b5 { [%clk 0:00:53.9] [%eval 0.56] [%bestmove b7b5] } 13. axb6 { [%clk 0:00:55.1] [%eval 0.41] [%bestmove a5b6] } 13... Nxb6 { [%clk 0:00:53.5] [%eval 0.67] [%bestmove e7e6] } 14. h3 { [%clk 0:00:54.6] [%eval 0.53] [%bestmove d1c2] } 14... a5 { [%clk 0:00:52.6] [%eval 1.20] [%bestmove e7e6] } 15. e4 { [%clk 0:00:54.1] [%eval 0.60] [%bestmove b2c3] } 15... a4 { [%clk 0:00:52.1] [%eval 0.47] [%bestmove a5a4] } 16. bxa4 { [%clk 0:00:51.8] [%eval -0.39] [%bestmove b2c3] } 16... Nxc4 { [%clk 0:00:51.3] [%eval -0.36] [%bestmove b6d5] } 17. Bxf6 { [%clk 0:00:50.7] [%eval -1.50] [%bestmove b2c3] } 1-0`
  },
  {
    id: 11,
    white: 'RandomPatzer123', white_elo: 2934,
    black: 'GothamChess', black_elo: 2926,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.11', round: '-', result: '1-0',
    eco: 'B10',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.11"]
[Round "-"]
[White "RandomPatzer123"]
[Black "GothamChess"]
[Result "1-0"]
[CurrentPosition "r4rk1/pp1N1ppp/4p3/2qn4/8/2P4P/PP2QPP1/R4RK1 b - - 1 17"]
[Timezone "UTC"]
[ECO "B10"]
[ECOUrl "https://www.chess.com/openings/Caro-Kann-Defense-2.Nf3"]
[UTCDate "2026.08.11"]
[UTCTime "07:49:41"]
[WhiteElo "2934"]
[BlackElo "2926"]
[TimeControl "180"]
[Termination "RandomPatzer123 won by resignation"]
[StartTime "07:49:41"]
[EndDate "2026.08.11"]
[EndTime "07:51:23"]
[Link "https://www.chess.com/game/live/172828846366"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:48:15Z"] } 1. e4 { [%clk 0:02:59.4] [%eval 0.32] [%bestmove e2e4] } 1... c6 { [%clk 0:02:57.4] [%eval 0.31] [%bestmove e7e5] } 2. Nf3 { [%clk 0:02:58.2] [%eval 0.36] [%bestmove g1f3] } 2... Na6 { [%clk 0:02:56.9] [%eval 1.30] [%bestmove d7d5] } 3. Nc3 { [%clk 0:02:58.1] [%eval 0.84] [%bestmove f1a6] } 3... Nc7 { [%clk 0:02:56.1] [%eval 0.82] [%bestmove a6c7] } 4. d4 { [%clk 0:02:57.3] [%eval 0.84] [%bestmove d2d4] } 4... d5 { [%clk 0:02:56] [%eval 0.85] [%bestmove d7d6] } 5. Bd3 { [%clk 0:02:54.3] [%eval 0.75] [%bestmove e4e5] } 5... Bg4 { [%clk 0:02:55.3] [%eval 0.88] [%bestmove d5e4] } 6. h3 { [%clk 0:02:53.3] [%eval 0.95] [%bestmove h2h3] } 6... Bh5 { [%clk 0:02:54.3] [%eval 1.09] [%bestmove g4f3] } 7. O-O { [%clk 0:02:51] [%eval 0.78] [%bestmove e4d5] } 7... e6 { [%clk 0:02:53] [%eval 0.78] [%bestmove e7e6] } 8. Be2 { [%clk 0:02:47.2] [%eval 0.39] [%bestmove e4e5] } 8... Nf6 { [%clk 0:02:51.5] [%eval 0.59] [%bestmove g8f6] } 9. Bg5 { [%clk 0:02:39.6] [%eval 0.07] [%bestmove e4e5] } 9... Be7 { [%clk 0:02:50.1] [%eval 0.14] [%bestmove f8e7] } 10. exd5 { [%clk 0:02:37.6] [%eval -0.06] [%bestmove f3e5] } 10... Ncxd5 { [%clk 0:02:48.5] [%eval 0.29] [%bestmove e6d5] } 11. Nxd5 { [%clk 0:02:35.4] [%eval 0.26] [%bestmove c3d5] } 11... Nxd5 { [%clk 0:02:45.6] [%eval 0.20] [%bestmove e6d5] } 12. Bxe7 { [%clk 0:02:33.6] [%eval 0.13] [%bestmove g5c1] } 12... Qxe7 { [%clk 0:02:45.1] [%eval 0.33] [%bestmove d5e7] } 13. Ne5 { [%clk 0:02:33.3] [%eval 0.08] [%bestmove f3e5] } 13... Bxe2 { [%clk 0:02:42.4] [%eval 0.07] [%bestmove h5e2] } 14. Qxe2 { [%clk 0:02:33.2] [%eval 0.09] [%bestmove d1e2] } 14... O-O { [%clk 0:02:40.2] [%eval 0.08] [%bestmove e8g8] } 15. c3 { [%clk 0:02:31.9] [%eval 0.05] [%bestmove f1e1] } 15... c5 { [%clk 0:02:38.5] [%eval 0.93] [%bestmove e7c7] } 16. dxc5 { [%clk 0:02:30] [%eval 1.28] [%bestmove d4c5] } 16... Qxc5 { [%clk 0:02:38.4] [%eval 3.52] [%bestmove f8d8] } 17. Nd7 { [%clk 0:02:28.9] [%eval 3.49] [%bestmove e5d7] } 1-0`
  },
  {
    id: 12,
    white: 'GORA2012', white_elo: 2770,
    black: 'GothamChess', black_elo: 2924,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.18', round: '-', result: '0-1',
    eco: 'A50',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.18"]
[Round "-"]
[White "GORA2012"]
[Black "GothamChess"]
[Result "0-1"]
[CurrentPosition "r1bq1rk1/p1p2ppp/3p4/2pPp3/n1P1P3/1NPB1P2/P5PP/1R3RK1 w - - 0 17"]
[Timezone "UTC"]
[ECO "A50"]
[ECOUrl "https://www.chess.com/openings/Indian-Game-Accelerated-Variation-3.Nc3-Bb7-4.d5"]
[UTCDate "2026.08.18"]
[UTCTime "02:06:31"]
[WhiteElo "2770"]
[BlackElo "2924"]
[TimeControl "180"]
[Termination "GothamChess won by resignation"]
[StartTime "02:06:31"]
[EndDate "2026.08.18"]
[EndTime "02:07:51"]
[Link "https://www.chess.com/game/live/173148834030"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:47:46Z"] } 1. d4 { [%clk 0:02:59.8] [%eval 0.16] [%bestmove e2e4] } 1... Nf6 { [%clk 0:02:58.4] [%eval 0.16] [%bestmove g8f6] } 2. c4 { [%clk 0:02:57.8] [%eval 0.19] [%bestmove c2c4] } 2... b6 { [%clk 0:02:57.6] [%eval 0.58] [%bestmove e7e6] } 3. Nc3 { [%clk 0:02:57.1] [%eval 0.56] [%bestmove b1c3] } 3... Bb7 { [%clk 0:02:57] [%eval 0.77] [%bestmove d7d5] } 4. d5 { [%clk 0:02:56.8] [%eval 0.71] [%bestmove d4d5] } 4... e5 { [%clk 0:02:55.6] [%eval 0.71] [%bestmove e7e6] } 5. e4 { [%clk 0:02:56.4] [%eval 0.69] [%bestmove a2a3] } 5... Bb4 { [%clk 0:02:54.7] [%eval 0.81] [%bestmove f8b4] } 6. Bd3 { [%clk 0:02:54.8] [%eval 0.10] [%bestmove d1c2] } 6... Bxc3+ { [%clk 0:02:53.9] [%eval 0.32] [%bestmove b4c3] } 7. bxc3 { [%clk 0:02:54] [%eval 0.35] [%bestmove b2c3] } 7... Na6 { [%clk 0:02:52.9] [%eval 0.48] [%bestmove d7d6] } 8. Ne2 { [%clk 0:02:50.5] [%eval -0.27] [%bestmove f2f4] } 8... Nc5 { [%clk 0:02:49.9] [%eval -0.30] [%bestmove a6c5] } 9. f3 { [%clk 0:02:50.1] [%eval -0.58] [%bestmove e2g3] } 9... O-O { [%clk 0:02:43.8] [%eval -0.25] [%bestmove d7d6] } 10. O-O { [%clk 0:02:49.2] [%eval -0.26] [%bestmove e1g1] } 10... Ba6 { [%clk 0:02:41.8] [%eval -0.12] [%bestmove d7d6] } 11. Ba3 { [%clk 0:02:47.5] [%eval -0.84] [%bestmove f3f4] } 11... d6 { [%clk 0:02:39.1] [%eval -0.44] [%bestmove c5d3] } 12. Bxc5 { [%clk 0:02:46.2] [%eval -0.42] [%bestmove a3c5] } 12... bxc5 { [%clk 0:02:38] [%eval -0.43] [%bestmove b6c5] } 13. Qa4 { [%clk 0:02:45.3] [%eval -0.97] [%bestmove e2g3] } 13... Bc8 { [%clk 0:02:36.9] [%eval -0.75] [%bestmove a6c8] } 14. Rab1 { [%clk 0:02:42.6] [%eval -0.84] [%bestmove a4d1] } 14... Nd7 { [%clk 0:02:36.2] [%eval -0.68] [%bestmove g7g6] } 15. Nc1 { [%clk 0:02:23.9] [%eval -1.06] [%bestmove a4c2] } 15... Nb6 { [%clk 0:02:31.9] [%eval -1.01] [%bestmove d7b6] } 16. Nb3 { [%clk 0:02:23.5] [%eval -7.30] [%bestmove a4c2] } 16... Nxa4 { [%clk 0:02:24] [%eval -7.46] [%bestmove b6a4] } 0-1`
  },
  {
    id: 13,
    white: 'GothamChess', white_elo: 3087,
    black: 'ATM622', black_elo: 2907,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.19', round: '-', result: '1-0',
    eco: 'A00',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.19"]
[Round "-"]
[White "GothamChess"]
[Black "ATM622"]
[Result "1-0"]
[CurrentPosition "3r1r1k/pp3p1p/4bQ2/PPp5/8/N2qPP2/3P1K1P/R5R1 b - - 0 26"]
[Timezone "UTC"]
[ECO "A00"]
[ECOUrl "https://www.chess.com/openings/Polish-Opening-1...e5"]
[UTCDate "2026.08.19"]
[UTCTime "22:05:48"]
[WhiteElo "3087"]
[BlackElo "2907"]
[TimeControl "60"]
[Termination "GothamChess won by checkmate"]
[StartTime "22:05:48"]
[EndDate "2026.08.19"]
[EndTime "22:06:48"]
[Link "https://www.chess.com/game/live/173240482540"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:47:02Z"] } 1. b4 { [%clk 0:00:59.9] [%eval -0.18] [%bestmove d2d4] } 1... e5 { [%clk 0:00:59.1] [%eval -0.23] [%bestmove g8f6] } 2. b5 { [%clk 0:00:59.3] [%eval -0.82] [%bestmove c1b2] } 2... d5 { [%clk 0:00:58.1] [%eval -0.78] [%bestmove d7d5] } 3. a4 { [%clk 0:00:58.8] [%eval -1.10] [%bestmove c1b2] } 3... Nd7 { [%clk 0:00:57.5] [%eval -0.80] [%bestmove f8d6] } 4. Bb2 { [%clk 0:00:58.6] [%eval -0.85] [%bestmove e2e3] } 4... Ngf6 { [%clk 0:00:57.2] [%eval -0.77] [%bestmove g8f6] } 5. c4 { [%clk 0:00:58] [%eval -1.10] [%bestmove e2e3] } 5... c6 { [%clk 0:00:56.3] [%eval -0.52] [%bestmove d5d4] } 6. e3 { [%clk 0:00:56.4] [%eval -0.56] [%bestmove e2e3] } 6... Bc5 { [%clk 0:00:54.9] [%eval -0.38] [%bestmove e5e4] } 7. Nf3 { [%clk 0:00:55.9] [%eval -0.35] [%bestmove c4d5] } 7... e4 { [%clk 0:00:54.2] [%eval -0.14] [%bestmove e8g8] } 8. Nd4 { [%clk 0:00:55.3] [%eval -0.67] [%bestmove d2d4] } 8... O-O { [%clk 0:00:53.3] [%eval -0.66] [%bestmove e8g8] } 9. Be2 { [%clk 0:00:55] [%eval -0.70] [%bestmove f1e2] } 9... Bxd4 { [%clk 0:00:50.2] [%eval -0.12] [%bestmove f8e8] } 10. Bxd4 { [%clk 0:00:54.1] [%eval -0.05] [%bestmove b2d4] } 10... c5 { [%clk 0:00:49.8] [%eval -0.07] [%bestmove c6c5] } 11. Bb2 { [%clk 0:00:53.8] [%eval -0.07] [%bestmove d4b2] } 11... dxc4 { [%clk 0:00:48.4] [%eval 0.37] [%bestmove f8e8] } 12. Na3 { [%clk 0:00:52.6] [%eval 0.23] [%bestmove b1a3] } 12... Nb6 { [%clk 0:00:47.4] [%eval 0.49] [%bestmove c4c3] } 13. a5 { [%clk 0:00:51.8] [%eval 0.31] [%bestmove a4a5] } 13... Nbd5 { [%clk 0:00:46.5] [%eval 0.51] [%bestmove b6d5] } 14. Nxc4 { [%clk 0:00:51.6] [%eval 0.52] [%bestmove a3c4] } 14... Be6 { [%clk 0:00:45.3] [%eval 0.67] [%bestmove c8e6] } 15. O-O { [%clk 0:00:50.9] [%eval 0.54] [%bestmove e1g1] } 15... Nb4 { [%clk 0:00:44.7] [%eval 0.72] [%bestmove d8e7] } 16. f4 { [%clk 0:00:48.4] [%eval 0.18] [%bestmove f2f3] } 16... exf3 { [%clk 0:00:43.6] [%eval 0.46] [%bestmove b4d3] } 17. gxf3 { [%clk 0:00:47.2] [%eval 0.00] [%bestmove f1f3] } 17... Nd3 { [%clk 0:00:42.9] [%eval 0.53] [%bestmove d8e7] } 18. Bxf6 { [%clk 0:00:46.2] [%eval 0.33] [%bestmove b2f6] } 18... gxf6 { [%clk 0:00:40.5] [%eval 0.31] [%bestmove g7f6] } 19. Qc2 { [%clk 0:00:44.3] [%eval 0.38] [%bestmove d1c2] } 19... Nb4 { [%clk 0:00:39] [%eval 0.44] [%bestmove d3b4] } 20. Qc3 { [%clk 0:00:43.9] [%eval 0.26] [%bestmove c2e4] } 20... Nd5 { [%clk 0:00:38] [%eval 0.36] [%bestmove e6h3] } 21. Qb2 { [%clk 0:00:42.4] [%eval 0.53] [%bestmove c3c2] } 21... Nb4 { [%clk 0:00:36.8] [%eval 1.41] [%bestmove g8h8] } 22. Kf2 { [%clk 0:00:41.4] [%eval 0.51] [%bestmove d2d4] } 22... Nd3+ { [%clk 0:00:36.2] [%eval 4.63] [%bestmove d8e7] } 23. Bxd3 { [%clk 0:00:41] [%eval 5.11] [%bestmove e2d3] } 23... Qxd3 { [%clk 0:00:35.9] [%eval 5.35] [%bestmove g8h8] } 24. Na3 { [%clk 0:00:38.7] [%eval 0.07] [%bestmove f1g1] } 24... Rad8 { [%clk 0:00:35] [%eval 4.58] [%bestmove f8d8] } 25. Rg1+ { [%clk 0:00:36.1] [%eval 4.96] [%bestmove f1g1] } 25... Kh8 { [%clk 0:00:32.4] [%eval #1] [%bestmove d3g6] } 26. Qxf6# { [%clk 0:00:35.6] [%bestmove b2f6] } 1-0`
  },
  {
    id: 14,
    white: 'GothamChess', white_elo: 3118,
    black: 'anasta10', black_elo: 2988,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.20', round: '-', result: '1-0',
    eco: 'B06',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.20"]
[Round "-"]
[White "GothamChess"]
[Black "anasta10"]
[Result "1-0"]
[CurrentPosition "8/n7/P7/6k1/8/5K2/8/8 b - - 2 67"]
[Timezone "UTC"]
[ECO "B06"]
[ECOUrl "https://www.chess.com/openings/Modern-Defense-with-1-e4-2.Bc4-Bg7-3.Qf3-e6-4.d4"]
[UTCDate "2026.08.20"]
[UTCTime "16:57:25"]
[WhiteElo "3118"]
[BlackElo "2988"]
[TimeControl "60"]
[Termination "GothamChess won on time"]
[StartTime "16:57:25"]
[EndDate "2026.08.20"]
[EndTime "16:59:40"]
[Link "https://www.chess.com/game/live/173277146602"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:46:32Z"] } 1. e4 { [%clk 0:00:59.7] [%eval 0.49] [%bestmove e2e4] } 1... g6 { [%clk 0:00:59.9] [%eval 0.77] [%bestmove c7c6] } 2. Bc4 { [%clk 0:00:58.2] [%eval 0.29] [%bestmove b1c3] } 2... Bg7 { [%clk 0:00:58.7] [%eval 0.60] [%bestmove c7c6] } 3. Qf3 { [%clk 0:00:57.9] [%eval -0.24] [%bestmove d2d4] } 3... e6 { [%clk 0:00:58.4] [%eval -0.28] [%bestmove e7e6] } 4. d4 { [%clk 0:00:57.6] [%eval -0.81] [%bestmove g1e2] } 4... Ne7 { [%clk 0:00:58] [%eval -0.14] [%bestmove g7d4] } 5. Ne2 { [%clk 0:00:57.2] [%eval -0.28] [%bestmove g1e2] } 5... d5 { [%clk 0:00:57.2] [%eval 0.00] [%bestmove d7d5] } 6. Bb3 { [%clk 0:00:56.9] [%eval -0.32] [%bestmove e4d5] } 6... O-O { [%clk 0:00:56.3] [%eval -0.24] [%bestmove d5e4] } 7. h4 { [%clk 0:00:56.1] [%eval -0.33] [%bestmove e4d5] } 7... dxe4 { [%clk 0:00:54.8] [%eval -0.23] [%bestmove d5e4] } 8. Qxe4 { [%clk 0:00:56] [%eval -0.45] [%bestmove f3e4] } 8... Nbc6 { [%clk 0:00:53.9] [%eval -0.21] [%bestmove b8d7] } 9. c3 { [%clk 0:00:55.3] [%eval -1.07] [%bestmove b1c3] } 9... Nd5 { [%clk 0:00:52.9] [%eval 0.39] [%bestmove e6e5] } 10. h5 { [%clk 0:00:54.3] [%eval 0.00] [%bestmove h4h5] } 10... Nf6 { [%clk 0:00:52.5] [%eval 1.18] [%bestmove c6a5] } 11. Qf3 { [%clk 0:00:53.2] [%eval -0.48] [%bestmove e4h4] } 11... Nxh5 { [%clk 0:00:52] [%eval -0.21] [%bestmove f6h5] } 12. g4 { [%clk 0:00:52.2] [%eval -0.68] [%bestmove e2g3] } 12... Nf6 { [%clk 0:00:50.8] [%eval -0.01] [%bestmove h5f6] } 13. Bg5 { [%clk 0:00:51.9] [%eval -2.12] [%bestmove g4g5] } 13... e5 { [%clk 0:00:49] [%eval -2.24] [%bestmove e6e5] } 14. Nd2 { [%clk 0:00:50.8] [%eval -2.26] [%bestmove b1d2] } 14... exd4 { [%clk 0:00:48.1] [%eval -1.27] [%bestmove c8g4] } 15. O-O-O { [%clk 0:00:49.8] [%eval -3.03] [%bestmove d2e4] } 15... Bxg4 { [%clk 0:00:45.9] [%eval -3.55] [%bestmove c8g4] } 16. Qg3 { [%clk 0:00:43.5] [%eval -4.94] [%bestmove f3f4] } 16... Bxe2 { [%clk 0:00:44.5] [%eval -5.02] [%bestmove g4e2] } 17. Rde1 { [%clk 0:00:42.5] [%eval -5.32] [%bestmove g5f6] } 17... Bh5 { [%clk 0:00:43.1] [%eval -4.97] [%bestmove f8e8] } 18. Rxh5 { [%clk 0:00:41.3] [%eval -6.25] [%bestmove d2e4] } 18... Nxh5 { [%clk 0:00:41.7] [%eval -6.17] [%bestmove f6h5] } 19. Qh4 { [%clk 0:00:37] [%eval -6.58] [%bestmove g3h4] } 19... Qd6 { [%clk 0:00:37.9] [%eval -5.69] [%bestmove d8d7] } 20. Ne4 { [%clk 0:00:34.9] [%eval -5.71] [%bestmove d2e4] } 20... Qd7 { [%clk 0:00:32] [%eval -5.47] [%bestmove d6d7] } 21. Bd1 { [%clk 0:00:33.5] [%eval -5.64] [%bestmove b3d1] } 21... dxc3 { [%clk 0:00:27.4] [%eval -5.47] [%bestmove d4c3] } 22. Bxh5 { [%clk 0:00:31.8] [%eval -10.51] [%bestmove b2c3] } 22... cxb2+ { [%clk 0:00:26.8] [%eval -12.85] [%bestmove c3b2] } 23. Kc2 { [%clk 0:00:30.2] [%eval -16.97] [%bestmove c1c2] } 23... gxh5 { [%clk 0:00:23.5] [%eval -4.60] [%bestmove c6b4] } 24. Nf6+ { [%clk 0:00:28.4] [%eval -5.92] [%bestmove e4f6] } 24... Bxf6 { [%clk 0:00:22.4] [%eval -6.01] [%bestmove g7f6] } 25. Bxf6 { [%clk 0:00:28.3] [%eval -6.51] [%bestmove g5f6] } 25... Qf5+ { [%clk 0:00:21.7] [%eval -3.56] [%bestmove d7g4] } 26. Kxb2 { [%clk 0:00:26.7] [%eval -4.63] [%bestmove c2b2] } 26... Qg4 { [%clk 0:00:20] [%eval -3.83] [%bestmove f8d8] } 27. Qh1 { [%clk 0:00:23.1] [%eval -3.78] [%bestmove h4h1] } 27... Rfe8 { [%clk 0:00:17.9] [%eval -3.77] [%bestmove f8e8] } 28. Rg1 { [%clk 0:00:21.8] [%eval -4.05] [%bestmove e1g1] } 28... Re6 { [%clk 0:00:17.3] [%eval -0.27] [%bestmove g4g6] } 29. Rxg4+ { [%clk 0:00:20.2] [%eval -0.37] [%bestmove g1g4] } 29... hxg4 { [%clk 0:00:16.9] [%eval -0.33] [%bestmove h5g4] } 30. Qh6 { [%clk 0:00:20.1] [%eval -0.33] [%bestmove h1h6] } 30... Rxf6 { [%clk 0:00:16.5] [%eval -0.25] [%bestmove e6f6] } 31. Qxf6 { [%clk 0:00:20] [%eval -0.28] [%bestmove h6f6] } 31... Re8 { [%clk 0:00:15.9] [%eval -0.16] [%bestmove a8d8] } 32. Qg5+ { [%clk 0:00:19.5] [%eval -0.21] [%bestmove f6g5] } 32... Kf8 { [%clk 0:00:15.1] [%eval -0.20] [%bestmove g8f8] } 33. Qxg4 { [%clk 0:00:19.4] [%eval -0.20] [%bestmove g5g4] } 33... Re6 { [%clk 0:00:15] [%eval -0.31] [%bestmove e8d8] } 34. Qf4 { [%clk 0:00:18.4] [%eval -0.33] [%bestmove g4f4] } 34... h6 { [%clk 0:00:14.8] [%eval -0.10] [%bestmove e6e7] } 35. Qxc7 { [%clk 0:00:17.9] [%eval -0.10] [%bestmove f4c7] } 35... Re7 { [%clk 0:00:14.2] [%eval -0.10] [%bestmove e6e2] } 36. Qc8+ { [%clk 0:00:17.6] [%eval -0.10] [%bestmove c7c8] } 36... Kg7 { [%clk 0:00:13.5] [%eval 0.01] [%bestmove e7e8] } 37. Qg4+ { [%clk 0:00:17.3] [%eval -0.07] [%bestmove b2c3] } 37... Kf6 { [%clk 0:00:12.8] [%eval 0.00] [%bestmove g7f8] } 38. Qh3 { [%clk 0:00:17.2] [%eval -0.09] [%bestmove g4c8] } 38... Re2+ { [%clk 0:00:11.7] [%eval -0.10] [%bestmove e7e6] } 39. Kc3 { [%clk 0:00:15.3] [%eval -0.09] [%bestmove b2a1] } 39... Re6 { [%clk 0:00:11.1] [%eval -0.08] [%bestmove e2e5] } 40. Qh4+ { [%clk 0:00:14.7] [%eval -0.06] [%bestmove h3h6] } 40... Ke5 { [%clk 0:00:10.3] [%eval -0.01] [%bestmove f6f5] } 41. f4+ { [%clk 0:00:14.6] [%eval -0.10] [%bestmove h4g3] } 41... Kd6 { [%clk 0:00:10.2] [%eval -0.09] [%bestmove e5d6] } 42. f5 { [%clk 0:00:13.9] [%eval -0.10] [%bestmove f4f5] } 42... Re3+ { [%clk 0:00:09.5] [%eval -0.05] [%bestmove e6e7] } 43. Kd2 { [%clk 0:00:13.1] [%eval -0.03] [%bestmove c3d2] } 43... Re5 { [%clk 0:00:09.4] [%eval 0.96] [%bestmove e3e7] } 44. Qf6+ { [%clk 0:00:12.6] [%eval 0.89] [%bestmove h4f6] } 44... Kd5 { [%clk 0:00:08.9] [%eval 1.90] [%bestmove d6c7] } 45. Qxf7+ { [%clk 0:00:12.2] [%eval 1.90] [%bestmove f6f7] } 45... Ke4 { [%clk 0:00:08.4] [%eval 2.67] [%bestmove d5d6] } 46. f6 { [%clk 0:00:11.8] [%eval 1.73] [%bestmove f7b7] } 46... Rf5 { [%clk 0:00:07.8] [%eval 1.83] [%bestmove e5f5] } 47. Ke2 { [%clk 0:00:11.7] [%eval 0.22] [%bestmove f7h7] } 47... Rd5 { [%clk 0:00:07.7] [%eval 3.63] [%bestmove e4e5] } 48. Qe6+ { [%clk 0:00:10.9] [%eval 2.85] [%bestmove f7b7] } 48... Re5 { [%clk 0:00:07.5] [%eval 3.00] [%bestmove d5e5] } 49. Qg4+ { [%clk 0:00:10.4] [%eval 4.20] [%bestmove e6d7] } 49... Kd5+ { [%clk 0:00:06.7] [%eval 3.96] [%bestmove e4d5] } 50. Kf2 { [%clk 0:00:10.3] [%eval 2.99] [%bestmove e2d2] } 50... Re6 { [%clk 0:00:05.9] [%eval 4.73] [%bestmove d5d6] } 51. f7 { [%clk 0:00:09.8] [%eval 0.00] [%bestmove g4f3] } 51... Rf6+ { [%clk 0:00:05.5] [%eval 0.00] [%bestmove e6f6] } 52. Kg2 { [%clk 0:00:09.4] [%eval 0.00] [%bestmove f2g1] } 52... Rxf7 { [%clk 0:00:05.4] [%eval 0.00] [%bestmove f6f7] } 53. Qh5+ { [%clk 0:00:07.4] [%eval 0.00] [%bestmove g4h5] } 53... Ke6 { [%clk 0:00:05.3] [%eval 0.00] [%bestmove c6e5] } 54. Qxh6+ { [%clk 0:00:07] [%eval 0.00] [%bestmove h5h6] } 54... Rf6 { [%clk 0:00:05.2] [%eval 0.00] [%bestmove e6d7] } 55. Qe3+ { [%clk 0:00:06.7] [%eval 0.00] [%bestmove h6g7] } 55... Ne5 { [%clk 0:00:04.2] [%eval 0.11] [%bestmove e6d7] } 56. Qb3+ { [%clk 0:00:06.6] [%eval 0.11] [%bestmove e3a7] } 56... Kf5 { [%clk 0:00:03.4] [%eval 0.22] [%bestmove e6d6] } 57. Qxb7 { [%clk 0:00:06.5] [%eval 0.17] [%bestmove b3b1] } 57... Kg6 { [%clk 0:00:03.2] [%eval 1.45] [%bestmove a7a6] } 58. Qxa7 { [%clk 0:00:05.4] [%eval 1.65] [%bestmove b7a7] } 58... Rf5 { [%clk 0:00:02.7] [%eval 2.57] [%bestmove g6f5] } 59. Qd4 { [%clk 0:00:05.1] [%eval 2.10] [%bestmove a2a4] } 59... Rg5+ { [%clk 0:00:02.6] [%eval 1.65] [%bestmove g6f7] } 60. Kh3 { [%clk 0:00:04.7] [%eval 1.65] [%bestmove g2f1] } 60... Nf3 { [%clk 0:00:02.1] [%eval 2.86] [%bestmove g6f5] } 61. Qd5 { [%clk 0:00:03.6] [%eval -5.56] [%bestmove d4d3] } 61... Nh4 { [%clk 0:00:02] [%eval 5.23] [%bestmove g5d5] } 62. Qxg5+ { [%clk 0:00:02.9] [%eval 0.43] [%bestmove d5e6] } 62... Kxg5 { [%clk 0:00:01.4] [%eval 0.43] [%bestmove g6g5] } 63. a4 { [%clk 0:00:02.8] [%eval 0.43] [%bestmove a2a4] } 63... Nf5 { [%clk 0:00:00.8] [%eval 0.43] [%bestmove h4f5] } 64. a5 { [%clk 0:00:02.7] [%eval 0.43] [%bestmove a4a5] } 64... Nd6 { [%clk 0:00:00.4] [%eval 0.42] [%bestmove f5d4] } 65. Kg3 { [%clk 0:00:02.6] [%eval 0.42] [%bestmove h3g2] } 65... Nc8 { [%clk 0:00:00.1] [%eval 0.42] [%bestmove d6c8] } 66. a6 { [%clk 0:00:02] [%eval 0.38] [%bestmove a5a6] } 66... Na7 { [%clk 0:00:00.1] [%eval 0.37] [%bestmove c8a7] } 67. Kf3 { [%clk 0:00:01.8] [%eval 0.38] [%bestmove g3f3] } 1-0`
  },
  {
    id: 15,
    white: 'GothamChess', white_elo: 3072,
    black: 'ToastBread_1', black_elo: 2891,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.21', round: '-', result: '1/2-1/2',
    eco: 'C28',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.21"]
[Round "-"]
[White "GothamChess"]
[Black "ToastBread_1"]
[Result "1/2-1/2"]
[CurrentPosition "8/8/8/K5k1/8/8/2Q5/8 b - - 100 136"]
[Timezone "UTC"]
[ECO "C28"]
[ECOUrl "https://www.chess.com/openings/Bishops-Opening-Berlin-Vienna-Hybrid-Variation-4...Be7-5.f4-d6-6.Nf3"]
[UTCDate "2026.08.21"]
[UTCTime "22:08:19"]
[WhiteElo "3072"]
[BlackElo "2891"]
[TimeControl "60"]
[Termination "Game drawn by 50-move rule"]
[StartTime "22:08:19"]
[EndDate "2026.08.21"]
[EndTime "22:10:26"]
[Link "https://www.chess.com/game/live/173337766558"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:51:43Z"] } 1. e4 { [%clk 0:00:43.3] [%eval 0.28] [%bestmove e2e4] } 1... e5 { [%clk 0:00:58.1] [%eval 0.27] [%bestmove e7e5] } 2. Nc3 { [%clk 0:00:42.5] [%eval 0.30] [%bestmove g1f3] } 2... Nc6 { [%clk 0:00:57.8] [%eval 0.35] [%bestmove g8f6] } 3. Bc4 { [%clk 0:00:41.7] [%eval 0.07] [%bestmove g1f3] } 3... d6 { [%clk 0:00:55.4] [%eval 0.43] [%bestmove g8f6] } 4. d3 { [%clk 0:00:41.1] [%eval 0.35] [%bestmove g1f3] } 4... Nf6 { [%clk 0:00:54.5] [%eval 0.33] [%bestmove c6a5] } 5. f4 { [%clk 0:00:40.8] [%eval 0.32] [%bestmove f2f4] } 5... Be7 { [%clk 0:00:53.3] [%eval 0.26] [%bestmove c6a5] } 6. Nf3 { [%clk 0:00:40.5] [%eval 0.32] [%bestmove g1f3] } 6... O-O { [%clk 0:00:52.7] [%eval 0.30] [%bestmove e8g8] } 7. O-O { [%clk 0:00:40.1] [%eval 0.11] [%bestmove f4f5] } 7... Bg4 { [%clk 0:00:52.2] [%eval 0.31] [%bestmove c6a5] } 8. h3 { [%clk 0:00:39.5] [%eval 0.22] [%bestmove h2h3] } 8... Be6 { [%clk 0:00:50.9] [%eval 1.19] [%bestmove g4f3] } 9. Bb3 { [%clk 0:00:38.5] [%eval 0.63] [%bestmove f4f5] } 9... a6 { [%clk 0:00:49.8] [%eval 0.69] [%bestmove e6b3] } 10. f5 { [%clk 0:00:38.1] [%eval 0.17] [%bestmove g1h1] } 10... Bxb3 { [%clk 0:00:48.7] [%eval 0.42] [%bestmove e6b3] } 11. axb3 { [%clk 0:00:38] [%eval 0.39] [%bestmove a2b3] } 11... h6 { [%clk 0:00:46.8] [%eval 0.55] [%bestmove d6d5] } 12. g4 { [%clk 0:00:36.9] [%eval 0.60] [%bestmove g2g4] } 12... Kh8 { [%clk 0:00:45.5] [%eval 1.62] [%bestmove d6d5] } 13. Kh2 { [%clk 0:00:36.6] [%eval 1.23] [%bestmove g1h1] } 13... Nh7 { [%clk 0:00:44.6] [%eval 1.09] [%bestmove f6h7] } 14. Rg1 { [%clk 0:00:36.2] [%eval 0.75] [%bestmove h2h1] } 14... Bg5 { [%clk 0:00:43.4] [%eval 2.29] [%bestmove c6d4] } 15. Bd2 { [%clk 0:00:35.4] [%eval 1.00] [%bestmove f3g5] } 15... Bxd2 { [%clk 0:00:42.5] [%eval 0.96] [%bestmove g5d2] } 16. Qxd2 { [%clk 0:00:34.8] [%eval 0.99] [%bestmove d1d2] } 16... Ng5 { [%clk 0:00:42.3] [%eval 0.92] [%bestmove h7g5] } 17. Raf1 { [%clk 0:00:33.9] [%eval 1.02] [%bestmove f3g5] } 17... Nd4 { [%clk 0:00:40.4] [%eval 1.32] [%bestmove g5f3] } 18. Ne1 { [%clk 0:00:32.9] [%eval 0.71] [%bestmove f3d4] } 18... Qe7 { [%clk 0:00:38.8] [%eval 1.91] [%bestmove g5h7] } 19. Nd1 { [%clk 0:00:32.2] [%eval 1.13] [%bestmove h3h4] } 19... Nh7 { [%clk 0:00:37.7] [%eval 1.21] [%bestmove g5h7] } 20. Kg3 { [%clk 0:00:31.4] [%eval 0.22] [%bestmove b3b4] } 20... f6 { [%clk 0:00:37.3] [%eval 0.78] [%bestmove d6d5] } 21. h4 { [%clk 0:00:30.7] [%eval 0.71] [%bestmove g3h2] } 21... Nc6 { [%clk 0:00:36.3] [%eval 1.48] [%bestmove a6a5] } 22. Ne3 { [%clk 0:00:29.7] [%eval 1.66] [%bestmove g3h2] } 22... Qf7 { [%clk 0:00:35.5] [%eval 1.70] [%bestmove e7d7] } 23. Nf3 { [%clk 0:00:29.3] [%eval 1.63] [%bestmove e1f3] } 23... Ne7 { [%clk 0:00:34.6] [%eval 1.70] [%bestmove c6e7] } 24. g5 { [%clk 0:00:28.8] [%eval 2.08] [%bestmove d2g2] } 24... fxg5 { [%clk 0:00:33.6] [%eval 2.49] [%bestmove g7g6] } 25. hxg5 { [%clk 0:00:28.7] [%eval 2.79] [%bestmove h4g5] } 25... Nxg5 { [%clk 0:00:31.3] [%eval 4.05] [%bestmove g7g6] } 26. Nxg5 { [%clk 0:00:28.2] [%eval 4.45] [%bestmove f3g5] } 26... hxg5 { [%clk 0:00:31.2] [%eval 5.04] [%bestmove f7h5] } 27. Rh1+ { [%clk 0:00:27.9] [%eval 5.53] [%bestmove g1h1] } 27... Kg8 { [%clk 0:00:30.8] [%eval 5.27] [%bestmove h8g8] } 28. Qh2 { [%clk 0:00:27.5] [%eval 6.35] [%bestmove e3g4] } 28... Qf6 { [%clk 0:00:24] [%eval 5.90] [%bestmove f7f6] } 29. Ng4 { [%clk 0:00:26.9] [%eval 5.57] [%bestmove e3g4] } 29... Nxf5+ { [%clk 0:00:20.6] [%eval 6.47] [%bestmove a8c8] } 30. Rxf5 { [%clk 0:00:25.8] [%eval 7.03] [%bestmove e4f5] } 30... Qxf5 { [%clk 0:00:18.3] [%eval 6.93] [%bestmove f6f5] } 31. exf5 { [%clk 0:00:24.8] [%eval 6.93] [%bestmove e4f5] } 31... Rxf5 { [%clk 0:00:18.2] [%eval 7.52] [%bestmove g8f7] } 32. Qh8+ { [%clk 0:00:24.3] [%eval 6.28] [%bestmove h2h7] } 32... Kf7 { [%clk 0:00:17.9] [%eval 7.13] [%bestmove g8f7] } 33. Qxa8 { [%clk 0:00:24.1] [%eval 7.38] [%bestmove h8a8] } 33... Rf4 { [%clk 0:00:17.3] [%eval 7.57] [%bestmove f5f4] } 34. Qxb7 { [%clk 0:00:23.7] [%eval 6.80] [%bestmove h1h8] } 34... Ke6 { [%clk 0:00:16.9] [%eval 6.88] [%bestmove f7e6] } 35. Qxc7 { [%clk 0:00:23] [%eval 7.01] [%bestmove h1h6] } 35... Rf7 { [%clk 0:00:15.8] [%eval 9.20] [%bestmove a6a5] } 36. Qxf7+ { [%clk 0:00:22.1] [%eval 6.83] [%bestmove c7c8] } 36... Kxf7 { [%clk 0:00:15.4] [%eval 7.03] [%bestmove e6f7] } 37. Nxe5+ { [%clk 0:00:22] [%eval 5.77] [%bestmove h1a1] } 37... Ke6 { [%clk 0:00:15.2] [%eval 7.92] [%bestmove d6e5] } 38. Ra1 { [%clk 0:00:21.7] [%eval 6.14] [%bestmove e5g4] } 38... Kxe5 { [%clk 0:00:14.9] [%eval 6.48] [%bestmove d6e5] } 39. Rxa6 { [%clk 0:00:21.6] [%eval 6.29] [%bestmove a1a6] } 39... Kd5 { [%clk 0:00:14.8] [%eval 6.43] [%bestmove g5g4] } 40. Ra7 { [%clk 0:00:21.3] [%eval 6.19] [%bestmove g3g4] } 40... Ke6 { [%clk 0:00:14.4] [%eval 6.13] [%bestmove d5e6] } 41. Rxg7 { [%clk 0:00:21.2] [%eval 6.19] [%bestmove a7g7] } 41... Kf6 { [%clk 0:00:14.3] [%eval 6.19] [%bestmove e6f5] } 42. Rxg5 { [%clk 0:00:20.7] [%eval 6.50] [%bestmove g7a7] } 42... Kxg5 { [%clk 0:00:14.2] [%eval 6.15] [%bestmove f6g5] } 43. b4 { [%clk 0:00:20.2] [%eval 6.44] [%bestmove b3b4] } 43... Kf6 { [%clk 0:00:14.1] [%eval 6.40] [%bestmove d6d5] } 44. b5 { [%clk 0:00:20.1] [%eval 6.41] [%bestmove g3f3] } 44... Ke6 { [%clk 0:00:13.7] [%eval 6.37] [%bestmove f6e6] } 45. d4 { [%clk 0:00:19.8] [%eval 5.98] [%bestmove g3f4] } 45... Kd7 { [%clk 0:00:13.6] [%eval 5.98] [%bestmove d6d5] } 46. c4 { [%clk 0:00:19.6] [%eval 6.33] [%bestmove g3g4] } 46... Kc7 { [%clk 0:00:13.5] [%eval 6.59] [%bestmove d7e7] } 47. d5 { [%clk 0:00:19.3] [%eval 6.18] [%bestmove g3f4] } 47... Kb6 { [%clk 0:00:12.8] [%eval 6.33] [%bestmove c7d7] } 48. Kf4 { [%clk 0:00:19.2] [%eval 6.06] [%bestmove g3g4] } 48... Kc5 { [%clk 0:00:12.6] [%eval 6.41] [%bestmove b6c5] } 49. b3 { [%clk 0:00:18.7] [%eval 6.94] [%bestmove f4f5] } 49... Kb4 { [%clk 0:00:12.2] [%eval 7.72] [%bestmove c5b6] } 50. b6 { [%clk 0:00:18.1] [%eval 7.19] [%bestmove b5b6] } 50... Kxb3 { [%clk 0:00:11.4] [%eval 7.10] [%bestmove b4c3] } 51. b7 { [%clk 0:00:18] [%eval 6.92] [%bestmove f4f5] } 51... Kxc4 { [%clk 0:00:11.3] [%eval 7.96] [%bestmove b3a4] } 52. b8=Q { [%clk 0:00:17.9] [%eval 34.13] [%bestmove f4f5] } 52... Kxd5 { [%clk 0:00:11.2] [%eval 33.71] [%bestmove c4d5] } 53. Qb1 { [%clk 0:00:17] [%eval 33.23] [%bestmove f4f5] } 53... Kc4 { [%clk 0:00:10.8] [%eval 34.55] [%bestmove d5c6] } 54. Qd1 { [%clk 0:00:16.9] [%eval 34.50] [%bestmove b1b7] } 54... d5 { [%clk 0:00:10.7] [%eval 34.87] [%bestmove c4c5] } 55. Kg5 { [%clk 0:00:16.8] [%eval 7.33] [%bestmove f4e5] } 55... Kc3 { [%clk 0:00:10.6] [%eval 34.96] [%bestmove c4c5] } 56. Kg6 { [%clk 0:00:16.7] [%eval 33.47] [%bestmove d1d5] } 56... d4 { [%clk 0:00:10.4] [%eval 34.93] [%bestmove c3c4] } 57. Kh6 { [%clk 0:00:16.6] [%eval 7.05] [%bestmove g6f5] } 57... d3 { [%clk 0:00:10] [%eval 33.73] [%bestmove d4d3] } 58. Kh7 { [%clk 0:00:16.5] [%eval 7.07] [%bestmove h6g5] } 58... d2 { [%clk 0:00:09.9] [%eval 7.09] [%bestmove c3c4] } 59. Kh8 { [%clk 0:00:16.4] [%eval 7.00] [%bestmove d1b1] } 59... Kd3 { [%clk 0:00:09.8] [%eval 7.07] [%bestmove c3d3] } 60. Kg8 { [%clk 0:00:16.3] [%eval 6.92] [%bestmove h8h7] } 60... Kc3 { [%clk 0:00:09.7] [%eval 33.78] [%bestmove d3c3] } 61. Kg7 { [%clk 0:00:16.2] [%eval 33.84] [%bestmove g8f7] } 61... Kd3 { [%clk 0:00:09.6] [%eval 33.84] [%bestmove c3d3] } 62. Kf8 { [%clk 0:00:16.1] [%eval 6.71] [%bestmove g7h6] } 62... Kc3 { [%clk 0:00:09.5] [%eval 34.15] [%bestmove d3c3] } 63. Kf7 { [%clk 0:00:16] [%eval 34.15] [%bestmove f8g7] } 63... Kd3 { [%clk 0:00:09.4] [%eval 34.52] [%bestmove c3d3] } 64. Ke8 { [%clk 0:00:15.9] [%eval 34.52] [%bestmove f7g6] } 64... Kc3 { [%clk 0:00:09.3] [%eval 34.52] [%bestmove d3c3] } 65. Ke7 { [%clk 0:00:15.8] [%eval 34.52] [%bestmove e8f7] } 65... Kd3 { [%clk 0:00:09.2] [%eval 34.20] [%bestmove c3d3] } 66. Kd8 { [%clk 0:00:15.7] [%eval 34.52] [%bestmove e7e6] } 66... Kc3 { [%clk 0:00:09.1] [%eval 34.52] [%bestmove d3c3] } 67. Kd7 { [%clk 0:00:15.6] [%eval 34.84] [%bestmove d8d7] } 67... Kd3 { [%clk 0:00:09] [%eval 34.84] [%bestmove c3d3] } 68. Kc7 { [%clk 0:00:15.5] [%eval 34.04] [%bestmove d7e6] } 68... Kc3 { [%clk 0:00:08.9] [%eval 34.04] [%bestmove d3e3] } 69. Kc8 { [%clk 0:00:15.4] [%eval 34.04] [%bestmove c7c6] } 69... Kd3 { [%clk 0:00:08.8] [%eval 34.04] [%bestmove c3d3] } 70. Kb8 { [%clk 0:00:15.3] [%eval 34.04] [%bestmove c8c7] } 70... Kc3 { [%clk 0:00:08.7] [%eval 34.04] [%bestmove d3c3] } 71. Kb7 { [%clk 0:00:15.2] [%eval 34.80] [%bestmove b8b7] } 71... Kd3 { [%clk 0:00:08.6] [%eval 34.86] [%bestmove c3d3] } 72. Ka8 { [%clk 0:00:15.1] [%eval 34.86] [%bestmove b7c6] } 72... Kc3 { [%clk 0:00:08.5] [%eval 35.05] [%bestmove d3c3] } 73. Ka7 { [%clk 0:00:15] [%eval 35.28] [%bestmove a8b7] } 73... Kd3 { [%clk 0:00:08.4] [%eval 35.10] [%bestmove c3d3] } 74. Ka6 { [%clk 0:00:14.9] [%eval 34.89] [%bestmove a7b6] } 74... Kc3 { [%clk 0:00:08.3] [%eval 35.17] [%bestmove d3e3] } 75. Kb6 { [%clk 0:00:14.8] [%eval 35.13] [%bestmove a6a5] } 75... Kd3 { [%clk 0:00:08.2] [%eval 34.83] [%bestmove c3d3] } 76. Ka5 { [%clk 0:00:14.7] [%eval 35.04] [%bestmove b6a6] } 76... Kc3 { [%clk 0:00:08.1] [%eval 35.17] [%bestmove d3e3] } 77. Kb5 { [%clk 0:00:14.6] [%eval 34.84] [%bestmove a5b5] } 77... Kd3 { [%clk 0:00:08] [%eval 34.67] [%bestmove c3d3] } 78. Ka4 { [%clk 0:00:14.5] [%eval 34.67] [%bestmove b5b4] } 78... Kc3 { [%clk 0:00:07.9] [%eval 34.67] [%bestmove d3e3] } 79. Ka3 { [%clk 0:00:14.4] [%eval 34.84] [%bestmove a4b5] } 79... Kd3 { [%clk 0:00:07.8] [%eval 34.98] [%bestmove c3d3] } 80. Ka2 { [%clk 0:00:14.3] [%eval 5.64] [%bestmove a3b4] } 80... Kc3 { [%clk 0:00:07.7] [%eval 34.98] [%bestmove d3c3] } 81. Ka1 { [%clk 0:00:14.2] [%eval 34.82] [%bestmove a2a3] } 81... Kd3 { [%clk 0:00:07.6] [%eval 35.22] [%bestmove c3d3] } 82. Kb1 { [%clk 0:00:14.1] [%eval 35.59] [%bestmove a1b2] } 82... Ke3 { [%clk 0:00:07.5] [%eval 35.22] [%bestmove d3d4] } 83. Kb2 { [%clk 0:00:13.7] [%eval 34.82] [%bestmove b1c2] } 83... Kd3 { [%clk 0:00:07.4] [%eval 34.92] [%bestmove e3e4] } 84. Kb3 { [%clk 0:00:13.1] [%eval 34.82] [%bestmove d1c2] } 84... Ke3 { [%clk 0:00:07.3] [%eval 34.78] [%bestmove d3e3] } 85. Kc3 { [%clk 0:00:13] [%eval 35.21] [%bestmove b3c3] } 85... Kf2 { [%clk 0:00:06.4] [%eval 35.23] [%bestmove e3e4] } 86. Kxd2 { [%clk 0:00:12.5] [%eval 34.81] [%bestmove c3d2] } 86... Kg2 { [%clk 0:00:06.3] [%eval #7] [%bestmove f2g3] } 87. Kd3 { [%clk 0:00:12.1] [%eval #6] [%bestmove d1g4] } 87... Kh3 { [%clk 0:00:06] [%eval #6] [%bestmove g2h3] } 88. Kd4 { [%clk 0:00:12] [%eval 35.03] [%bestmove d1h5] } 88... Kh4 { [%clk 0:00:05.9] [%eval 34.02] [%bestmove h3h4] } 89. Kd5 { [%clk 0:00:11.9] [%eval 33.65] [%bestmove d1g1] } 89... Kg5 { [%clk 0:00:05.2] [%eval 33.48] [%bestmove h4g3] } 90. Kd6 { [%clk 0:00:11.8] [%eval 33.58] [%bestmove d5e5] } 90... Kh4 { [%clk 0:00:05] [%eval #5] [%bestmove g5f5] } 91. Kd7 { [%clk 0:00:11.7] [%eval 32.80] [%bestmove d1g1] } 91... Kg5 { [%clk 0:00:04.9] [%eval 32.72] [%bestmove h4g5] } 92. Kd8 { [%clk 0:00:11.6] [%eval 32.17] [%bestmove d1d6] } 92... Kh4 { [%clk 0:00:04.8] [%eval 33.49] [%bestmove g5f4] } 93. Kc8 { [%clk 0:00:11.5] [%eval 32.18] [%bestmove d1g1] } 93... Kg5 { [%clk 0:00:04.7] [%eval 31.88] [%bestmove h4g5] } 94. Kc7 { [%clk 0:00:11.4] [%eval 31.64] [%bestmove d1g1] } 94... Kh4 { [%clk 0:00:04.6] [%eval 31.69] [%bestmove g5f5] } 95. Kc6 { [%clk 0:00:11.3] [%eval 31.16] [%bestmove d1g1] } 95... Kg5 { [%clk 0:00:04.5] [%eval 31.20] [%bestmove h4g3] } 96. Kc5 { [%clk 0:00:11.2] [%eval 30.67] [%bestmove d1a4] } 96... Kh4 { [%clk 0:00:04.4] [%eval 32.18] [%bestmove g5h4] } 97. Kc4 { [%clk 0:00:11.1] [%eval 30.65] [%bestmove d1g1] } 97... Kg5 { [%clk 0:00:04.3] [%eval 30.52] [%bestmove h4g5] } 98. Kc3 { [%clk 0:00:11] [%eval 29.79] [%bestmove d1f3] } 98... Kh4 { [%clk 0:00:04.2] [%eval #6] [%bestmove g5f4] } 99. Kc2 { [%clk 0:00:10.9] [%eval 29.83] [%bestmove d1g1] } 99... Kg5 { [%clk 0:00:04.1] [%eval 29.39] [%bestmove h4g5] } 100. Kc1 { [%clk 0:00:10.8] [%eval 29.20] [%bestmove d1d2] } 100... Kh4 { [%clk 0:00:04] [%eval 29.30] [%bestmove g5g6] } 101. Kb1 { [%clk 0:00:10.7] [%eval 28.72] [%bestmove d1g1] } 101... Kg5 { [%clk 0:00:03.9] [%eval 28.48] [%bestmove h4g3] } 102. Kb2 { [%clk 0:00:10.6] [%eval 28.29] [%bestmove d1f3] } 102... Kh4 { [%clk 0:00:03.8] [%eval #7] [%bestmove g5f4] } 103. Kb3 { [%clk 0:00:10.5] [%eval 27.81] [%bestmove d1g1] } 103... Kg5 { [%clk 0:00:03.7] [%eval 28.32] [%bestmove h4g5] } 104. Kb4 { [%clk 0:00:10.4] [%eval 27.75] [%bestmove d1d8] } 104... Kh4 { [%clk 0:00:03.6] [%eval 27.91] [%bestmove g5f6] } 105. Kb5 { [%clk 0:00:10.3] [%eval 27.89] [%bestmove d1d8] } 105... Kg5 { [%clk 0:00:03.5] [%eval 27.62] [%bestmove h4g3] } 106. Kb6 { [%clk 0:00:10.2] [%eval 26.94] [%bestmove b5c4] } 106... Kh4 { [%clk 0:00:03.4] [%eval 27.10] [%bestmove g5f4] } 107. Kb7 { [%clk 0:00:10.1] [%eval 25.87] [%bestmove b6c5] } 107... Kg5 { [%clk 0:00:03.3] [%eval 26.85] [%bestmove h4g5] } 108. Kb8 { [%clk 0:00:10] [%eval 25.85] [%bestmove b7c7] } 108... Kh4 { [%clk 0:00:03.2] [%eval 26.68] [%bestmove g5f5] } 109. Ka8 { [%clk 0:00:09.9] [%eval 25.70] [%bestmove d1g1] } 109... Kg5 { [%clk 0:00:03.1] [%eval 24.83] [%bestmove h4g3] } 110. Ka7 { [%clk 0:00:09.8] [%eval 24.65] [%bestmove d1c2] } 110... Kh4 { [%clk 0:00:03] [%eval 25.93] [%bestmove g5f5] } 111. Ka6 { [%clk 0:00:09.7] [%eval 25.21] [%bestmove d1a4] } 111... Kg5 { [%clk 0:00:02.9] [%eval 24.62] [%bestmove h4g5] } 112. Ka5 { [%clk 0:00:09.2] [%eval 24.62] [%bestmove d1e2] } 112... Kh4 { [%clk 0:00:02.8] [%eval 25.69] [%bestmove g5f4] } 113. Ka4 { [%clk 0:00:09.1] [%eval 24.29] [%bestmove d1g1] } 113... Kg5 { [%clk 0:00:02.7] [%eval 24.40] [%bestmove h4g5] } 114. Ka3 { [%clk 0:00:09] [%eval 24.38] [%bestmove a4b3] } 114... Kh4 { [%clk 0:00:02.6] [%eval 24.65] [%bestmove g5f4] } 115. Ka2 { [%clk 0:00:08.9] [%eval 23.39] [%bestmove a3a2] } 115... Kg5 { [%clk 0:00:02.5] [%eval 23.39] [%bestmove h4g5] } 116. Ka1 { [%clk 0:00:08.8] [%eval 23.27] [%bestmove d1d8] } 116... Kh4 { [%clk 0:00:02.4] [%eval 23.93] [%bestmove g5f4] } 117. Kb1 { [%clk 0:00:08.7] [%eval 23.60] [%bestmove d1f3] } 117... Kg5 { [%clk 0:00:02.3] [%eval 23.72] [%bestmove h4g5] } 118. Qc1+ { [%clk 0:00:08.4] [%eval 22.49] [%bestmove d1d5] } 118... Kh4 { [%clk 0:00:02.2] [%eval 22.59] [%bestmove g5g4] } 119. Qc2 { [%clk 0:00:08.3] [%eval 22.17] [%bestmove c1h6] } 119... Kg5 { [%clk 0:00:02.1] [%eval 22.50] [%bestmove h4g4] } 120. Kb2 { [%clk 0:00:08.1] [%eval 21.95] [%bestmove c2c5] } 120... Kh4 { [%clk 0:00:02] [%eval 23.24] [%bestmove g5g4] } 121. Kb3 { [%clk 0:00:08] [%eval 21.95] [%bestmove c2g6] } 121... Kg5 { [%clk 0:00:01.9] [%eval 22.17] [%bestmove h4g4] } 122. Kc3 { [%clk 0:00:07.9] [%eval 21.81] [%bestmove c2d2] } 122... Kh4 { [%clk 0:00:01.8] [%eval 21.87] [%bestmove g5g4] } 123. Kc4 { [%clk 0:00:07.8] [%eval 21.30] [%bestmove c2e4] } 123... Kg5 { [%clk 0:00:01.7] [%eval 21.33] [%bestmove h4g4] } 124. Kb4 { [%clk 0:00:07.7] [%eval 20.74] [%bestmove c4d5] } 124... Kh4 { [%clk 0:00:01.6] [%eval 21.46] [%bestmove g5g4] } 125. Kb5 { [%clk 0:00:07.6] [%eval 20.71] [%bestmove c2g6] } 125... Kg5 { [%clk 0:00:01.5] [%eval 20.67] [%bestmove h4h5] } 126. Kc5 { [%clk 0:00:07.5] [%eval 20.55] [%bestmove c2g2] } 126... Kf6 { [%clk 0:00:01.3] [%eval 20.07] [%bestmove g5h6] } 127. Kc6 { [%clk 0:00:07.4] [%eval 18.96] [%bestmove c5d6] } 127... Kf7 { [%clk 0:00:01.2] [%eval 19.68] [%bestmove f6g5] } 128. Kb6 { [%clk 0:00:07.3] [%eval 19.22] [%bestmove c2f5] } 128... Kf6 { [%clk 0:00:01.1] [%eval 19.17] [%bestmove f7f6] } 129. Kb7 { [%clk 0:00:07.2] [%eval 18.59] [%bestmove b6c5] } 129... Kf7 { [%clk 0:00:01] [%eval 19.52] [%bestmove f6g5] } 130. Kc7 { [%clk 0:00:07.1] [%eval 18.91] [%bestmove c2f5] } 130... Kf6 { [%clk 0:00:00.9] [%eval 18.88] [%bestmove f7f6] } 131. Kc8 { [%clk 0:00:07] [%eval 18.37] [%bestmove c2h7] } 131... Kf7 { [%clk 0:00:00.8] [%eval 18.60] [%bestmove f6e6] } 132. Kb8 { [%clk 0:00:06.9] [%eval 18.20] [%bestmove c2f5] } 132... Kf6 { [%clk 0:00:00.7] [%eval 18.12] [%bestmove f7g8] } 133. Ka8 { [%clk 0:00:06.8] [%eval 0.00] [%bestmove c2a2] } 133... Kf7 { [%clk 0:00:00.6] [%eval 0.00] [%bestmove f6g7] } 134. Ka7 { [%clk 0:00:06.7] [%eval 0.00] [%bestmove c2e2] } 134... Kf6 { [%clk 0:00:00.5] [%eval 0.00] [%bestmove f7f6] } 135. Ka6 { [%clk 0:00:06.6] [%eval 0.00] [%bestmove c2c3] } 135... Kg5 { [%clk 0:00:00.4] [%eval 0.00] [%bestmove f6g5] } 136. Ka5 { [%clk 0:00:06.5] [%eval 0.00] [%bestmove c2b1] } 1/2-1/2`
  },
  {
    id: 16,
    white: 'gagic233', white_elo: 2862,
    black: 'GothamChess', black_elo: 2894,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.22', round: '-', result: '1/2-1/2',
    eco: 'C63',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.22"]
[Round "-"]
[White "gagic233"]
[Black "GothamChess"]
[Result "1/2-1/2"]
[CurrentPosition "8/8/1K6/8/8/7k/8/8 b - - 0 50"]
[Timezone "UTC"]
[ECO "C63"]
[ECOUrl "https://www.chess.com/openings/Ruy-Lopez-Opening-Jaenisch-Dyckhoff-Tartakower-Variation-6.Nxf6-Qxf6-7.Qe2"]
[UTCDate "2026.08.22"]
[UTCTime "14:43:13"]
[WhiteElo "2862"]
[BlackElo "2894"]
[TimeControl "180"]
[Termination "Game drawn by insufficient material"]
[StartTime "14:43:13"]
[EndDate "2026.08.22"]
[EndTime "14:48:41"]
[Link "https://www.chess.com/game/live/173367556672"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:51:34Z"] } 1. e4 { [%clk 0:02:59.7] [%eval 0.35] [%bestmove e2e4] } 1... e5 { [%clk 0:02:54.7] [%eval 0.40] [%bestmove e7e5] } 2. Nf3 { [%clk 0:02:58.5] [%eval 0.28] [%bestmove g1f3] } 2... Nc6 { [%clk 0:02:54.1] [%eval 0.39] [%bestmove b8c6] } 3. Bb5 { [%clk 0:02:57.9] [%eval 0.40] [%bestmove f1b5] } 3... f5 { [%clk 0:02:53.7] [%eval 1.00] [%bestmove a7a6] } 4. Nc3 { [%clk 0:02:52.6] [%eval 0.26] [%bestmove d2d4] } 4... fxe4 { [%clk 0:02:52.2] [%eval 0.57] [%bestmove g8f6] } 5. Nxe4 { [%clk 0:02:51.8] [%eval 0.32] [%bestmove c3e4] } 5... Nf6 { [%clk 0:02:51.9] [%eval 0.58] [%bestmove g8f6] } 6. Nxf6+ { [%clk 0:02:41.2] [%eval 0.32] [%bestmove d1e2] } 6... Qxf6 { [%clk 0:02:50.6] [%eval 0.35] [%bestmove d8f6] } 7. Qe2 { [%clk 0:02:38.3] [%eval 0.33] [%bestmove e1g1] } 7... d6 { [%clk 0:02:44.1] [%eval 2.15] [%bestmove f8e7] } 8. d4 { [%clk 0:02:31] [%eval 1.57] [%bestmove d2d4] } 8... Bd7 { [%clk 0:02:41.9] [%eval 1.33] [%bestmove a7a6] } 9. dxe5 { [%clk 0:02:23.8] [%eval 1.29] [%bestmove d4d5] } 9... Nxe5 { [%clk 0:02:39.1] [%eval 2.18] [%bestmove d6e5] } 10. Bxd7+ { [%clk 0:02:18.4] [%eval 0.61] [%bestmove c1g5] } 10... Kxd7 { [%clk 0:02:37.9] [%eval 0.82] [%bestmove e8d7] } 11. Nxe5+ { [%clk 0:02:17.5] [%eval 0.43] [%bestmove f3e5] } 11... Qxe5 { [%clk 0:02:37] [%eval 0.39] [%bestmove f6e5] } 12. Qxe5 { [%clk 0:02:15.7] [%eval 0.29] [%bestmove c1e3] } 12... dxe5 { [%clk 0:02:36.9] [%eval 0.23] [%bestmove d6e5] } 13. Be3 { [%clk 0:02:13.7] [%eval 0.22] [%bestmove c1e3] } 13... Bd6 { [%clk 0:02:34.3] [%eval 0.23] [%bestmove f8d6] } 14. Ke2 { [%clk 0:02:11.5] [%eval 0.15] [%bestmove a2a4] } 14... Ke6 { [%clk 0:02:33.4] [%eval 0.16] [%bestmove b7b6] } 15. f3 { [%clk 0:02:03] [%eval 0.09] [%bestmove a2a4] } 15... Rhg8 { [%clk 0:02:23.7] [%eval 0.23] [%bestmove a7a5] } 16. Rad1 { [%clk 0:01:56.9] [%eval 0.24] [%bestmove a2a4] } 16... g5 { [%clk 0:02:20.7] [%eval 0.54] [%bestmove a7a5] } 17. h3 { [%clk 0:01:52.6] [%eval 0.48] [%bestmove g2g4] } 17... h5 { [%clk 0:02:19.5] [%eval 0.60] [%bestmove a8d8] } 18. c4 { [%clk 0:01:47.7] [%eval 0.36] [%bestmove g2g4] } 18... b6 { [%clk 0:02:17.9] [%eval 0.44] [%bestmove h5h4] } 19. Kd3 { [%clk 0:01:41.6] [%eval 0.38] [%bestmove g2g4] } 19... g4 { [%clk 0:02:08.3] [%eval 0.76] [%bestmove a8f8] } 20. fxg4 { [%clk 0:01:38.3] [%eval 0.82] [%bestmove f3g4] } 20... hxg4 { [%clk 0:02:08.2] [%eval 1.04] [%bestmove a8d8] } 21. h4 { [%clk 0:01:36.4] [%eval 0.88] [%bestmove h3h4] } 21... Rad8 { [%clk 0:01:54.1] [%eval 1.06] [%bestmove a8d8] } 22. Ke4 { [%clk 0:01:24.9] [%eval 0.73] [%bestmove d3e2] } 22... g3 { [%clk 0:01:53.5] [%eval 0.87] [%bestmove g4g3] } 23. Bg5 { [%clk 0:01:23.5] [%eval -0.01] [%bestmove b2b3] } 23... Rdf8 { [%clk 0:01:50.3] [%eval -0.13] [%bestmove d8f8] } 24. Rdf1 { [%clk 0:01:17.2] [%eval -0.28] [%bestmove g5e3] } 24... Rf2 { [%clk 0:01:48.2] [%eval -0.42] [%bestmove f8f2] } 25. Rxf2 { [%clk 0:00:59] [%eval -0.14] [%bestmove f1f2] } 25... gxf2 { [%clk 0:01:48.1] [%eval -0.18] [%bestmove g3f2] } 26. Rf1 { [%clk 0:00:58] [%eval -0.15] [%bestmove e4f3] } 26... Bc5 { [%clk 0:01:41] [%eval -0.14] [%bestmove d6c5] } 27. g4 { [%clk 0:00:33.5] [%eval -0.67] [%bestmove e4f3] } 27... a5 { [%clk 0:01:36.5] [%eval -0.73] [%bestmove a7a5] } 28. Kd3 { [%clk 0:00:30.1] [%eval -1.06] [%bestmove b2b3] } 28... Rf8 { [%clk 0:01:30.9] [%eval -0.50] [%bestmove a5a4] } 29. Ke4 { [%clk 0:00:28] [%eval -0.57] [%bestmove d3e2] } 29... c6 { [%clk 0:01:27.7] [%eval 0.25] [%bestmove f8g8] } 30. Be3 { [%clk 0:00:26.9] [%eval 0.18] [%bestmove g5e3] } 30... Bxe3 { [%clk 0:01:09.7] [%eval 0.28] [%bestmove c5e3] } 31. Kxe3 { [%clk 0:00:26.2] [%eval 0.28] [%bestmove e4e3] } 31... Rf4 { [%clk 0:01:09.4] [%eval 0.26] [%bestmove f8f4] } 32. Rxf2 { [%clk 0:00:25.8] [%eval 0.00] [%bestmove f1f2] } 32... Rxg4 { [%clk 0:01:09] [%eval 0.14] [%bestmove f4g4] } 33. Rh2 { [%clk 0:00:25.1] [%eval 0.01] [%bestmove f2h2] } 33... Rxc4 { [%clk 0:01:00.4] [%eval -0.08] [%bestmove e6f7] } 34. h5 { [%clk 0:00:24.2] [%eval -0.07] [%bestmove h4h5] } 34... Kf7 { [%clk 0:00:59.4] [%eval -0.06] [%bestmove e6f7] } 35. h6 { [%clk 0:00:21.9] [%eval -0.02] [%bestmove h5h6] } 35... Kg8 { [%clk 0:00:59] [%eval -0.03] [%bestmove f7g8] } 36. Rh5 { [%clk 0:00:19.8] [%eval -0.15] [%bestmove b2b3] } 36... Rc2 { [%clk 0:00:55.3] [%eval -0.15] [%bestmove c4c2] } 37. Rxe5 { [%clk 0:00:18.2] [%eval -0.15] [%bestmove h5e5] } 37... Rxb2 { [%clk 0:00:54.8] [%eval -0.10] [%bestmove c2b2] } 38. Re6 { [%clk 0:00:17.8] [%eval -0.17] [%bestmove e5e8] } 38... Rxa2 { [%clk 0:00:51.7] [%eval -0.16] [%bestmove b2a2] } 39. Rxc6 { [%clk 0:00:16.9] [%eval -0.18] [%bestmove e3d3] } 39... Rb2 { [%clk 0:00:51.3] [%eval -0.16] [%bestmove a2b2] } 40. Kd3 { [%clk 0:00:16] [%eval -0.25] [%bestmove c6c7] } 40... a4 { [%clk 0:00:50.5] [%eval -0.04] [%bestmove b2b3] } 41. Kc3 { [%clk 0:00:15] [%eval -0.08] [%bestmove c6c7] } 41... a3 { [%clk 0:00:49.9] [%eval -0.03] [%bestmove b2b5] } 42. Rc8+ { [%clk 0:00:14.7] [%eval -0.03] [%bestmove c6c8] } 42... Kh7 { [%clk 0:00:48.9] [%eval 0.00] [%bestmove g8h7] } 43. Ra8 { [%clk 0:00:14.6] [%eval -0.01] [%bestmove c8a8] } 43... Kxh6 { [%clk 0:00:33.6] [%eval 0.03] [%bestmove b2f2] } 44. Rxa3 { [%clk 0:00:14.2] [%eval 0.03] [%bestmove a8a3] } 44... Rh2 { [%clk 0:00:31.3] [%eval 0.04] [%bestmove b2b5] } 45. Rb3 { [%clk 0:00:14.1] [%eval -0.01] [%bestmove a3a8] } 45... Rh3+ { [%clk 0:00:29.7] [%eval -0.01] [%bestmove h2h3] } 46. Kc4 { [%clk 0:00:13.7] [%eval 0.00] [%bestmove c3c2] } 46... Rxb3 { [%clk 0:00:29.5] [%eval 0.00] [%bestmove h3b3] } 47. Kxb3 { [%clk 0:00:13.1] [%eval -0.01] [%bestmove c4b3] } 47... Kg5 { [%clk 0:00:29.4] [%eval -0.02] [%bestmove h6g5] } 48. Kb4 { [%clk 0:00:13] [%eval -0.01] [%bestmove b3c4] } 48... Kh4 { [%clk 0:00:29.3] [%eval 0.00] [%bestmove g5g4] } 49. Kb5 { [%clk 0:00:12.9] [%eval 0.00] [%bestmove b4b5] } 49... Kh3 { [%clk 0:00:29.2] [%eval 0.00] [%bestmove h4g4] } 50. Kxb6 { [%clk 0:00:12.8] [%bestmove b5b6] } 1/2-1/2`
  },
  {
    id: 17,
    white: 'GothamChess', white_elo: 2906,
    black: 'luizzy', black_elo: 2856,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.22', round: '-', result: '1-0',
    eco: 'B07',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.22"]
[Round "-"]
[White "GothamChess"]
[Black "luizzy"]
[Result "1-0"]
[CurrentPosition "4rr2/ppp1qp2/3p1kpQ/3P1R2/4P2P/2Pn2NB/PP6/6K1 b - - 4 26"]
[Timezone "UTC"]
[ECO "B07"]
[ECOUrl "https://www.chess.com/openings/Pirc-Defense-2.Nc3-Nf6-3.f4"]
[UTCDate "2026.08.22"]
[UTCTime "11:57:53"]
[WhiteElo "2906"]
[BlackElo "2856"]
[TimeControl "180"]
[Termination "GothamChess won by checkmate"]
[StartTime "11:57:53"]
[EndDate "2026.08.22"]
[EndTime "12:02:07"]
[Link "https://www.chess.com/game/live/173360769174"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:51:37Z"] } 1. e4 { [%clk 0:02:59.9] [%eval 0.34] [%bestmove e2e4] } 1... d6 { [%clk 0:02:58.5] [%eval 0.60] [%bestmove e7e6] } 2. Nc3 { [%clk 0:02:58.8] [%eval 0.42] [%bestmove d2d4] } 2... Nf6 { [%clk 0:02:58.2] [%eval 0.67] [%bestmove c7c5] } 3. f4 { [%clk 0:02:57.8] [%eval 0.24] [%bestmove d2d4] } 3... Nbd7 { [%clk 0:02:57.8] [%eval 0.88] [%bestmove c7c5] } 4. g4 { [%clk 0:02:56.1] [%eval 0.58] [%bestmove d2d4] } 4... Nc5 { [%clk 0:02:53.7] [%eval -0.14] [%bestmove e7e5] } 5. Bg2 { [%clk 0:02:50.2] [%eval -0.76] [%bestmove d2d3] } 5... Bxg4 { [%clk 0:02:52.3] [%eval -0.79] [%bestmove c8g4] } 6. Nge2 { [%clk 0:02:48.7] [%eval -0.84] [%bestmove g1e2] } 6... e5 { [%clk 0:02:49.7] [%eval -0.92] [%bestmove e7e5] } 7. d4 { [%clk 0:02:46.3] [%eval -0.85] [%bestmove d2d4] } 7... Ne6 { [%clk 0:02:43.1] [%eval -0.85] [%bestmove c5e6] } 8. d5 { [%clk 0:02:42.7] [%eval -2.83] [%bestmove d1d3] } 8... Nxf4 { [%clk 0:02:39.8] [%eval -2.39] [%bestmove e6f4] } 9. Bxf4 { [%clk 0:02:40.8] [%eval -2.82] [%bestmove c1f4] } 9... exf4 { [%clk 0:02:39.5] [%eval -2.42] [%bestmove e5f4] } 10. O-O { [%clk 0:02:40.7] [%eval -3.80] [%bestmove h2h3] } 10... g6 { [%clk 0:02:29.3] [%eval -3.14] [%bestmove g7g5] } 11. Rxf4 { [%clk 0:02:38.5] [%eval -3.25] [%bestmove d1d3] } 11... Bg7 { [%clk 0:02:28] [%eval -3.03] [%bestmove f8h6] } 12. Qd3 { [%clk 0:02:32.8] [%eval -2.65] [%bestmove d1d3] } 12... Bxe2 { [%clk 0:02:25.2] [%eval -2.45] [%bestmove g4e2] } 13. Nxe2 { [%clk 0:02:31.6] [%eval -2.57] [%bestmove c3e2] } 13... Qe7 { [%clk 0:02:23.2] [%eval -2.56] [%bestmove f6d7] } 14. Raf1 { [%clk 0:02:30.2] [%eval -2.80] [%bestmove d3b5] } 14... O-O { [%clk 0:02:22.2] [%eval -2.63] [%bestmove e8g8] } 15. Ng3 { [%clk 0:02:27.8] [%eval -3.19] [%bestmove e2d4] } 15... Nd7 { [%clk 0:02:19.3] [%eval -3.26] [%bestmove f6d7] } 16. c3 { [%clk 0:02:21.8] [%eval -3.67] [%bestmove d3e2] } 16... Rae8 { [%clk 0:02:14.4] [%eval -3.19] [%bestmove g7h6] } 17. h4 { [%clk 0:02:19.8] [%eval -5.06] [%bestmove g1h1] } 17... h5 { [%clk 0:02:12.4] [%eval -2.79] [%bestmove g7h6] } 18. Bh3 { [%clk 0:02:06.3] [%eval -2.80] [%bestmove g2h3] } 18... Nc5 { [%clk 0:02:09.7] [%eval -1.89] [%bestmove c7c6] } 19. Qc2 { [%clk 0:02:04.9] [%eval -3.28] [%bestmove d3f3] } 19... Be5 { [%clk 0:02:08.1] [%eval -3.06] [%bestmove g7h6] } 20. Qg2 { [%clk 0:01:49.8] [%eval -3.61] [%bestmove f4f3] } 20... Bxf4 { [%clk 0:02:06] [%eval -3.77] [%bestmove e5f4] } 21. Rxf4 { [%clk 0:01:48.7] [%eval -3.89] [%bestmove f1f4] } 21... Nd3 { [%clk 0:01:59.5] [%eval -3.82] [%bestmove c5d3] } 22. Rf5 { [%clk 0:01:43.5] [%eval -3.65] [%bestmove f4f1] } 22... Kh8 { [%clk 0:01:39.2] [%eval -2.06] [%bestmove e7h4] } 23. Qd2 { [%clk 0:01:39.7] [%eval -2.66] [%bestmove g2d2] } 23... Kh7 { [%clk 0:00:52.4] [%eval -1.05] [%bestmove f7f6] } 24. Rxh5+ { [%clk 0:01:19.8] [%eval 0.05] [%bestmove g3h5] } 24... Kg7 { [%clk 0:00:45.4] [%eval #2] [%bestmove g6h5] } 25. Qh6+ { [%clk 0:01:14.1] [%eval #1] [%bestmove d2h6] } 25... Kf6 { [%clk 0:00:43.2] [%eval #1] [%bestmove g7f6] } 26. Rf5# { [%clk 0:01:12.8] [%bestmove h5f5] } 1-0`
  },
  {
    id: 18,
    white: 'GothamChess', white_elo: 2957,
    black: 'JamyTheSaint', black_elo: 2811,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.24', round: '-', result: '1-0',
    eco: 'D00',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.24"]
[Round "-"]
[White "GothamChess"]
[Black "JamyTheSaint"]
[Result "1-0"]
[CurrentPosition "1Bbq1rk1/p2np1b1/4p3/1QP2nP1/2p4p/2N5/PP2NPP1/2KR1B1R b - - 0 18"]
[Timezone "UTC"]
[ECO "D00"]
[ECOUrl "https://www.chess.com/openings/Queens-Pawn-Opening-Levitsky-Attack"]
[UTCDate "2026.08.24"]
[UTCTime "03:16:36"]
[WhiteElo "2957"]
[BlackElo "2811"]
[TimeControl "180"]
[Termination "GothamChess won by resignation"]
[StartTime "03:16:36"]
[EndDate "2026.08.24"]
[EndTime "03:18:47"]
[Link "https://www.chess.com/game/live/173439274492"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:50:45Z"] } 1. d4 { [%clk 0:02:59.4] [%eval 0.27] [%bestmove e2e4] } 1... d5 { [%clk 0:02:59] [%eval 0.26] [%bestmove d7d5] } 2. Bg5 { [%clk 0:02:58.3] [%eval -0.23] [%bestmove c2c4] } 2... Nd7 { [%clk 0:02:57.6] [%eval 0.39] [%bestmove c7c5] } 3. c4 { [%clk 0:02:56.8] [%eval 0.11] [%bestmove c2c4] } 3... dxc4 { [%clk 0:02:55.8] [%eval 0.11] [%bestmove d5c4] } 4. Nc3 { [%clk 0:02:55.4] [%eval -0.03] [%bestmove g1f3] } 4... h6 { [%clk 0:02:53.5] [%eval 0.23] [%bestmove c7c6] } 5. Bh4 { [%clk 0:02:54.5] [%eval 0.18] [%bestmove g5f4] } 5... g5 { [%clk 0:02:50.7] [%eval 0.77] [%bestmove a7a6] } 6. Bg3 { [%clk 0:02:53.9] [%eval 0.77] [%bestmove h4g3] } 6... Bg7 { [%clk 0:02:50.1] [%eval 0.81] [%bestmove d7b6] } 7. e4 { [%clk 0:02:53.2] [%eval 0.26] [%bestmove e2e3] } 7... Nb6 { [%clk 0:02:42.3] [%eval 0.55] [%bestmove c7c5] } 8. e5 { [%clk 0:02:52.6] [%eval -0.40] [%bestmove g1f3] } 8... h5 { [%clk 0:02:36.5] [%eval -0.07] [%bestmove c8f5] } 9. h4 { [%clk 0:02:51.5] [%eval -0.05] [%bestmove h2h4] } 9... Nh6 { [%clk 0:02:34.3] [%eval 0.72] [%bestmove g5g4] } 10. hxg5 { [%clk 0:02:49.4] [%eval 0.64] [%bestmove h4g5] } 10... Nf5 { [%clk 0:02:33.1] [%eval 1.06] [%bestmove h6f5] } 11. Nge2 { [%clk 0:02:48] [%eval 0.63] [%bestmove h1h5] } 11... c5 { [%clk 0:02:17.7] [%eval 1.14] [%bestmove c7c6] } 12. dxc5 { [%clk 0:02:46.2] [%eval 1.03] [%bestmove d4c5] } 12... Nd7 { [%clk 0:02:15.4] [%eval 0.98] [%bestmove b6d7] } 13. e6 { [%clk 0:02:37.7] [%eval 1.04] [%bestmove d1a4] } 13... fxe6 { [%clk 0:02:13.2] [%eval 1.34] [%bestmove f7e6] } 14. Qa4 { [%clk 0:02:31.4] [%eval 0.62] [%bestmove e2f4] } 14... h4 { [%clk 0:02:03.4] [%eval 1.69] [%bestmove b7b5] } 15. Bf4 { [%clk 0:02:25.3] [%eval 1.67] [%bestmove g3f4] } 15... O-O { [%clk 0:01:53.7] [%eval 2.57] [%bestmove e6e5] } 16. O-O-O { [%clk 0:02:19.3] [%eval 2.88] [%bestmove e1c1] } 16... b5 { [%clk 0:01:48.9] [%eval 3.23] [%bestmove d8e8] } 17. Qxb5 { [%clk 0:02:16.1] [%eval 3.24] [%bestmove a4b5] } 17... Rb8 { [%clk 0:01:45.4] [%eval 5.74] [%bestmove d8e8] } 18. Bxb8 { [%clk 0:02:15] [%eval 5.64] [%bestmove f4b8] } 1-0`
  },
  {
    id: 19,
    white: 'GothamChess', white_elo: 3123,
    black: 'F7m_08', black_elo: 2969,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.25', round: '-', result: '1-0',
    eco: 'A01',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.25"]
[Round "-"]
[White "GothamChess"]
[Black "F7m_08"]
[Result "1-0"]
[CurrentPosition "2Q3k1/1p3ppp/p4n2/6q1/3rp2n/1P2P1P1/PB2BP1P/R5K1 b - - 0 23"]
[Timezone "UTC"]
[ECO "A01"]
[ECOUrl "https://www.chess.com/openings/Nimzowitsch-Larsen-Attack-Modern-Variation-2.Bb2-Nc6-3.e3-Nf6-4.Nf3"]
[UTCDate "2026.08.25"]
[UTCTime "03:17:22"]
[WhiteElo "3123"]
[BlackElo "2969"]
[TimeControl "60"]
[Termination "GothamChess won by resignation"]
[StartTime "03:17:22"]
[EndDate "2026.08.25"]
[EndTime "03:18:22"]
[Link "https://www.chess.com/game/live/173487499542"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:50:07Z"] } 1. b3 { [%clk 0:00:59.9] [%eval -0.19] [%bestmove e2e4] } 1... e5 { [%clk 0:00:57.9] [%eval -0.07] [%bestmove e7e5] } 2. Bb2 { [%clk 0:00:59.8] [%eval -0.28] [%bestmove c1b2] } 2... Nc6 { [%clk 0:00:56.9] [%eval -0.15] [%bestmove b8c6] } 3. e3 { [%clk 0:00:59.5] [%eval -0.28] [%bestmove e2e3] } 3... Nf6 { [%clk 0:00:56] [%eval -0.19] [%bestmove g8f6] } 4. Nf3 { [%clk 0:00:59.1] [%eval -0.22] [%bestmove f1b5] } 4... Bd6 { [%clk 0:00:55.6] [%eval 0.34] [%bestmove e5e4] } 5. Na3 { [%clk 0:00:58.1] [%eval -0.95] [%bestmove b1c3] } 5... O-O { [%clk 0:00:55.2] [%eval 0.45] [%bestmove e5e4] } 6. Nc4 { [%clk 0:00:57.7] [%eval 0.46] [%bestmove a3c4] } 6... Re8 { [%clk 0:00:55.1] [%eval 0.71] [%bestmove f8e8] } 7. Nxd6 { [%clk 0:00:57.2] [%eval 0.31] [%bestmove f1e2] } 7... cxd6 { [%clk 0:00:54.7] [%eval 0.15] [%bestmove c7d6] } 8. d3 { [%clk 0:00:56.9] [%eval 0.29] [%bestmove f1e2] } 8... d5 { [%clk 0:00:54.4] [%eval 0.27] [%bestmove d6d5] } 9. Be2 { [%clk 0:00:56.2] [%eval 0.27] [%bestmove f1e2] } 9... e4 { [%clk 0:00:54.1] [%eval 1.24] [%bestmove b7b5] } 10. Nd4 { [%clk 0:00:55.6] [%eval 1.11] [%bestmove f3d4] } 10... Ne5 { [%clk 0:00:52.9] [%eval 1.34] [%bestmove d7d6] } 11. O-O { [%clk 0:00:54.8] [%eval 1.07] [%bestmove d1d2] } 11... Ng6 { [%clk 0:00:52.6] [%eval 1.99] [%bestmove d7d6] } 12. c4 { [%clk 0:00:54] [%eval 1.07] [%bestmove d4b5] } 12... dxc4 { [%clk 0:00:51.4] [%eval 1.18] [%bestmove d5c4] } 13. dxc4 { [%clk 0:00:53] [%eval 1.21] [%bestmove b3c4] } 13... d5 { [%clk 0:00:51] [%eval 0.91] [%bestmove d7d5] } 14. cxd5 { [%clk 0:00:52] [%eval 0.77] [%bestmove d4b5] } 14... Qxd5 { [%clk 0:00:50.4] [%eval 0.25] [%bestmove f6d5] } 15. Nb5 { [%clk 0:00:49.6] [%eval 0.00] [%bestmove d4b5] } 15... Qg5 { [%clk 0:00:46.8] [%eval 0.80] [%bestmove d5g5] } 16. Nc7 { [%clk 0:00:46.2] [%eval -1.22] [%bestmove b2f6] } 16... Bh3 { [%clk 0:00:46.3] [%eval -1.40] [%bestmove c8h3] } 17. g3 { [%clk 0:00:45.2] [%eval -1.07] [%bestmove g2g3] } 17... Red8 { [%clk 0:00:42.9] [%eval -1.22] [%bestmove e8d8] } 18. Qe1 { [%clk 0:00:42.5] [%eval -2.82] [%bestmove c7a8] } 18... Rac8 { [%clk 0:00:42] [%eval -2.79] [%bestmove h3f1] } 19. Nb5 { [%clk 0:00:38.6] [%eval -2.82] [%bestmove c7b5] } 19... Bxf1 { [%clk 0:00:41.6] [%eval -2.61] [%bestmove h3f1] } 20. Qxf1 { [%clk 0:00:37.5] [%eval -2.89] [%bestmove e1f1] } 20... Nh4 { [%clk 0:00:40.9] [%eval -1.80] [%bestmove g6e5] } 21. Nd4 { [%clk 0:00:36.5] [%eval -2.40] [%bestmove b2f6] } 21... a6 { [%clk 0:00:36.7] [%eval -2.08] [%bestmove h4g6] } 22. Qh3 { [%clk 0:00:35.5] [%eval -2.10] [%bestmove a1c1] } 22... Rxd4 { [%clk 0:00:34.6] [%eval #3] [%bestmove h4g6] } 23. Qxc8+ { [%clk 0:00:32.7] [%eval #2] [%bestmove h3c8] } 1-0`
  },
  {
    id: 20,
    white: 'jkaRUSSIA', white_elo: 2815,
    black: 'GothamChess', black_elo: 2906,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.25', round: '-', result: '1-0',
    eco: 'A40',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.25"]
[Round "-"]
[White "jkaRUSSIA"]
[Black "GothamChess"]
[Result "1-0"]
[CurrentPosition "r1bqrk2/ppnn1Qp1/4p3/3pN1b1/3P4/2NBP3/PP3P1P/R3K2R b KQ - 0 17"]
[Timezone "UTC"]
[ECO "A40"]
[ECOUrl "https://www.chess.com/openings/Queens-Pawn-Opening"]
[UTCDate "2026.08.25"]
[UTCTime "14:42:17"]
[WhiteElo "2815"]
[BlackElo "2906"]
[TimeControl "180"]
[Termination "jkaRUSSIA won by checkmate"]
[StartTime "14:42:17"]
[EndDate "2026.08.25"]
[EndTime "14:43:50"]
[Link "https://www.chess.com/game/live/173510361166"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:49:58Z"] } 1. d4 { [%clk 0:02:47.9] [%eval 0.27] [%bestmove d2d4] } 1... Na6 { [%clk 0:02:58.9] [%eval 1.01] [%bestmove g8f6] } 2. Nf3 { [%clk 0:02:47.1] [%eval 0.72] [%bestmove e2e4] } 2... c6 { [%clk 0:02:58.2] [%eval 1.04] [%bestmove g8f6] } 3. c4 { [%clk 0:02:45.6] [%eval 0.78] [%bestmove e2e4] } 3... d5 { [%clk 0:02:57] [%eval 1.05] [%bestmove g7g6] } 4. cxd5 { [%clk 0:02:43.5] [%eval 1.17] [%bestmove c4d5] } 4... cxd5 { [%clk 0:02:56] [%eval 1.18] [%bestmove c6d5] } 5. Nc3 { [%clk 0:02:43.2] [%eval 1.03] [%bestmove e2e4] } 5... Nf6 { [%clk 0:02:55.7] [%eval 0.83] [%bestmove g8f6] } 6. Bf4 { [%clk 0:02:41.6] [%eval 0.76] [%bestmove f3e5] } 6... e6 { [%clk 0:02:54.5] [%eval 0.76] [%bestmove a6b8] } 7. e3 { [%clk 0:02:39.9] [%eval 0.85] [%bestmove a1c1] } 7... Bd6 { [%clk 0:02:54.1] [%eval 1.55] [%bestmove a6b8] } 8. Bb5+ { [%clk 0:02:37.2] [%eval 1.64] [%bestmove f1b5] } 8... Ke7 { [%clk 0:02:53.4] [%eval 1.56] [%bestmove e8f8] } 9. Bg5 { [%clk 0:02:28.1] [%eval 1.30] [%bestmove f3e5] } 9... Nc7 { [%clk 0:02:52.2] [%eval 1.89] [%bestmove h7h6] } 10. Bd3 { [%clk 0:02:25.4] [%eval 1.68] [%bestmove b5d3] } 10... h6 { [%clk 0:02:51.6] [%eval 1.75] [%bestmove e7f8] } 11. Bh4 { [%clk 0:02:24.5] [%eval 1.94] [%bestmove g5h4] } 11... Re8 { [%clk 0:02:51] [%eval 2.53] [%bestmove c8d7] } 12. g4 { [%clk 0:02:21.6] [%eval 1.24] [%bestmove f3e5] } 12... Kf8 { [%clk 0:02:46.9] [%eval 2.76] [%bestmove g7g5] } 13. g5 { [%clk 0:02:20.3] [%eval 1.77] [%bestmove f3e5] } 13... hxg5 { [%clk 0:02:46.8] [%eval 2.34] [%bestmove h6g5] } 14. Bxg5 { [%clk 0:02:18.7] [%eval 0.97] [%bestmove f3g5] } 14... Be7 { [%clk 0:02:46.3] [%eval 3.28] [%bestmove e6e5] } 15. Ne5 { [%clk 0:02:14.8] [%eval 3.27] [%bestmove f3e5] } 15... Nd7 { [%clk 0:02:43.2] [%eval #3] [%bestmove c7a6] } 16. Qh5 { [%clk 0:01:53.5] [%eval #2] [%bestmove d1h5] } 16... Bxg5 { [%clk 0:02:42] [%eval #1] [%bestmove f8g8] } 17. Qxf7# { [%clk 0:01:52.3] [%bestmove h5f7] } 1-0`
  },
  {
    id: 21,
    white: 'GothamChess', white_elo: 3074,
    black: 'StockFisher_HBK', black_elo: 2893,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.25', round: '-', result: '0-1',
    eco: 'B00',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.25"]
[Round "-"]
[White "GothamChess"]
[Black "StockFisher_HBK"]
[Result "0-1"]
[CurrentPosition "5k2/p4p2/4p3/4P1Pp/2q4P/6K1/8/8 w - - 0 50"]
[Timezone "UTC"]
[ECO "B00"]
[ECOUrl "https://www.chess.com/openings/Owens-Defense-2.d4-Bb7"]
[UTCDate "2026.08.25"]
[UTCTime "23:55:39"]
[WhiteElo "3074"]
[BlackElo "2893"]
[TimeControl "60"]
[Termination "StockFisher_HBK won by resignation"]
[StartTime "23:55:39"]
[EndDate "2026.08.25"]
[EndTime "23:57:12"]
[Link "https://www.chess.com/game/live/173531785794"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:49:16Z"] } 1. e4 { [%clk 0:00:58.7] [%eval 0.31] [%bestmove e2e4] } 1... b6 { [%clk 0:00:58] [%eval 0.94] [%bestmove c7c6] } 2. d4 { [%clk 0:00:57.2] [%eval 0.86] [%bestmove d2d4] } 2... Bb7 { [%clk 0:00:57.9] [%eval 1.05] [%bestmove c8b7] } 3. f3 { [%clk 0:00:56.9] [%eval 0.26] [%bestmove f1d3] } 3... e6 { [%clk 0:00:57.3] [%eval 0.57] [%bestmove d7d5] } 4. a3 { [%clk 0:00:56.2] [%eval 0.06] [%bestmove c2c4] } 4... d5 { [%clk 0:00:57.2] [%eval 0.11] [%bestmove d7d5] } 5. e5 { [%clk 0:00:55.5] [%eval -0.15] [%bestmove b1c3] } 5... c5 { [%clk 0:00:56.4] [%eval -0.06] [%bestmove c7c5] } 6. c3 { [%clk 0:00:55.3] [%eval -0.24] [%bestmove c2c3] } 6... cxd4 { [%clk 0:00:56] [%eval 0.53] [%bestmove b8c6] } 7. cxd4 { [%clk 0:00:54.4] [%eval 0.47] [%bestmove c3d4] } 7... Nc6 { [%clk 0:00:55.9] [%eval 0.42] [%bestmove b8c6] } 8. Nc3 { [%clk 0:00:54] [%eval -1.86] [%bestmove c1e3] } 8... Nge7 { [%clk 0:00:55.8] [%eval 0.61] [%bestmove d8h4] } 9. f4 { [%clk 0:00:51.1] [%eval 0.30] [%bestmove c1e3] } 9... Nf5 { [%clk 0:00:55.3] [%eval 0.24] [%bestmove e7f5] } 10. Nf3 { [%clk 0:00:50.8] [%eval 0.35] [%bestmove g1f3] } 10... Be7 { [%clk 0:00:54.6] [%eval 0.22] [%bestmove f8e7] } 11. g3 { [%clk 0:00:50.1] [%eval -0.23] [%bestmove f1b5] } 11... O-O { [%clk 0:00:53.5] [%eval -0.21] [%bestmove a8c8] } 12. Bg2 { [%clk 0:00:49.2] [%eval -0.61] [%bestmove f1e2] } 12... Rc8 { [%clk 0:00:53.1] [%eval -0.60] [%bestmove b7a6] } 13. O-O { [%clk 0:00:48.7] [%eval -2.05] [%bestmove d1d3] } 13... Ncxd4 { [%clk 0:00:52.4] [%eval -2.34] [%bestmove c6d4] } 14. Nxd4 { [%clk 0:00:48.1] [%eval -1.90] [%bestmove f3d4] } 14... Nxd4 { [%clk 0:00:52.2] [%eval -1.83] [%bestmove f5d4] } 15. Be3 { [%clk 0:00:45.8] [%eval -1.88] [%bestmove c1e3] } 15... Nf5 { [%clk 0:00:51.1] [%eval -1.80] [%bestmove d4f5] } 16. Bf2 { [%clk 0:00:45.5] [%eval -1.89] [%bestmove e3f2] } 16... Bc5 { [%clk 0:00:50.3] [%eval -1.97] [%bestmove b7a6] } 17. Rc1 { [%clk 0:00:44.7] [%eval -4.21] [%bestmove d1e2] } 17... Bxf2+ { [%clk 0:00:49.1] [%eval -2.03] [%bestmove f5e3] } 18. Rxf2 { [%clk 0:00:44.6] [%eval -2.30] [%bestmove f1f2] } 18... Qe7 { [%clk 0:00:48.2] [%eval -2.11] [%bestmove f5e3] } 19. g4 { [%clk 0:00:42.8] [%eval -4.00] [%bestmove g2h3] } 19... Ne3 { [%clk 0:00:47.3] [%eval -3.94] [%bestmove f5e3] } 20. Qd2 { [%clk 0:00:40.8] [%eval -4.33] [%bestmove d1d3] } 20... Nxg2 { [%clk 0:00:47.2] [%eval -4.60] [%bestmove e3g4] } 21. Rxg2 { [%clk 0:00:40.5] [%eval -4.49] [%bestmove f2g2] } 21... d4 { [%clk 0:00:47.1] [%eval -4.61] [%bestmove d5d4] } 22. Qxd4 { [%clk 0:00:37.8] [%eval -4.43] [%bestmove d2d4] } 22... Bxg2 { [%clk 0:00:45.6] [%eval -4.35] [%bestmove b7g2] } 23. Kxg2 { [%clk 0:00:37.7] [%eval -4.50] [%bestmove g1g2] } 23... Rfd8 { [%clk 0:00:44.9] [%eval -4.41] [%bestmove f8d8] } 24. Qe3 { [%clk 0:00:37.3] [%eval -4.49] [%bestmove d4e3] } 24... Qb7+ { [%clk 0:00:43.5] [%eval -4.39] [%bestmove e7d7] } 25. Kg3 { [%clk 0:00:36.9] [%eval -4.68] [%bestmove g2f2] } 25... Qd7 { [%clk 0:00:42] [%eval -4.28] [%bestmove b7a6] } 26. Re1 { [%clk 0:00:36.2] [%eval -4.41] [%bestmove c1d1] } 26... Qd2 { [%clk 0:00:39.8] [%eval -4.11] [%bestmove d7d2] } 27. Re2 { [%clk 0:00:35.2] [%eval -4.10] [%bestmove e3d2] } 27... Qxe3+ { [%clk 0:00:39.1] [%eval -4.09] [%bestmove d2e3] } 28. Rxe3 { [%clk 0:00:35.1] [%eval -4.42] [%bestmove e2e3] } 28... Rd2 { [%clk 0:00:37.5] [%eval -4.26] [%bestmove d8d2] } 29. Ne4 { [%clk 0:00:34.7] [%eval -4.29] [%bestmove c3b5] } 29... Rxb2 { [%clk 0:00:36.3] [%eval -3.60] [%bestmove d2b2] } 30. Nd6 { [%clk 0:00:34.5] [%eval -3.79] [%bestmove e3d3] } 30... Rc7 { [%clk 0:00:35.6] [%eval -3.35] [%bestmove c8c2] } 31. f5 { [%clk 0:00:32.9] [%eval -3.89] [%bestmove e3d3] } 31... Rbc2 { [%clk 0:00:34.8] [%eval -4.01] [%bestmove b2d2] } 32. f6 { [%clk 0:00:32.3] [%eval -4.67] [%bestmove d6b5] } 32... R2c3 { [%clk 0:00:33.9] [%eval -4.67] [%bestmove c7c3] } 33. Kf4 { [%clk 0:00:30.7] [%eval -5.26] [%bestmove e3f3] } 33... Rxe3 { [%clk 0:00:33.1] [%eval -5.29] [%bestmove c3e3] } 34. Kxe3 { [%clk 0:00:30.6] [%eval -5.03] [%bestmove f4e3] } 34... Rc3+ { [%clk 0:00:32.6] [%eval -4.57] [%bestmove g7f6] } 35. Kd4 { [%clk 0:00:29.9] [%eval -4.73] [%bestmove e3d4] } 35... Rxa3 { [%clk 0:00:32.5] [%eval -4.98] [%bestmove c3a3] } 36. Ne8 { [%clk 0:00:29.1] [%eval -5.53] [%bestmove g4g5] } 36... gxf6 { [%clk 0:00:31.9] [%eval -5.90] [%bestmove g7f6] } 37. Nxf6+ { [%clk 0:00:28.8] [%eval -5.86] [%bestmove d4e4] } 37... Kg7 { [%clk 0:00:31.6] [%eval -5.33] [%bestmove g8g7] } 38. h4 { [%clk 0:00:28.4] [%eval -6.17] [%bestmove g4g5] } 38... h6 { [%clk 0:00:27.7] [%eval -5.65] [%bestmove a3a4] } 39. Ke4 { [%clk 0:00:27.5] [%eval -5.50] [%bestmove d4e4] } 39... b5 { [%clk 0:00:26.4] [%eval -5.48] [%bestmove a7a5] } 40. Ne8+ { [%clk 0:00:27.1] [%eval -5.51] [%bestmove g4g5] } 40... Kf8 { [%clk 0:00:25.5] [%eval -5.72] [%bestmove g7f8] } 41. Nd6 { [%clk 0:00:27] [%eval -6.14] [%bestmove e4d4] } 41... b4 { [%clk 0:00:24.7] [%eval -5.72] [%bestmove a7a6] } 42. Nc4 { [%clk 0:00:26.7] [%eval -6.26] [%bestmove d6c4] } 42... Ra4 { [%clk 0:00:24.1] [%eval -5.89] [%bestmove a3a1] } 43. Nb2 { [%clk 0:00:25.9] [%eval -5.51] [%bestmove e4d3] } 43... Ra2 { [%clk 0:00:23.5] [%eval -6.06] [%bestmove a4a5] } 44. Nd3 { [%clk 0:00:25] [%eval -5.80] [%bestmove b2c4] } 44... b3 { [%clk 0:00:23.4] [%eval -6.20] [%bestmove a2a4] } 45. Nb4 { [%clk 0:00:24.7] [%eval -6.50] [%bestmove e4d4] } 45... b2 { [%clk 0:00:22] [%eval -6.42] [%bestmove a2a4] } 46. Nxa2 { [%clk 0:00:23.8] [%eval -6.68] [%bestmove b4a2] } 46... b1=Q+ { [%clk 0:00:21.7] [%eval -6.36] [%bestmove b2b1q] } 47. Kf4 { [%clk 0:00:23.6] [%eval -6.69] [%bestmove e4d4] } 47... Qxa2 { [%clk 0:00:21.6] [%eval -5.10] [%bestmove b1e1] } 48. g5 { [%clk 0:00:23.3] [%eval -5.28] [%bestmove f4e3] } 48... Qc4+ { [%clk 0:00:20.9] [%eval -5.30] [%bestmove a2c2] } 49. Kg3 { [%clk 0:00:22.6] [%eval -6.68] [%bestmove f4f3] } 49... h5 { [%clk 0:00:20.8] [%eval -10.07] [%bestmove c4h4] } 0-1`
  },
  {
    id: 22,
    white: 'GothamChess', white_elo: 2870,
    black: 'Die_Sonne', black_elo: 2852,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.27', round: '-', result: '1/2-1/2',
    eco: 'C25',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.27"]
[Round "-"]
[White "GothamChess"]
[Black "Die_Sonne"]
[Result "1/2-1/2"]
[CurrentPosition "8/8/8/8/6k1/4K3/8/8 w - - 0 67"]
[Timezone "UTC"]
[ECO "C25"]
[ECOUrl "https://www.chess.com/openings/Vienna-Game-Max-Lange-Defense"]
[UTCDate "2026.08.27"]
[UTCTime "13:56:12"]
[WhiteElo "2870"]
[BlackElo "2852"]
[TimeControl "180"]
[Termination "Game drawn by insufficient material"]
[StartTime "13:56:12"]
[EndDate "2026.08.27"]
[EndTime "14:01:45"]
[Link "https://www.chess.com/game/live/173605580880"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:48:46Z"] } 1. Nc3 { [%clk 0:02:59.1] [%eval -0.03] [%bestmove e2e4] } 1... e5 { [%clk 0:02:58.1] [%eval 0.24] [%bestmove d7d5] } 2. e4 { [%clk 0:02:58] [%eval 0.22] [%bestmove e2e4] } 2... Nc6 { [%clk 0:02:56.9] [%eval 0.27] [%bestmove b8c6] } 3. d3 { [%clk 0:02:57.3] [%eval -0.38] [%bestmove g1f3] } 3... Bc5 { [%clk 0:02:56.1] [%eval -0.12] [%bestmove g8e7] } 4. Be3 { [%clk 0:02:55.4] [%eval -0.37] [%bestmove g2g3] } 4... Bb6 { [%clk 0:02:55.1] [%eval -0.01] [%bestmove d7d6] } 5. Qg4 { [%clk 0:02:53] [%eval 0.05] [%bestmove e3b6] } 5... g6 { [%clk 0:02:46.1] [%eval 0.33] [%bestmove g8f6] } 6. Nd5 { [%clk 0:02:50.3] [%eval -0.24] [%bestmove g4g3] } 6... d6 { [%clk 0:02:42.2] [%eval -0.25] [%bestmove d7d6] } 7. Qg3 { [%clk 0:02:44.8] [%eval -0.45] [%bestmove g4g3] } 7... Bxe3 { [%clk 0:02:39.1] [%eval 0.01] [%bestmove c8e6] } 8. fxe3 { [%clk 0:02:43.9] [%eval 0.03] [%bestmove f2e3] } 8... Be6 { [%clk 0:02:38.2] [%eval 0.24] [%bestmove g8f6] } 9. Nf3 { [%clk 0:02:38.5] [%eval -0.75] [%bestmove e1c1] } 9... Bxd5 { [%clk 0:02:33.2] [%eval -0.47] [%bestmove e6d5] } 10. exd5 { [%clk 0:02:38.4] [%eval -0.13] [%bestmove e4d5] } 10... Nce7 { [%clk 0:02:32.8] [%eval 0.58] [%bestmove c6b4] } 11. c4 { [%clk 0:02:36.2] [%eval -0.54] [%bestmove e3e4] } 11... f5 { [%clk 0:02:27] [%eval 0.61] [%bestmove c7c6] } 12. Nxe5 { [%clk 0:02:34.7] [%eval 0.31] [%bestmove d3d4] } 12... Nf6 { [%clk 0:02:22] [%eval 0.45] [%bestmove c7c6] } 13. Nf3 { [%clk 0:02:32.2] [%eval 0.36] [%bestmove e5f3] } 13... O-O { [%clk 0:02:20.7] [%eval 0.90] [%bestmove c7c6] } 14. Nd4 { [%clk 0:02:30.1] [%eval 0.64] [%bestmove e1c1] } 14... Qd7 { [%clk 0:02:14.4] [%eval 1.28] [%bestmove c7c6] } 15. Be2 { [%clk 0:02:28] [%eval 1.25] [%bestmove f1e2] } 15... c6 { [%clk 0:02:12.8] [%eval 1.34] [%bestmove c7c6] } 16. dxc6 { [%clk 0:02:23.4] [%eval 0.87] [%bestmove d4e6] } 16... Nxc6 { [%clk 0:02:11.4] [%eval 0.95] [%bestmove e7c6] } 17. O-O { [%clk 0:02:17.2] [%eval 0.65] [%bestmove e1c1] } 17... Nxd4 { [%clk 0:02:05.2] [%eval 0.81] [%bestmove c6d4] } 18. exd4 { [%clk 0:02:17.1] [%eval 0.69] [%bestmove e3d4] } 18... Rae8 { [%clk 0:01:59.2] [%eval 0.75] [%bestmove d6d5] } 19. Bf3 { [%clk 0:02:15.6] [%eval 0.33] [%bestmove e2f3] } 19... Re3 { [%clk 0:01:58.1] [%eval 0.72] [%bestmove e8e3] } 20. Rfd1 { [%clk 0:02:07.3] [%eval 0.04] [%bestmove f1e1] } 20... Rfe8 { [%clk 0:01:55.2] [%eval 0.09] [%bestmove d7e7] } 21. Qf4 { [%clk 0:01:59.7] [%eval 0.00] [%bestmove a1c1] } 21... b6 { [%clk 0:01:46.2] [%eval 0.58] [%bestmove g8g7] } 22. h3 { [%clk 0:01:59] [%eval 0.15] [%bestmove a1c1] } 22... Qe7 { [%clk 0:01:42.7] [%eval 0.71] [%bestmove a7a5] } 23. Kh2 { [%clk 0:01:53.7] [%eval -0.05] [%bestmove b2b4] } 23... Kg7 { [%clk 0:01:39.7] [%eval -0.14] [%bestmove g8g7] } 24. a4 { [%clk 0:01:49.8] [%eval -0.25] [%bestmove c4c5] } 24... a5 { [%clk 0:01:38.1] [%eval -0.27] [%bestmove a7a5] } 25. b4 { [%clk 0:01:46.1] [%eval -0.64] [%bestmove d1d2] } 25... axb4 { [%clk 0:01:30.1] [%eval -0.67] [%bestmove a5b4] } 26. Rab1 { [%clk 0:01:45.5] [%eval -0.82] [%bestmove f3e4] } 26... d5 { [%clk 0:01:23.3] [%eval 0.79] [%bestmove h7h5] } 27. cxd5 { [%clk 0:01:40.4] [%eval 0.45] [%bestmove c4d5] } 27... Rd8 { [%clk 0:01:15.4] [%eval 1.32] [%bestmove e7d7] } 28. d6 { [%clk 0:01:39.4] [%eval 0.05] [%bestmove d1c1] } 28... Qxd6 { [%clk 0:01:14.1] [%eval 0.19] [%bestmove e7d6] } 29. Qxd6 { [%clk 0:01:38.3] [%eval 0.19] [%bestmove f4d6] } 29... Rxd6 { [%clk 0:01:14] [%eval 0.11] [%bestmove d8d6] } 30. Rxb4 { [%clk 0:01:37.8] [%eval 0.06] [%bestmove b1b4] } 30... g5 { [%clk 0:01:03.2] [%eval 0.21] [%bestmove f6d5] } 31. Kg1 { [%clk 0:01:27.8] [%eval -0.17] [%bestmove b4b5] } 31... g4 { [%clk 0:01:00.8] [%eval -0.14] [%bestmove g5g4] } 32. hxg4 { [%clk 0:01:27] [%eval -0.12] [%bestmove h3g4] } 32... fxg4 { [%clk 0:01:00.7] [%eval -0.12] [%bestmove f5g4] } 33. Kf2 { [%clk 0:01:26.5] [%eval -2.12] [%bestmove f3e4] } 33... Re7 { [%clk 0:00:56.2] [%eval 0.00] [%bestmove g4f3] } 34. Ba8 { [%clk 0:01:19.8] [%eval 0.00] [%bestmove f3a8] } 34... Ra7 { [%clk 0:00:54.7] [%eval 0.21] [%bestmove e7e8] } 35. Be4 { [%clk 0:01:18.7] [%eval 0.27] [%bestmove a8e4] } 35... Rad7 { [%clk 0:00:48.1] [%eval 0.51] [%bestmove a7e7] } 36. d5 { [%clk 0:01:09.9] [%eval 0.05] [%bestmove f2e3] } 36... Nxd5 { [%clk 0:00:44] [%eval 0.31] [%bestmove h7h5] } 37. Bxd5 { [%clk 0:01:09] [%eval 0.34] [%bestmove e4d5] } 37... Rxd5 { [%clk 0:00:43.9] [%eval 0.24] [%bestmove d6d5] } 38. Rxg4+ { [%clk 0:01:08.6] [%eval 0.24] [%bestmove b4g4] } 38... Kf6 { [%clk 0:00:42.3] [%eval 0.29] [%bestmove g7f7] } 39. Ke3 { [%clk 0:01:06.7] [%eval 0.28] [%bestmove f2e3] } 39... Re5+ { [%clk 0:00:41.6] [%eval 0.33] [%bestmove f6e7] } 40. Re4 { [%clk 0:01:05.5] [%eval 0.53] [%bestmove e3d2] } 40... Rxe4+ { [%clk 0:00:41] [%eval 0.37] [%bestmove e5g5] } 41. Kxe4 { [%clk 0:01:05.4] [%eval 0.53] [%bestmove e3e4] } 41... Re7+ { [%clk 0:00:40.3] [%eval 1.03] [%bestmove d7a7] } 42. Kd4 { [%clk 0:01:04.6] [%eval 0.22] [%bestmove e4d5] } 42... Ra7 { [%clk 0:00:39.3] [%eval 0.18] [%bestmove e7a7] } 43. Ra1 { [%clk 0:01:02.4] [%eval 0.18] [%bestmove d1b1] } 43... Ra5 { [%clk 0:00:37.9] [%eval 0.09] [%bestmove f6e6] } 44. Kc4 { [%clk 0:01:00.4] [%eval 0.05] [%bestmove d4c3] } 44... Ke6 { [%clk 0:00:36] [%eval 0.06] [%bestmove f6e6] } 45. d4 { [%clk 0:00:59.8] [%eval -0.02] [%bestmove c4b3] } 45... Kd6 { [%clk 0:00:34.4] [%eval 0.06] [%bestmove b6b5] } 46. Kd3 { [%clk 0:00:55.9] [%eval 0.00] [%bestmove a1f1] } 46... b5 { [%clk 0:00:31.6] [%eval 0.01] [%bestmove b6b5] } 47. Rh1 { [%clk 0:00:52.7] [%eval 0.00] [%bestmove a1h1] } 47... bxa4 { [%clk 0:00:30.4] [%eval 0.00] [%bestmove b5a4] } 48. Rh6+ { [%clk 0:00:51.3] [%eval 0.00] [%bestmove h1h6] } 48... Ke7 { [%clk 0:00:29.2] [%eval 0.00] [%bestmove d6d7] } 49. Rxh7+ { [%clk 0:00:50.5] [%eval 0.00] [%bestmove h6h7] } 49... Kf6 { [%clk 0:00:28.6] [%eval 0.01] [%bestmove e7d6] } 50. Rh1 { [%clk 0:00:47.3] [%eval 0.00] [%bestmove d3c4] } 50... a3 { [%clk 0:00:27.8] [%eval 0.00] [%bestmove f6e7] } 51. Ra1 { [%clk 0:00:46.5] [%eval 0.00] [%bestmove d3c4] } 51... a2 { [%clk 0:00:27.2] [%eval 0.00] [%bestmove f6e7] } 52. Kc4 { [%clk 0:00:45.2] [%eval 0.02] [%bestmove d3c4] } 52... Ra4+ { [%clk 0:00:25.7] [%eval 0.03] [%bestmove a5a4] } 53. Kb3 { [%clk 0:00:43] [%eval 0.00] [%bestmove c4c5] } 53... Rxd4 { [%clk 0:00:24.7] [%eval 0.00] [%bestmove a4d4] } 54. Rxa2 { [%clk 0:00:42.5] [%eval -0.04] [%bestmove g2g3] } 54... Rg4 { [%clk 0:00:24.5] [%eval -0.03] [%bestmove d4d6] } 55. Kc3 { [%clk 0:00:39.5] [%eval -0.04] [%bestmove g2g3] } 55... Kg5 { [%clk 0:00:22.9] [%eval -0.02] [%bestmove g4g7] } 56. Kd3 { [%clk 0:00:38.1] [%eval -0.03] [%bestmove c3d3] } 56... Kf4 { [%clk 0:00:22.5] [%eval 0.00] [%bestmove g4g3] } 57. Ra4+ { [%clk 0:00:36.6] [%eval 0.01] [%bestmove a2a4] } 57... Kg3 { [%clk 0:00:22.4] [%eval 0.03] [%bestmove f4g5] } 58. Rxg4+ { [%clk 0:00:34.8] [%eval 0.02] [%bestmove a4g4] } 58... Kxg4 { [%clk 0:00:22.3] [%eval 0.00] [%bestmove g3g4] } 59. Ke2 { [%clk 0:00:33.9] [%eval 0.02] [%bestmove d3e2] } 59... Kg3 { [%clk 0:00:22.2] [%eval 0.03] [%bestmove g4g3] } 60. Kf1 { [%clk 0:00:33.3] [%eval 0.03] [%bestmove e2f1] } 60... Kg4 { [%clk 0:00:22] [%eval 0.03] [%bestmove g3g4] } 61. Kf2 { [%clk 0:00:32.9] [%eval 0.02] [%bestmove f1f2] } 61... Kf4 { [%clk 0:00:21.5] [%eval 0.03] [%bestmove g4f4] } 62. g3+ { [%clk 0:00:32.5] [%eval 0.03] [%bestmove g2g3] } 62... Kg4 { [%clk 0:00:20.9] [%eval 0.03] [%bestmove f4f5] } 63. Kg2 { [%clk 0:00:32.4] [%eval 0.04] [%bestmove f2g2] } 63... Kg5 { [%clk 0:00:20.8] [%eval 0.03] [%bestmove g4g5] } 64. Kf3 { [%clk 0:00:32.3] [%eval 0.03] [%bestmove g2f3] } 64... Kf5 { [%clk 0:00:20.1] [%eval 0.03] [%bestmove g5f5] } 65. g4+ { [%clk 0:00:32.2] [%eval 0.03] [%bestmove g3g4] } 65... Kg5 { [%clk 0:00:19.5] [%eval 0.03] [%bestmove f5g6] } 66. Ke3 { [%clk 0:00:32.1] [%eval 0.00] [%bestmove f3g3] } 66... Kxg4 { [%clk 0:00:18.8] [%bestmove g5g4] } 1/2-1/2`
  },
  {
    id: 23,
    white: 'thebeaglez', white_elo: 2877,
    black: 'GothamChess', black_elo: 2874,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.28', round: '-', result: '0-1',
    eco: 'A47',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.28"]
[Round "-"]
[White "thebeaglez"]
[Black "GothamChess"]
[Result "0-1"]
[CurrentPosition "6k1/p3r3/P2Rn1q1/4P3/2pP4/2P2P2/R2QKPp1/6Nr b - - 3 36"]
[Timezone "UTC"]
[ECO "A47"]
[ECOUrl "https://www.chess.com/openings/Indian-Game-Knights-Variation-2...b6-3.e3-Bb7-4.Bd3"]
[UTCDate "2026.08.28"]
[UTCTime "23:04:57"]
[WhiteElo "2877"]
[BlackElo "2874"]
[TimeControl "180"]
[Termination "GothamChess won by resignation"]
[StartTime "23:04:57"]
[EndDate "2026.08.28"]
[EndTime "23:09:58"]
[Link "https://www.chess.com/game/live/173675141246"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:48:17Z"] } 1. d4 { [%clk 0:02:55.2] [%eval 0.29] [%bestmove d2d4] } 1... Nf6 { [%clk 0:02:54.7] [%eval 0.31] [%bestmove d7d5] } 2. Nf3 { [%clk 0:02:52.4] [%eval 0.26] [%bestmove c2c4] } 2... b6 { [%clk 0:02:54] [%eval 0.47] [%bestmove d7d5] } 3. e3 { [%clk 0:02:51] [%eval 0.30] [%bestmove g2g3] } 3... Bb7 { [%clk 0:02:53.3] [%eval 0.29] [%bestmove c8b7] } 4. Bd3 { [%clk 0:02:50.7] [%eval 0.04] [%bestmove f1d3] } 4... g6 { [%clk 0:02:52.8] [%eval 0.47] [%bestmove d7d5] } 5. O-O { [%clk 0:02:50.3] [%eval 0.29] [%bestmove c2c4] } 5... Bg7 { [%clk 0:02:52] [%eval 0.27] [%bestmove f8g7] } 6. c4 { [%clk 0:02:50.1] [%eval 0.36] [%bestmove c2c4] } 6... O-O { [%clk 0:02:49.1] [%eval 0.39] [%bestmove e7e6] } 7. Nc3 { [%clk 0:02:49.6] [%eval 0.42] [%bestmove b1c3] } 7... e6 { [%clk 0:02:46.1] [%eval 0.71] [%bestmove d7d5] } 8. e4 { [%clk 0:02:47.5] [%eval 0.79] [%bestmove e3e4] } 8... d5 { [%clk 0:02:44.3] [%eval 1.56] [%bestmove d7d6] } 9. cxd5 { [%clk 0:02:47.1] [%eval 1.41] [%bestmove c4d5] } 9... exd5 { [%clk 0:02:43.4] [%eval 1.57] [%bestmove e6d5] } 10. e5 { [%clk 0:02:46.8] [%eval 1.58] [%bestmove e4e5] } 10... Ne4 { [%clk 0:02:43.3] [%eval 1.58] [%bestmove f6e4] } 11. Qe2 { [%clk 0:02:44.4] [%eval 1.19] [%bestmove f1e1] } 11... Nxc3 { [%clk 0:02:40.6] [%eval 1.65] [%bestmove c7c5] } 12. bxc3 { [%clk 0:02:43.7] [%eval 1.41] [%bestmove b2c3] } 12... c5 { [%clk 0:02:40.4] [%eval 1.82] [%bestmove f8e8] } 13. Bg5 { [%clk 0:02:35.8] [%eval 1.60] [%bestmove h2h4] } 13... Qd7 { [%clk 0:02:39.2] [%eval 1.86] [%bestmove d8c8] } 14. Qe3 { [%clk 0:02:34.4] [%eval 1.09] [%bestmove h2h4] } 14... Ba6 { [%clk 0:02:34.3] [%eval 0.93] [%bestmove b7a6] } 15. Bxa6 { [%clk 0:02:28.7] [%eval 0.60] [%bestmove h2h4] } 15... Nxa6 { [%clk 0:02:34.2] [%eval 0.75] [%bestmove b8a6] } 16. Bh6 { [%clk 0:02:28.1] [%eval 0.57] [%bestmove g5f6] } 16... Rae8 { [%clk 0:02:32.3] [%eval 0.86] [%bestmove a6c7] } 17. h4 { [%clk 0:02:15] [%eval 0.85] [%bestmove h2h4] } 17... f5 { [%clk 0:02:30.7] [%eval 1.12] [%bestmove a6c7] } 18. h5 { [%clk 0:02:07.9] [%eval 1.15] [%bestmove h6f4] } 18... Bxh6 { [%clk 0:02:22.1] [%eval 1.31] [%bestmove g7h6] } 19. Qxh6 { [%clk 0:02:06.3] [%eval 1.08] [%bestmove e3h6] } 19... Qg7 { [%clk 0:02:22] [%eval 0.96] [%bestmove d7g7] } 20. Qg5 { [%clk 0:02:02.9] [%eval 0.88] [%bestmove h6g7] } 20... Nc7 { [%clk 0:02:20.6] [%eval 0.84] [%bestmove a6c7] } 21. hxg6 { [%clk 0:01:34.1] [%eval 0.36] [%bestmove h5h6] } 21... hxg6 { [%clk 0:02:19.1] [%eval 0.46] [%bestmove g7g6] } 22. a4 { [%clk 0:01:28.1] [%eval -0.60] [%bestmove d4c5] } 22... Ne6 { [%clk 0:02:18.3] [%eval -0.32] [%bestmove c7e6] } 23. Qd2 { [%clk 0:01:27.8] [%eval -0.33] [%bestmove g5d2] } 23... c4 { [%clk 0:02:14.4] [%eval -0.04] [%bestmove g6g5] } 24. a5 { [%clk 0:01:27] [%eval -0.73] [%bestmove f3g5] } 24... b5 { [%clk 0:02:13.4] [%eval -0.69] [%bestmove b6b5] } 25. a6 { [%clk 0:01:26.7] [%eval -0.67] [%bestmove a5a6] } 25... g5 { [%clk 0:02:11.4] [%eval -0.64] [%bestmove g6g5] } 26. Rfb1 { [%clk 0:01:13.6] [%eval -0.76] [%bestmove f1b1] } 26... g4 { [%clk 0:02:06.2] [%eval -0.79] [%bestmove g5g4] } 27. Ne1 { [%clk 0:01:09] [%eval -2.02] [%bestmove f3h2] } 27... f4 { [%clk 0:01:56.7] [%eval -1.83] [%bestmove f5f4] } 28. Rxb5 { [%clk 0:01:04.2] [%eval -1.12] [%bestmove b1b5] } 28... g3 { [%clk 0:01:54] [%eval 0.30] [%bestmove e6g5] } 29. Nf3 { [%clk 0:00:54.4] [%eval -0.17] [%bestmove b5b7] } 29... Re7 { [%clk 0:01:48.7] [%eval 0.00] [%bestmove e8e7] } 30. Rxd5 { [%clk 0:00:45.2] [%eval -0.42] [%bestmove b5b7] } 30... Rf5 { [%clk 0:01:41] [%eval 1.34] [%bestmove g7g6] } 31. Rd6 { [%clk 0:00:40.8] [%eval 0.12] [%bestmove a1b1] } 31... Rh5 { [%clk 0:01:37.2] [%eval -0.72] [%bestmove f5h5] } 32. Kf1 { [%clk 0:00:23.7] [%eval -2.73] [%bestmove a1e1] } 32... Rh1+ { [%clk 0:01:33.3] [%eval -1.98] [%bestmove h5h1] } 33. Ng1 { [%clk 0:00:23.3] [%eval -2.59] [%bestmove f3g1] } 33... f3 { [%clk 0:01:25.4] [%eval -2.33] [%bestmove g7h7] } 34. gxf3 { [%clk 0:00:18.3] [%eval -1.87] [%bestmove g2f3] } 34... g2+ { [%clk 0:01:15.9] [%eval -1.76] [%bestmove h1h2] } 35. Ke2 { [%clk 0:00:17.4] [%eval -1.82] [%bestmove f1e2] } 35... Qg6 { [%clk 0:01:03.5] [%eval -1.56] [%bestmove g7g6] } 36. Ra2 { [%clk 0:00:11.2] [%eval -6.57] [%bestmove a1d1] } 0-1`
  },
  {
    id: 24,
    white: 'GothamChess', white_elo: 3043,
    black: 'gmalsayed', black_elo: 2966,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.28', round: '-', result: '1-0',
    eco: 'B12',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.28"]
[Round "-"]
[White "GothamChess"]
[Black "gmalsayed"]
[Result "1-0"]
[CurrentPosition "2Q2N2/p6k/1p4qp/1n1pP3/P2P1p2/8/1P3K1P/8 b - - 2 37"]
[Timezone "UTC"]
[ECO "B12"]
[ECOUrl "https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation-3...e6-4.Nc3"]
[UTCDate "2026.08.28"]
[UTCTime "17:46:31"]
[WhiteElo "3043"]
[BlackElo "2966"]
[TimeControl "60"]
[Termination "GothamChess won by resignation"]
[StartTime "17:46:31"]
[EndDate "2026.08.28"]
[EndTime "17:48:01"]
[Link "https://www.chess.com/game/live/173664148768"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:48:30Z"] } 1. e4 { [%clk 0:00:59.4] [%eval 0.38] [%bestmove e2e4] } 1... c6 { [%clk 0:00:59.9] [%eval 0.50] [%bestmove e7e5] } 2. d4 { [%clk 0:00:58.6] [%eval 0.43] [%bestmove d2d4] } 2... d5 { [%clk 0:00:59.7] [%eval 0.53] [%bestmove d7d5] } 3. f3 { [%clk 0:00:57.8] [%eval -0.08] [%bestmove e4e5] } 3... e6 { [%clk 0:00:58.8] [%eval 0.13] [%bestmove d5e4] } 4. Nc3 { [%clk 0:00:57.4] [%eval 0.04] [%bestmove b1c3] } 4... Be7 { [%clk 0:00:58.7] [%eval 0.15] [%bestmove f8e7] } 5. Be3 { [%clk 0:00:56.7] [%eval 0.05] [%bestmove a2a3] } 5... b6 { [%clk 0:00:58.1] [%eval 0.58] [%bestmove d8b6] } 6. Qd2 { [%clk 0:00:56.3] [%eval 0.56] [%bestmove f1d3] } 6... Ba6 { [%clk 0:00:57.5] [%eval 0.49] [%bestmove c8a6] } 7. Bxa6 { [%clk 0:00:55.6] [%eval 0.51] [%bestmove f1a6] } 7... Nxa6 { [%clk 0:00:57.3] [%eval 0.42] [%bestmove b8a6] } 8. Nge2 { [%clk 0:00:55.4] [%eval 0.32] [%bestmove c3e2] } 8... Nf6 { [%clk 0:00:55.8] [%eval 0.27] [%bestmove a6c7] } 9. O-O { [%clk 0:00:54.8] [%eval 0.16] [%bestmove e2f4] } 9... O-O { [%clk 0:00:54.8] [%eval 0.36] [%bestmove e8g8] } 10. e5 { [%clk 0:00:54.2] [%eval 0.33] [%bestmove e4e5] } 10... Nd7 { [%clk 0:00:54.4] [%eval 0.27] [%bestmove f6d7] } 11. f4 { [%clk 0:00:53.8] [%eval 0.19] [%bestmove c3d1] } 11... g6 { [%clk 0:00:54.3] [%eval 0.96] [%bestmove a6c7] } 12. g4 { [%clk 0:00:52.9] [%eval 0.67] [%bestmove f4f5] } 12... f5 { [%clk 0:00:53.4] [%eval 0.49] [%bestmove f7f5] } 13. gxf5 { [%clk 0:00:51.8] [%eval 0.09] [%bestmove c3d1] } 13... gxf5 { [%clk 0:00:50.9] [%eval 0.53] [%bestmove e6f5] } 14. Kh1 { [%clk 0:00:51.3] [%eval 0.58] [%bestmove f1f3] } 14... Kh8 { [%clk 0:00:50.4] [%eval 0.82] [%bestmove g8h8] } 15. Rg1 { [%clk 0:00:50.5] [%eval 0.54] [%bestmove f1f3] } 15... Rg8 { [%clk 0:00:49.8] [%eval 0.53] [%bestmove f8g8] } 16. Ng3 { [%clk 0:00:50.1] [%eval 0.18] [%bestmove e2g3] } 16... Qe8 { [%clk 0:00:48.5] [%eval 0.29] [%bestmove d8f8] } 17. Qe2 { [%clk 0:00:49.5] [%eval 0.25] [%bestmove g1g2] } 17... Nc7 { [%clk 0:00:47.4] [%eval 0.29] [%bestmove a6c7] } 18. Nh5 { [%clk 0:00:48.6] [%eval 0.12] [%bestmove e2f3] } 18... Qf7 { [%clk 0:00:45.8] [%eval 0.25] [%bestmove g8g6] } 19. Qf3 { [%clk 0:00:47] [%eval 0.13] [%bestmove e2f3] } 19... Rg6 { [%clk 0:00:44.6] [%eval 0.16] [%bestmove c6c5] } 20. Ne2 { [%clk 0:00:46] [%eval 0.08] [%bestmove c3e2] } 20... Rag8 { [%clk 0:00:43] [%eval 0.02] [%bestmove a8g8] } 21. Rg5 { [%clk 0:00:44.7] [%eval -0.06] [%bestmove g1g3] } 21... Bxg5 { [%clk 0:00:41.5] [%eval 0.53] [%bestmove c6c5] } 22. fxg5 { [%clk 0:00:44.6] [%eval 0.29] [%bestmove f4g5] } 22... Rxg5 { [%clk 0:00:41] [%eval 0.33] [%bestmove h7h6] } 23. Bxg5 { [%clk 0:00:44] [%eval 0.03] [%bestmove e3g5] } 23... Rxg5 { [%clk 0:00:40.8] [%eval 0.12] [%bestmove g8g5] } 24. Rg1 { [%clk 0:00:43.5] [%eval -2.65] [%bestmove e2f4] } 24... Rxg1+ { [%clk 0:00:39.5] [%eval -0.05] [%bestmove g5h5] } 25. Kxg1 { [%clk 0:00:43.4] [%eval 0.05] [%bestmove h1g1] } 25... Nf8 { [%clk 0:00:38.5] [%eval 0.14] [%bestmove c6c5] } 26. Nef4 { [%clk 0:00:42.9] [%eval 0.24] [%bestmove g1f2] } 26... Ng6 { [%clk 0:00:37.4] [%eval 0.13] [%bestmove c7b5] } 27. Qa3 { [%clk 0:00:42.7] [%eval -0.08] [%bestmove g1f2] } 27... Nxf4 { [%clk 0:00:34.5] [%eval -0.06] [%bestmove g6f4] } 28. Nxf4 { [%clk 0:00:42.6] [%eval -0.04] [%bestmove h5f4] } 28... Qg7+ { [%clk 0:00:33.1] [%eval -0.02] [%bestmove c7b5] } 29. Kf2 { [%clk 0:00:41.2] [%eval -0.08] [%bestmove g1f1] } 29... h6 { [%clk 0:00:32.5] [%eval 3.35] [%bestmove c7b5] } 30. Qd6 { [%clk 0:00:40.2] [%eval 0.66] [%bestmove a3a7] } 30... Nb5 { [%clk 0:00:30.8] [%eval 2.03] [%bestmove g7g5] } 31. Qd8+ { [%clk 0:00:37.6] [%eval 1.59] [%bestmove d6d8] } 31... Kh7 { [%clk 0:00:29.9] [%eval 1.88] [%bestmove h8h7] } 32. Nxe6 { [%clk 0:00:37.3] [%eval 2.30] [%bestmove f4e6] } 32... Qf7 { [%clk 0:00:26.7] [%eval 2.52] [%bestmove g7f7] } 33. Qc8 { [%clk 0:00:35] [%eval 2.53] [%bestmove d8c8] } 33... c5 { [%clk 0:00:20.9] [%eval 2.71] [%bestmove f7e7] } 34. c3 { [%clk 0:00:33.7] [%eval 2.55] [%bestmove c2c3] } 34... cxd4 { [%clk 0:00:19.7] [%eval 2.80] [%bestmove a7a5] } 35. cxd4 { [%clk 0:00:33.1] [%eval 3.00] [%bestmove c3d4] } 35... f4 { [%clk 0:00:19.1] [%eval 3.63] [%bestmove f7g8] } 36. a4 { [%clk 0:00:32.3] [%eval 3.62] [%bestmove a2a4] } 36... Qg6 { [%clk 0:00:15.4] [%eval 6.60] [%bestmove f7e7] } 37. Nf8+ { [%clk 0:00:31.6] [%eval 6.57] [%bestmove e6f8] } 1-0`
  },
  {
    id: 25,
    white: 'GothamChess', white_elo: 3059,
    black: 'EmperorSixSeven', black_elo: 2834,
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
[CurrentPosition "r1b2kn1/p3q1bN/4p1Q1/1pppPr2/3n4/P1NP4/BPPB4/2K2R1R b - - 2 21"]
[Timezone "UTC"]
[ECO "B20"]
[ECOUrl "https://www.chess.com/openings/Sicilian-Defense-Mengarini-Variation-2...g6"]
[UTCDate "2026.08.29"]
[UTCTime "20:04:23"]
[WhiteElo "3059"]
[BlackElo "2834"]
[TimeControl "60"]
[Termination "GothamChess won by checkmate"]
[StartTime "20:04:23"]
[EndDate "2026.08.29"]
[EndTime "20:05:38"]
[Link "https://www.chess.com/game/live/173716177294"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:47:48Z"] } 1. e4 { [%clk 0:00:59.9] [%eval 0.36] [%bestmove e2e4] } 1... c5 { [%clk 0:00:59.1] [%eval 0.36] [%bestmove c7c5] } 2. a3 { [%clk 0:00:59.6] [%eval -0.06] [%bestmove g1f3] } 2... g6 { [%clk 0:00:57.9] [%eval -0.12] [%bestmove g7g6] } 3. Nc3 { [%clk 0:00:57.9] [%eval -0.22] [%bestmove g1f3] } 3... Bg7 { [%clk 0:00:57.3] [%eval -0.22] [%bestmove f8g7] } 4. Bc4 { [%clk 0:00:57.7] [%eval -0.28] [%bestmove a1b1] } 4... Nc6 { [%clk 0:00:56.9] [%eval -0.20] [%bestmove e7e6] } 5. d3 { [%clk 0:00:57.4] [%eval -0.27] [%bestmove d2d3] } 5... e6 { [%clk 0:00:56.6] [%eval -0.29] [%bestmove e7e6] } 6. Ba2 { [%clk 0:00:57.2] [%eval -0.30] [%bestmove g1f3] } 6... Nge7 { [%clk 0:00:56] [%eval -0.28] [%bestmove g8e7] } 7. Bd2 { [%clk 0:00:57] [%eval -0.31] [%bestmove g1f3] } 7... O-O { [%clk 0:00:55.6] [%eval 0.18] [%bestmove b7b6] } 8. h4 { [%clk 0:00:56.8] [%eval 0.08] [%bestmove h2h4] } 8... h5 { [%clk 0:00:54.7] [%eval 1.03] [%bestmove h7h6] } 9. g4 { [%clk 0:00:56.6] [%eval 1.00] [%bestmove g2g4] } 9... hxg4 { [%clk 0:00:52.6] [%eval 1.57] [%bestmove b7b5] } 10. h5 { [%clk 0:00:56.5] [%eval 0.02] [%bestmove d1g4] } 10... d5 { [%clk 0:00:51.4] [%eval 2.20] [%bestmove f7f5] } 11. hxg6 { [%clk 0:00:54.9] [%eval 0.04] [%bestmove d1g4] } 11... fxg6 { [%clk 0:00:50.5] [%eval 2.03] [%bestmove f7f5] } 12. Qxg4 { [%clk 0:00:54.2] [%eval 2.14] [%bestmove d1g4] } 12... Nd4 { [%clk 0:00:45.5] [%eval 2.32] [%bestmove b7b5] } 13. O-O-O { [%clk 0:00:53.1] [%eval 2.19] [%bestmove e1c1] } 13... Rxf2 { [%clk 0:00:41.3] [%eval 3.72] [%bestmove b7b5] } 14. Nh3 { [%clk 0:00:52] [%eval 4.02] [%bestmove g1h3] } 14... Rf7 { [%clk 0:00:39.9] [%eval 4.70] [%bestmove e6e5] } 15. Ng5 { [%clk 0:00:50.6] [%eval 4.45] [%bestmove h3g5] } 15... Rf6 { [%clk 0:00:38.4] [%eval 4.82] [%bestmove f7f6] } 16. Qh4 { [%clk 0:00:47.9] [%eval 4.74] [%bestmove g4h4] } 16... b5 { [%clk 0:00:34.8] [%eval 5.28] [%bestmove d4f3] } 17. Qh7+ { [%clk 0:00:40.7] [%eval 5.43] [%bestmove d1f1] } 17... Kf8 { [%clk 0:00:33.9] [%eval 5.88] [%bestmove g8f8] } 18. Rdf1 { [%clk 0:00:33.8] [%eval 5.41] [%bestmove d1f1] } 18... Ng8 { [%clk 0:00:31.3] [%eval 8.95] [%bestmove e7f5] } 19. e5 { [%clk 0:00:32.1] [%eval 6.37] [%bestmove h7g6] } 19... Rf5 { [%clk 0:00:28.9] [%eval 7.54] [%bestmove d8e8] } 20. Qxg6 { [%clk 0:00:30.5] [%eval 7.13] [%bestmove h7g6] } 20... Qe7 { [%clk 0:00:21.5] [%eval #1] [%bestmove d8g5] } 21. Nh7# { [%clk 0:00:29.5] [%bestmove g5h7] } 1-0`
  },
  {
    id: 26,
    white: 'fast_knight_11', white_elo: 2769,
    black: 'GothamChess', black_elo: 2853,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.29', round: '-', result: '0-1',
    eco: 'D25',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.29"]
[Round "-"]
[White "fast_knight_11"]
[Black "GothamChess"]
[Result "0-1"]
[CurrentPosition "8/2p5/p1p1kp2/3r2pp/PP6/2B1r2P/2K5/6R1 w - g6 0 38"]
[Timezone "UTC"]
[ECO "D25"]
[ECOUrl "https://www.chess.com/openings/Queens-Gambit-Accepted-Janowski-Larsen-Variation-5.Bxc4-e6-6.O-O"]
[UTCDate "2026.08.29"]
[UTCTime "21:44:24"]
[WhiteElo "2769"]
[BlackElo "2853"]
[TimeControl "180"]
[Termination "GothamChess won by resignation"]
[StartTime "21:44:24"]
[EndDate "2026.08.29"]
[EndTime "21:49:23"]
[Link "https://www.chess.com/game/live/173719448128"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:47:33Z"] } 1. d4 { [%clk 0:02:59.3] [%eval 0.23] [%bestmove e2e4] } 1... d5 { [%clk 0:02:56.3] [%eval 0.27] [%bestmove g8f6] } 2. c4 { [%clk 0:02:58.4] [%eval 0.27] [%bestmove c2c4] } 2... dxc4 { [%clk 0:02:54] [%eval 0.44] [%bestmove e7e6] } 3. Nf3 { [%clk 0:02:56.2] [%eval 0.44] [%bestmove g1f3] } 3... Nf6 { [%clk 0:02:53.2] [%eval 0.44] [%bestmove g8f6] } 4. e3 { [%clk 0:02:55.4] [%eval 0.44] [%bestmove e2e3] } 4... Bg4 { [%clk 0:02:52.3] [%eval 0.58] [%bestmove a7a6] } 5. Bxc4 { [%clk 0:02:53.5] [%eval 0.60] [%bestmove h2h3] } 5... e6 { [%clk 0:02:51.9] [%eval 0.46] [%bestmove e7e6] } 6. O-O { [%clk 0:02:49.1] [%eval 0.41] [%bestmove h2h3] } 6... Bd6 { [%clk 0:02:51] [%eval 0.36] [%bestmove b8c6] } 7. h3 { [%clk 0:02:47.4] [%eval 0.35] [%bestmove b1c3] } 7... Bh5 { [%clk 0:02:50.1] [%eval 0.35] [%bestmove g4h5] } 8. Nc3 { [%clk 0:02:46.1] [%eval 0.32] [%bestmove b1c3] } 8... Nc6 { [%clk 0:02:48.2] [%eval 0.49] [%bestmove b8c6] } 9. Be2 { [%clk 0:02:44.4] [%eval 0.47] [%bestmove c4e2] } 9... O-O { [%clk 0:02:46.7] [%eval 0.40] [%bestmove e8g8] } 10. a3 { [%clk 0:02:42.7] [%eval 0.31] [%bestmove d1b3] } 10... a6 { [%clk 0:02:45.9] [%eval 0.43] [%bestmove f8e8] } 11. b4 { [%clk 0:02:41.8] [%eval 0.64] [%bestmove d1c2] } 11... Qe8 { [%clk 0:02:43.9] [%eval 0.58] [%bestmove f6d5] } 12. Qb3 { [%clk 0:02:37.2] [%eval 0.39] [%bestmove c1b2] } 12... e5 { [%clk 0:02:42.5] [%eval 0.48] [%bestmove e6e5] } 13. d5 { [%clk 0:02:35.5] [%eval 0.36] [%bestmove d4d5] } 13... e4 { [%clk 0:02:41.1] [%eval 0.36] [%bestmove c6a7] } 14. dxc6 { [%clk 0:02:27.9] [%eval -0.82] [%bestmove c3e4] } 14... exf3 { [%clk 0:02:40.2] [%eval -0.68] [%bestmove e4f3] } 15. Bxf3 { [%clk 0:02:23.3] [%eval -1.89] [%bestmove g2f3] } 15... Qe5 { [%clk 0:02:34.7] [%eval -2.21] [%bestmove e8e5] } 16. Rd1 { [%clk 0:02:11.6] [%eval -1.70] [%bestmove f1d1] } 16... bxc6 { [%clk 0:02:27.7] [%eval -0.56] [%bestmove e5h2] } 17. Bxh5 { [%clk 0:02:04.1] [%eval -1.99] [%bestmove d1d6] } 17... Qh2+ { [%clk 0:02:26] [%eval -2.03] [%bestmove e5h2] } 18. Kf1 { [%clk 0:02:03.3] [%eval -2.14] [%bestmove g1f1] } 18... Nxh5 { [%clk 0:02:25.9] [%eval -2.53] [%bestmove f6h5] } 19. Ne2 { [%clk 0:01:58.7] [%eval -4.06] [%bestmove d1d6] } 19... Qh1+ { [%clk 0:02:15] [%eval -4.52] [%bestmove h2h1] } 20. Ng1 { [%clk 0:01:57.5] [%eval -4.38] [%bestmove e2g1] } 20... Bh2 { [%clk 0:02:14.9] [%eval -4.88] [%bestmove d6h2] } 21. Ke2 { [%clk 0:01:52.5] [%eval -5.12] [%bestmove g2g4] } 21... Qxg2 { [%clk 0:02:08.5] [%eval -4.96] [%bestmove h1g2] } 22. Bb2 { [%clk 0:01:42] [%eval -4.99] [%bestmove c1b2] } 22... Ng3+ { [%clk 0:02:02.8] [%eval -5.16] [%bestmove h5g3] } 23. Kd3 { [%clk 0:01:41.2] [%eval -5.22] [%bestmove e2d3] } 23... Qxf2 { [%clk 0:01:57.9] [%eval -4.90] [%bestmove g3e4] } 24. Qc3 { [%clk 0:01:34.6] [%eval -5.04] [%bestmove b3c2] } 24... f6 { [%clk 0:01:33.4] [%eval -4.69] [%bestmove f2f5] } 25. Kc4 { [%clk 0:00:59.7] [%eval -5.06] [%bestmove c3c4] } 25... Rad8 { [%clk 0:01:21.7] [%eval -3.31] [%bestmove g3e4] } 26. Re1 { [%clk 0:00:39.2] [%eval -6.46] [%bestmove c4b3] } 26... Ne4 { [%clk 0:01:17.3] [%eval -6.74] [%bestmove g3e4] } 27. Rf1 { [%clk 0:00:30.8] [%eval -8.56] [%bestmove e1e2] } 27... Qxf1+ { [%clk 0:01:14.8] [%eval -5.75] [%bestmove e4d2] } 28. Rxf1 { [%clk 0:00:28.7] [%eval -5.76] [%bestmove a1f1] } 28... Nxc3 { [%clk 0:01:14.1] [%eval -5.45] [%bestmove e4c3] } 29. Bxc3 { [%clk 0:00:28.6] [%eval -5.59] [%bestmove b2c3] } 29... Bxg1 { [%clk 0:01:12.5] [%eval -5.10] [%bestmove f8e8] } 30. Rxg1 { [%clk 0:00:27.9] [%eval -5.03] [%bestmove f1g1] } 30... Kf7 { [%clk 0:01:12] [%eval -4.64] [%bestmove g8f7] } 31. a4 { [%clk 0:00:26.3] [%eval -5.28] [%bestmove e3e4] } 31... Rfe8 { [%clk 0:01:10.8] [%eval -5.20] [%bestmove f8e8] } 32. Rg3 { [%clk 0:00:23.2] [%eval -5.54] [%bestmove c3d4] } 32... Rd5 { [%clk 0:01:08.1] [%eval -5.62] [%bestmove d8d5] } 33. Kb3 { [%clk 0:00:20] [%eval -5.87] [%bestmove c3d4] } 33... h5 { [%clk 0:01:06] [%eval -5.56] [%bestmove d5g5] } 34. Kc2 { [%clk 0:00:18.7] [%eval -6.18] [%bestmove e3e4] } 34... Re4 { [%clk 0:01:04.9] [%eval -5.44] [%bestmove e8e4] } 35. Rf3 { [%clk 0:00:18] [%eval -5.89] [%bestmove c3d4] } 35... Ke6 { [%clk 0:01:03.1] [%eval -5.20] [%bestmove c6c5] } 36. Rf1 { [%clk 0:00:17.2] [%eval -5.83] [%bestmove c3d4] } 36... Rxe3 { [%clk 0:01:00.3] [%eval -6.11] [%bestmove e4e3] } 37. Rg1 { [%clk 0:00:16.7] [%eval -6.52] [%bestmove f1c1] } 37... g5 { [%clk 0:00:59] [%eval -5.64] [%bestmove e6f7] } 0-1`
  },
  {
    id: 27,
    white: 'DeArron_Fox', white_elo: 2986,
    black: 'GothamChess', black_elo: 3077,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.29', round: '-', result: '0-1',
    eco: 'D20',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.29"]
[Round "-"]
[White "DeArron_Fox"]
[Black "GothamChess"]
[Result "0-1"]
[CurrentPosition "8/8/8/7p/7k/6pP/6P1/5r1K w - - 22 67"]
[Timezone "UTC"]
[ECO "D20"]
[ECOUrl "https://www.chess.com/openings/Queens-Gambit-Accepted-Old-Variation...8.Nc3-Nc6-9.h3-h6"]
[UTCDate "2026.08.29"]
[UTCTime "20:13:39"]
[WhiteElo "2986"]
[BlackElo "3077"]
[TimeControl "60"]
[Termination "GothamChess won by checkmate"]
[StartTime "20:13:39"]
[EndDate "2026.08.29"]
[EndTime "20:15:39"]
[Link "https://www.chess.com/game/live/173716498708"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:47:42Z"] } 1. d4 { [%clk 0:00:59.8] [%eval 0.25] [%bestmove e2e4] } 1... d5 { [%clk 0:00:59] [%eval 0.28] [%bestmove g8f6] } 2. c4 { [%clk 0:00:59.4] [%eval 0.33] [%bestmove c2c4] } 2... dxc4 { [%clk 0:00:58.8] [%eval 0.44] [%bestmove e7e6] } 3. e3 { [%clk 0:00:58.7] [%eval 0.43] [%bestmove g1f3] } 3... e5 { [%clk 0:00:57.8] [%eval 0.56] [%bestmove e7e6] } 4. Bxc4 { [%clk 0:00:58.3] [%eval 0.64] [%bestmove f1c4] } 4... exd4 { [%clk 0:00:57.5] [%eval 0.64] [%bestmove e5d4] } 5. exd4 { [%clk 0:00:58.2] [%eval 0.66] [%bestmove e3d4] } 5... Nf6 { [%clk 0:00:57.2] [%eval 0.60] [%bestmove g8f6] } 6. Nf3 { [%clk 0:00:57.8] [%eval 0.55] [%bestmove d1b3] } 6... Bd6 { [%clk 0:00:56.9] [%eval 0.49] [%bestmove f8d6] } 7. O-O { [%clk 0:00:57.5] [%eval 0.46] [%bestmove e1g1] } 7... O-O { [%clk 0:00:56.6] [%eval 0.59] [%bestmove e8g8] } 8. h3 { [%clk 0:00:57.2] [%eval 0.19] [%bestmove c1g5] } 8... Nc6 { [%clk 0:00:56.4] [%eval 0.11] [%bestmove h7h6] } 9. Nc3 { [%clk 0:00:56.9] [%eval 0.07] [%bestmove c1g5] } 9... h6 { [%clk 0:00:55.5] [%eval 0.16] [%bestmove h7h6] } 10. Qc2 { [%clk 0:00:56.3] [%eval 0.04] [%bestmove f1e1] } 10... Nb4 { [%clk 0:00:53.9] [%eval 0.00] [%bestmove c6a5] } 11. Qb1 { [%clk 0:00:55.4] [%eval -0.26] [%bestmove c2b3] } 11... Be6 { [%clk 0:00:53.3] [%eval 0.18] [%bestmove c7c6] } 12. Bxe6 { [%clk 0:00:53.9] [%eval 0.27] [%bestmove c4e6] } 12... fxe6 { [%clk 0:00:53.2] [%eval 0.05] [%bestmove f7e6] } 13. Re1 { [%clk 0:00:52.2] [%eval 0.09] [%bestmove a2a3] } 13... Nbd5 { [%clk 0:00:52.7] [%eval 1.30] [%bestmove d8d7] } 14. Rxe6 { [%clk 0:00:51] [%eval 1.14] [%bestmove e1e6] } 14... Qd7 { [%clk 0:00:51.3] [%eval 1.10] [%bestmove d8d7] } 15. Re1 { [%clk 0:00:49.6] [%eval 1.08] [%bestmove e6e1] } 15... c6 { [%clk 0:00:48.2] [%eval 1.28] [%bestmove d7f7] } 16. Bd2 { [%clk 0:00:49] [%eval 1.22] [%bestmove f3e5] } 16... Rae8 { [%clk 0:00:41.9] [%eval 1.33] [%bestmove d7f7] } 17. Qg6 { [%clk 0:00:47.9] [%eval 1.18] [%bestmove b1g6] } 17... Ne7 { [%clk 0:00:38.5] [%eval 1.39] [%bestmove d7f7] } 18. Qd3 { [%clk 0:00:46.3] [%eval 1.21] [%bestmove g6c2] } 18... Ned5 { [%clk 0:00:36.3] [%eval 1.63] [%bestmove d7f5] } 19. Ne5 { [%clk 0:00:45.3] [%eval 1.70] [%bestmove f3e5] } 19... Qc7 { [%clk 0:00:35.4] [%eval 1.75] [%bestmove d7c7] } 20. Nxd5 { [%clk 0:00:40.9] [%eval 1.90] [%bestmove c3d5] } 20... Nxd5 { [%clk 0:00:33.8] [%eval 1.77] [%bestmove c6d5] } 21. Ng4 { [%clk 0:00:38.8] [%eval 1.38] [%bestmove e5g6] } 21... Bf4 { [%clk 0:00:32.7] [%eval 1.24] [%bestmove d6f4] } 22. Bxf4 { [%clk 0:00:37.4] [%eval 1.12] [%bestmove g2g3] } 22... Qxf4 { [%clk 0:00:31.6] [%eval 1.58] [%bestmove d5f4] } 23. Ne5 { [%clk 0:00:34] [%eval -0.85] [%bestmove g2g3] } 23... Qxf2+ { [%clk 0:00:30] [%eval -0.85] [%bestmove f4f2] } 24. Kh1 { [%clk 0:00:33.6] [%eval -1.72] [%bestmove g1h2] } 24... Qh4 { [%clk 0:00:23.4] [%eval 0.03] [%bestmove d5f4] } 25. Rf1 { [%clk 0:00:31.5] [%eval 0.00] [%bestmove e1f1] } 25... Rxf1+ { [%clk 0:00:18.3] [%eval 0.01] [%bestmove f8f2] } 26. Rxf1 { [%clk 0:00:31.4] [%eval 0.01] [%bestmove a1f1] } 26... Qg5 { [%clk 0:00:17.1] [%eval 0.03] [%bestmove h4g5] } 27. Qf3 { [%clk 0:00:30.1] [%eval 0.00] [%bestmove d3b3] } 27... Kh7 { [%clk 0:00:14.7] [%eval 0.43] [%bestmove g5f6] } 28. Qe4+ { [%clk 0:00:29.1] [%eval 0.04] [%bestmove f3f7] } 28... Kg8 { [%clk 0:00:14.2] [%eval 0.00] [%bestmove h7g8] } 29. Qf3 { [%clk 0:00:25.5] [%eval 0.00] [%bestmove e4f3] } 29... Kh7 { [%clk 0:00:13.4] [%eval 0.19] [%bestmove g5f6] } 30. Qf5+ { [%clk 0:00:21.8] [%eval -0.36] [%bestmove f3f7] } 30... Qxf5 { [%clk 0:00:12.6] [%eval -0.20] [%bestmove g5f5] } 31. Rxf5 { [%clk 0:00:21.7] [%eval -0.42] [%bestmove f1f5] } 31... Ne3 { [%clk 0:00:12.4] [%eval 0.11] [%bestmove h7g8] } 32. Rf7 { [%clk 0:00:21.4] [%eval 0.18] [%bestmove f5f7] } 32... c5 { [%clk 0:00:11.6] [%eval 0.38] [%bestmove e8b8] } 33. Rxb7 { [%clk 0:00:20.4] [%eval -0.07] [%bestmove e5f3] } 33... cxd4 { [%clk 0:00:11.1] [%eval -0.03] [%bestmove c5d4] } 34. Nd3 { [%clk 0:00:20.3] [%eval -0.05] [%bestmove e5d3] } 34... Nd5 { [%clk 0:00:10.2] [%eval 0.62] [%bestmove e8c8] } 35. Rd7 { [%clk 0:00:19.8] [%eval 0.03] [%bestmove b7a7] } 35... Re3 { [%clk 0:00:09.7] [%eval 0.12] [%bestmove e8e3] } 36. Rxd5 { [%clk 0:00:19.1] [%eval 0.01] [%bestmove d3c5] } 36... Rxd3 { [%clk 0:00:09.4] [%eval -0.06] [%bestmove e3d3] } 37. b4 { [%clk 0:00:18] [%eval -0.04] [%bestmove d5d6] } 37... Rd2 { [%clk 0:00:09.3] [%eval -0.05] [%bestmove h7g6] } 38. b5 { [%clk 0:00:17] [%eval -0.04] [%bestmove a2a3] } 38... d3 { [%clk 0:00:09.2] [%eval -0.03] [%bestmove d2a2] } 39. a4 { [%clk 0:00:16.5] [%eval 0.00] [%bestmove a2a4] } 39... Ra2 { [%clk 0:00:08.6] [%eval -0.02] [%bestmove d2a2] } 40. Rxd3 { [%clk 0:00:15.5] [%eval -0.03] [%bestmove d5d3] } 40... Rb2 { [%clk 0:00:08.1] [%eval 1.62] [%bestmove a2a4] } 41. Rb3 { [%clk 0:00:15.4] [%eval -4.89] [%bestmove d3d7] } 41... Rxb3 { [%clk 0:00:07.8] [%eval -5.31] [%bestmove b2b3] } 42. Kh2 { [%clk 0:00:13.9] [%eval -5.83] [%bestmove h1h2] } 42... Rb1 { [%clk 0:00:07.7] [%eval -5.83] [%bestmove b3a3] } 43. a5 { [%clk 0:00:13.3] [%eval -6.40] [%bestmove h3h4] } 43... Rb4 { [%clk 0:00:07.6] [%eval -5.37] [%bestmove b1b5] } 44. b6 { [%clk 0:00:12.6] [%eval -5.98] [%bestmove b5b6] } 44... axb6 { [%clk 0:00:07.5] [%eval -5.97] [%bestmove a7b6] } 45. axb6 { [%clk 0:00:12.5] [%eval -6.13] [%bestmove a5b6] } 45... Rxb6 { [%clk 0:00:06.9] [%eval -6.02] [%bestmove b4b6] } 46. Kg3 { [%clk 0:00:12.4] [%eval -6.13] [%bestmove h3h4] } 46... Rg6+ { [%clk 0:00:06.5] [%eval -5.97] [%bestmove b6b4] } 47. Kh2 { [%clk 0:00:12.3] [%eval -6.13] [%bestmove g3h2] } 47... Rf6 { [%clk 0:00:06.2] [%eval -5.87] [%bestmove h6h5] } 48. Kg3 { [%clk 0:00:12.2] [%eval -6.09] [%bestmove h3h4] } 48... Kg6 { [%clk 0:00:06] [%eval -6.03] [%bestmove f6a6] } 49. Kg4 { [%clk 0:00:11.5] [%eval -6.30] [%bestmove h3h4] } 49... h5+ { [%clk 0:00:05.4] [%eval -6.32] [%bestmove h6h5] } 50. Kg3 { [%clk 0:00:11.4] [%eval -6.29] [%bestmove g4h4] } 50... Kh6 { [%clk 0:00:05.3] [%eval -6.15] [%bestmove f6a6] } 51. Kh4 { [%clk 0:00:11.2] [%eval -6.70] [%bestmove g3h2] } 51... g5+ { [%clk 0:00:05.2] [%eval -6.14] [%bestmove g7g5] } 52. Kg3 { [%clk 0:00:10.9] [%eval -6.26] [%bestmove h4g3] } 52... Rb6 { [%clk 0:00:04.9] [%eval -6.13] [%bestmove f6a6] } 53. Kh2 { [%clk 0:00:10.8] [%eval -6.22] [%bestmove g3h2] } 53... Rb3 { [%clk 0:00:04.8] [%eval -5.92] [%bestmove h5h4] } 54. Kg1 { [%clk 0:00:10.2] [%eval -6.34] [%bestmove g2g4] } 54... g4 { [%clk 0:00:04.7] [%eval -6.07] [%bestmove b3b2] } 55. Kf2 { [%clk 0:00:10.1] [%eval -5.90] [%bestmove h3g4] } 55... g3+ { [%clk 0:00:04.2] [%eval -5.98] [%bestmove b3b5] } 56. Kf1 { [%clk 0:00:09.3] [%eval -6.64] [%bestmove f2e2] } 56... Kg5 { [%clk 0:00:04.1] [%eval -5.88] [%bestmove b3b2] } 57. Ke2 { [%clk 0:00:09.2] [%eval -7.24] [%bestmove f1e2] } 57... Kh4 { [%clk 0:00:04] [%eval -7.60] [%bestmove g5h4] } 58. Kf1 { [%clk 0:00:08.6] [%eval -9.19] [%bestmove e2d2] } 58... Ra3 { [%clk 0:00:03.9] [%eval -7.60] [%bestmove b3b2] } 59. Ke2 { [%clk 0:00:08.5] [%eval -7.64] [%bestmove f1e2] } 59... Ra2+ { [%clk 0:00:03.8] [%eval -8.13] [%bestmove a3a2] } 60. Kf1 { [%clk 0:00:08] [%eval -9.19] [%bestmove e2d3] } 60... Rf2+ { [%clk 0:00:03.7] [%eval #-5] [%bestmove a2b2] } 61. Kg1 { [%clk 0:00:07.4] [%eval #-3] [%bestmove f1e1] } 61... Re2 { [%clk 0:00:03.5] [%eval #-6] [%bestmove h4g5] } 62. Kf1 { [%clk 0:00:07.3] [%eval #-6] [%bestmove g1f1] } 62... Re3 { [%clk 0:00:03.4] [%eval #-1] [%bestmove e2f2] } 63. Kg1 { [%clk 0:00:06.3] [%eval #-1] [%bestmove f1g1] } 63... Re4 { [%clk 0:00:03.3] [%eval #-2] [%bestmove e3e1] } 64. Kf1 { [%clk 0:00:05.7] [%eval #-2] [%bestmove g1f1] } 64... Rf4+ { [%clk 0:00:03.2] [%eval -8.38] [%bestmove e4e3] } 65. Kg1 { [%clk 0:00:05.2] [%eval #-2] [%bestmove f1e2] } 65... Rf5 { [%clk 0:00:03.1] [%eval #-1] [%bestmove f4f2] } 66. Kh1 { [%clk 0:00:04.6] [%eval #-1] [%bestmove g1h1] } 66... Rf1# { [%clk 0:00:03] [%bestmove f5f1] } 0-1`
  },
  {
    id: 28,
    white: 'GothamChess', white_elo: 2893,
    black: 'ChessEminem11', black_elo: 2801,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.31', round: '-', result: '1-0',
    eco: 'A45',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.31"]
[Round "-"]
[White "GothamChess"]
[Black "ChessEminem11"]
[Result "1-0"]
[CurrentPosition "r1b1k2r/p3qpp1/2nNp2p/4P3/3Pp3/2p5/PPB3PP/R2Q1RK1 b kq - 1 16"]
[Timezone "UTC"]
[ECO "A45"]
[ECOUrl "https://www.chess.com/openings/Trompowsky-Attack...3.e3-e6-4.Nd2-Be7-5.Bd3"]
[UTCDate "2026.08.31"]
[UTCTime "19:02:45"]
[WhiteElo "2893"]
[BlackElo "2801"]
[TimeControl "180"]
[Termination "GothamChess won by resignation"]
[StartTime "19:02:45"]
[EndDate "2026.08.31"]
[EndTime "19:03:54"]
[Link "https://www.chess.com/game/live/173807845438"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:46:36Z"] } 1. d4 { [%clk 0:02:58.7] [%eval 0.13] [%bestmove e2e4] } 1... Nf6 { [%clk 0:02:58.9] [%eval 0.17] [%bestmove g8f6] } 2. Bg5 { [%clk 0:02:57.3] [%eval 0.11] [%bestmove g1f3] } 2... e6 { [%clk 0:02:57.7] [%eval 0.27] [%bestmove d7d5] } 3. Nd2 { [%clk 0:02:56] [%eval 0.21] [%bestmove e2e4] } 3... d5 { [%clk 0:02:56.8] [%eval 0.21] [%bestmove h7h6] } 4. e3 { [%clk 0:02:55.1] [%eval 0.18] [%bestmove e2e4] } 4... Be7 { [%clk 0:02:55.5] [%eval 0.24] [%bestmove c7c5] } 5. Bd3 { [%clk 0:02:54.4] [%eval 0.25] [%bestmove c2c3] } 5... h6 { [%clk 0:02:54.3] [%eval 0.19] [%bestmove c7c5] } 6. Bxf6 { [%clk 0:02:52.6] [%eval 0.01] [%bestmove g5f4] } 6... Bxf6 { [%clk 0:02:54.2] [%eval 0.02] [%bestmove e7f6] } 7. f4 { [%clk 0:02:51.7] [%eval 0.10] [%bestmove c2c3] } 7... c5 { [%clk 0:02:52.9] [%eval 0.19] [%bestmove c7c5] } 8. c3 { [%clk 0:02:50.9] [%eval 0.17] [%bestmove c2c3] } 8... Nc6 { [%clk 0:02:51.6] [%eval 0.24] [%bestmove d8b6] } 9. Ngf3 { [%clk 0:02:50.1] [%eval 0.48] [%bestmove g1f3] } 9... c4 { [%clk 0:02:49.4] [%eval 0.82] [%bestmove c8d7] } 10. Bc2 { [%clk 0:02:49] [%eval 0.88] [%bestmove d3c2] } 10... b5 { [%clk 0:02:48.4] [%eval 0.98] [%bestmove b7b5] } 11. Ne5 { [%clk 0:02:47.2] [%eval 0.78] [%bestmove e1g1] } 11... Bxe5 { [%clk 0:02:46.8] [%eval 0.66] [%bestmove c6e5] } 12. fxe5 { [%clk 0:02:44.6] [%eval 0.85] [%bestmove f4e5] } 12... b4 { [%clk 0:02:43.7] [%eval 0.96] [%bestmove d8h4] } 13. O-O { [%clk 0:02:42.4] [%eval 0.77] [%bestmove e1g1] } 13... Qe7 { [%clk 0:02:38.2] [%eval 1.43] [%bestmove b4c3] } 14. e4 { [%clk 0:02:41.2] [%eval 0.92] [%bestmove d1g4] } 14... dxe4 { [%clk 0:02:33.1] [%eval 3.74] [%bestmove e8g8] } 15. Nxc4 { [%clk 0:02:37.2] [%eval 2.79] [%bestmove d2e4] } 15... bxc3 { [%clk 0:02:29.2] [%eval 4.76] [%bestmove e8g8] } 16. Nd6+ { [%clk 0:02:33.8] [%eval 4.83] [%bestmove c4d6] } 1-0`
  },
  {
    id: 29,
    white: 'the', white_elo: 2807,
    black: 'GothamChess', black_elo: 2862,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.31', round: '-', result: '0-1',
    eco: 'A06',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.31"]
[Round "-"]
[White "the"]
[Black "GothamChess"]
[Result "0-1"]
[CurrentPosition "8/pp2r1k1/2p3q1/5n1K/5P2/1P6/P2QB3/2R5 w - - 0 37"]
[Timezone "UTC"]
[ECO "A06"]
[ECOUrl "https://www.chess.com/openings/Reti-Opening-Nimzowitsch-Larsen-Attack-2...Bg4"]
[UTCDate "2026.08.31"]
[UTCTime "03:00:35"]
[WhiteElo "2807"]
[BlackElo "2862"]
[TimeControl "180"]
[Termination "GothamChess won by checkmate"]
[StartTime "03:00:35"]
[EndDate "2026.08.31"]
[EndTime "03:06:08"]
[Link "https://www.chess.com/game/live/173773883076"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:46:51Z"] } 1. Nf3 { [%clk 0:02:58.8] [%eval 0.22] [%bestmove e2e4] } 1... d5 { [%clk 0:02:56] [%eval 0.22] [%bestmove d7d5] } 2. b3 { [%clk 0:02:57.6] [%eval 0.05] [%bestmove d2d4] } 2... Bg4 { [%clk 0:02:54.3] [%eval 0.02] [%bestmove b8c6] } 3. Ne5 { [%clk 0:02:56.4] [%eval -0.07] [%bestmove d2d4] } 3... Be6 { [%clk 0:02:52.9] [%eval 0.28] [%bestmove h7h5] } 4. d4 { [%clk 0:02:55.5] [%eval 0.28] [%bestmove c1b2] } 4... Nd7 { [%clk 0:02:52] [%eval 0.31] [%bestmove g7g6] } 5. Bb2 { [%clk 0:02:54.5] [%eval 0.34] [%bestmove c1b2] } 5... Nxe5 { [%clk 0:02:51] [%eval 0.43] [%bestmove g7g6] } 6. dxe5 { [%clk 0:02:53.7] [%eval 0.13] [%bestmove d4e5] } 6... Nh6 { [%clk 0:02:46] [%eval 0.52] [%bestmove e6f5] } 7. Nd2 { [%clk 0:02:51.8] [%eval 0.58] [%bestmove b1c3] } 7... g6 { [%clk 0:02:44.5] [%eval 0.84] [%bestmove g7g6] } 8. e3 { [%clk 0:02:50.5] [%eval 0.46] [%bestmove e2e4] } 8... Bg7 { [%clk 0:02:43.5] [%eval 0.45] [%bestmove f8g7] } 9. Be2 { [%clk 0:02:46] [%eval 0.43] [%bestmove f1e2] } 9... O-O { [%clk 0:02:41.6] [%eval 0.44] [%bestmove e8g8] } 10. g4 { [%clk 0:02:45.2] [%eval -0.66] [%bestmove c2c4] } 10... f6 { [%clk 0:02:36.8] [%eval -0.69] [%bestmove f7f6] } 11. exf6 { [%clk 0:02:39.6] [%eval -1.02] [%bestmove e5f6] } 11... exf6 { [%clk 0:02:35.2] [%eval -0.80] [%bestmove g7f6] } 12. h3 { [%clk 0:02:29.4] [%eval -1.33] [%bestmove h1g1] } 12... c6 { [%clk 0:02:33.5] [%eval -0.60] [%bestmove f6f5] } 13. Nf3 { [%clk 0:02:28.3] [%eval -0.65] [%bestmove d2f3] } 13... Nf7 { [%clk 0:02:30.4] [%eval -0.23] [%bestmove d8e7] } 14. Nd4 { [%clk 0:02:23] [%eval -0.45] [%bestmove c2c4] } 14... Qe7 { [%clk 0:02:28.8] [%eval 0.22] [%bestmove e6d7] } 15. c4 { [%clk 0:02:21.2] [%eval -0.56] [%bestmove d4e6] } 15... Rad8 { [%clk 0:02:22.2] [%eval 0.16] [%bestmove f6f5] } 16. Nxe6 { [%clk 0:02:18.8] [%eval 0.15] [%bestmove d4e6] } 16... Qxe6 { [%clk 0:02:21] [%eval 0.11] [%bestmove e7e6] } 17. cxd5 { [%clk 0:02:18] [%eval 0.12] [%bestmove c4d5] } 17... Rxd5 { [%clk 0:02:18.4] [%eval 0.03] [%bestmove c6d5] } 18. Qc2 { [%clk 0:02:16.4] [%eval 0.03] [%bestmove d1c2] } 18... Nd6 { [%clk 0:02:13] [%eval 0.93] [%bestmove f6f5] } 19. Rd1 { [%clk 0:02:13.7] [%eval 0.60] [%bestmove e2f3] } 19... f5 { [%clk 0:02:08.8] [%eval 0.53] [%bestmove f6f5] } 20. Bxg7 { [%clk 0:02:00.7] [%eval -0.11] [%bestmove b2a3] } 20... Kxg7 { [%clk 0:02:08.7] [%eval 0.03] [%bestmove d5d1] } 21. Rxd5 { [%clk 0:01:51.4] [%eval -0.16] [%bestmove e1g1] } 21... Qxd5 { [%clk 0:02:05.9] [%eval 0.53] [%bestmove c6d5] } 22. O-O { [%clk 0:01:45.3] [%eval 0.07] [%bestmove c2b2] } 22... Qe5 { [%clk 0:02:03.6] [%eval 0.12] [%bestmove d5e5] } 23. Qd3 { [%clk 0:01:34.9] [%eval -0.13] [%bestmove f1d1] } 23... fxg4 { [%clk 0:02:00.1] [%eval 0.32] [%bestmove d6e4] } 24. hxg4 { [%clk 0:01:31.3] [%eval 0.26] [%bestmove h3g4] } 24... h5 { [%clk 0:01:47.3] [%eval 0.80] [%bestmove d6b5] } 25. f4 { [%clk 0:01:27.7] [%eval 0.93] [%bestmove f1d1] } 25... Qc5 { [%clk 0:01:44.9] [%eval 1.08] [%bestmove e5e7] } 26. gxh5 { [%clk 0:01:11.5] [%eval 1.02] [%bestmove g4h5] } 26... Nf5 { [%clk 0:01:43.3] [%eval 0.35] [%bestmove f8f6] } 27. hxg6 { [%clk 0:01:03.8] [%eval -0.16] [%bestmove f1f3] } 27... Rf6 { [%clk 0:01:29.3] [%eval 1.54] [%bestmove f8e8] } 28. Kf2 { [%clk 0:00:59.3] [%eval 0.75] [%bestmove g1f2] } 28... Re6 { [%clk 0:01:13.9] [%eval 1.25] [%bestmove f6e6] } 29. Qd7+ { [%clk 0:00:53.9] [%eval -4.64] [%bestmove b3b4] } 29... Re7 { [%clk 0:01:12.3] [%eval -1.79] [%bestmove e6e7] } 30. Qd2 { [%clk 0:00:28.9] [%eval -2.04] [%bestmove d7d3] } 30... Nxe3 { [%clk 0:01:06.1] [%eval -2.86] [%bestmove f5e3] } 31. Rc1 { [%clk 0:00:19] [%eval -4.16] [%bestmove d2b2] } 31... Nd1+ { [%clk 0:00:38.1] [%eval -5.13] [%bestmove e3c4] } 32. Kg3 { [%clk 0:00:14.3] [%eval -6.30] [%bestmove f2g2] } 32... Qf2+ { [%clk 0:00:34.7] [%eval -6.51] [%bestmove c5f2] } 33. Kg4 { [%clk 0:00:13.4] [%eval -5.92] [%bestmove g3g4] } 33... Ne3+ { [%clk 0:00:33.3] [%eval -6.28] [%bestmove d1e3] } 34. Kh3 { [%clk 0:00:10.6] [%eval #-3] [%bestmove d2e3] } 34... Qg2+ { [%clk 0:00:29.7] [%eval #-2] [%bestmove f2g2] } 35. Kh4 { [%clk 0:00:09.6] [%eval #-2] [%bestmove h3h4] } 35... Nf5+ { [%clk 0:00:28.1] [%eval #-1] [%bestmove e3f5] } 36. Kh5 { [%clk 0:00:08.9] [%eval #-1] [%bestmove h4h5] } 36... Qxg6# { [%clk 0:00:24.4] [%bestmove g2g6] } 0-1`
  },
  {
    id: 30,
    white: 'MusashiStyle', white_elo: 2817,
    black: 'GothamChess', black_elo: 2909,
    event: 'Live Chess', site: 'Chess.com',
    date: '2026.08.31', round: '-', result: '0-1',
    eco: 'C11',
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.31"]
[Round "-"]
[White "MusashiStyle"]
[Black "GothamChess"]
[Result "0-1"]
[CurrentPosition "8/8/7R/2k4P/5p2/5P2/5nrK/R4b2 w - - 15 53"]
[Timezone "UTC"]
[ECO "C11"]
[ECOUrl "https://www.chess.com/openings/French-Defense-Classical-Burn-Variation-5.Nxe4-Be7-6.Nxf6"]
[UTCDate "2026.08.31"]
[UTCTime "23:38:12"]
[WhiteElo "2817"]
[BlackElo "2909"]
[TimeControl "180"]
[Termination "GothamChess won by checkmate"]
[StartTime "23:38:12"]
[EndDate "2026.08.31"]
[EndTime "23:43:53"]
[Link "https://www.chess.com/game/live/173816914174"]

{ [%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:46:26Z"] } 1. e4 { [%clk 0:02:59.6] [%eval 0.32] [%bestmove e2e4] } 1... e6 { [%clk 0:02:58.8] [%eval 0.48] [%bestmove e7e5] } 2. d4 { [%clk 0:02:58.3] [%eval 0.46] [%bestmove d2d4] } 2... d5 { [%clk 0:02:58.2] [%eval 0.47] [%bestmove d7d5] } 3. Nc3 { [%clk 0:02:55.4] [%eval 0.50] [%bestmove b1c3] } 3... dxe4 { [%clk 0:02:57.5] [%eval 0.71] [%bestmove f8b4] } 4. Nxe4 { [%clk 0:02:54.4] [%eval 0.50] [%bestmove c3e4] } 4... Nf6 { [%clk 0:02:57.4] [%eval 1.01] [%bestmove b8d7] } 5. Bg5 { [%clk 0:02:50.1] [%eval 0.38] [%bestmove e4f6] } 5... Be7 { [%clk 0:02:56.3] [%eval 0.30] [%bestmove f8e7] } 6. Nxf6+ { [%clk 0:02:47.3] [%eval 0.11] [%bestmove e4f6] } 6... gxf6 { [%clk 0:02:54.5] [%eval 0.60] [%bestmove e7f6] } 7. Be3 { [%clk 0:02:44.6] [%eval 0.68] [%bestmove g5e3] } 7... b6 { [%clk 0:02:53.8] [%eval 1.15] [%bestmove b8c6] } 8. Nf3 { [%clk 0:02:43.3] [%eval 0.43] [%bestmove d1f3] } 8... Bb7 { [%clk 0:02:53.2] [%eval 0.40] [%bestmove c8b7] } 9. Be2 { [%clk 0:02:42.3] [%eval 0.24] [%bestmove f1b5] } 9... Rg8 { [%clk 0:02:52.4] [%eval 0.38] [%bestmove d8d7] } 10. Rg1 { [%clk 0:02:40] [%eval 0.23] [%bestmove d1d3] } 10... Nc6 { [%clk 0:02:48.8] [%eval 0.32] [%bestmove d8d5] } 11. c3 { [%clk 0:02:35.1] [%eval 0.20] [%bestmove c2c3] } 11... Qd5 { [%clk 0:02:44.4] [%eval 0.28] [%bestmove d8d5] } 12. Qd3 { [%clk 0:02:30.5] [%eval -0.22] [%bestmove d1a4] } 12... f5 { [%clk 0:02:38] [%eval 0.00] [%bestmove e8c8] } 13. Bf4 { [%clk 0:02:27.6] [%eval -0.02] [%bestmove g2g3] } 13... O-O-O { [%clk 0:02:36.8] [%eval -0.04] [%bestmove e8c8] } 14. a4 { [%clk 0:02:21.6] [%eval -0.28] [%bestmove d3c4] } 14... a5 { [%clk 0:02:35.5] [%eval 0.20] [%bestmove f7f6] } 15. Qc2 { [%clk 0:02:14.7] [%eval -0.14] [%bestmove d3b5] } 15... Qe4 { [%clk 0:02:30.8] [%eval 0.61] [%bestmove c8b8] } 16. Qxe4 { [%clk 0:02:09.7] [%eval 0.11] [%bestmove c2e4] } 16... fxe4 { [%clk 0:02:30.7] [%eval 0.12] [%bestmove f5e4] } 17. Nd2 { [%clk 0:02:09.1] [%eval 0.05] [%bestmove f3d2] } 17... f5 { [%clk 0:02:27.5] [%eval 0.08] [%bestmove f7f5] } 18. f3 { [%clk 0:02:08.3] [%eval -0.24] [%bestmove d2c4] } 18... e5 { [%clk 0:02:21.3] [%eval -0.38] [%bestmove e6e5] } 19. dxe5 { [%clk 0:02:07] [%eval -0.58] [%bestmove d4e5] } 19... Bc5 { [%clk 0:02:20.5] [%eval -0.58] [%bestmove e7c5] } 20. Rf1 { [%clk 0:02:02.6] [%eval -0.58] [%bestmove g1f1] } 20... e3 { [%clk 0:02:12] [%eval -0.39] [%bestmove e4e3] } 21. Nb3 { [%clk 0:02:00.1] [%eval -0.69] [%bestmove d2b3] } 21... Rxg2 { [%clk 0:02:09] [%eval -0.16] [%bestmove c6b4] } 22. Nxc5 { [%clk 0:01:58.1] [%eval -0.01] [%bestmove b3c5] } 22... bxc5 { [%clk 0:02:08.9] [%eval -0.27] [%bestmove b6c5] } 23. Bxe3 { [%clk 0:01:57.4] [%eval -0.40] [%bestmove a1d1] } 23... Nxe5 { [%clk 0:02:06] [%eval -0.40] [%bestmove c6e5] } 24. Bxc5 { [%clk 0:01:54.9] [%eval -1.49] [%bestmove f1f2] } 24... Re8 { [%clk 0:01:53.5] [%eval -1.50] [%bestmove d8e8] } 25. Kd1 { [%clk 0:01:45.6] [%eval -1.75] [%bestmove e1d1] } 25... Rxe2 { [%clk 0:01:26.8] [%eval -1.35] [%bestmove e8d8] } 26. Kxe2 { [%clk 0:01:39.5] [%eval -1.46] [%bestmove d1e2] } 26... Nd7+ { [%clk 0:01:26] [%eval -1.10] [%bestmove e5d7] } 27. Kf2 { [%clk 0:01:37.1] [%eval -1.48] [%bestmove e2f2] } 27... Nxc5 { [%clk 0:01:25.1] [%eval -1.25] [%bestmove d7c5] } 28. Rfd1 { [%clk 0:01:29.2] [%eval -1.72] [%bestmove f1d1] } 28... f4 { [%clk 0:01:24.6] [%eval -0.14] [%bestmove b7a6] } 29. b4 { [%clk 0:01:24.9] [%eval -0.97] [%bestmove b2b4] } 29... Na6 { [%clk 0:01:10.9] [%eval 0.00] [%bestmove a5b4] } 30. Rd4 { [%clk 0:01:22.6] [%eval -0.21] [%bestmove d1d4] } 30... Rf8 { [%clk 0:00:57.4] [%eval 0.45] [%bestmove c7c5] } 31. Rg1 { [%clk 0:01:14.8] [%eval 0.63] [%bestmove a1d1] } 31... axb4 { [%clk 0:00:54] [%eval 0.99] [%bestmove c7c5] } 32. cxb4 { [%clk 0:01:13.6] [%eval 0.80] [%bestmove c3b4] } 32... c5 { [%clk 0:00:53.5] [%eval 0.99] [%bestmove c7c5] } 33. bxc5 { [%clk 0:01:11.4] [%eval 1.01] [%bestmove b4c5] } 33... Rf7 { [%clk 0:00:45.3] [%eval 1.42] [%bestmove f8f5] } 34. Rc1 { [%clk 0:01:02] [%eval 1.19] [%bestmove g1g5] } 34... Bc6 { [%clk 0:00:43.8] [%eval 1.53] [%bestmove f7f5] } 35. Rd6 { [%clk 0:00:57.3] [%eval 0.69] [%bestmove c1c4] } 35... Kc7 { [%clk 0:00:42.3] [%eval 0.78] [%bestmove c8c7] } 36. a5 { [%clk 0:00:55.8] [%eval -0.09] [%bestmove c1c3] } 36... Nxc5 { [%clk 0:00:38.6] [%eval -0.05] [%bestmove a6c5] } 37. Rdd1 { [%clk 0:00:41.3] [%eval -0.37] [%bestmove c1d1] } 37... Nb3 { [%clk 0:00:36.8] [%eval -0.38] [%bestmove c5b3] } 38. Rc3 { [%clk 0:00:39.7] [%eval -0.27] [%bestmove c1b1] } 38... Nxa5 { [%clk 0:00:35.6] [%eval -0.24] [%bestmove b3a5] } 39. Ra1 { [%clk 0:00:38.2] [%eval -0.47] [%bestmove d1d5] } 39... Rf5 { [%clk 0:00:34] [%eval -0.63] [%bestmove f7f5] } 40. Rg1 { [%clk 0:00:31.8] [%eval -0.51] [%bestmove a1g1] } 40... Nb7 { [%clk 0:00:31.1] [%eval -0.22] [%bestmove c7d6] } 41. Rg7+ { [%clk 0:00:31.2] [%eval -0.25] [%bestmove g1g7] } 41... Kd6 { [%clk 0:00:29.5] [%eval -0.25] [%bestmove c7d6] } 42. Rxh7 { [%clk 0:00:30.6] [%eval -0.38] [%bestmove g7h7] } 42... Nc5 { [%clk 0:00:29.1] [%eval -0.25] [%bestmove b7c5] } 43. Rh6+ { [%clk 0:00:29] [%eval -0.58] [%bestmove h7h8] } 43... Kd5 { [%clk 0:00:28.6] [%eval -0.30] [%bestmove d6d5] } 44. h4 { [%clk 0:00:24.6] [%eval -0.70] [%bestmove c3a3] } 44... Bb5 { [%clk 0:00:28] [%eval -0.23] [%bestmove d5d4] } 45. h5 { [%clk 0:00:23.1] [%eval -0.83] [%bestmove f2g2] } 45... Nd3+ { [%clk 0:00:27.3] [%eval -0.96] [%bestmove c5d3] } 46. Kg1 { [%clk 0:00:20.8] [%eval -1.65] [%bestmove f2e2] } 46... Rg5+ { [%clk 0:00:26.7] [%eval -1.77] [%bestmove f5g5] } 47. Kh2 { [%clk 0:00:19.8] [%eval -1.46] [%bestmove g1h2] } 47... Kd4 { [%clk 0:00:26] [%eval -1.83] [%bestmove d3e1] } 48. Rb3 { [%clk 0:00:18.2] [%eval -2.03] [%bestmove c3a3] } 48... Bc4 { [%clk 0:00:24.8] [%eval -2.28] [%bestmove b5c4] } 49. Ra3 { [%clk 0:00:16] [%eval -2.48] [%bestmove b3a3] } 49... Nf2 { [%clk 0:00:21.8] [%eval -0.22] [%bestmove d4e3] } 50. Rd6+ { [%clk 0:00:14.8] [%eval -0.06] [%bestmove h6d6] } 50... Kc5 { [%clk 0:00:21] [%eval -0.08] [%bestmove d4c5] } 51. Rh6 { [%clk 0:00:12.6] [%eval -1.13] [%bestmove d6f6] } 51... Bf1 { [%clk 0:00:20.2] [%eval 0.10] [%bestmove f2d3] } 52. Ra1 { [%clk 0:00:10.6] [%eval #-1] [%bestmove h6g6] } 52... Rg2# { [%clk 0:00:19.3] [%bestmove g5g2] } 0-1`
  },
];
