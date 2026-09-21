/**
 * The Game Workspace's sample games — a hand-maintained table, not a generated one.
 *
 * Each entry is a row of `games` as schema §1 and §4 describe one: `pgn` holds the
 * original document, read-only and never patched, and the columns beside it hold the
 * values §4 lifted out of its tag pairs at import. Those columns exist so that a search
 * need not read every `pgn` in the database to answer a simple question, and they are
 * the editable copies — the same relationship `movetext` has to `pgn`. Editing a game's
 * White would change the column and leave the tag pair alone, so a column and its tag
 * can legitimately disagree. They agree on every row here only because these were
 * imported and never edited; field editing is not a feature of this version.
 *
 * Nothing is precomputed. Positions, the squares a move ran between, check and
 * evaluations are read from the movetext at runtime by `$lib/game/plies.js`, which is
 * the point of the exercise — the prototype validates the schema by reading what the
 * schema actually stores.
 *
 * `movetext` IS NULL ON EVERY ROW, which is what §3.1's precedence is for: a reader
 * takes `movetext` when it is present and parses `pgn` when it is not. Every row in
 * `samples/` is in the same state — 0 of 1,066 sample games carry a movetext, because
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
 * ALL FORTY ROWS COME FROM ONE CURATED FILE, `samples/pgn/sample-games.pgn` — ten
 * historical/reference games (several carrying real prose commentary, NAGs and chess.com's
 * own [%c_effect] move-quality tags — not engine data) plus thirty of AwesomeAtti's own
 * Live Chess games. `[%c_effect]` is not one of the five commands chessops defines, so
 * `annotations.js` keeps it as an unrecognized, verbatim command — it round-trips but draws
 * as plain text, not a banner, until something reads it.
 *
 * THIRTY OF THE FORTY CARRY NO ENGINE ANNOTATION — the ten historical games and twenty of
 * the Live Chess games (the MagnusCarlsen and Hikaru ones) — so on those the Evaluation Bar
 * draws its neutral fill throughout (§5.4.1 already specifies that state: an empty bar at
 * 50% would read as "equal", which is a claim). The other TEN (the GothamChess-vs-
 * AwesomeAtti games) turned out to already carry [%clk]/[%eval]/[%bestmove] on every move —
 * an unplanned but welcome find, not something this file went looking for. Those ten are
 * this file's only engine-annotated rows, and what exercises the comment control, the
 * comment banner and the Evaluation Bar's populated state in the application; a feature no
 * shipped data reaches is a feature nobody can check.
 *
 * THIS FILE PREVIOUSLY ALSO CARRIED A SEPARATE 26-GAME GOTHAMCHESS DEMO SET (one row here
 * plus twenty-five spread in from a companion `annotated.js`), kept purely to exercise
 * engine annotation before this PGN existed. Dropped on explicit instruction so the PWA
 * ships the same forty games as the desktop app's Sample Games library, with the GothamChess-
 * vs-AwesomeAtti rows above now doing that job instead.
 *
 * IDS ARE 1-40, CONTIGUOUS FROM ONE. `$lib/library/mock.js`'s `makeGames()` continues its
 * generated stress rows' ids from `realRows().length + 1`, so a gap or an out-of-order real
 * id here would hand a generated row an id a real row already owns — Svelte's keyed
 * `{#each}` throws on the duplicate key that produces. Renumbered from the file's earlier
 * 31-70 (a legacy of rows that used to sit alongside id 1 and the annotated set above) to
 * close that gap now that this file holds nothing else.
 */

export const GAMES = [
  {
    id: 1,
    white: "Garry Kasparov", white_elo: 2812,
    black: "Veselin Topalov", black_elo: 2700,
    event: "Hoogovens Group A", site: "Wijk aan Zee NED",
    date: "1999.01.20", round: "4", result: "1-0",
    eco: "B07",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Hoogovens Group A"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[Round "4"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[Result "1-0"]
[WhiteElo "2812"]
[BlackElo "2700"]
[ECO "B07"]
[Link "https://www.chess.com/analysis/collection/greatest-chess-games-of-all-time-y1bGzP5Y/35jqMSeWrr/games?move=86"]

1. e4 {Kasparov has won many brilliant attacking games with both 1.e4 and 1.d4.
Here he pursues an open game.} 1... d6 $5 {[%c_effect
d6;square;d6;type;Interesting;persistent;true] Kasparov is probably THE greatest
opening theoretician of all time so it makes sense to avoid main lines against
him. Topalov selects the less common Pirc Defense, but now he runs the risk of
getting in trouble not because he is outprepared, but because the opening may be
slightly dubious at the highest level.} 2. d4 {It is of course correct to
establish the \\\\\\"perfect pawn center\\\\\\" against almost any hypermodern
opening.} 2... Nf6 {Topalov attacks the e4-pawn. A difference between the King's
Indian Defense (1.d4 Nf6 2.c4 g6) and the Pirc Defense (1.e4 d6 2.d4 Nf6) is
that it is natural now to play Nc3 which block the c-pawn that has already
advanced to c4 in the King's Indian.} 3. Nc3 {Kasparov develops and defends e4.}
3... g6 {Topalov commits to the true \\\\\\"Pirc\\\\\\" defense with a kingside
fianchetto. He could still have changed course and played ...e5 and played a
\\\\\\"Philidor Defense\\\\\\" instead.} 4. Be3 {As is his way, Kasparov selects an
aggressive setup, developing the bishop to pursue a quick queen and bishop
battery and castle queenside.} 4... Bg7 {completing the fianchetto.} 5. Qd2
{This move already prepares queenside castling and Bh6. Kasparov's attacking
ideas are taking shape.} 5... c6 $5 {[%c_effect
c6;square;c6;type;Interesting;persistent;true] An intriguing and flexible move $1
Rather than castling (which most beginners would play), Topalov adopts a very
flexible expansion on the queenside which waits to see how Kasparov will deploy
his forces without creating targets.} (5... Ng4 $6 {[%c_effect
g4;square;g4;type;Inaccuracy;persistent;true] Exchanging the dark-square bishop
would be a huge strategic achievement, but Topalov would only overextend if he
tried this move.} 6. Bg5 h6 7. Bh4 g5 8. Bg3 $16 {The dark-square bishop survives,
and Black's advanced kingside pawns may easily become targets.}) (5... O-O
{Naturally Topalov avoids castling into the attack (though this is playable)
when Kasparov would be able to fully commit to the wing assault.}) 6. f3 {This
is a very useful (often essential) move in such positions. Kasparov secures e4
and keeps a knight out of g4.} 6... b5 {Topalov expands on the queenside,
creating prospects for an attack on White's king after 0-0-0, thinking about
inconveniencing the c3-knight after ...b4, and giving space to the Bc8 to
develop.} 7. Nge2 {This move is slightly odd since the knight has nowhere good
to go right away and blocks the Bf1. Topalov has benefited slightly from his
wait-and-see approach that makes it hard for Kasparov to commit his forces.} (7.
Bd3 $14 {Stockfish prefers developing the bishop and TH $146 playing Nge2.}) 7...
Nbd7 {The knight develops to it's most natural square, controlling e5 and c5.}
8. Bh6 {A very committal decision from Kasparov. He elects to exchange the
\\\\\\"dragon bishop,\\\\\\" but he must sideline his queen to achieve this strategic
goal.} 8... Bxh6 {Topalov pulls Kasparov's queen to h6, where it is misplaced.}
(8... O-O $2 {[%c_effect g8;square;g8;type;Mistake;persistent;true] This would be
very risky as Kasparov can immediately launch a kingside attack.} 9. h4 $16) 9.
Qxh6 {recapturing} 9... Bb7 {The bishop develops and adds important control to
the d5-square.} 10. a3 {Kasparov takes a moment to stop ...b4.} (10. Qg7 {Many
beginners might play (or be worried about) this move.} 10... Rg8 {White can only
retreat and as Black was never castling kingside anyway, nothing was
accomplished.}) 10... e5 {Topalov finally makes a control commitment. He also
shows his plan, ...Qe7 and 0-0-0.} (10... a5 $5 $14 {[%c_effect
a5;square;a5;type;Interesting;persistent;true] The engine preferred more
queenside expansion. It's move 10 and both players are still trying to figure
out development and castling.}) 11. O-O-O {Now that Topalov has committed,
Kasparov does too. ...e5 weakens the d-file, and it is the perfect time to
castle and put a rook on it.} 11... Qe7 {Topalov places the queen in a perfect
spot. It defends the dark-squares on all sides of the board and secures e5.} 12.
Kb1 $1 {[%c_effect b1;square;b1;type;GreatFind;persistent;true] A grandmaster
move $1 Kasparov is patient and places his king on the safer b1-square and frees
c1 for his e2-knight.} 12... a6 {Topalov secures b5 as d5 could have created
problems.} 13. Nc1 $1 {[%c_effect c1;square;c1;type;GreatFind;persistent;true] The
knight repositions and frees the f1-bishop.} 13... O-O-O {Topalov finally
castles. In a classical sense, it is only here that we have left the opening as
both players are mostly developed and are castled.} 14. Nb3 {The knight finishes
it's journey and has a possible new target, a5.} 14... exd4 {Topalov can find no
further improvements so he decides it's time to release the central tensions.
Although his king is open, he is hoping his better centralized pieces (see the
Bf1, Rh1, and Qh6) can benefit from central action.} 15. Rxd4 {Recapturing with
the knight was of roughly equal value.} 15... c5 {The b7-bishop is released with
a gain of tempo on the rook.} 16. Rd1 {The rook retreats to the first rank.}
16... Nb6 {This one move activates both the knight and the Rd8 in the fight for
d5. Black hopes to advance ...d5 soon.} 17. g3 {Kasparov needs to active his
f1-bishop and h1-rook so he prepares Bh3.} 17... Kb8 {Topalov simply anticiaptes
Bh3+} 18. Na5 $6 {[%c_effect a5;square;a5;type;Inaccuracy;persistent;true] This
complex phase sees several inaccuracies from both players. Kasparov plays to
trade off the b7-bishop, but Topalov can let him have it and use the time gained
to break in the center.} (18. Qf4 $16) 18... Ba8 $6 {[%c_effect
a8;square;a8;type;Inaccuracy;persistent;true] Topalov keeps the bishop, but he
did not have to do so.} (18... d5 $1 {[%c_effect
d5;square;d5;type;GreatFind;persistent;true] This was the perfect time to break
in the center $1} 19. Nxb7 Kxb7 20. exd5 Nfxd5 $12 {Black's king feels drafty, but
his central pieces offset this concern and give him equality.}) 19. Bh3 $2
{[%c_effect h3;square;h3;type;Mistake;persistent;true] Kasparov develops the
bishop, but it would not be so useful on h3 had Topalov responded accurately on
move 24.} (19. Qf4 $16 {again, it was better to recentralize.}) 19... d5 $1
{[%c_effect d5;square;d5;type;GreatFind;persistent;true] Topalov finally strikes
out $1 His king is opened up, but his pieces are activated. Black is even better.}
20. Qf4+ {The queen recentralizes with a check. She's been longing to do so.}
20... Ka7 {Topalov's king appears to be fairly safe on a7...} 21. Rhe1 {Kasparov
finally develops his lat piece. Don't wait until move 21 to develop your rooks,
kids $1} 21... d4 {Topalov keeps the e-file from opening and asks the knight to
passively retreat.} 22. Nd5 {Kasparov strives to avoid passivity and advances so
as to avoid the e-file. This is the move which commits Kasparov to a sacrificial
path as (at a minimum) he will lose a pawn on d5.} 22... Nbxd5 {This is the
correct knight to capture with as the black king has access to b6 now.} 23. exd5
{opening the e-file.} 23... Qd6 {The queen blockades the d-pawn which appears to
be a goner.} 24. Rxd4 $3 {[%c_effect d4;square;d4;type;Brilliant;persistent;true]
A thunderous move $3 $1 Kasparov sacrifices a rook in the hope of a mating attack.
Topalov has a huge decision here. Should he accept the audacious sacrifice or
decline $2} (24. Nc6+ $5 {[%c_effect c6;square;c6;type;Interesting;persistent;true]
This might be the \\\\\\"best\\\\\\" course of action, but only Black can be better in
the endgame, and Topalov will have little way to go wrong.} 24... Bxc6 25. Qxd6
Rxd6 26. dxc6 $17) 24... cxd4 $2 {[%c_effect
d4;square;d4;type;Mistake;persistent;true] Topalov accepts, following one of my
favorite maxims, \\\\\\"If you cannot see a reason not to take material, take it.
You will either get material or a lesson.\\\\\\" Here Topalov gets a lesson as
Kasparov's sacrifice proves sound. We should all be grateful to Topalov for
being willing to venture down this road, but declining the sacrifice could have
gained a clear advantage.} (24... Kb6 $1 {[%c_effect
b6;square;b6;type;GreatFind;persistent;true] This move was much cited after the
match. Instead of taking the rook, Black plays a daring king move and places the
knight on a5 and the rook under attack. This disrupts White's mating patterns,
and an endgame is now unavoidable.} 25. b4 Qxf4 26. Rxf4 Nxd5 27. Rxf7 cxb4 28.
axb4 Nxb4 29. Nb3 Bd5 30. Rf6+ Nc6 $17 {Black is better in this endgame due to
good pieces and strong queenside pawns. There are decent winning chances.})
(24... Rhe8 $2 {[%c_effect e8;square;e8;type;Mistake;persistent;true] I quite like
this move which activates the last undeveloped piece. I think this give the most
winning chances to Black.} 25. Rxe8 Nxe8 26. Qxf7+ $16) 25. Re7+ $3 {[%c_effect
e7;square;e7;type;Brilliant;persistent;true] A second rook sacrifice to justify
the first $1 This one cannot be accepted though.} (25. Qxd4+ $4 {[%c_effect
d4;square;d4;type;Blunder;persistent;true]} 25... Qb6 26. Re7+ Nd7 {And since
White's queen is hanging, the attack falters in this line.}) 25... Kb6 {Topalov
has no choice but to run the monarch up the board and attack the knight.} (25...
Qxe7 $2 {[%c_effect e7;square;e7;type;Mistake;persistent;true] Kasparov now has a
pretty mate in four.} 26. Qxd4+ Kb8 27. Qb6+ Bb7 (27... Qb7 28. Nc6#) 28. Nc6+
Ka8 29. Qa7#) (25... Kb8 $2 {[%c_effect b8;square;b8;type;Mistake;persistent;true]
The problem here is that the h8-rook hangs in the end of the lines. The devil is
in the details $1} 26. Qxd4 Nd7 (26... Rd7 27. Bxd7 $18) (26... Qxe7 27. Qb6+ {is
the same as immediately capturing the rook.}) 27. Rxd7 Rxd7 28. Bxd7 Qxd7 29.
Qxh8+ $18) 26. Qxd4+ $1 {[%c_effect d4;square;d4;type;GreatFind;persistent;true]
The knight on a5 is sacrificed as well to force Topalov's king into a mating
net.} 26... Kxa5 {Topalov accepts the knight. His king is netted, but the final
mate is difficult to force.} (26... Qc5 27. Qxf6+ Qd6 (27... Kxa5 $2 {[%c_effect
a5;square;a5;type;Mistake;persistent;true]} 28. b4+ $18) 28. Be6 $3 {[%c_effect
e6;square;e6;type;Brilliant;persistent;true] An amazing solution put forward by
Kasparov $1 This stops the queen trades and keeps White's pieces in a dominating
position. The threat is just b4 and Qd4+ mating.} 28... Kxa5 (28... Rhe8 29. b4
Rxe7 30. Qd4+ Kc7 31. Qa7+ {Another magnificent final position.}) 29. b4+ Ka4
30. Qc3 Bxd5 31. Kb2 Bxe6 32. Qb3+ Bxb3 33. cxb3#) 27. b4+ {Forcing the king to
a4.} 27... Ka4 {Can the king survive here $2} 28. Qc3 {Kasparov threatens mate
with Qb3. He is combining ideas of Qb3# and Ra7-a6# to stretch Topalov's
defenses to the maximum.} (28. Ra7 $1 {[%c_effect
a7;square;a7;type;GreatFind;persistent;true] This is even stronger thanks to
some great resources. We will show just a few to appreciate the beauty of the
ideas.} 28... Nxd5 (28... Rc8 29. Qd3 Rxc2 30. Qxc2+ Kxa3 31. Qc3+ Ka4 32. Rxa6+
Qxa6 33. Kb2 Bxd5 34. Qa3# {Yet another mate to remember.}) (28... Bxd5 29. Qc3
Rhe8 30. Kb2 Re2 31. Qc7 Qxc7 32. Rxa6+ Qa5 33. Rxa5#) (28... Bb7 29. Rxb7
{Modern analysis has shown an advantage in all lines, but we leave the position
here.}) 29. Rxa6+ $3 {[%c_effect a6;square;a6;type;Brilliant;persistent;true]}
29... Qxa6 30. Qb2 Nc3+ 31. Qxc3 Bd5 32. Kb2 Rc8 33. Qb3+ Bxb3 34. cxb3#) 28...
Qxd5 (28... Bxd5 $2 {[%c_effect d5;square;d5;type;Mistake;persistent;true] This
loses immediately because the bishop interferes with the black queen's defensive
lines.} 29. Kb2 {Qb3# is now unstoppable since Black's Qd6 can neither defend b3
again or reach d4 to pin the white queen.} 29... Qxe7 30. Qb3+ $1 {[%c_effect
b3;square;b3;type;GreatFind;persistent;true]} 30... Bxb3 31. cxb3# {What a
stunning checkmate $3 $1}) 29. Ra7 (29. Kb2 $4 {[%c_effect
b2;square;b2;type;Blunder;persistent;true] This threatens Qb3#, but Black can
save the day with a pin.} 29... Qd4 $19) (29. Qc7 {This is an important drawing
resource. The mate threat on a5 compels Black to take a draw. If Kasparov became
concerned that he risked too much in playing on, he had this out.} 29... Qd1+
30. Kb2 Qd4+ $12) 29... Bb7 $1 {[%c_effect
b7;square;b7;type;GreatFind;persistent;true] The only viable way to defend a6 is
to give up this bishop.} (29... Rd6 $2 {[%c_effect
d6;square;d6;type;Mistake;persistent;true] This defends a6, but the rook's
occupation means that ...Qd4 is no longer available as a defense to Kb2 $1} 30.
Kb2 Qd4 {This stops Qb3 mating, but it allows Rxa6#} 31. Qxd4 Rxd4 32. Rxa6#)
(29... Qd1+ $2 {[%c_effect d1;square;d1;type;Mistake;persistent;true] A bad
check.} 30. Kb2 $18 {With Qb3# and Rxa6# both threatened, Black must concede.})
30. Rxb7 {Kasparov takes the bishop, but he gives Topalov a moment to organize a
defense, and he is still down a rook.} 30... Qc4 {Topalov offers a queen trade
and resolves the threat of Qb3#, but he surrenders the knight on f6.} (30...
Rhe8 {Activating the as-yet-undeveloped rook was a very thematic defense.} 31.
Rb6 Ra8 32. Bf1 $3 {[%c_effect f1;square;f1;type;Brilliant;persistent;true]}
32... Re1+ 33. Qxe1 Nd7 34. Rb7 $3 {[%c_effect
b7;square;b7;type;Brilliant;persistent;true]} 34... Qxb7 35. Qd1 Kxa3 36. c3 Nb6
37. Qc1+ Ka4 38. Qc2+ Ka3 39. Qa2#) 31. Qxf6 {Of course, Kasparov would never
trade queens, but he can win a knight while evading simplification He also
threatens mate on a6.} (31. Ra7 $4 {[%c_effect
a7;square;a7;type;Blunder;persistent;true] This threat of mate doesn't allow
Black to capture the queen immediately, but an intermediate check wins the
game.} 31... Qxc3 $4 {[%c_effect c3;square;c3;type;Blunder;persistent;true]}
(31... Rd1+ $1 {[%c_effect d1;square;d1;type;GreatFind;persistent;true]} 32. Kb2
Qxc3+ 33. Kxc3 Rd6 $19) 32. Rxa6#) 31... Kxa3 $2 {[%c_effect
a3;square;a3;type;Mistake;persistent;true] Topalov elects to take a pawn and
gain some royal breathing room.} (31... Rd1+ $1 {[%c_effect
d1;square;d1;type;GreatFind;persistent;true] This was the last viable defense.
Topalov could reach a very slightly worse endgame by trading queens in a
moment.} 32. Kb2 Ra8 33. Qb6 Qd4+ 34. Qxd4 Rxd4 35. Rxf7 $14) 32. Qxa6+ {The play
is forced from here on.} 32... Kxb4 {Topalov has eliminated the dangerous a3-b4
pawns. Has he found relief $2} 33. c3+ $1 {[%c_effect
c3;square;c3;type;GreatFind;persistent;true] Kasparov shows that the attack is
not over $1 Topalov has no good way to respond.} 33... Kxc3 {This is the most
logical try. Topalov eliminates the pawn and runs his king toward the open
center.} (33... Qxc3 $2 {[%c_effect c3;square;c3;type;Mistake;persistent;true]
allows immediate mate.} 34. Qxb5+ Ka3 35. Qa6+ Qa5 36. Qxa5#) (33... Kc5 {drops
the queen.} 34. Rc7+ $18) (33... Kb3 $2 {[%c_effect
b3;square;b3;type;Mistake;persistent;true] Now Kasparov can pick up the queen
with a series of checks.} 34. Qa2+ Kxc3 35. Qb2+ Kd3 36. Bf1+ $18) 34. Qa1+ $1
{[%c_effect a1;square;a1;type;GreatFind;persistent;true] There is something
particularly beautiful about the queen falling back to the corner, utilizing the
whole board. Both Qa3 and Qa5 allow Topalov to interpose with check and trade
queens.} 34... Kd2 {Perhaps the king will be safe on d1 $2} (34... Kb4 35. Qb2+
Qb3 36. Rxb5+ $18 {Picks up the queen with a classic decoy.}) (34... Kd3 35. Bf1+
{skewered again.}) 35. Qb2+ {Kasparov continues the hunt. Can Black find a safe
square $2} 35... Kd1 {Topalov's king reaches the opposite rank, and it looks safe
on d1 $1 Kasparov is out of checks and still down material, PLUS ...Rd2 and
...Qd3+ $1 are huge threats. Is Topalov just winning $2} (35... Ke1 36. Re7+ $18)
(35... Ke3 36. Re7+ Kxf3 37. Qg2# {is a funny mate.}) 36. Bf1 $3 {[%c_effect
f1;square;f1;type;Brilliant;persistent;true] A-M-A-Z-I $146-G $1 Kasparov delivers a
shot that wins the game. The bishop cannot be taken, and the attacked Black
queen cannot defend checks on c1, c2, and e2.} 36... Rd2 {A great try from
Topalov $1 He leaves his queen hanging and counter-attacks Kasparov's queen. Once
agains, it appears that Topalov has saved the game.} (36... Qxf1 37. Qc2+ Ke1
38. Re7+ $18) (36... Qe6 37. Qc1# {another picture-perfect mate.}) 37. Rd7 $3
{[%c_effect d7;square;d7;type;Brilliant;persistent;true] Kasparov has all the
answers. He pins the d2-rook and renews his threat the the black queen, PLUS he
now threatens mate on d2.} 37... Rxd7 {Topalov has no choice. He must take the
rook and surrender his queen.} 38. Bxc4 {cashing in.} 38... bxc4 {recapturing.
There is no time to save h8 as Rc1 mate was threatened.} 39. Qxh8 {The \\\\\\"sting
in the tail\\\\\\" of this long battle. At the end of these tactics, the rook in
the corner falls and Kasparov now wins with relative ease.} 39... Rd3
{Threatening the f3-pawn.} 40. Qa8 {Defending f3 and threatening Qa4+ winning
c4.} 40... c3 {Threatening a winning c2+} 41. Qa4+ {Resolving the c2 threat and
pushing Black's king away.} 41... Ke1 {hoping to attack and eliminate the
kingside pawns.} 42. f4 {securing the f-pawn.} 42... f5 {also securing a loose
f-pawn.} 43. Kc1 {The king firmly blockades the c-pawn and eliminates and hope
of counterplay.} 43... Rd2 {attacking h2.} 44. Qa7 {defending h2 (due to Qg1+)
and threatening both Qe3+ and Qxa7. Topalov selected a good moment to resign
here.} 1-0`
  },
  {
    id: 2,
    white: "Morhpy, Paul", white_elo: null,
    black: "Allies", black_elo: null,
    event: "Paris", site: "Paris FRA",
    date: "1858.??.??", round: "?", result: "1-0",
    eco: "C41",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Paris"]
[Site "Paris FRA"]
[Date "1858.??.??"]
[Round "?"]
[White "Morhpy, Paul"]
[Black "Allies"]
[Result "1-0"]
[WhiteElo "?"]
[BlackElo "?"]
[ECO "C41"]
[Link "https://www.chess.com/analysis/collection/greatest-chess-games-of-all-time-y1bGzP5Y/2UNezrGa4W/games?move=32"]

{This famous game is known as the \\\\\\"Opera Game\\\\\\" as it was played informally
at the Paris Opera between Paul Morphy and the Duke of Brunswick and Count
Isouard who played in consultation.} 1. e4 {Seizes the center. Frees the bishop
and queen.} 1... e5 {Equally good for the same reasons.} 2. Nf3 {The knight
develops with \\\\\\"tempo,\\\\\\" attacking e5. Because the kings' pawns are
undefended on e4 and e5, attacks and counterattacks are possible, and the game
is sharper than after 1.d4 d5 when the queens defend the pawns, slowing down
attacks.} 2... d6 $6 {[%c_effect d6;square;d6;type;Inaccuracy;persistent;true]
Black defends e5, BUT this move blocks the bishop on f8. This opening, \\\\\\"The
Philidor Defense\\\\\\" is not bad, but it is considered inferior to 2...Nc6 which
defends the e5-pawn without blocking the bishop on f8.} (2... Nc6) 3. d4 {Morphy
plays the most active move, freeing the bishop on c1 and attacking the pawn on
e5.} 3... Bg4 $2 {[%c_effect g4;square;g4;type;Mistake;persistent;true] Black uses
a tactic, a \\\\\\"pin\\\\\\" on the knight on f3 which cannot move without losing the
queen on d1, to defend the pawn on e5, but the tactic is flawed. It was better
to play ...exd4 although White's position is much better.} (3... exd4 4. Qxd4)
4. dxe5 {Morphy has an idea to win a pawn.} 4... Bxf3 {This is the only way to
avoid losing a pawn on e5, but it helps Morphy develop the queen and create
threats against f7.} (4... dxe5 $2 {[%c_effect
e5;square;e5;type;Mistake;persistent;true] Recapturing the pawn.} 5. Qxd8+
{Trading queens at just the right time.} 5... Kxd8 {The only legal move -
therefore the \\\\\\"best\\\\\\" move.} 6. Nxe5 {By trading queens, Morphy would
\\\\\\"unpin\\\\\\" the knight on f3 and allow it top capture on e5.}) 5. Qxf3
{Recapturing and activating the queen.} 5... dxe5 {Regaining the pawn.} 6. Bc4
{Morphy develops the bishop and threatens checkmate with 7.Qxf7#} 6... Nf6
{Black develops the knight and stops the checkmate on f7. Can you now find a
move that creates two threats for White $2} 7. Qb3 $1 {[%c_effect
b3;square;b3;type;GreatFind;persistent;true] Morphy attacks f7 AND b7. The
arrangement with the bishop on c4 being supported by the queen on f3 is called a
\\\\\\"battery\\\\\\" - a lineup of two linear pieces.} 7... Qe7 {Black can't defend
both threats so Black defends the more dangerous one, the attack on f7. Black
also has an idea to trade queens if Morphy captures on b7, BUT the queen is now
blocking the bishop on f8, and it is hard for Black to develop the kingside
pieces and castle.} 8. Nc3 {Morphy develops a queen and stops ...Qb4+ trading
queens.} (8. Qxb7 {wins a free pawn. This also looks like it traps the rook on
a8, but Black has a defense.} 8... Qb4+ {This check trades queens. White is
still winning, but Morphy wanted to keep attacking and did not choose this path
which trades queens, making it harder to attack.} 9. Qxb4 Bxb4+) (8. Bxf7+ $1
{[%c_effect f7;square;f7;type;GreatFind;persistent;true] This is a very nice
trick which wins more material.} 8... Qxf7 {The only way to capture on f7.} 9.
Qxb7 {After capturing on f7, the black queen can no longer reach b4 to trade
queens which means there is no trick to save the trapped rook on a8.}) 8... c6
{Black finds the best move. This move allows the queen to defend the pawn on b7,
AND the pawn defends the squares b5 and d5 so that White's knight can't advance
to these squares.} (8... Qb4 9. Bxf7+) 9. Bg5 {Morphy develops his last minor
piece (minor pieces are bishops and knights), makes a pin on the f8-knight which
can't move without allowing White to capture the queen on e7, and gets to ready
to castle queenside. One move accomplishes a lot $1} 9... b5 $2 {[%c_effect
b5;square;b5;type;Mistake;persistent;true] It's hard to suggest a good move for
Black. This proves to be a mistake because Morphy's sacrifice on the next move
is very strong, but it's hard to develop any black pieces.} (9... Na6 {White can
take this knight with Bxa6 and break up Black's queenside pawns, but maybe this
was Black's best move, developing a piece.}) 10. Nxb5 $1 {[%c_effect
b5;square;b5;type;GreatFind;persistent;true] Morphy has three minor pieces
developed as well as his queen, AND he's ready to castle and get his rooks into
the game. That lead in development justifies his piece sacrifice which unleashes
his remaining pieces and traps Black in a crossfire in the center of the board.}
(10. Bd3 $2 {[%c_effect d3;square;d3;type;Mistake;persistent;true] If Morphy had
retreated, he would have lost the initiative, and Black could have developed
with ...Nbd7, solving most of his problems.} 10... Nbd7) 10... cxb5 {Black
should capture the knight as otherwise he has lost a pawn for nothing. Now he at
least has an extra knight for his suffering.} 11. Bxb5+ {Morphy captures back
and points the powerful bishop on b5 right at the queen.} 11... Nbd7 {Black
develops the knight and blocks the check.} (11... Kd8 {Moving the king means the
king can NEVER castle, and Morphy can just continue bringing more pieces into
the attack with check with 0-0-0+}) 12. O-O-O $1 {[%c_effect
c1;square;c1;type;GreatFind;persistent;true] Morphy castles AND places his rook
on d1. He immediately threatens to win material by capturing on d7 with the rook
or the bishop as the knight on f6 is still pinned and is not a helpful
defender.} 12... Rd8 {Black develops his a8-rook and defends the knight on d7.
This was Black's only way to defend d7.} 13. Rxd7 $1 {[%c_effect
d7;square;d7;type;GreatFind;persistent;true] A brilliant move $1 Morphy wants to
include his last piece, the rook on h1, but he displays no patience (a good
habit for a player who has sacrificed, time is of the essence) and sacrifices to
bring the rook to d1 as fast as possible.} 13... Rxd7 {The knight on f6 is still
pinned so this was the only way to recapture that did not lose material.} 14.
Rd1 {Morphy's final piece develops with another tempo move, a threat to yet
again capture on d7.} 14... Qe6 {Black unpins the knight on f6 so that it can
finally defend d7.} 15. Bxd7+ {Morphy has sniffed out a checkmating idea...}
15... Nxd7 {The only recapture which doesn't allow White to capture the black
queen.} 16. Qb8+ $3 {[%c_effect b8;square;b8;type;Brilliant;persistent;true] A
brilliant finish $1 Checkmate wins the game, and chess players must not be afraid
to sacrifice even their best piece, the queen, if checkmate can be forced.}
16... Nxb8 {The only legal move.} 17. Rd8# {Checkmate $1 This checkmate in which
the bishop defends the rook like this is known as \\\\\\"Morphy's Mate\\\\\\" in
memory of this brilliant \\\\\\"Opera Game.\\\\\\"} 1-0`
  },
  {
    id: 3,
    white: "Levon Aronian", white_elo: 2802,
    black: "Viswanathan Anand", black_elo: 2772,
    event: "Tata Steel Group A", site: "Wijk aan Zee NED",
    date: "2013.01.15", round: "4", result: "0-1",
    eco: "D47",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Tata Steel Group A"]
[Site "Wijk aan Zee NED"]
[Date "2013.01.15"]
[Round "4"]
[White "Levon Aronian"]
[Black "Viswanathan Anand"]
[Result "0-1"]
[WhiteElo "2802"]
[BlackElo "2772"]
[ECO "D47"]
[Link "https://www.chess.com/analysis/collection/greatest-chess-games-of-all-time-y1bGzP5Y/29ww3RNENS/games?move=45"]

1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 e6 5. e3 Nbd7 6. Bd3 dxc4 7. Bxc4 b5 8. Bd3
Bd6 9. O-O O-O 10. Qc2 Bb7 11. a3 Rc8 12. Ng5 $6 {[%c_effect
g5;square;g5;type;Inaccuracy;persistent;true] In retrospect, this opening line
is put to the test by Anand's response.} 12... c5 $1 {[%c_effect
c5;square;c5;type;GreatFind;persistent;true] Black ALWAYS wants to play this in
the Semi-Slav. Excellet tactics and analysis are needed to justify it here.}
(12... Bxh2+ {This tactic does win a pawn, but it leaves White with the better
pieces and the center.} 13. Kxh2 Ng4+ 14. Kg1 Qxg5 15. f3 Ngf6 16. e4 $14) 13.
Nxh7 (13. Nxb5 $2 {[%c_effect b5;square;b5;type;Mistake;persistent;true]} 13...
Bxh2+ {now this works.} 14. Kxh2 Ng4+ 15. Kg1 Qxg5 $17) (13. Bxb5 $2 {[%c_effect
b5;square;b5;type;Mistake;persistent;true]} 13... cxd4 14. exd4 h6 15. Nh3 Qc7 $17
{Black's pieces are humming.}) (13. Bxh7+ $5 {[%c_effect
h7;square;h7;type;Interesting;persistent;true]} 13... Kh8 14. Be4 (14. f4 cxd4
15. exd4 g6 {Anand gives a LOT of analysis here. I'll just say unclear.}) 14...
Nxe4 15. Ncxe4 Be7 $13) 13... Ng4 14. f4 $2 {[%c_effect
f4;square;f4;type;Mistake;persistent;true]} (14. h3 $1 {[%c_effect
h3;square;h3;type;GreatFind;persistent;true]} 14... Bh2+ 15. Kh1 Qh4 {Anand also
gives lots of analysis here. Both Be4 and d5 are interesting here.} 16. Be4 (16.
d5)) 14... cxd4 15. exd4 Bc5 $3 {[%c_effect
c5;square;c5;type;Brilliant;persistent;true] BOOM $1 Anand refutes White's setup
in style. Suddenly, White finds himself overextended and beset by ideas of
smothered mate.} 16. Be2 (16. dxc5 $2 {[%c_effect
c5;square;c5;type;Mistake;persistent;true]} 16... Nxc5 17. Be2 (17. h3 Nxd3 18.
hxg4 Qd4+ 19. Kh2 Kxh7 $17) 17... Qd4+ 18. Kh1 Nf2+ 19. Rxf2 Qxf2 {Mates are
threatened on g2 and e1, and there is no defense.}) 16... Nde5 $3 {[%c_effect
e5;square;e5;type;Brilliant;persistent;true] BOOMX2 $3 Anand's second minor-piece
sacrifice forces the win. Anand's pieces breathe fire through the center of the
board.} 17. Bxg4 (17. dxc5 $2 {[%c_effect
c5;square;c5;type;Mistake;persistent;true]} 17... Qd4+ 18. Kh1 Nf2+ 19. Rxf2
Qxf2 $19) (17. fxe5 $2 {[%c_effect e5;square;e5;type;Mistake;persistent;true]}
17... Qxd4+ 18. Kh1 Qg1+ 19. Rxg1 Nf2#) 17... Bxd4+ 18. Kh1 Nxg4 19. Nxf8 (19.
Ng5 f5 {...Rf6 and ...Rh6 is a winning idea.} 20. Nxe6 Qh4 $19) 19... f5 $1
{[%c_effect f5;square;f5;type;GreatFind;persistent;true]} (19... Kxf8 20. Qh7
{is trickier.}) 20. Ng6 Qf6 21. h3 (21. Ne5 Nxh2 $1 {[%c_effect
h2;square;h2;type;GreatFind;persistent;true] The only winning move, but a
completely decisive one.}) 21... Qxg6 22. Qe2 (22. hxg4 Qh6#) 22... Qh5 23. Qd3
Be3 $1 {[%c_effect e3;square;e3;type;GreatFind;persistent;true] This interference
move destroys the the defense of ...Qxh3+ and is completely decisive. A fine
finish to an incredibly brilliant game.} 0-1`
  },
  {
    id: 4,
    white: "Anatoly Karpov", white_elo: null,
    black: "Garry Kasparov", black_elo: null,
    event: "Karpov - Kasparov World Championship Match", site: "Moscow URS",
    date: "1985.10.15", round: "16", result: "0-1",
    eco: "B44",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Karpov - Kasparov World Championship Match"]
[Site "Moscow URS"]
[Date "1985.10.15"]
[Round "16"]
[White "Anatoly Karpov"]
[Black "Garry Kasparov"]
[Result "0-1"]
[WhiteElo "?"]
[BlackElo "?"]
[ECO "B44"]
[Link "https://www.chess.com/analysis/collection/greatest-chess-games-of-all-time-y1bGzP5Y/U79ZtTDKt/games?move=79"]

{\\\\\\"For many years, I regarded [this game] as my best creative
achievement.\\\\\\"} 1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 Nc6 5. Nb5 (5. Nc3
{played by Karpov in other match games.}) 5... d6 6. c4 Nf6 7. N1c3 a6 8. Na3
d5 $6 {[%c_effect d5;square;d5;type;Inaccuracy;persistent;true] Kasparov's
trademark gambit idea in the match. As we'll see, the line has not stood the
test of time, but in the moment, it worked marvelously.} 9. cxd5 exd5 10. exd5
Nb4 11. Be2 (11. Bc4 Bg4 {was played in a prior game.}) 11... Bc5 $6 {[%c_effect
c5;square;c5;type;Inaccuracy;persistent;true] \\\\\\"This move, which we thought
was very good, was also made quickly and firmly, after which Karpov became
anxious on realising that he had again not guessed the direction of our thorough
home analysis, and that he would have to carry out the main work at the board
against a well­-prepared opponent.\\\\\\" Can you find the refutation that Geller,
Karpov's second, found, but did NOT tell Karpov about $2} 12. O-O (12. Be3 $1
{[%c_effect e3;square;e3;type;GreatFind;persistent;true] \\\\\\"The sudden queen
check and its consequences were overlooked by me and my trainers $1 ...
Fortunately for me, I brought out my bishop without thinking and did not notice
the reply 12 .Be3. And yet if my opponent had played this or if I had avoided
11.Bc5, the match could have turned out differ­ently $1 But fate decreed
otherwise...\\\\\\"} 12... Bxe3 13. Qa4+ Bd7 14. Qxb4 $16) 12... O-O 13. Bf3 Bf5 14.
Bg5 {\\\\\\"Karpov simply develops his pieces, hoping that subsequently his extra
pawn will tell. Indeed, how can Black expect to create counterplay $2 He does not
have any lead in development, and, apart from the knight on a3, all the
opponent's pieces are quite reasonably placed. But Black's position contains
colossal dynamic resources, which are not easy to foresee. The main point is the
immediate prospect of the black pieces seizing all the dominant 'heights' in the
position, and White, strangely enough, has to act very energetically. On the
other hand, it is not easy to force yourself to hurry, when you have an extra
pawn and, at first sight, a solid position. It is possible that, for the entire
first half of the game, Karpov was quite unable to escape from this
psychological impasse.\\\\\\"} 14... Re8 $1 {[%c_effect
e8;square;e8;type;GreatFind;persistent;true]} 15. Qd2 $2 {[%c_effect
d2;square;d2;type;Mistake;persistent;true] What is Black's best move $2 How best
to restrict White $2} (15. Nc4 $1 {[%c_effect
c4;square;c4;type;GreatFind;persistent;true] Stockfish approves of this. The
knight on b4 proves to be awkwardly placed.} 15... Bd3 16. Ne3 Bxf1 17. Kxf1
Bxe3 18. Bxe3 a5 19. a3 Na6 20. Qd4 $14) 15... b5 $1 {[%c_effect
b5;square;b5;type;GreatFind;persistent;true]} 16. Rad1 Nd3 $1 {[%c_effect
d3;square;d3;type;GreatFind;persistent;true] \\\\\\"A cherished leap, which I first
carried out earlier on my pocket set. The knight could not have dreamed of a
better career $1 It is destined to play a brilliant role in the ultimate victory.
With their excellent ad­vanced outpost at d3, the black pieces are now ready for
a decisive invasion of the enemy position.\\\\\\"} 17. Nab1 ({\\\\\\"The key point of
the game. White must recognise the threatened danger of com­plete suffocation,
and urgently undertake something by deciding on some action ...\\\\\\"} 17. d6 $5
{[%c_effect d6;square;d6;type;Interesting;persistent;true]} 17... Qxd6 $1
{[%c_effect d6;square;d6;type;GreatFind;persistent;true] A fascinating exchange
sacrifice $1} 18. Bxa8 Rxa8 19. Bxf6 Qxf6 20. Nc2 Nxb2 $15 {That which occurred in
thegame was far worse for White. By retreat­ing his knight, Karpov was probably
hop­ing soon to evict the knight from d3 by Be2. But he is not in fact able to
do this.\\\\\\"}) 17... h6 18. Bh4 b4 $1 {[%c_effect
b4;square;b4;type;GreatFind;persistent;true] \\\\\\"Continuing his restriction
strategy, Black not only dislodges the knight on c3 from its good position, but
also deprives the knight on b1 of any future.\\\\\\"} 19. Na4 Bd6 {\\\\\\"Now Black's
achievements are clearly obvious. White's minor pieces are scattered about on
either wing and are quite unable to coordinate, the placing of his knights being
particularly depressing. But Black's main achievement is the wonderful Bf5 and
Nd3 duo, which completely paralyses all three of White's major pieces.\\\\\\"} 20.
Bg3 Rc8 21. b3 {\\\\\\"At first sight it seems that Black cannot prevent the
freeing manoeuvre Na4-b2, but now fresh forces join the battle.\\\\\\"} 21... g5 $3
{[%c_effect g5;square;g5;type;Brilliant;persistent;true] \\\\\\"The advance of this
modest pawn finally tips the scales in Black's favour. In a normal situation
such a pawn thrust, weakening the king's position, would be anti-­positional,
but here, on the contrary, it contains a profound positional point\\\\\\"} 22. Bxd6
(22. Nb2 $2 {[%c_effect b2;square;b2;type;Mistake;persistent;true]} 22... Nxb2 23.
Qxb2 g4 24. Be2 Rc2 $19) 22... Qxd6 23. g3 Nd7 24. Bg2 ({\\\\\\"Missing the last
opportunity to combat this outpost by 24.Nb2.\\\\\\"} 24. Nb2 {\\\\\\"Because of the
mass of tempting possibilities, it is not so easy for Black to choose the
correct course.\\\\\\"} 24... Qf6 $1 {[%c_effect
f6;square;f6;type;GreatFind;persistent;true]} 25. Nxd3 $2 {[%c_effect
d3;square;d3;type;Mistake;persistent;true]} (25. Nc4 $1 {[%c_effect
c4;square;c4;type;GreatFind;persistent;true]} 25... N7e5 26. Nxe5 Rxe5 $17) 25...
Bxd3 26. Qxd3 Ne5 $19) 24... Qf6 $1 {[%c_effect
f6;square;f6;type;GreatFind;persistent;true] \\\\\\"The b2-point is conclusively
under Black's control. In contrast to the examined variation with 24.Nb2 Qf6
25.Nc4, the knight at a4 does not in fact come into play. The fate of the game
is essentially decided as ­the white pieces are completely pinned down within
their own territory.\\\\\\"} 25. a3 a5 26. axb4 axb4 27. Qa2 Bg6 28. d6 g4
{\\\\\\"This position could be used as a striking example on the theme of
'domination' - with the board full of pieces, White is practically stalemated $1
It is not surprising that over his next six moves Karpov used up nearly all of
his remaining time before the control.\\\\\\"} 29. Qd2 Kg7 30. f3 Qxd6 31. fxg4
Qd4+ 32. Kh1 Nf6 33. Rf4 Ne4 34. Qxd3 Nf2+ 35. Rxf2 Bxd3 36. Rfd2 {\\\\\\"For an
instant, it may seem that White has managed to extricate himself, but the mirage
promptly disappears ...\\\\\\"} 36... Qe3 37. Rxd3 Rc1 38. Nb2 Qf2 $1 {[%c_effect
f2;square;f2;type;GreatFind;persistent;true]} 39. Nd2 Rxd1+ (39... Re2) 40. Nxd1
Re1+ {\\\\\\"Nikitin: 'It was painful to observe how the world champion, as White
in a middle­game with a 'sound' extra pawn and a solid pawn structure, was
unable to find a useful move. His scattered pieces froze on the back ranks as
though in a torpor. The effect of Kasparov's patent move 8...d5 $6 proved
stunning, and it effectively turned the course of the match.'\\\\\\"} 0-1`
  },
  {
    id: 5,
    white: "Donald Byrne", white_elo: null,
    black: "Robert James Fischer", black_elo: null,
    event: "Third Rosenwald Trophy", site: "New York, NY USA",
    date: "1956.10.17", round: "8", result: "0-1",
    eco: "D92",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Third Rosenwald Trophy"]
[Site "New York, NY USA"]
[Date "1956.10.17"]
[Round "8"]
[White "Donald Byrne"]
[Black "Robert James Fischer"]
[Result "0-1"]
[WhiteElo "?"]
[BlackElo "?"]
[ECO "D92"]
[Link "https://www.chess.com/analysis/collection/greatest-chess-games-of-all-time-y1bGzP5Y/3MHSCk2iGN/games?move=81"]

1. Nf3 {A flexible move, committing no central pawns. Good against younguns and
a favorite of the great Kramnik according to Khalifman.} 1... Nf6 {Equally
flexible in response.} 2. c4 {Establishing some central control and preparing
Nc3.} 2... g6 {Bobby was a lover of placing bishops on long diagonals,
especially in his youth $1} 3. Nc3 {Establishing control of the light-squares (d5
and e4) in the center.} 3... Bg7 {\\\\\\"Fianchettoing\\\\\\" the bishop and getting
ready to castle.} 4. d4 {Reverting to a d4-opening.} 4... O-O {Castling $1} 5. Bf4
{Avoiding the King's Indian Defense.} (5. e4 {The King's Indian Defense - an
opening destined to be associated with Bobby.}) 5... d5 {The Gruenfeld Defense -
This sharp opening allows White a big center and tries to attack it with active
pieces.} 6. Qb3 {Pressuring d5 and b7.} 6... dxc4 {Giving up a stake in the
center and seeking to gain time attacking the queen after it recaptures on c4.}
7. Qxc4 {recapturing.} 7... c6 {advancing the attacked c-pawn and controlling
d5. This is considered a bit passive today. ...Na6, preparing to play ...c5, is
preferred.} 8. e4 {Building the perfect pawn center.} 8... Nbd7 {Developing the
knight.} 9. Rd1 {Placing the rook in support of the center. This does not feel
like the most useful move though.} (9. Be2 {Why not get ready to castle $2}) 9...
Nb6 {Hitting the queen.} 10. Qc5 {Keeping an overly advanced posture $2 This move
is not a mistake yet, but it is risky and creates the tactical opportunity in
two moves..} (10. Qb3) 10... Bg4 {developing the final minor piece and
threatening to double the pawns.} 11. Bg5 $2 {[%c_effect
g5;square;g5;type;Mistake;persistent;true] One too many dubious moves. This
accomplishes nothing AND it places the bishop on a vulnerable square after
Bobby's next brilliant move $1} (11. Be2 {Castle. Simple.}) 11... Na4 $3
{[%c_effect a4;square;a4;type;Brilliant;persistent;true] Fischer strikes $1 This
move undermines the knight on c3 which holds e4. \\\\\\"A brilliant most surprising
stroke ... A murmur went through the tournament room after this move, and the
kibitzers thronged to Fischer's table as a fish to a hole in the ice.\\\\\\" - Hans
Kmoch in Chess Review from 1956} 12. Qa3 {Retreating the queen while trying to
keep an eye on e7.} (12. Nxa4 {accepting the sacrificed knight.} 12... Nxe4 {The
knight threatens both c5 and g5. Note also that ...Qa5+ can also be possible.}
13. Bxe7 {Threatening the black queen instead of retreating.} (13. Qxe7 Qa5+ $19
{attacks too many White pieces.}) 13... Re8 14. Bxd8 Nxc5+ 15. Be2 Bxf3 16. gxf3
Nxa4 {Black is about to win a pawn and has a much better structure and better
pieces.}) 12... Nxc3 {Eliminating the defender of the e4-square.} 13. bxc3
{Recapturing.} 13... Nxe4 $1 {[%c_effect
e4;square;e4;type;GreatFind;persistent;true] Fischer gives up e7, but he rips
open the center.} 14. Bxe7 {Faced with total collapse in the center, Byrne tries
to win material for his trouble by forking the queen and rook.} 14... Qb6
{Advancing the threatened queen to create more threats.} 15. Bc4 {Finally
developing the last piece and hoping to castle.} (15. Bxf8 {This doesn't work
because the bishop on g7 now gets to swing around to attack the queen and create
a pin tactic.} 15... Bxf8 16. Qb3 Nxc3 $1 {[%c_effect
c3;square;c3;type;GreatFind;persistent;true]} 17. Qxc3 Bb4 $19) 15... Nxc3 $1
{[%c_effect c3;square;c3;type;GreatFind;persistent;true] Clearing the e-file so
that ...Re8 might win the bishop on e7.} 16. Bc5 {Pulling the bishop off the
dangerous e-file and attacking the queen. Has Fischer missed this $2 Will he lose
the c3-knight after retreating the queen $2} (16. Qxc3 Rae8 $19 {The pinned bishop
cannot be saved.}) 16... Rfe8+ {Fischer first activates the rook and threatens
the white king.} 17. Kf1 {The only logical way out of check. Fischer now has a
queen and knight hanging. What is to be done $2} 17... Be6 $3 {[%c_effect
e6;square;e6;type;Brilliant;persistent;true] The second brilliant move $1 Fischer
leaves his queen hanging and threatens the bishop on c4 $1 All the tactics work
perfectly for Fischer.} 18. Bxb6 {Byrne accepts the queen.} (18. Bxe6 {This move
allows the famous \\\\\\"smothered mate\\\\\\" pattern.} 18... Qb5+ 19. Kg1 Ne2+ 20.
Kf1 Ng3+ 21. Kg1 Qf1+ $1 {[%c_effect f1;square;f1;type;GreatFind;persistent;true]}
22. Rxf1 Ne2#) (18. Qxc3 Qxc5 $1 $19 {[%c_effect
c5;square;c5;type;GreatFind;persistent;true] A nice pin to pick off the
bishop.}) 18... Bxc4+ {Fischer snags the bishop with check, but more
importantly, he sets up a \\\\\\"windmill,\\\\\\" a repeating sequence of checks that
wins material.} 19. Kg1 {forced} 19... Ne2+ {Dragging the king back into the
line of fire.} 20. Kf1 {forced} 20... Nxd4+ {Snagging a pawn.} 21. Kg1 {forced}
21... Ne2+ {Dragging the king back again.} 22. Kf1 {forced} 22... Nc3+
{Attacking the rook on d1.} 23. Kg1 {forced} 23... axb6 $1 {[%c_effect
b6;square;b6;type;GreatFind;persistent;true] Fischer picks up the bishop AND
attacks the queen and the rook on d1.} 24. Qb4 {Trying to save the game by
attacking the bishop on b5.} (24. Qc1 {Trying to defend the d1-rook.} 24... Ne2+
$19 {A nasty royal fork.}) 24... Ra4 $1 {[%c_effect
a4;square;a4;type;GreatFind;persistent;true] A nice move that threatens the
queen and defends the valuable bishop on a4.} 25. Qxb6 {Saving the queen and
picking up a pawn.} 25... Nxd1 {Fischer has a rook, two bishops, and a pawn for
the queen AND the rook on h1 is completely out of play. The game is over at this
point, and I'll save the remaining explanations for the video :)} 26. h3 Rxa2
27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 $1
{[%c_effect b5;square;b5;type;GreatFind;persistent;true]} 33. h4 h5 $1 {[%c_effect
h5;square;h5;type;GreatFind;persistent;true]} 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1
Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2# 0-1`
  },
  {
    id: 6,
    white: "Vassily Ivanchuk", white_elo: null,
    black: "Artur Yusupov", black_elo: null,
    event: "Candidates Match", site: "Brussels BEL",
    date: "1991.08.24", round: "9", result: "0-1",
    eco: "E67",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Candidates Match"]
[Site "Brussels BEL"]
[Date "1991.08.24"]
[Round "9"]
[White "Vassily Ivanchuk"]
[Black "Artur Yusupov"]
[Result "0-1"]
[ECO "E67"]
[Link "https://www.chess.com/analysis/collection/greatest-chess-games-of-all-time-y1bGzP5Y/4VKJu257kr/games?move=77"]

1. c4 e5 2. g3 d6 3. Bg2 g6 4. d4 Nd7 5. Nc3 Bg7 6. Nf3 Ngf6 7. O-O O-O 8. Qc2
Re8 9. Rd1 c6 10. b3 Qe7 11. Ba3 (11. e4 {This was White's last chance to revert
to a more typical KID structure.}) 11... e4 $5 {[%c_effect
e4;square;e4;type;Interesting;persistent;true] Very committal. In Caeser's
words, \\\\\\"the die is cast.\\\\\\"} 12. Ng5 e3 13. f4 $6 {[%c_effect
f4;square;f4;type;Inaccuracy;persistent;true] Objectively, this is weaker than
f3 which keeps more central control.} (13. f3 $1 {[%c_effect
f3;square;f3;type;GreatFind;persistent;true] Later, White will regret the loss
of control over e4 and g4.}) 13... Nf8 14. b4 Bf5 15. Qb3 h6 16. Nf3 Ng4 17. b5
g5 {Both players are breaking through on their respective wings, White on the
queenside, and Black on the kingside.} 18. bxc6 bxc6 19. Ne5 gxf4 20. Nxc6 Qg5
21. Bxd6 Ng6 22. Nd5 Qh5 23. h4 Nxh4 $2 {[%c_effect
h4;square;h4;type;Mistake;persistent;true]} (23... fxg3 $1 {[%c_effect
g3;square;g3;type;GreatFind;persistent;true] Objectively, this was the best way
to maintain the balance. A draw by perpetual is likely.}) 24. gxh4 Qxh4 25.
Nde7+ $2 {[%c_effect e7;square;e7;type;Mistake;persistent;true] Wrong knight.}
(25. Nce7+ $1 {[%c_effect e7;square;e7;type;GreatFind;persistent;true] It's better
to leave the knight on d5 to attack f4.} 25... Kh8 26. Nxf5 Qh2+ 27. Kf1 Be5 $5
{[%c_effect e5;square;e5;type;Interesting;persistent;true] A brilliant try.
Dvoretsky theorized that this move scared Ivanchuk and is why he kept the knight
on c6. The following line wins through.} 28. dxe5 Rg8 29. Ndxe3 fxe3 30. e6 $1
{[%c_effect e6;square;e6;type;GreatFind;persistent;true] A hard move to see, but
with h2 controlled, Black is just busted.}) 25... Kh8 26. Nxf5 Qh2+ 27. Kf1 Re6 $1
{[%c_effect e6;square;e6;type;GreatFind;persistent;true] Onward to g6 $1} 28. Qb7
(28. Nce7 Rg8 $1 {[%c_effect g8;square;g8;type;GreatFind;persistent;true]} 29.
Nxg8 Rg6 $19) 28... Rg6 $3 {[%c_effect
g6;square;g6;type;Brilliant;persistent;true] White can have the rook with check $1
The threat of ...Qh1+ $3 wins $1} 29. Qxa8+ Kh7 30. Qg8+ $5 {[%c_effect
g8;square;g8;type;Interesting;persistent;true] Only this move allows White to
eliminate the deadly rook on g6 and stop the threat of ...Qh1+ $3} (30. Nce7 $2
{[%c_effect e7;square;e7;type;Mistake;persistent;true]} 30... Qh1+ $3 {[%c_effect
h1;square;h1;type;Brilliant;persistent;true] The critical point in many, many
variations.} 31. Bxh1 Nh2+ 32. Ke1 Rg1#) 30... Kxg8 31. Nce7+ Kh7 32. Nxg6 fxg6
33. Nxg7 Nf2 $3 {[%c_effect f2;square;f2;type;Brilliant;persistent;true] Another
brilliant checkmating mechanism. Now the idea is simply ...Nh3 $1 and mate on f2
or g1.} 34. Bxf4 Qxf4 35. Ne6 Qh2 36. Rdb1 Nh3 37. Rb7+ Kh8 38. Rb8+ Qxb8 39.
Bxh3 Qg3 $1 {[%c_effect g3;square;g3;type;GreatFind;persistent;true] It's mate
next move.} 0-1`
  },
  {
    id: 7,
    white: "?", white_elo: null,
    black: "?", black_elo: null,
    event: "Interpolis 15th", site: "Tilburg NED",
    date: "1991.10.21", round: "4", result: "1-0",
    eco: "B04",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Interpolis 15th"]
[Site "Tilburg NED"]
[Date "1991.10.21"]
[Round "4"]
[White "?"]
[Black "?"]
[Result "1-0"]
[ECO "B04"]
[PlyCount "67"]
[Link "https://www.chess.com/analysis/collection/greatest-chess-games-of-all-time-y1bGzP5Y/3Potyj2RFc/games?move=66"]

1. e4 Nf6 2. e5 Nd5 3. d4 d6 4. Nf3 (4. c4 {Continuing to sieze space is perhaps
a bit more ambitious AND a bit riskier.}) 4... g6 $6 {[%c_effect
g6;square;g6;type;Inaccuracy;persistent;true] The Alburt variation isn't too
popular today. I think this game is part of the reason.} (4... dxe5 {These days,
this move is considered much more reliable.}) 5. Bc4 Nb6 6. Bb3 Bg7 (6... N8d7 $2
{[%c_effect d7;square;d7;type;Mistake;persistent;true] Don't forget about f7
tactics $1} 7. Ng5 $1 {[%c_effect g5;square;g5;type;GreatFind;persistent;true]} 7...
e6 8. Bxe6 $1 {[%c_effect e6;square;e6;type;GreatFind;persistent;true]} 8... fxe6
9. Nxe6 Qe7 10. Nxc7+ $18) 7. Qe2 Nc6 8. O-O O-O (8... Bg4 $2 {[%c_effect
g4;square;g4;type;Mistake;persistent;true] Don't forget about f7-tactics take
2 $1} 9. Bxf7+ $1 {[%c_effect f7;square;f7;type;GreatFind;persistent;true]} 9...
Kxf7 10. Ng5+ $18) 9. h3 a5 10. a4 dxe5 11. dxe5 Nd4 12. Nxd4 Qxd4 13. Re1 e6 $6
{[%c_effect e6;square;e6;type;Inaccuracy;persistent;true] I HATE having an e6,
f7, g6, and h7 structure when my opponent has a pawn on e5. This game is a good
example of the issues.} (13... Bd7 {This makes more sense to me, avoiding
conceding further weaknesses on f6.}) 14. Nd2 Nd5 15. Nf3 Qc5 16. Qe4 $1
{[%c_effect e4;square;e4;type;GreatFind;persistent;true] A great move - heading
to h4 to lead the kingside attack.} 16... Qb4 {Trying to trade queens.} 17. Bc4
Nb6 18. b3 $1 {[%c_effect b3;square;b3;type;GreatFind;persistent;true]} 18... Nxc4
19. bxc4 {White's pawn structure is awful, but it doesn't matter. White has
closed off Black's counterplay long enough to start the attack.} 19... Re8
(19... Rd8 {Of course, Black wants to try to challenge the open file, but the
rook is forced to a bad d7-square.} 20. Bg5 Rd7 21. Bf6 $16) 20. Rd1 $1 {[%c_effect
d1;square;d1;type;GreatFind;persistent;true] Siezing the open file.} 20... Qc5
(20... h6 $1 {[%c_effect h6;square;h6;type;GreatFind;persistent;true] This move
was probably the last viable defense for Timman. It's still dangerous, but White
is denied some access to those soft kingside squares.}) 21. Qh4 b6 22. Be3 $1
{[%c_effect e3;square;e3;type;GreatFind;persistent;true] Excellent inclusion.
This move pushes the queen to a worse square before playing Bh6.} (22. Bh6 $6
{[%c_effect h6;square;h6;type;Inaccuracy;persistent;true]} 22... Bxh6 23. Qxh6
Qf8 $1 $14 {[%c_effect f8;square;f8;type;GreatFind;persistent;true] and Timman would
defend and be only a little bit worse.}) 22... Qc6 23. Bh6 Bh8 {Keeping the
dark-square defender.} 24. Rd8 Bb7 25. Rad1 Bg7 {A clever move that threatens to
trade on h6 and win d8.} 26. R8d7 {This threatens to capture on g7 and mate with
Qf6+ OR Rxf7+ $1} 26... Rf8 {Forced to defend f7.} (26... Qxa4 $2 {[%c_effect
a4;square;a4;type;Mistake;persistent;true]} 27. Bxg7 Kxg7 28. Qf6+ $1 $18
{[%c_effect f6;square;f6;type;GreatFind;persistent;true]} (28. Rxf7+ $1 $18
{[%c_effect f7;square;f7;type;GreatFind;persistent;true]})) 27. Bxg7 Kxg7 28.
R1d4 Rae8 29. Qf6+ Kg8 30. h4 h5 {How can White conclude the game $2 White's
position is GORGEOUS, but where is the mate $2} 31. Kh2 $3 {[%c_effect
h2;square;h2;type;Brilliant;persistent;true] Brilliant. One more piece is
needed, and the king is it. Timman is completely helpless.} 31... Rc8 (31... Bc8
{This is the last, best try, but since mate on g2 is no longer an issue, the
knight can simply hop in.} 32. Ng5 $1 {[%c_effect
g5;square;g5;type;GreatFind;persistent;true]} 32... Bxd7 33. Rf4 $1 {[%c_effect
f4;square;f4;type;GreatFind;persistent;true]} 33... Qxa4 34. Nxf7 Rxf7 35. Qxf7+
Kh8 36. Qxg6 $18) 32. Kg3 $3 {[%c_effect
g3;square;g3;type;Brilliant;persistent;true]} 32... Rce8 33. Kf4 $3 {[%c_effect
f4;square;f4;type;Brilliant;persistent;true]} 33... Bc8 34. Kg5 $3 {[%c_effect
g5;square;g5;type;Brilliant;persistent;true] GG YO. What a concept.} (34. Kg5
Kh7 {to prevent the king's invasion.} 35. Qxg6+ $1 {[%c_effect
g6;square;g6;type;GreatFind;persistent;true]} 35... Kh8 36. Qh6+ Kg8 37. Kf6
{and mate next move.}) (34. Kg5 Bxd7 35. Kh6 Qc5 36. Qg7#) 1-0`
  },
  {
    id: 8,
    white: "Bai, Jinshi", white_elo: 2585,
    black: "Ding, Liren", black_elo: 2759,
    event: "Chinese Chess League", site: "China",
    date: "2017.11.04", round: "18.1", result: "0-1",
    eco: null,
    ply_count: null,
    movetext: null,
    pgn: `[Event "Chinese Chess League"]
[Site "China"]
[Date "2017.11.04"]
[Round "18.1"]
[White "Bai, Jinshi"]
[Black "Ding, Liren"]
[Result "0-1"]
[WhiteElo "2585"]
[BlackElo "2759"]
[Link "https://www.chess.com/analysis/collection/greatest-chess-games-of-all-time-y1bGzP5Y/tgN3L625t/games?move=63"]

1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. Nf3 O-O 5. Bg5 c5 6. e3 cxd4 7. Qxd4 Nc6 8. Qd3 $146 h6 9. Bh4 d5 10. Rd1 g5 11. Bg3 Ne4 12. Nd2 Nc5 13. Qc2 d4 14. Nf3 e5 15. Nxe5
(15. Bxe5 $5 {[%c_effect e5;square;e5;type;Interesting;persistent;true]} 15...
Nxe5 16. Nxe5 Qf6 17. exd4 Bf5 {Ding still has lots of compensation, but maybe
this was a better path for Bai Jinshi $2 Hard to say. He is faced with tough
decisions no matter what.}) 15... dxc3 $5 {[%c_effect
c3;square;c3;type;Interesting;persistent;true] A very tempting queen sacrifice $1}
16. Rxd8 cxb2+ 17. Ke2 $2 {[%c_effect e2;square;e2;type;Mistake;persistent;true]}
(17. Rd2 $1 {[%c_effect d2;square;d2;type;GreatFind;persistent;true] It is hard to
walk into a pin and leave b2 alive just a bit longer, but this was the critical
move.} 17... Rd8 18. Nf3 Bg4 19. Qxb2 Bxf3 (19... Ne4 20. Qxb4 $1 {[%c_effect
b4;square;b4;type;GreatFind;persistent;true]} 20... Nxb4 21. Rb2 Nc3 $1
{[%c_effect c3;square;c3;type;GreatFind;persistent;true]} 22. Be2 Nd3+ 23. Bxd3
Rxd3 24. O-O $14) 20. gxf3 Rxd2 21. Qxd2 Bxd2+ 22. Kxd2 Rd8+ $14) 17... Rxd8 18.
Qxb2 Na4 $1 {[%c_effect a4;square;a4;type;GreatFind;persistent;true]} 19. Qc2 Nc3+
20. Kf3 (20. Ke1 $2 {[%c_effect e1;square;e1;type;Mistake;persistent;true]} 20...
Nb5+ 21. Ke2 Nbd4+ {Forks and wins the queen.}) 20... Rd4 $3 {[%c_effect
d4;square;d4;type;Brilliant;persistent;true] What a \\\\\\"visual\\\\\\" quiet move.
The rook cannot be captured due to the royal fork, but now ...g4 mate is
threatened, and the white king is sealed in.} (20... h5 21. h3 Rd4 $3 {[%c_effect
d4;square;d4;type;Brilliant;persistent;true] transposes.}) 21. h3 h5 22. Bh2 {A
most unhappy cleric.} 22... g4+ 23. Kg3 (23. hxg4 hxg4+ 24. Kg3 Rd2 $3 $19
{[%c_effect d2;square;d2;type;Brilliant;persistent;true]}) 23... Rd2 $3
{[%c_effect d2;square;d2;type;Brilliant;persistent;true] Yet again, the fork
appears. The point here is to attack f2 in critical lines.} (23... Ne4+ $2
{[%c_effect e4;square;e4;type;Mistake;persistent;true]} 24. Kf4 Rd2 25. Qxe4 $1 $14
{[%c_effect e4;square;e4;type;GreatFind;persistent;true] This line is why
23...Rd2 $3 was the right move order.}) 24. Qb3 Ne4+ 25. Kh4 {The king is soon
hunted down now, but Ding consistently finds the strongest paths.} (25. Kf4
Rxf2+ 26. Kxe4 Bf5+ 27. Kd5 Rd8+ 28. Nd7 Rxd7+ 29. Bd6 Rxd6#) 25... Be7+ 26.
Kxh5 Kg7 $1 {[%c_effect g7;square;g7;type;GreatFind;persistent;true]} 27. Bf4 Bf5
28. Bh6+ Kh7 29. Qxb7 Rxf2 30. Bg5 Rh8 $1 {[%c_effect
h8;square;h8;type;GreatFind;persistent;true]} 31. Nxf7 Bg6+ 32. Kxg4 Ne5+ $1
{[%c_effect e5;square;e5;type;GreatFind;persistent;true]} (32... Ne5+ 33. Nxe5
Bf5+ 34. Kh5 Kg7+ 35. Bh6+ Rxh6#) 0-1`
  },
  {
    id: 9,
    white: "Georg Rotlewi", white_elo: null,
    black: "Akiba Rubinstein", black_elo: null,
    event: "Lodz", site: "Lodz RUE",
    date: "1907.12.26", round: "6", result: "0-1",
    eco: "D32",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Lodz"]
[Site "Lodz RUE"]
[Date "1907.12.26"]
[Round "6"]
[White "Georg Rotlewi"]
[Black "Akiba Rubinstein"]
[Result "0-1"]
[WhiteElo "?"]
[BlackElo "?"]
[ECO "D32"]
[Link "https://www.chess.com/analysis/collection/greatest-chess-games-of-all-time-y1bGzP5Y/HaaZAR4Wi/games?move=49"]

1. d4 {1.d4 was really becoming popular in the early 1900s.} 1... d5 {Rubinstein
responds in kind.} 2. Nf3 {This is a popular choice for those who want to be
flexible and see what Black does next.} 2... e6 {Another good solid move that
prepares to develop the kingside.} 3. e3 $6 {[%c_effect
e3;square;e3;type;Inaccuracy;persistent;true] Slightly suspect. The Bc1 could
have developed more actively without this.} 3... c5 {Aggressively pressuring the
white center.} 4. c4 {Rotlewi finally decides he must commit the c-pawn.} 4...
Nc6 {Developing and again pressuring the center.} 5. Nc3 {More good
development.} 5... Nf6 {This symmetrical position is actually quite interesting.
Exchanges in the middle will soon open things up.} 6. dxc5 $6 {[%c_effect
c5;square;c5;type;Inaccuracy;persistent;true] This is a subtle mistake common to
newer players. The early capture allows the bishop on f8 to develop and
recapture in one move instead of two moves.} 6... Bxc5 {regaining the pawn and a
nice post.} 7. a3 {This is a common idea to expand with b4.} 7... a6 {This move
has the same purpose as a3, supporting b5.} 8. b4 {pushing the bishop back.}
8... Bd6 {...Ba7 is also possible, but Rubinstein decides on the more central
placement.} 9. Bb2 {White's bishop reaches the long diagonal. Although, White
has made a few sub-optimal moves, nothing is wrong with the White's position
yet.} 9... O-O {Castling in a timely manner. Too often, newer players delay
castling too long. Castling allows Rubinstein's pieces to develop fluidly over
the coming moves, and it is flexible, allowing him to see what Rotlewi will do
next.} 10. Qd2 $6 {[%c_effect d2;square;d2;type;Inaccuracy;persistent;true] Is
the queen better here than on d1 $2 If not, this can't be right $1} (10. cxd5 exd5
11. Be2 $12 (11. Nxd5 $4 {[%c_effect d5;square;d5;type;Blunder;persistent;true]}
11... Nxd5 12. Qxd5 Bxb4+ $19)) 10... Qe7 $5 {[%c_effect
e7;square;e7;type;Interesting;persistent;true] This is an ambitious move that
offers a pawn sacrifice.} 11. Bd3 $2 {[%c_effect
d3;square;d3;type;Mistake;persistent;true] Without taking the sacrificed pawn,
Rotlewi will just be worse.} (11. cxd5 $1 {[%c_effect
d5;square;d5;type;GreatFind;persistent;true]} 11... exd5 12. Nxd5 (12. Be2 $15)
12... Nxd5 13. Qxd5 $13 {It's scary to take this pawn, but it's the only way to
challenge Rubinstein.}) 11... dxc4 {This is better timed then 6.dxc5 $6 because
Rotlewi has finally moved his f1-bishop and must immediately lose time by moving
it again.} 12. Bxc4 {recapturing} 12... b5 {pushing the bishop away preparing to
occupy the long diagonal.} 13. Bd3 {This is probably the best post, but the
bishop is vulnerable on the open d-file.} 13... Rd8 {Rubinstein immediately
senses the possibility of tactics on the d-file and places his rook there.} 14.
Qe2 {The queen didn't have to move yet, but the pressure on the d-file meant she
would need to move soon anyway so this is fine.} (14. O-O Bb7 15. Qe2 {just
changes the move order.}) 14... Bb7 {This bishop will be great here $1} 15. O-O
{Rotlewi finally castles, but it doesn't solve all of his problems.} 15... Ne5 $1
{[%c_effect e5;square;e5;type;GreatFind;persistent;true] Well-timed $1 Now after
the exchange, on e5, both of Rubinstein's bishops spring to life.} 16. Nxe5
{This is forced due to the attacks on f3 and d3.} 16... Bxe5 {Rubinstein's
bishops are amazing here, AND he has an immediate threat of ...Bxh2+ $1 and
...Qd6+ $1 which wins a pawn after capturing on d3.} 17. f4 $2 {[%c_effect
f4;square;f4;type;Mistake;persistent;true] This stops the threat of ...Bxh2+ $1,
but it's just too weakening. The weakness of the dark squares, g4, and even the
idea of ...Rd2 $3 recalls Larsen vs. Spassky, 1970.} (17. Rfd1 $1 {[%c_effect
d1;square;d1;type;GreatFind;persistent;true]} 17... Rac8 18. Rac1 $17) 17... Bc7
{The bishop will be happy on b6.} 18. e4 {Probably this move is played because
Rotlewi missed Rubinstein's 20th move.} 18... Rac8 {A great move $1 Rubinstein
finds the perfect time to include his last undeveloped piece. Perhaps he already
anticipated his brilliant 22nd move here $2} 19. e5 $2 {[%c_effect
e5;square;e5;type;Mistake;persistent;true] There weren't any good moves at this
point, but this loses immediately.} 19... Bb6+ {Seizing the weak 17-g1
diagonal.} 20. Kh1 {forced.} 20... Ng4 $1 {[%c_effect
g4;square;g4;type;GreatFind;persistent;true] It's worth taking a moment to just
appreciate Rubinstein's active pieces here. They are all wonderfully placed and
coordinated. This move threatens, among other things, ...Qh4, and the knight is
taboo.} (20... Nd5 $2 {[%c_effect d5;square;d5;type;Mistake;persistent;true] Much
too slow.} 21. Ne4 $17) 21. Be4 {Rotlewi tries to combat the pressure on the long
diagonal, and he also moves the loose bishop on d3.} (21. Qxg4 Rxd3 {attacking
c3.} 22. Rac1 Rd2 $19 {now attacking g2 and b2 and winning.}) (21. Bxh7+ {This
gains a pawn compared to the last line, but it loses similarly.} 21... Kxh7 22.
Qxg4 Rd2 $19 {Also attacking g2 and b2.}) (21. h3 {There are few ways to defeat
this. Here is the strongest according to the engine.} 21... Rxd3 $1 {[%c_effect
d3;square;d3;type;GreatFind;persistent;true]} 22. Qxd3 Qh4 {White's queen on d3
is the only piece able to stop ...Qxh3#, but it cannot stay on d3.} 23. Rad1
Rd8 $1 {[%c_effect d8;square;d8;type;GreatFind;persistent;true] The queen cannot
defend h3 so Black wins.}) 21... Qh4 {Threatening ...Qxh2#} (21... Nxh2 $1
{[%c_effect h2;square;h2;type;GreatFind;persistent;true] Also a win, just not
nearly as gorgeous.} 22. Bxb7 Nxf1 23. Bxc8 Qh4#) 22. g3 {Now the Qe2 defends
h2, but the opening of the long diagonal forbodes doom. It takes brilliance to
conclude the game right away though.} (22. h3 {The only sensible alternative way
to defend mate.} 22... Rxc3 $1 {[%c_effect
c3;square;c3;type;GreatFind;persistent;true]} 23. Bxc3 (23. Bxb7 Rxh3+ $1
{[%c_effect h3;square;h3;type;GreatFind;persistent;true]} 24. gxh3 Qxh3+ 25. Qh2
Qxh2#) 23... Bxe4 24. Qxg4 (24. Qxe4 Qg3 $1 {[%c_effect
g3;square;g3;type;GreatFind;persistent;true]} 25. hxg4 Qh4# {A classic mating
idea.}) 24... Qxg4 25. hxg4 Rd3 $1 {[%c_effect
d3;square;d3;type;GreatFind;persistent;true] This double attack is tough to
see.} 26. Be1 Rh3#) 22... Rxc3 $3 {[%c_effect
c3;square;c3;type;Brilliant;persistent;true] Amazing $1 Rubinstein sacrifices his
queen and rook. We'll look at each capture.} 23. gxh4 {Taking the queen is the
most challenging. One wonders if Rotlewi saw the next move coming $2} (23. Bxc3
Bxe4+ 24. Qxe4 Qxh2#) (23. Bxb7 Rxg3 {Now ...Rh3 and ...Rxh2+ $1 will crush.})
23... Rd2 $3 {[%c_effect d2;square;d2;type;Brilliant;persistent;true] An
absolutely magnificent move $1 Rubinstein follows up his queen sacrifice with a
quiet move (not a check or a capture) that hangs a rook $1 The whole point is to
crash through on the long diagonal and Rotlewi cannot defend.} 24. Qxd2
{Accepting the rook seems the most challenging.} (24. Qxg4 Bxe4+ 25. Rf3 Rxf3
$19) (24. Bxc3 Bxe4+ 25. Rf3 Bxf3+ 26. Qxf3 Rxh2#) 24... Bxe4+ 25. Qg2 Rh3 $1
{[%c_effect h3;square;h3;type;GreatFind;persistent;true] With this final move
(also a quite move), Rubinstein threatens ...Rh2# Rotlewi is out of defense and
so resigned in this immortal position.} 0-1`
  },
  {
    id: 10,
    white: "Efim Geller", white_elo: null,
    black: "Max Euwe", black_elo: null,
    event: "Zurich Candidates", site: "Zurich SUI",
    date: "1953.08.31", round: "2", result: "0-1",
    eco: "E26",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Zurich Candidates"]
[Site "Zurich SUI"]
[Date "1953.08.31"]
[Round "2"]
[White "Efim Geller"]
[Black "Max Euwe"]
[Result "0-1"]
[WhiteElo "?"]
[BlackElo "?"]
[ECO "E26"]
[Link "https://www.chess.com/analysis/collection/greatest-chess-games-of-all-time-y1bGzP5Y/MUdfo7BMx/games?move=51"]

{\\\\\\"One of the tournament's best games and the recipient of a brilliancy prize.
White initiated a powerful attack on the king by sacrificing his c4-pawn. This
attack gave Geller every hope of success, provided Black held to the traditional
sort of queen-side counterattack. Euwe, however, carried out two remarkable
ideas: 1) utilizing his queenside lines of communication for an attack on the
king's wing, and 2) decoying the enemy forces deep into his own rear area, with
the aim of cutting them off from the defense of their king. It's a most
diverting spectacle to watch White's pieces in their frontal assault on the
king, burrowing further and further, while Black is transferring his forces by
roundabout routes.\\\\\\"} 1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3 c5 5. a3 $6
{[%c_effect a3;square;a3;type;Inaccuracy;persistent;true] This move proves
inaccurate and quite weak. Geller loses a crucial tempo by playing this move
unprovoked.} 5... Bxc3+ 6. bxc3 b6 7. Bd3 Bb7 8. f3 {\\\\\\"A small but significant
opening subtlety: Black substitutes ...b6 and ...Bb7 for the more usual ...Nc6
and ...0-0; and White, who failed to notice in time to react correctly with
7.Ne2, must now spend an extra tempo preparing e3-e4. Such details should never
be underestimated, but neither should they be overvalued. Occasionally it is
said that White's advantage consists of his right to the first move: should he
lose a tempo, then, the advantage must necessarily pass to Black. Practically
speaking, however, the advantage of playing White boils down to greater freedom
in selecting a plan to suit one's tastes; once the game has settled into its
ordained track, the loss of a single tempo is not always so serious.\\\\\\"} 8...
Nc6 9. Ne2 O-O 10. O-O Na5 11. e4 Ne8 {\\\\\\"Black retreats his knight to
forestall the pin with 12.Bg5, and to be able to answer f3-f4 with ...f7-f5,
blockading the king's wing. White therefore secures f5 before advancing his
f-pawn. It would be senseless to defend the pawn at c4 now: that pawn was doomed
by White's fifth move.\\\\\\"} 12. Ng3 (12. dxc5 {The engine recommends this
alternative, but Black has interesting choices such as...} 12... Qc7 $5
{[%c_effect c7;square;c7;type;Interesting;persistent;true]} 13. cxb6 axb6 $13
{Black gets good compensation for the pawns due to the excellent structure.})
(12. f4 $2 {[%c_effect f4;square;f4;type;Mistake;persistent;true]} 12... f5 $1 $15
{[%c_effect f5;square;f5;type;GreatFind;persistent;true] Is Black's positional
idea. It completely stops White in his tracks.}) 12... cxd4 13. cxd4 Rc8 14. f4
(14. c5 $5 {[%c_effect c5;square;c5;type;Interesting;persistent;true] This was
the engine's final suggested alternative other than the commital path chosen in
the game.} 14... bxc5 15. dxc5 Rxc5 16. Bd2 Nc6 17. Rb1 $13 {White has excellent
compensation for the pawn here due to the bishop pair, development, and rapid
queenside pressure.}) 14... Nxc4 15. f5 f6 16. Rf4 $6 {[%c_effect
f4;square;f4;type;Inaccuracy;persistent;true] \\\\\\"White's attack has become
rather threatening. Black's previous move was necessary to forestall White's
intention to push his pawn to f6, and then, after 16...Nxf6, to pin the knight
after all, piling up on the king with the combined firepower of queen, rooks and
three minor pieces. Even now, White needs only two moves to transfer his rook
and queen to the h-file, and then it might appear that nothing could save the
black king. ... Euwe, however, is not easily flustered. Remember that in his
lifetime he played more than seventy games with Alekhine, the most feared
attacking player of our time.\\\\\\"} 16... b5 $3 {[%c_effect
b5;square;b5;type;Brilliant;persistent;true] \\\\\\"The beginning of a remarkable
plan. Clearly, any defensive maneuvers on the kingside are fore-doomed, since
they involve pieces with an inconsequential radius of activity, but Black does
have another defensive resource, and that is counterattack. The bishop at b7,
the rook at c8, and the knight at c4 are all well-based; all that remains is to
bring up the queen. The basis for this counterattack is Black's preponderance on
the central squares. With 16...b5, Black reinforces the knight on c4 and opens a
path for the queen to b6. Still, one cannot help feeling that his operations are
too little and too late.\\\\\\"} 17. Rh4 Qb6 {\\\\\\"Pinning White's queen to the
defense of the d-pawn, Black prevents the intended 18.Qh5. After 17.Qh5 Qb6
18.Ne2 Ne5, we get the echo-variation, with the white rook unable to get to
h4.\\\\\\"} 18. e5 {defending d4 with the rook on h4 AND preparing an attack on h7
by opening the diagonal.} 18... Nxe5 19. fxe6 Nxd3 20. Qxd3 Qxe6 21. Qxh7+
{\\\\\\"Thus, White has broken through after all, at an insignificant cost. Once
again, Black's position appears critical.\\\\\\"} 21... Kf7 22. Bh6 Rh8 $3
{[%c_effect h8;square;h8;type;Brilliant;persistent;true] \\\\\\"If Black's 16th
move was the beginning of his strategic plan of counterattack, then this rook
sacrifice is its fundamental tactical stroke, with the aim of drawing the white
queen still further afield and decoying it away from the c2-square, mean-while
attacking the king.\\\\\\"} (22... Qd5 $4 {[%c_effect
d5;square;d5;type;Blunder;persistent;true]} 23. Re4 $18) 23. Qxh8 Rc2
{\\\\\\"Threatening mate in a few moves: 24...Rg2+, 25...Qc4+, etc. Detailed
analysis, requiring more than just one week's time, showed that White could have
saved himself from mate by finding a few 'only' and very difficult moves. ...
The analysts also showed that the ...Rf8-h8 idea was actually a little
premature, and that ...Rc4 first was better. However, those who love chess will
find it difficult to agree with this. Moves like 22...Rh8 are not
forgotten.\\\\\\"} 24. Rc1 (24. d5 $3 {[%c_effect
d5;square;d5;type;Brilliant;persistent;true] An incredible defense for White
that would have JUST disrupted Black's attack enough to hold the game.} 24...
Bxd5 (24... Qxd5 $2 {[%c_effect d5;square;d5;type;Mistake;persistent;true]} 25.
Re4 $18) 25. Rd1 $1 {[%c_effect d1;square;d1;type;GreatFind;persistent;true]} 25...
Rxg2+ 26. Kf1 Ra2 (26... gxh6 27. Qxh6 Bf3) 27. Bd2 $3 {[%c_effect
d2;square;d2;type;Brilliant;persistent;true]} 27... Bc4+ 28. Rxc4 Qxc4+ 29. Ke1 $12 {One could analyze much more in this variation, but it was certainly White's
last chance and seems sufficient to hold.}) 24... Rxg2+ 25. Kf1 Qb3 $1 {[%c_effect
b3;square;b3;type;GreatFind;persistent;true] 24.d5 $3 would have stopped this.
Now the attack wins.} 26. Ke1 Qf3 0-1`
  },
  {
    id: 11,
    white: "GothamChess", white_elo: 2891,
    black: "AwesomeAtti", black_elo: 2809,
    event: "Live Chess", site: "Chess.com",
    date: "2026.09.01", round: "?", result: "1-0",
    eco: "A45",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.09.01"]
[Round "?"]
[White "GothamChess"]
[Black "AwesomeAtti"]
[Result "1-0"]
[WhiteElo "2891"]
[BlackElo "2809"]
[ECO "A45"]
[PlyCount "37"]
[CurrentPosition "5rrk/p2pnpp1/n1b1p2p/q1p1P1NQ/2P4P/P2B2R1/1P1N1PP1/2KR4 b - - 8 19"]
[ECOUrl "https://www.chess.com/openings/Trompowsky-Attack-Classical-Defense-3.Nd2-h6-4.Bh4"]
[EndDate "2026.09.01"]
[EndTime "02:15:51"]
[Link "https://www.chess.com/game/live/173820532932"]
[StartTime "02:11:42"]
[Termination "GothamChess won by resignation"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.09.01"]
[UTCTime "02:11:42"]

{[%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:46:20Z"]}  1.d4 {[%clk 0:02:50.1] [%eval 0.07] [%bestmove e2e4]}  1...Nf6 {[%clk 0:02:58.7] [%eval 0.21] [%bestmove d7d5]}  2.Bg5 {[%clk 0:02:45.9] [%eval 0.02] [%bestmove c2c4]}  2...e6 {[%clk 0:02:56.7] [%eval 0.24] [%bestmove f6e4]}  3.Nd2 {[%clk 0:02:44.7] [%eval 0.13] [%bestmove e2e4]}  3...h6 {[%clk 0:02:55.6] [%eval 0.21] [%bestmove h7h6]}  4.Bh4 {[%clk 0:02:39.5] [%eval 0.22] [%bestmove g5f6]}  4...b6 {[%clk 0:02:52.7] [%eval 0.75] [%bestmove d7d5]}  5.e4 {[%clk 0:02:37.9] [%eval 0.74] [%bestmove e2e4]}  5...Be7 {[%clk 0:02:50.9] [%eval 0.68] [%bestmove f8e7]}  6.e5 {[%clk 0:02:36.2] [%eval 0.75] [%bestmove e4e5]}  6...Nd5 {[%clk 0:02:47.3] [%eval 0.69] [%bestmove f6d5]}  7.Bxe7 {[%clk 0:02:35.3] [%eval 0.44] [%bestmove h4g3]}  7...Nxe7 {[%clk 0:02:44.5] [%eval 0.42] [%bestmove d5e7]}  8.Qg4 {[%clk 0:02:33.1] [%eval 0.77] [%bestmove d1g4]}  8...O-O {[%clk 0:02:28.5] [%eval 0.80] [%bestmove e8g8]}  9.Bd3 {[%clk 0:02:19.1] [%eval 0.08] [%bestmove d2e4]}  9...Bb7 {[%clk 0:02:09.8] [%eval 0.46] [%bestmove c8a6]}  10.Ngf3 {[%clk 0:02:15.2] [%eval 0.43] [%bestmove g1f3]}  10...c5 {[%clk 0:02:02] [%eval 0.71] [%bestmove b7a6]}  11.dxc5 {[%clk 0:02:06.5] [%eval 0.43] [%bestmove d2e4]}  11...bxc5 {[%clk 0:01:59.9] [%eval 0.58] [%bestmove b6c5]}  12.O-O-O {[%clk 0:02:02.3] [%eval 0.56] [%bestmove d2e4]}  12...Qa5 {[%clk 0:01:53.3] [%eval 1.01] [%bestmove b8c6]}  13.a3 {[%clk 0:01:57.5] [%eval 0.95] [%bestmove a2a3]}  13...Bd5 {[%clk 0:01:23.3] [%eval 0.84] [%bestmove b7d5]}  14.c4 {[%clk 0:01:40] [%eval 0.84] [%bestmove c2c4]}  14...Bc6 {[%clk 0:01:07.6] [%eval 1.52] [%bestmove d5f3]}  15.h4 {[%clk 0:01:36.5] [%eval 1.51] [%bestmove d2e4]}  15...Na6 {[%clk 0:01:06.1] [%eval 1.61] [%bestmove c6f3]}  16.Rh3 {[%clk 0:01:34.5] [%eval 1.83] [%bestmove h1h3]}  16...Kh8 {[%clk 0:01:03.3] [%eval 2.16] [%bestmove e7f5]}  17.Rg3 {[%clk 0:01:33.6] [%eval 2.25] [%bestmove h3g3]}  17...Rg8 {[%clk 0:01:02.1] [%eval 3.78] [%bestmove f8g8]}  18.Ng5 {[%clk 0:01:31.8] [%eval 4.04] [%bestmove f3g5]}  18...Raf8 {[%clk 0:00:54.8] [%eval 3.76] [%bestmove g8f8]}  19.Qh5 {[%clk 0:01:22.2] [%eval 3.91] [%bestmove g4h5]}  1-0`
  },
  {
    id: 12,
    white: "AwesomeAtti", white_elo: 2734,
    black: "GothamChess", black_elo: 2885,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.31", round: "?", result: "1-0",
    eco: "B00",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.31"]
[Round "?"]
[White "AwesomeAtti"]
[Black "GothamChess"]
[Result "1-0"]
[WhiteElo "2734"]
[BlackElo "2885"]
[ECO "B00"]
[PlyCount "43"]
[CurrentPosition "1r1q2kr/pp3ppp/3P2b1/4Nn2/8/1Q3B1P/PP3PP1/3RR1K1 b - - 0 22"]
[ECOUrl "https://www.chess.com/openings/Caro-Kann-Defense-De-Bruycker-Defense-3.Nc3"]
[EndDate "2026.08.31"]
[EndTime "23:49:56"]
[Link "https://www.chess.com/game/live/173817153688"]
[StartTime "23:47:59"]
[Termination "AwesomeAtti won by resignation"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.31"]
[UTCTime "23:47:59"]

{[%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:46:24Z"]}  1.e4 {[%clk 0:02:57.8] [%eval 0.45] [%bestmove e2e4]}  1...Na6 {[%clk 0:02:59] [%eval 1.21] [%bestmove e7e5]}  2.d4 {[%clk 0:02:56.6] [%eval 1.25] [%bestmove g1f3]}  2...c6 {[%clk 0:02:58.4] [%eval 0.86] [%bestmove c7c6]}  3.Nc3 {[%clk 0:02:56] [%eval 0.98] [%bestmove g1f3]}  3...d5 {[%clk 0:02:57.9] [%eval 1.25] [%bestmove a6c7]}  4.Nf3 {[%clk 0:02:54.5] [%eval 0.92] [%bestmove e4e5]}  4...dxe4 {[%clk 0:02:57.1] [%eval 0.84] [%bestmove d5e4]}  5.Nxe4 {[%clk 0:02:53.4] [%eval 0.76] [%bestmove f3e5]}  5...Nf6 {[%clk 0:02:57] [%eval 0.76] [%bestmove g8f6]}  6.Bd3 {[%clk 0:02:47.6] [%eval 0.42] [%bestmove f1a6]}  6...Bg4 {[%clk 0:02:54.8] [%eval 1.05] [%bestmove a6b4]}  7.c3 {[%clk 0:02:44.4] [%eval 0.67] [%bestmove c2c3]}  7...Nc7 {[%clk 0:02:53.7] [%eval 1.07] [%bestmove f6e4]}  8.O-O {[%clk 0:02:42.9] [%eval 0.84] [%bestmove h2h3]}  8...e6 {[%clk 0:02:52.8] [%eval 0.87] [%bestmove e7e6]}  9.h3 {[%clk 0:02:41.7] [%eval 0.64] [%bestmove f1e1]}  9...Bh5 {[%clk 0:02:51.3] [%eval 0.80] [%bestmove g4f3]}  10.Re1 {[%clk 0:02:40.9] [%eval 0.82] [%bestmove e4g3]}  10...Be7 {[%clk 0:02:50.4] [%eval 0.90] [%bestmove f8e7]}  11.Bg5 {[%clk 0:02:37] [%eval 0.43] [%bestmove e4g3]}  11...Nxe4 {[%clk 0:02:47.7] [%eval 0.28] [%bestmove f6e4]}  12.Bxe7 {[%clk 0:02:33.8] [%eval 0.31] [%bestmove g5e7]}  12...Qxe7 {[%clk 0:02:46.3] [%eval 0.39] [%bestmove d8e7]}  13.Bxe4 {[%clk 0:02:32.2] [%eval 0.35] [%bestmove d3e4]}  13...Bg6 {[%clk 0:02:44.9] [%eval 0.63] [%bestmove e8g8]}  14.Qb3 {[%clk 0:02:29.7] [%eval 0.30] [%bestmove e4g6]}  14...Rb8 {[%clk 0:02:34.3] [%eval 3.97] [%bestmove g6e4]}  15.Bxc6+ {[%clk 0:02:27.7] [%eval 4.03] [%bestmove e4c6]}  15...Kf8 {[%clk 0:02:25.7] [%eval 4.03] [%bestmove e8f8]}  16.Ne5 {[%clk 0:02:25.4] [%eval 4.15] [%bestmove f3e5]}  16...Kg8 {[%clk 0:02:24.3] [%eval 4.11] [%bestmove f8g8]}  17.Bf3 {[%clk 0:02:23.3] [%eval 4.09] [%bestmove c6f3]}  17...Qd8 {[%clk 0:02:17] [%eval 4.13] [%bestmove e7d8]}  18.Rad1 {[%clk 0:02:20.4] [%eval 4.09] [%bestmove a1d1]}  18...Nd5 {[%clk 0:02:15.3] [%eval 4.45] [%bestmove f7f6]}  19.c4 {[%clk 0:02:09.8] [%eval 4.86] [%bestmove c3c4]}  19...Ne7 {[%clk 0:02:14.4] [%eval 5.31] [%bestmove d5f4]}  20.d5 {[%clk 0:02:08.4] [%eval 5.92] [%bestmove d4d5]}  20...exd5 {[%clk 0:02:14] [%eval 5.64] [%bestmove e6d5]}  21.cxd5 {[%clk 0:02:07.1] [%eval 5.52] [%bestmove c4d5]}  21...Nf5 {[%clk 0:02:13.4] [%eval 5.84] [%bestmove d8d6]}  22.d6 {[%clk 0:02:04.1] [%eval 5.55] [%bestmove d5d6]}  1-0`
  },
  {
    id: 13,
    white: "AwesomeAtti", white_elo: 2751,
    black: "GothamChess", black_elo: 2897,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.31", round: "?", result: "1-0",
    eco: "D24",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.31"]
[Round "?"]
[White "AwesomeAtti"]
[Black "GothamChess"]
[Result "1-0"]
[WhiteElo "2751"]
[BlackElo "2897"]
[ECO "D24"]
[PlyCount "47"]
[CurrentPosition "r1b4k/4qp2/pp2P2Q/2b2p2/P1B5/1P6/5PPP/5RK1 b - - 0 24"]
[ECOUrl "https://www.chess.com/openings/Queens-Gambit-Accepted-Showalter-Variation...5.a4-Nc6-6.e3-Na5-7.Ne5"]
[EndDate "2026.08.31"]
[EndTime "23:47:16"]
[Link "https://www.chess.com/game/live/173817070828"]
[StartTime "23:44:35"]
[Termination "AwesomeAtti won by resignation"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.31"]
[UTCTime "23:44:35"]

{[%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:46:25Z"]}  1.d4 {[%clk 0:02:58.7] [%eval 0.04] [%bestmove e2e4]}  1...d5 {[%clk 0:02:58.5] [%eval 0.11] [%bestmove d7d5]}  2.c4 {[%clk 0:02:58] [%eval 0.15] [%bestmove e2e3]}  2...dxc4 {[%clk 0:02:57.8] [%eval 0.33] [%bestmove e7e6]}  3.Nf3 {[%clk 0:02:55.6] [%eval 0.35] [%bestmove e2e3]}  3...Nf6 {[%clk 0:02:57] [%eval 0.39] [%bestmove g8f6]}  4.Nc3 {[%clk 0:02:53.3] [%eval 0.07] [%bestmove e2e3]}  4...a6 {[%clk 0:02:56.1] [%eval 0.18] [%bestmove a7a6]}  5.a4 {[%clk 0:02:52.4] [%eval -0.51] [%bestmove e2e4]}  5...Nc6 {[%clk 0:02:55.2] [%eval -0.44] [%bestmove b8c6]}  6.e3 {[%clk 0:02:49.9] [%eval -0.72] [%bestmove a4a5]}  6...Na5 {[%clk 0:02:52.7] [%eval -0.62] [%bestmove c6a5]}  7.Ne5 {[%clk 0:02:47.9] [%eval -1.09] [%bestmove f1e2]}  7...c5 {[%clk 0:02:51.7] [%eval -0.12] [%bestmove c8e6]}  8.Nxc4 {[%clk 0:02:46.4] [%eval -0.37] [%bestmove f1c4]}  8...Nxc4 {[%clk 0:02:48.8] [%eval 0.08] [%bestmove c8f5]}  9.Bxc4 {[%clk 0:02:45.9] [%eval 0.10] [%bestmove f1c4]}  9...cxd4 {[%clk 0:02:47.9] [%eval 0.22] [%bestmove c5d4]}  10.exd4 {[%clk 0:02:45.2] [%eval 0.16] [%bestmove e3d4]}  10...e6 {[%clk 0:02:44.5] [%eval 0.20] [%bestmove e7e6]}  11.O-O {[%clk 0:02:43.9] [%eval 0.25] [%bestmove e1g1]}  11...Bb4 {[%clk 0:02:43.2] [%eval 0.74] [%bestmove f8e7]}  12.Bg5 {[%clk 0:02:41.9] [%eval 0.28] [%bestmove d1b3]}  12...h6 {[%clk 0:02:41.8] [%eval 0.49] [%bestmove e8g8]}  13.Bh4 {[%clk 0:02:40.7] [%eval 0.35] [%bestmove g5h4]}  13...Qa5 {[%clk 0:02:36.4] [%eval 1.72] [%bestmove b4e7]}  14.Bxf6 {[%clk 0:02:37.7] [%eval 1.21] [%bestmove h4f6]}  14...gxf6 {[%clk 0:02:36.2] [%eval 1.62] [%bestmove g7f6]}  15.Ne4 {[%clk 0:02:36.9] [%eval 0.11] [%bestmove d4d5]}  15...Be7 {[%clk 0:02:33.9] [%eval 1.52] [%bestmove f6f5]}  16.b3 {[%clk 0:02:28.9] [%eval 0.53] [%bestmove d4d5]}  16...f5 {[%clk 0:02:31.6] [%eval 0.34] [%bestmove f6f5]}  17.Qh5 {[%clk 0:02:26.5] [%eval 0.80] [%bestmove e4g3]}  17...Qd8 {[%clk 0:02:17.1] [%eval 0.69] [%bestmove c8d7]}  18.Nc5 {[%clk 0:02:24.8] [%eval -0.12] [%bestmove e4g3]}  18...Kf8 {[%clk 0:02:07.3] [%eval 0.25] [%bestmove e8f8]}  19.Rad1 {[%clk 0:02:21.9] [%eval -0.64] [%bestmove f1d1]}  19...b6 {[%clk 0:02:05.4] [%eval -0.20] [%bestmove b7b6]}  20.d5 {[%clk 0:02:10.1] [%eval -0.46] [%bestmove h5f3]}  20...Bxc5 {[%clk 0:01:56.8] [%eval -0.82] [%bestmove e7c5]}  21.dxe6 {[%clk 0:02:05.1] [%eval -0.91] [%bestmove d5e6]}  21...Qe7 {[%clk 0:01:46.5] [%eval 4.42] [%bestmove d8f6]}  22.Rd8+ {[%clk 0:02:01.6] [%eval 4.14] [%bestmove d1d8]}  22...Kg7 {[%clk 0:01:45.4] [%eval 4.22] [%bestmove f8g7]}  23.Rxh8 {[%clk 0:02:01.5] [%eval 4.60] [%bestmove d8h8]}  23...Kxh8 {[%clk 0:01:44.1] [%eval #6] [%bestmove e7g5]}  24.Qxh6+ {[%clk 0:02:01] [%eval #5] [%bestmove h5h6]}  1-0`
  },
  {
    id: 14,
    white: "AwesomeAtti", white_elo: 2817,
    black: "GothamChess", black_elo: 2909,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.31", round: "?", result: "0-1",
    eco: "C10",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.31"]
[Round "?"]
[White "AwesomeAtti"]
[Black "GothamChess"]
[Result "0-1"]
[WhiteElo "2817"]
[BlackElo "2909"]
[ECO "C10"]
[PlyCount "104"]
[CurrentPosition "8/8/7R/2k4P/5p2/5P2/5nrK/R4b2 w - - 15 53"]
[ECOUrl "https://www.chess.com/openings/French-Defense-Classical-Burn-Variation-5.Nxe4-Be7-6.Nxf6"]
[EndDate "2026.08.31"]
[EndTime "23:43:53"]
[Link "https://www.chess.com/game/live/173816914174"]
[StartTime "23:38:12"]
[Termination "GothamChess won by checkmate"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.31"]
[UTCTime "23:38:12"]

{[%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:46:26Z"]}  1.e4 {[%clk 0:02:59.6] [%eval 0.32] [%bestmove e2e4]}  1...e6 {[%clk 0:02:58.8] [%eval 0.48] [%bestmove e7e5]}  2.d4 {[%clk 0:02:58.3] [%eval 0.46] [%bestmove d2d4]}  2...d5 {[%clk 0:02:58.2] [%eval 0.47] [%bestmove d7d5]}  3.Nc3 {[%clk 0:02:55.4] [%eval 0.50] [%bestmove b1c3]}  3...dxe4 {[%clk 0:02:57.5] [%eval 0.71] [%bestmove f8b4]}  4.Nxe4 {[%clk 0:02:54.4] [%eval 0.50] [%bestmove c3e4]}  4...Nf6 {[%clk 0:02:57.4] [%eval 1.01] [%bestmove b8d7]}  5.Bg5 {[%clk 0:02:50.1] [%eval 0.38] [%bestmove e4f6]}  5...Be7 {[%clk 0:02:56.3] [%eval 0.30] [%bestmove f8e7]}  6.Nxf6+ {[%clk 0:02:47.3] [%eval 0.11] [%bestmove e4f6]}  6...gxf6 {[%clk 0:02:54.5] [%eval 0.60] [%bestmove e7f6]}  7.Be3 {[%clk 0:02:44.6] [%eval 0.68] [%bestmove g5e3]}  7...b6 {[%clk 0:02:53.8] [%eval 1.15] [%bestmove b8c6]}  8.Nf3 {[%clk 0:02:43.3] [%eval 0.43] [%bestmove d1f3]}  8...Bb7 {[%clk 0:02:53.2] [%eval 0.40] [%bestmove c8b7]}  9.Be2 {[%clk 0:02:42.3] [%eval 0.24] [%bestmove f1b5]}  9...Rg8 {[%clk 0:02:52.4] [%eval 0.38] [%bestmove d8d7]}  10.Rg1 {[%clk 0:02:40] [%eval 0.23] [%bestmove d1d3]}  10...Nc6 {[%clk 0:02:48.8] [%eval 0.32] [%bestmove d8d5]}  11.c3 {[%clk 0:02:35.1] [%eval 0.20] [%bestmove c2c3]}  11...Qd5 {[%clk 0:02:44.4] [%eval 0.28] [%bestmove d8d5]}  12.Qd3 {[%clk 0:02:30.5] [%eval -0.22] [%bestmove d1a4]}  12...f5 {[%clk 0:02:38] [%eval 0.00] [%bestmove e8c8]}  13.Bf4 {[%clk 0:02:27.6] [%eval -0.02] [%bestmove g2g3]}  13...O-O-O {[%clk 0:02:36.8] [%eval -0.04] [%bestmove e8c8]}  14.a4 {[%clk 0:02:21.6] [%eval -0.28] [%bestmove d3c4]}  14...a5 {[%clk 0:02:35.5] [%eval 0.20] [%bestmove f7f6]}  15.Qc2 {[%clk 0:02:14.7] [%eval -0.14] [%bestmove d3b5]}  15...Qe4 {[%clk 0:02:30.8] [%eval 0.61] [%bestmove c8b8]}  16.Qxe4 {[%clk 0:02:09.7] [%eval 0.11] [%bestmove c2e4]}  16...fxe4 {[%clk 0:02:30.7] [%eval 0.12] [%bestmove f5e4]}  17.Nd2 {[%clk 0:02:09.1] [%eval 0.05] [%bestmove f3d2]}  17...f5 {[%clk 0:02:27.5] [%eval 0.08] [%bestmove f7f5]}  18.f3 {[%clk 0:02:08.3] [%eval -0.24] [%bestmove d2c4]}  18...e5 {[%clk 0:02:21.3] [%eval -0.38] [%bestmove e6e5]}  19.dxe5 {[%clk 0:02:07] [%eval -0.58] [%bestmove d4e5]}  19...Bc5 {[%clk 0:02:20.5] [%eval -0.58] [%bestmove e7c5]}  20.Rf1 {[%clk 0:02:02.6] [%eval -0.58] [%bestmove g1f1]}  20...e3 {[%clk 0:02:12] [%eval -0.39] [%bestmove e4e3]}  21.Nb3 {[%clk 0:02:00.1] [%eval -0.69] [%bestmove d2b3]}  21...Rxg2 {[%clk 0:02:09] [%eval -0.16] [%bestmove c6b4]}  22.Nxc5 {[%clk 0:01:58.1] [%eval -0.01] [%bestmove b3c5]}  22...bxc5 {[%clk 0:02:08.9] [%eval -0.27] [%bestmove b6c5]}  23.Bxe3 {[%clk 0:01:57.4] [%eval -0.40] [%bestmove a1d1]}  23...Nxe5 {[%clk 0:02:06] [%eval -0.40] [%bestmove c6e5]}  24.Bxc5 {[%clk 0:01:54.9] [%eval -1.49] [%bestmove f1f2]}  24...Re8 {[%clk 0:01:53.5] [%eval -1.50] [%bestmove d8e8]}  25.Kd1 {[%clk 0:01:45.6] [%eval -1.75] [%bestmove e1d1]}  25...Rxe2 {[%clk 0:01:26.8] [%eval -1.35] [%bestmove e8d8]}  26.Kxe2 {[%clk 0:01:39.5] [%eval -1.46] [%bestmove d1e2]}  26...Nd7+ {[%clk 0:01:26] [%eval -1.10] [%bestmove e5d7]}  27.Kf2 {[%clk 0:01:37.1] [%eval -1.48] [%bestmove e2f2]}  27...Nxc5 {[%clk 0:01:25.1] [%eval -1.25] [%bestmove d7c5]}  28.Rfd1 {[%clk 0:01:29.2] [%eval -1.72] [%bestmove f1d1]}  28...f4 {[%clk 0:01:24.6] [%eval -0.14] [%bestmove b7a6]}  29.b4 {[%clk 0:01:24.9] [%eval -0.97] [%bestmove b2b4]}  29...Na6 {[%clk 0:01:10.9] [%eval 0.00] [%bestmove a5b4]}  30.Rd4 {[%clk 0:01:22.6] [%eval -0.21] [%bestmove d1d4]}  30...Rf8 {[%clk 0:00:57.4] [%eval 0.45] [%bestmove c7c5]}  31.Rg1 {[%clk 0:01:14.8] [%eval 0.63] [%bestmove a1d1]}  31...axb4 {[%clk 0:00:54] [%eval 0.99] [%bestmove c7c5]}  32.cxb4 {[%clk 0:01:13.6] [%eval 0.80] [%bestmove c3b4]}  32...c5 {[%clk 0:00:53.5] [%eval 0.99] [%bestmove c7c5]}  33.bxc5 {[%clk 0:01:11.4] [%eval 1.01] [%bestmove b4c5]}  33...Rf7 {[%clk 0:00:45.3] [%eval 1.42] [%bestmove f8f5]}  34.Rc1 {[%clk 0:01:02] [%eval 1.19] [%bestmove g1g5]}  34...Bc6 {[%clk 0:00:43.8] [%eval 1.53] [%bestmove f7f5]}  35.Rd6 {[%clk 0:00:57.3] [%eval 0.69] [%bestmove c1c4]}  35...Kc7 {[%clk 0:00:42.3] [%eval 0.78] [%bestmove c8c7]}  36.a5 {[%clk 0:00:55.8] [%eval -0.09] [%bestmove c1c3]}  36...Nxc5 {[%clk 0:00:38.6] [%eval -0.05] [%bestmove a6c5]}  37.Rdd1 {[%clk 0:00:41.3] [%eval -0.37] [%bestmove c1d1]}  37...Nb3 {[%clk 0:00:36.8] [%eval -0.38] [%bestmove c5b3]}  38.Rc3 {[%clk 0:00:39.7] [%eval -0.27] [%bestmove c1b1]}  38...Nxa5 {[%clk 0:00:35.6] [%eval -0.24] [%bestmove b3a5]}  39.Ra1 {[%clk 0:00:38.2] [%eval -0.47] [%bestmove d1d5]}  39...Rf5 {[%clk 0:00:34] [%eval -0.63] [%bestmove f7f5]}  40.Rg1 {[%clk 0:00:31.8] [%eval -0.51] [%bestmove a1g1]}  40...Nb7 {[%clk 0:00:31.1] [%eval -0.22] [%bestmove c7d6]}  41.Rg7+ {[%clk 0:00:31.2] [%eval -0.25] [%bestmove g1g7]}  41...Kd6 {[%clk 0:00:29.5] [%eval -0.25] [%bestmove c7d6]}  42.Rxh7 {[%clk 0:00:30.6] [%eval -0.38] [%bestmove g7h7]}  42...Nc5 {[%clk 0:00:29.1] [%eval -0.25] [%bestmove b7c5]}  43.Rh6+ {[%clk 0:00:29] [%eval -0.58] [%bestmove h7h8]}  43...Kd5 {[%clk 0:00:28.6] [%eval -0.30] [%bestmove d6d5]}  44.h4 {[%clk 0:00:24.6] [%eval -0.70] [%bestmove c3a3]}  44...Bb5 {[%clk 0:00:28] [%eval -0.23] [%bestmove d5d4]}  45.h5 {[%clk 0:00:23.1] [%eval -0.83] [%bestmove f2g2]}  45...Nd3+ {[%clk 0:00:27.3] [%eval -0.96] [%bestmove c5d3]}  46.Kg1 {[%clk 0:00:20.8] [%eval -1.65] [%bestmove f2e2]}  46...Rg5+ {[%clk 0:00:26.7] [%eval -1.77] [%bestmove f5g5]}  47.Kh2 {[%clk 0:00:19.8] [%eval -1.46] [%bestmove g1h2]}  47...Kd4 {[%clk 0:00:26] [%eval -1.83] [%bestmove d3e1]}  48.Rb3 {[%clk 0:00:18.2] [%eval -2.03] [%bestmove c3a3]}  48...Bc4 {[%clk 0:00:24.8] [%eval -2.28] [%bestmove b5c4]}  49.Ra3 {[%clk 0:00:16] [%eval -2.48] [%bestmove b3a3]}  49...Nf2 {[%clk 0:00:21.8] [%eval -0.22] [%bestmove d4e3]}  50.Rd6+ {[%clk 0:00:14.8] [%eval -0.06] [%bestmove h6d6]}  50...Kc5 {[%clk 0:00:21] [%eval -0.08] [%bestmove d4c5]}  51.Rh6 {[%clk 0:00:12.6] [%eval -1.13] [%bestmove d6f6]}  51...Bf1 {[%clk 0:00:20.2] [%eval 0.10] [%bestmove f2d3]}  52.Ra1 {[%clk 0:00:10.6] [%eval #-1] [%bestmove h6g6]}  52...Rg2# {[%clk 0:00:19.3] [%bestmove g5g2]}  0-1`
  },
  {
    id: 15,
    white: "GothamChess", white_elo: 2903,
    black: "AwesomeAtti", black_elo: 2823,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.31", round: "?", result: "1-0",
    eco: "C45",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.31"]
[Round "?"]
[White "GothamChess"]
[Black "AwesomeAtti"]
[Result "1-0"]
[WhiteElo "2903"]
[BlackElo "2823"]
[ECO "C45"]
[PlyCount "82"]
[CurrentPosition "8/1rB5/P3kp2/8/5P2/6P1/6K1/8 w - - 0 42"]
[ECOUrl "https://www.chess.com/openings/Scotch-Game-Classical-Variation-5.Be3-Qf6-6.c3-Nge7"]
[EndDate "2026.08.31"]
[EndTime "23:38:07"]
[Link "https://www.chess.com/game/live/173816784196"]
[StartTime "23:32:56"]
[Termination "GothamChess won by resignation"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.31"]
[UTCTime "23:32:56"]

{[%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:46:28Z"]}  1.e4 {[%clk 0:02:58.8] [%eval 0.41] [%bestmove e2e4]}  1...e5 {[%clk 0:02:57.4] [%eval 0.45] [%bestmove e7e5]}  2.Nf3 {[%clk 0:02:57.7] [%eval 0.39] [%bestmove g1f3]}  2...Nc6 {[%clk 0:02:55.4] [%eval 0.36] [%bestmove b8c6]}  3.d4 {[%clk 0:02:57.1] [%eval 0.37] [%bestmove b1c3]}  3...exd4 {[%clk 0:02:53.8] [%eval 0.37] [%bestmove e5d4]}  4.Nxd4 {[%clk 0:02:57] [%eval 0.32] [%bestmove f3d4]}  4...Qf6 {[%clk 0:02:52.4] [%eval 1.02] [%bestmove g8f6]}  5.c3 {[%clk 0:02:52] [%eval 0.58] [%bestmove d4b5]}  5...Bc5 {[%clk 0:02:48.2] [%eval 0.77] [%bestmove f6g6]}  6.Be3 {[%clk 0:02:50.9] [%eval 0.07] [%bestmove c1e3]}  6...Nge7 {[%clk 0:02:45.8] [%eval 0.07] [%bestmove g8e7]}  7.Be2 {[%clk 0:02:47.6] [%eval 0.07] [%bestmove f1e2]}  7...Ne5 {[%clk 0:02:31.2] [%eval 1.33] [%bestmove d7d5]}  8.f4 {[%clk 0:02:44.2] [%eval 0.96] [%bestmove b2b4]}  8...N5g6 {[%clk 0:02:19] [%eval 1.44] [%bestmove e5c6]}  9.e5 {[%clk 0:02:40.5] [%eval 1.17] [%bestmove e1g1]}  9...Qb6 {[%clk 0:02:10] [%eval 1.56] [%bestmove f6b6]}  10.b4 {[%clk 0:02:36.6] [%eval 1.29] [%bestmove b2b4]}  10...Bxd4 {[%clk 0:02:06.3] [%eval 1.26] [%bestmove c5d4]}  11.Bxd4 {[%clk 0:02:36.5] [%eval 1.36] [%bestmove e3d4]}  11...Qc6 {[%clk 0:02:02.7] [%eval 1.25] [%bestmove b6c6]}  12.Bf3 {[%clk 0:02:29.8] [%eval 0.51] [%bestmove e1g1]}  12...d5 {[%clk 0:02:01.8] [%eval 0.51] [%bestmove d7d5]}  13.g3 {[%clk 0:02:11.4] [%eval 0.25] [%bestmove e5d6]}  13...Nf5 {[%clk 0:01:58] [%eval 1.12] [%bestmove c8h3]}  14.Bf2 {[%clk 0:02:09.5] [%eval 1.29] [%bestmove d4f2]}  14...Be6 {[%clk 0:01:57] [%eval 1.29] [%bestmove f5e7]}  15.O-O {[%clk 0:02:07.8] [%eval 1.50] [%bestmove e1g1]}  15...h5 {[%clk 0:01:55.3] [%eval 1.43] [%bestmove h7h5]}  16.Qd2 {[%clk 0:02:01.7] [%eval 0.42] [%bestmove a2a4]}  16...a6 {[%clk 0:01:36.8] [%eval 0.73] [%bestmove c6a4]}  17.a4 {[%clk 0:02:00.5] [%eval 1.01] [%bestmove a2a4]}  17...a5 {[%clk 0:01:24.4] [%eval 1.89] [%bestmove c6d7]}  18.b5 {[%clk 0:01:52.8] [%eval 1.96] [%bestmove b4b5]}  18...Qd7 {[%clk 0:01:23.2] [%eval 1.87] [%bestmove c6d7]}  19.c4 {[%clk 0:01:45.2] [%eval 1.82] [%bestmove c3c4]}  19...dxc4 {[%clk 0:01:21.4] [%eval 3.23] [%bestmove a8d8]}  20.Bxb7 {[%clk 0:01:36.8] [%eval 2.47] [%bestmove d2d7]}  20...Qxd2 {[%clk 0:01:11.8] [%eval 2.39] [%bestmove d7d2]}  21.Nxd2 {[%clk 0:01:36.7] [%eval 2.27] [%bestmove b1d2]}  21...Rb8 {[%clk 0:01:09.9] [%eval 3.77] [%bestmove a8d8]}  22.Bc6+ {[%clk 0:01:34.6] [%eval 3.67] [%bestmove b7c6]}  22...Kf8 {[%clk 0:01:06.6] [%eval 3.65] [%bestmove e8f8]}  23.Rac1 {[%clk 0:01:31.5] [%eval 3.01] [%bestmove f1c1]}  23...Nfe7 {[%clk 0:00:55.7] [%eval 4.42] [%bestmove g6e7]}  24.Bg2 {[%clk 0:01:24.1] [%eval 4.21] [%bestmove c6e4]}  24...h4 {[%clk 0:00:53.5] [%eval 4.26] [%bestmove b8d8]}  25.Nxc4 {[%clk 0:01:22.9] [%eval 4.64] [%bestmove d2c4]}  25...hxg3 {[%clk 0:00:51.7] [%eval 4.86] [%bestmove b8d8]}  26.hxg3 {[%clk 0:01:21.8] [%eval 4.79] [%bestmove h2g3]}  26...f6 {[%clk 0:00:39.9] [%eval 5.11] [%bestmove f8e8]}  27.exf6 {[%clk 0:01:19] [%eval 4.79] [%bestmove f1d1]}  27...gxf6 {[%clk 0:00:38.7] [%eval 4.82] [%bestmove g7f6]}  28.Nxa5 {[%clk 0:01:18.5] [%eval 3.80] [%bestmove c4a5]}  28...Bd5 {[%clk 0:00:29.8] [%eval 3.95] [%bestmove e6d5]}  29.Rxc7 {[%clk 0:01:15.6] [%eval 4.00] [%bestmove a5c6]}  29...Bxg2 {[%clk 0:00:23.9] [%eval 4.43] [%bestmove g6f4]}  30.Kxg2 {[%clk 0:01:15.5] [%eval 4.62] [%bestmove g1g2]}  30...Kf7 {[%clk 0:00:18.2] [%eval 5.14] [%bestmove e7d5]}  31.Nc6 {[%clk 0:01:12] [%eval 5.57] [%bestmove a5c6]}  31...Rhc8 {[%clk 0:00:15.7] [%eval 5.30] [%bestmove b8c8]}  32.Rxc8 {[%clk 0:01:10.3] [%eval 5.36] [%bestmove c7c8]}  32...Rxc8 {[%clk 0:00:14.5] [%eval 5.23] [%bestmove b8c8]}  33.Nxe7 {[%clk 0:01:09.4] [%eval 5.14] [%bestmove c6e7]}  33...Nxe7 {[%clk 0:00:13.3] [%eval 5.60] [%bestmove g6e7]}  34.b6 {[%clk 0:01:08.9] [%eval 5.16] [%bestmove a4a5]}  34...Ra8 {[%clk 0:00:12.5] [%eval 5.93] [%bestmove c8c2]}  35.b7 {[%clk 0:01:04.2] [%eval 5.55] [%bestmove f1a1]}  35...Rb8 {[%clk 0:00:11.7] [%eval 5.48] [%bestmove a8b8]}  36.Rb1 {[%clk 0:01:03.4] [%eval 5.43] [%bestmove f1b1]}  36...Nd5 {[%clk 0:00:10.9] [%eval 6.10] [%bestmove f7e8]}  37.a5 {[%clk 0:01:02] [%eval 5.57] [%bestmove b1b3]}  37...Nc7 {[%clk 0:00:10] [%eval 6.18] [%bestmove b8g8]}  38.Rb6 {[%clk 0:00:59.4] [%eval 5.97] [%bestmove b1b2]}  38...Nd5 {[%clk 0:00:08.1] [%eval 6.09] [%bestmove f7g8]}  39.a6 {[%clk 0:00:57.8] [%eval 5.46] [%bestmove b6b2]}  39...Nxb6 {[%clk 0:00:06.4] [%eval 5.45] [%bestmove d5b6]}  40.Bxb6 {[%clk 0:00:57.7] [%eval 5.74] [%bestmove f2b6]}  40...Ke6 {[%clk 0:00:04.1] [%eval 6.17] [%bestmove b8e8]}  41.Bc7 {[%clk 0:00:56.7] [%eval 5.77] [%bestmove b6c7]}  41...Rxb7 {[%clk 0:00:02.6] [%eval 7.00] [%bestmove b8g8]}  1-0`
  },
  {
    id: 16,
    white: "AwesomeAtti", white_elo: 2898,
    black: "GothamChess", black_elo: 2897,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.31", round: "?", result: "1-0",
    eco: "D20",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.31"]
[Round "?"]
[White "AwesomeAtti"]
[Black "GothamChess"]
[Result "1-0"]
[WhiteElo "2898"]
[BlackElo "2897"]
[ECO "D20"]
[PlyCount "111"]
[CurrentPosition "6k1/4PP2/1nbN4/4K3/1Pp5/2N5/8/8 b - - 0 56"]
[ECOUrl "https://www.chess.com/openings/Queens-Gambit-Accepted-Old-Variation-3...e5-4.Bxc4-exd4"]
[EndDate "2026.08.31"]
[EndTime "19:50:23"]
[Link "https://www.chess.com/game/live/173809527070"]
[StartTime "19:44:40"]
[Termination "AwesomeAtti won on time"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.31"]
[UTCTime "19:44:40"]

{[%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:46:29Z"]}  1.d4 {[%clk 0:02:59] [%eval 0.15] [%bestmove e2e4]}  1...d5 {[%clk 0:02:58.8] [%eval 0.10] [%bestmove d7d5]}  2.c4 {[%clk 0:02:58.7] [%eval 0.12] [%bestmove e2e3]}  2...dxc4 {[%clk 0:02:58] [%eval 0.36] [%bestmove e7e6]}  3.e3 {[%clk 0:02:57.2] [%eval 0.34] [%bestmove g1f3]}  3...e5 {[%clk 0:02:56.6] [%eval 0.45] [%bestmove e7e6]}  4.Bxc4 {[%clk 0:02:53.1] [%eval 0.40] [%bestmove f1c4]}  4...exd4 {[%clk 0:02:55.4] [%eval 0.46] [%bestmove d8g5]}  5.Nf3 {[%clk 0:02:48.1] [%eval 0.25] [%bestmove e3d4]}  5...Bb4+ {[%clk 0:02:53.9] [%eval 0.30] [%bestmove f8b4]}  6.Bd2 {[%clk 0:02:46.3] [%eval 0.16] [%bestmove c1d2]}  6...Bxd2+ {[%clk 0:02:52.7] [%eval 0.37] [%bestmove b4d2]}  7.Qxd2 {[%clk 0:02:46] [%eval 0.26] [%bestmove d1d2]}  7...Nf6 {[%clk 0:02:50.5] [%eval 0.35] [%bestmove g8f6]}  8.Nxd4 {[%clk 0:02:44.1] [%eval 0.24] [%bestmove d2d4]}  8...O-O {[%clk 0:02:49.5] [%eval 0.26] [%bestmove d8e7]}  9.Nc3 {[%clk 0:02:43.3] [%eval 0.25] [%bestmove b1c3]}  9...c5 {[%clk 0:02:46.8] [%eval 0.23] [%bestmove c7c5]}  10.Nf3 {[%clk 0:02:39.6] [%eval 0.15] [%bestmove d4f3]}  10...Nc6 {[%clk 0:02:37.8] [%eval 0.20] [%bestmove b8c6]}  11.O-O-O {[%clk 0:02:34.3] [%eval 0.15] [%bestmove e1c1]}  11...Bg4 {[%clk 0:02:32.6] [%eval 0.27] [%bestmove d8b6]}  12.Qxd8 {[%clk 0:02:29.7] [%eval 0.32] [%bestmove h2h3]}  12...Raxd8 {[%clk 0:02:32.5] [%eval 0.44] [%bestmove a8d8]}  13.Rxd8 {[%clk 0:02:24.8] [%eval 0.12] [%bestmove h2h3]}  13...Rxd8 {[%clk 0:02:31.5] [%eval 0.13] [%bestmove f8d8]}  14.Rd1 {[%clk 0:02:24.3] [%eval 0.07] [%bestmove c4e2]}  14...Rxd1+ {[%clk 0:02:28.5] [%eval 0.09] [%bestmove d8d1]}  15.Kxd1 {[%clk 0:02:24.2] [%eval -0.02] [%bestmove c1d1]}  15...a6 {[%clk 0:02:23.1] [%eval 0.23] [%bestmove c6e5]}  16.Be2 {[%clk 0:02:21.8] [%eval 0.18] [%bestmove c4e2]}  16...Kf8 {[%clk 0:02:15.3] [%eval 0.17] [%bestmove g8f8]}  17.h3 {[%clk 0:02:19.4] [%eval 0.08] [%bestmove h2h3]}  17...Bf5 {[%clk 0:02:09.9] [%eval 0.36] [%bestmove g4e6]}  18.Nd2 {[%clk 0:02:15.8] [%eval 0.10] [%bestmove f3d2]}  18...Ke7 {[%clk 0:02:03.8] [%eval 0.24] [%bestmove f5e6]}  19.Bf3 {[%clk 0:02:12] [%eval 0.09] [%bestmove f2f4]}  19...Kd6 {[%clk 0:01:55.9] [%eval 0.57] [%bestmove c6a5]}  20.Nc4+ {[%clk 0:02:10.4] [%eval 0.27] [%bestmove d2c4]}  20...Kc7 {[%clk 0:01:55.3] [%eval 0.75] [%bestmove d6c7]}  21.Bxc6 {[%clk 0:02:08.2] [%eval 0.20] [%bestmove f3c6]}  21...Kxc6 {[%clk 0:01:51.2] [%eval 0.70] [%bestmove c7c6]}  22.Ne5+ {[%clk 0:02:07.1] [%eval 0.39] [%bestmove c4e5]}  22...Kc7 {[%clk 0:01:47.5] [%eval 0.45] [%bestmove c6c7]}  23.Nxf7 {[%clk 0:02:06.6] [%eval 0.03] [%bestmove e5f7]}  23...Be6 {[%clk 0:01:46.3] [%eval 0.88] [%bestmove f6e4]}  24.Ng5 {[%clk 0:02:03.6] [%eval 0.74] [%bestmove f7e5]}  24...Bc4 {[%clk 0:01:43] [%eval 0.85] [%bestmove e6g8]}  25.h4 {[%clk 0:01:54.9] [%eval 0.65] [%bestmove b2b3]}  25...h6 {[%clk 0:01:34.7] [%eval 0.56] [%bestmove h7h6]}  26.Nf3 {[%clk 0:01:51.8] [%eval 0.84] [%bestmove g5h3]}  26...Kd6 {[%clk 0:01:28.7] [%eval 1.09] [%bestmove f6g4]}  27.b3 {[%clk 0:01:46.5] [%eval 0.51] [%bestmove f3d2]}  27...Bf7 {[%clk 0:01:21.6] [%eval 1.17] [%bestmove c4f1]}  28.Nd2 {[%clk 0:01:41.9] [%eval 1.05] [%bestmove e3e4]}  28...Ke5 {[%clk 0:01:12.9] [%eval 1.43] [%bestmove b7b5]}  29.Ke2 {[%clk 0:01:40.2] [%eval 1.28] [%bestmove d2c4]}  29...b5 {[%clk 0:01:11.7] [%eval 1.27] [%bestmove b7b5]}  30.f4+ {[%clk 0:01:35.5] [%eval 1.14] [%bestmove g2g3]}  30...Kf5 {[%clk 0:01:06.6] [%eval 1.21] [%bestmove e5f5]}  31.Kf3 {[%clk 0:01:28.6] [%eval 1.29] [%bestmove e2f3]}  31...Bh5+ {[%clk 0:01:05.7] [%eval 1.30] [%bestmove f7h5]}  32.Kg3 {[%clk 0:01:28.3] [%eval 1.24] [%bestmove f3g3]}  32...Ke6 {[%clk 0:00:59.9] [%eval 1.42] [%bestmove f5e6]}  33.e4 {[%clk 0:01:26.1] [%eval 1.42] [%bestmove e3e4]}  33...Be8 {[%clk 0:00:51.2] [%eval 1.98] [%bestmove g7g6]}  34.f5+ {[%clk 0:01:20.1] [%eval 2.25] [%bestmove f4f5]}  34...Kd6 {[%clk 0:00:46.4] [%eval 2.24] [%bestmove e6d6]}  35.Kf4 {[%clk 0:01:16.2] [%eval 2.47] [%bestmove d2f3]}  35...Nh5+ {[%clk 0:00:45.1] [%eval 2.64] [%bestmove f6h5]}  36.Ke3 {[%clk 0:01:15.4] [%eval 2.39] [%bestmove f4e3]}  36...Bc6 {[%clk 0:00:41.1] [%eval 3.10] [%bestmove h5f6]}  37.g4 {[%clk 0:01:10.7] [%eval 2.68] [%bestmove g2g4]}  37...Nf6 {[%clk 0:00:40.2] [%eval 2.80] [%bestmove h5f6]}  38.Kf4 {[%clk 0:01:09.7] [%eval 2.83] [%bestmove e3f4]}  38...Nd7 {[%clk 0:00:34.9] [%eval 2.81] [%bestmove f6d7]}  39.Nf3 {[%clk 0:01:05.6] [%eval 2.72] [%bestmove d2f3]}  39...c4 {[%clk 0:00:34.4] [%eval 3.47] [%bestmove b5b4]}  40.b4 {[%clk 0:00:50.9] [%eval 3.32] [%bestmove b3b4]}  40...a5 {[%clk 0:00:33] [%eval 3.30] [%bestmove d6e7]}  41.a3 {[%clk 0:00:49.4] [%eval 3.31] [%bestmove a2a3]}  41...axb4 {[%clk 0:00:32] [%eval 3.31] [%bestmove a5b4]}  42.axb4 {[%clk 0:00:49.3] [%eval 3.31] [%bestmove a3b4]}  42...Ke7 {[%clk 0:00:30.4] [%eval 4.10] [%bestmove d7b8]}  43.Nd4 {[%clk 0:00:47] [%eval 4.13] [%bestmove f3d4]}  43...Kd6 {[%clk 0:00:29] [%eval 4.93] [%bestmove d7b8]}  44.Ndxb5+ {[%clk 0:00:46] [%eval 4.34] [%bestmove c3b5]}  44...Ke7 {[%clk 0:00:27.5] [%eval 4.95] [%bestmove c6b5]}  45.Nd4 {[%clk 0:00:44.6] [%eval 5.15] [%bestmove b5a3]}  45...Bb7 {[%clk 0:00:27.4] [%eval 5.29] [%bestmove e7d6]}  46.e5 {[%clk 0:00:42.7] [%eval 4.73] [%bestmove d4e6]}  46...Nb6 {[%clk 0:00:26.4] [%eval 4.81] [%bestmove e7e8]}  47.e6 {[%clk 0:00:39.5] [%eval 4.47] [%bestmove f4e3]}  47...Kd6 {[%clk 0:00:25.5] [%eval 4.77] [%bestmove b6d7]}  48.Ndb5+ {[%clk 0:00:38.1] [%eval 4.87] [%bestmove g4g5]}  48...Ke7 {[%clk 0:00:23.7] [%eval 5.04] [%bestmove d6e7]}  49.Ke5 {[%clk 0:00:36.6] [%eval 5.14] [%bestmove f4e5]}  49...Bc6 {[%clk 0:00:22.5] [%eval 5.26] [%bestmove b7c6]}  50.g5 {[%clk 0:00:35.5] [%eval 5.11] [%bestmove b5d4]}  50...hxg5 {[%clk 0:00:21.2] [%eval 5.38] [%bestmove b6d7]}  51.hxg5 {[%clk 0:00:35.4] [%eval 5.41] [%bestmove h4g5]}  51...Nc8 {[%clk 0:00:19.4] [%eval 5.48] [%bestmove c6b5]}  52.f6+ {[%clk 0:00:34.3] [%eval 5.66] [%bestmove b5d4]}  52...gxf6+ {[%clk 0:00:19.3] [%eval 5.56] [%bestmove g7f6]}  53.gxf6+ {[%clk 0:00:34.1] [%eval 5.97] [%bestmove g5f6]}  53...Kf8 {[%clk 0:00:19.2] [%eval 6.39] [%bestmove e7f8]}  54.Nd6 {[%clk 0:00:32.5] [%eval 5.97] [%bestmove b5d6]}  54...Nb6 {[%clk 0:00:16] [%eval 7.98] [%bestmove c8d6]}  55.e7+ {[%clk 0:00:31.7] [%eval 7.50] [%bestmove e6e7]}  55...Kg8 {[%clk 0:00:15.2] [%eval 7.57] [%bestmove f8g8]}  56.f7+ {[%clk 0:00:30.7] [%eval 7.99] [%bestmove f6f7]}  1-0`
  },
  {
    id: 17,
    white: "GothamChess", white_elo: 2905,
    black: "AwesomeAtti", black_elo: 2819,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.31", round: "?", result: "1-0",
    eco: "A45",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.31"]
[Round "?"]
[White "GothamChess"]
[Black "AwesomeAtti"]
[Result "1-0"]
[WhiteElo "2905"]
[BlackElo "2819"]
[ECO "A45"]
[PlyCount "119"]
[CurrentPosition "8/4k3/6r1/4Pp2/5P2/3R1K2/8/8 b - - 4 60"]
[ECOUrl "https://www.chess.com/openings/Trompowsky-Attack-2...c6"]
[EndDate "2026.08.31"]
[EndTime "19:36:20"]
[Link "https://www.chess.com/game/live/173808956466"]
[StartTime "19:30:11"]
[Termination "GothamChess won on time"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.31"]
[UTCTime "19:30:11"]

{[%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:46:31Z"]}  1.d4 {[%clk 0:02:58.6] [%eval 0.09] [%bestmove e2e4]}  1...Nf6 {[%clk 0:02:58] [%eval 0.11] [%bestmove g8f6]}  2.Bg5 {[%clk 0:02:57.4] [%eval -0.02] [%bestmove c2c4]}  2...c6 {[%clk 0:02:55.6] [%eval 0.07] [%bestmove f6e4]}  3.Nd2 {[%clk 0:02:55.5] [%eval 0.01] [%bestmove c2c3]}  3...Qa5 {[%clk 0:02:52.5] [%eval 0.54] [%bestmove d8b6]}  4.Bxf6 {[%clk 0:02:53.7] [%eval 0.26] [%bestmove g1f3]}  4...gxf6 {[%clk 0:02:50.9] [%eval 0.44] [%bestmove e7f6]}  5.c3 {[%clk 0:02:53.2] [%eval 0.40] [%bestmove e2e4]}  5...f5 {[%clk 0:02:49.9] [%eval 0.46] [%bestmove h7h5]}  6.g3 {[%clk 0:02:50.9] [%eval 0.43] [%bestmove e2e3]}  6...d5 {[%clk 0:02:48] [%eval 0.45] [%bestmove d7d5]}  7.Bg2 {[%clk 0:02:48.5] [%eval 0.43] [%bestmove e2e3]}  7...Nd7 {[%clk 0:02:46.5] [%eval 0.53] [%bestmove b8d7]}  8.e3 {[%clk 0:02:45.6] [%eval 0.50] [%bestmove g1f3]}  8...Nf6 {[%clk 0:02:43.7] [%eval 0.62] [%bestmove e7e6]}  9.Ne2 {[%clk 0:02:43] [%eval 0.56] [%bestmove g1f3]}  9...h5 {[%clk 0:02:41.7] [%eval 0.61] [%bestmove a5b6]}  10.h4 {[%clk 0:02:41.9] [%eval 0.61] [%bestmove h2h4]}  10...e6 {[%clk 0:02:40] [%eval 0.44] [%bestmove c8d7]}  11.a3 {[%clk 0:02:40.9] [%eval 0.59] [%bestmove e1g1]}  11...Qc7 {[%clk 0:02:38.3] [%eval 0.67] [%bestmove b7b5]}  12.c4 {[%clk 0:02:39.6] [%eval 0.71] [%bestmove c3c4]}  12...a5 {[%clk 0:02:36] [%eval 0.80] [%bestmove h8g8]}  13.Rc1 {[%clk 0:02:37] [%eval 0.73] [%bestmove a1c1]}  13...Qb6 {[%clk 0:02:35.2] [%eval 0.92] [%bestmove c7b8]}  14.Qc2 {[%clk 0:02:33.7] [%eval 0.84] [%bestmove d1c2]}  14...Bd7 {[%clk 0:02:33.3] [%eval 0.88] [%bestmove b6d8]}  15.Nf4 {[%clk 0:02:31.4] [%eval 0.80] [%bestmove e2f4]}  15...Bh6 {[%clk 0:02:30.8] [%eval 0.82] [%bestmove b6d8]}  16.Nd3 {[%clk 0:02:28.4] [%eval 0.67] [%bestmove d2f3]}  16...Ne4 {[%clk 0:02:28.2] [%eval 0.86] [%bestmove e8g8]}  17.Nf3 {[%clk 0:02:25.4] [%eval 0.83] [%bestmove e1g1]}  17...a4 {[%clk 0:02:25] [%eval 0.99] [%bestmove e8g8]}  18.Nfe5 {[%clk 0:02:21.7] [%eval 0.99] [%bestmove f3e5]}  18...Bc8 {[%clk 0:02:19.8] [%eval 1.36] [%bestmove b6a5]}  19.cxd5 {[%clk 0:02:10.2] [%eval 1.25] [%bestmove e1g1]}  19...exd5 {[%clk 0:02:18.7] [%eval 1.30] [%bestmove e6d5]}  20.O-O {[%clk 0:02:04] [%eval 1.07] [%bestmove g2f3]}  20...Rg8 {[%clk 0:02:12.9] [%eval 1.71] [%bestmove h6f8]}  21.Kh2 {[%clk 0:02:00.3] [%eval 1.42] [%bestmove c2e2]}  21...Be6 {[%clk 0:02:09.5] [%eval 1.57] [%bestmove g8h8]}  22.Qe2 {[%clk 0:01:47.1] [%eval 1.50] [%bestmove c2d1]}  22...Nf6 {[%clk 0:02:08.5] [%eval 1.38] [%bestmove e4f6]}  23.Bf3 {[%clk 0:01:39.6] [%eval 1.33] [%bestmove c1c3]}  23...Rh8 {[%clk 0:02:06.8] [%eval 1.83] [%bestmove f6g4]}  24.Nc5 {[%clk 0:01:38.4] [%eval 1.44] [%bestmove f3h5]}  24...Bf8 {[%clk 0:01:59.6] [%eval 1.42] [%bestmove h6f8]}  25.Ned3 {[%clk 0:01:26.6] [%eval 1.52] [%bestmove e5d3]}  25...Bd6 {[%clk 0:01:57.8] [%eval 1.33] [%bestmove e6c8]}  26.Rb1 {[%clk 0:01:23.6] [%eval 0.90] [%bestmove e2c2]}  26...Ng4+ {[%clk 0:01:52.6] [%eval 1.40] [%bestmove f6e4]}  27.Kg2 {[%clk 0:01:21.8] [%eval 1.36] [%bestmove h2g2]}  27...Rg8 {[%clk 0:01:50.8] [%eval 1.63] [%bestmove e6c8]}  28.b3 {[%clk 0:01:19.4] [%eval 1.53] [%bestmove b2b4]}  28...Qc7 {[%clk 0:01:45.6] [%eval 1.81] [%bestmove e6c8]}  29.bxa4 {[%clk 0:01:16.1] [%eval 1.61] [%bestmove d3f4]}  29...Ra7 {[%clk 0:01:44.4] [%eval 2.17] [%bestmove e6c8]}  30.a5 {[%clk 0:01:14.4] [%eval 1.64] [%bestmove d3f4]}  30...Nf6 {[%clk 0:01:39.7] [%eval 2.21] [%bestmove e6c8]}  31.Rb6 {[%clk 0:01:08.8] [%eval 0.36] [%bestmove a5a6]}  31...Bxg3 {[%clk 0:01:36.1] [%eval -0.36] [%bestmove d6g3]}  32.Kh3 {[%clk 0:01:01.4] [%eval -1.03] [%bestmove g2h1]}  32...Bh2 {[%clk 0:01:30.3] [%eval 0.93] [%bestmove e6c8]}  33.Nxe6 {[%clk 0:00:57.6] [%eval 0.35] [%bestmove f1b1]}  33...fxe6 {[%clk 0:01:28.2] [%eval 0.35] [%bestmove f7e6]}  34.Nf4 {[%clk 0:00:54.8] [%eval -1.04] [%bestmove d3c5]}  34...Bxf4 {[%clk 0:01:25.2] [%eval -0.95] [%bestmove h2f4]}  35.exf4 {[%clk 0:00:54.7] [%eval -0.71] [%bestmove e3f4]}  35...Ke7 {[%clk 0:01:15.6] [%eval -0.58] [%bestmove f6e4]}  36.Qe5 {[%clk 0:00:52] [%eval -0.71] [%bestmove e2e3]}  36...Qxe5 {[%clk 0:01:13.2] [%eval -0.76] [%bestmove c7e5]}  37.fxe5 {[%clk 0:00:51.7] [%eval -0.92] [%bestmove f4e5]}  37...Nd7 {[%clk 0:01:05.3] [%eval -0.98] [%bestmove f6d7]}  38.Rb3 {[%clk 0:00:48.3] [%eval -0.89] [%bestmove b6b3]}  38...Rxa5 {[%clk 0:01:03.6] [%eval -1.03] [%bestmove a7a5]}  39.Bxh5 {[%clk 0:00:45.8] [%eval -1.43] [%bestmove f1c1]}  39...Ra4 {[%clk 0:00:57.7] [%eval -0.14] [%bestmove c6c5]}  40.Rd1 {[%clk 0:00:44.4] [%eval -0.83] [%bestmove b3b7]}  40...b6 {[%clk 0:00:53.4] [%eval -0.40] [%bestmove c6c5]}  41.Be2 {[%clk 0:00:41.9] [%eval -0.57] [%bestmove h5e2]}  41...Rh8 {[%clk 0:00:50.7] [%eval 0.14] [%bestmove c6c5]}  42.h5 {[%clk 0:00:40.7] [%eval -0.38] [%bestmove b3g3]}  42...c5 {[%clk 0:00:49.3] [%eval -0.23] [%bestmove c6c5]}  43.Bb5 {[%clk 0:00:39.4] [%eval -1.21] [%bestmove d1g1]}  43...Rxh5+ {[%clk 0:00:42.1] [%eval -1.41] [%bestmove h8h5]}  44.Kg3 {[%clk 0:00:37.5] [%eval -1.87] [%bestmove h3g2]}  44...Ra5 {[%clk 0:00:39.9] [%eval -1.12] [%bestmove a4d4]}  45.Bxd7 {[%clk 0:00:34.3] [%eval -0.72] [%bestmove f2f3]}  45...Kxd7 {[%clk 0:00:39.1] [%eval -0.67] [%bestmove h5g5]}  46.Rxb6 {[%clk 0:00:34.2] [%eval -0.63] [%bestmove b3b6]}  46...Rxa3+ {[%clk 0:00:37.5] [%eval -0.17] [%bestmove h5g5]}  47.f3 {[%clk 0:00:33] [%eval -0.22] [%bestmove f2f3]}  47...cxd4 {[%clk 0:00:23] [%eval -0.13] [%bestmove c5d4]}  48.Rd6+ {[%clk 0:00:31.7] [%eval -1.57] [%bestmove d1d4]}  48...Ke7 {[%clk 0:00:21.6] [%eval -1.15] [%bestmove d7e7]}  49.Rxd4 {[%clk 0:00:31.6] [%eval -1.80] [%bestmove d6c6]}  49...Ra1 {[%clk 0:00:18] [%eval -0.56] [%bestmove a3e3]}  50.Rb4 {[%clk 0:00:29.2] [%eval -1.10] [%bestmove d6b6]}  50...Ra7 {[%clk 0:00:17.2] [%eval -0.24] [%bestmove f5f4]}  51.Rbb6 {[%clk 0:00:27.8] [%eval -0.74] [%bestmove d6b6]}  51...Rh6 {[%clk 0:00:16.6] [%eval -0.04] [%bestmove f5f4]}  52.Rxd5 {[%clk 0:00:27.2] [%eval 0.00] [%bestmove g3f4]}  52...exd5 {[%clk 0:00:11.1] [%eval 0.98] [%bestmove h6g6]}  53.Rxh6 {[%clk 0:00:25.8] [%eval 0.34] [%bestmove b6h6]}  53...Ra4 {[%clk 0:00:10.6] [%eval 0.71] [%bestmove a7d7]}  54.f4 {[%clk 0:00:24.5] [%eval 0.30] [%bestmove h6f6]}  54...Re4 {[%clk 0:00:08.5] [%eval 0.08] [%bestmove a4e4]}  55.Rf6 {[%clk 0:00:20.9] [%eval 0.07] [%bestmove h6h7]}  55...d4 {[%clk 0:00:07.7] [%eval 0.07] [%bestmove d5d4]}  56.Kf3 {[%clk 0:00:20] [%eval 0.05] [%bestmove g3f3]}  56...d3 {[%clk 0:00:06.5] [%eval 1.28] [%bestmove e4e3]}  57.Rd6 {[%clk 0:00:19.6] [%eval 1.41] [%bestmove f6d6]}  57...Ra4 {[%clk 0:00:03] [%eval 1.32] [%bestmove e4c4]}  58.Rxd3 {[%clk 0:00:18.7] [%eval 1.37] [%bestmove d6d3]}  58...Ra6 {[%clk 0:00:01.9] [%eval 1.29] [%bestmove a4a6]}  59.Kg3 {[%clk 0:00:17.5] [%eval 1.30] [%bestmove d3d5]}  59...Rg6+ {[%clk 0:00:00.5] [%eval 1.29] [%bestmove a6g6]}  60.Kf3 {[%clk 0:00:16.4] [%eval 1.45] [%bestmove g3f2]}  1-0`
  },
  {
    id: 18,
    white: "GothamChess", white_elo: 2899,
    black: "AwesomeAtti", black_elo: 2807,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.31", round: "?", result: "1-0",
    eco: "D00",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.31"]
[Round "?"]
[White "GothamChess"]
[Black "AwesomeAtti"]
[Result "1-0"]
[WhiteElo "2899"]
[BlackElo "2807"]
[ECO "D00"]
[PlyCount "69"]
[CurrentPosition "2b1Q1k1/8/p4p1K/1p1p2p1/3P4/P3P1p1/2r3PP/5r2 b - - 1 35"]
[ECOUrl "https://www.chess.com/openings/Queens-Pawn-Opening-Levitsky-Attack"]
[EndDate "2026.08.31"]
[EndTime "19:09:54"]
[Link "https://www.chess.com/game/live/173807912828"]
[StartTime "19:04:24"]
[Termination "GothamChess won by checkmate"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.31"]
[UTCTime "19:04:24"]

{[%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:46:34Z"]}  1.d4 {[%clk 0:02:56.7] [%eval 0.11] [%bestmove e2e4]}  1...d5 {[%clk 0:02:59.1] [%eval 0.19] [%bestmove d7d5]}  2.Bg5 {[%clk 0:02:55.3] [%eval 0.07] [%bestmove g1f3]}  2...Nd7 {[%clk 0:02:57.9] [%eval 0.20] [%bestmove c7c6]}  3.c4 {[%clk 0:02:54.1] [%eval 0.43] [%bestmove e2e3]}  3...c6 {[%clk 0:02:56.9] [%eval 0.46] [%bestmove d5c4]}  4.cxd5 {[%clk 0:02:53.3] [%eval 0.41] [%bestmove c4d5]}  4...cxd5 {[%clk 0:02:56.8] [%eval 0.43] [%bestmove c6d5]}  5.Nc3 {[%clk 0:02:52.8] [%eval 0.43] [%bestmove b1c3]}  5...Ngf6 {[%clk 0:02:56.4] [%eval 0.44] [%bestmove g8f6]}  6.e3 {[%clk 0:02:52.2] [%eval 0.35] [%bestmove d1c2]}  6...e6 {[%clk 0:02:56] [%eval 0.75] [%bestmove f6e4]}  7.Bd3 {[%clk 0:02:51.2] [%eval 0.71] [%bestmove f1d3]}  7...Be7 {[%clk 0:02:55.2] [%eval 0.58] [%bestmove a7a6]}  8.f4 {[%clk 0:02:50.3] [%eval 0.56] [%bestmove d1c2]}  8...a6 {[%clk 0:02:53.1] [%eval 0.63] [%bestmove h7h6]}  9.Nf3 {[%clk 0:02:49.4] [%eval 0.55] [%bestmove g1f3]}  9...b5 {[%clk 0:02:52.3] [%eval 0.65] [%bestmove h7h6]}  10.O-O {[%clk 0:02:47.4] [%eval 0.64] [%bestmove e1g1]}  10...Bb7 {[%clk 0:02:51.9] [%eval 0.63] [%bestmove h7h6]}  11.Ne5 {[%clk 0:02:45.7] [%eval 0.54] [%bestmove f3e5]}  11...O-O {[%clk 0:02:50.9] [%eval 0.65] [%bestmove e8g8]}  12.Rf3 {[%clk 0:02:38.5] [%eval 0.30] [%bestmove d1f3]}  12...Ne4 {[%clk 0:02:45.6] [%eval 0.65] [%bestmove f6e4]}  13.Bxe7 {[%clk 0:02:35.8] [%eval 0.29] [%bestmove d3e4]}  13...Qxe7 {[%clk 0:02:45.5] [%eval 0.08] [%bestmove d8e7]}  14.Rh3 {[%clk 0:02:26.2] [%eval 0.00] [%bestmove f3h3]}  14...Ndf6 {[%clk 0:02:40.4] [%eval 0.64] [%bestmove g7g6]}  15.Ng4 {[%clk 0:02:14.3] [%eval -0.29] [%bestmove g2g4]}  15...Nxg4 {[%clk 0:02:24.5] [%eval -0.44] [%bestmove f6g4]}  16.Qxg4 {[%clk 0:02:07.8] [%eval -0.46] [%bestmove d3e4]}  16...g6 {[%clk 0:02:22.1] [%eval -0.01] [%bestmove f7f5]}  17.Rh6 {[%clk 0:01:58.6] [%eval -0.59] [%bestmove d3e4]}  17...Rac8 {[%clk 0:02:07.4] [%eval -0.51] [%bestmove f7f5]}  18.Qh3 {[%clk 0:01:52.2] [%eval -0.60] [%bestmove g4h3]}  18...f6 {[%clk 0:02:01.8] [%eval -0.35] [%bestmove f7f6]}  19.Rf1 {[%clk 0:01:37.1] [%eval -0.70] [%bestmove g2g4]}  19...Rfe8 {[%clk 0:01:50.6] [%eval -0.17] [%bestmove f8f7]}  20.a3 {[%clk 0:01:28.4] [%eval -0.21] [%bestmove a2a3]}  20...Qg7 {[%clk 0:01:49.5] [%eval 0.28] [%bestmove f6f5]}  21.Rf3 {[%clk 0:01:23.3] [%eval -1.09] [%bestmove d3e4]}  21...Nxc3 {[%clk 0:01:42.7] [%eval -0.36] [%bestmove e4c3]}  22.bxc3 {[%clk 0:01:21] [%eval -0.71] [%bestmove b2c3]}  22...Rxc3 {[%clk 0:01:41.6] [%eval -0.07] [%bestmove f6f5]}  23.Bxg6 {[%clk 0:01:18.7] [%eval 1.81] [%bestmove d3g6]}  23...Rc1+ {[%clk 0:01:36.9] [%eval 1.86] [%bestmove h7g6]}  24.Kf2 {[%clk 0:01:17.5] [%eval 2.10] [%bestmove g1f2]}  24...hxg6 {[%clk 0:01:19.6] [%eval 3.58] [%bestmove h7g6]}  25.Rg3 {[%clk 0:01:15.9] [%eval 2.68] [%bestmove f3g3]}  25...g5 {[%clk 0:01:05.5] [%eval 2.30] [%bestmove g6g5]}  26.Qh5 {[%clk 0:01:14.3] [%eval 3.57] [%bestmove h3h5]}  26...Rec8 {[%clk 0:00:59] [%eval 3.63] [%bestmove e8c8]}  27.Rg6 {[%clk 0:01:09.4] [%eval 3.74] [%bestmove h6g6]}  27...R8c2+ {[%clk 0:00:45.5] [%eval 4.32] [%bestmove c8c3]}  28.Kf3 {[%clk 0:01:08.3] [%eval 3.94] [%bestmove f2f3]}  28...Rf1+ {[%clk 0:00:23.6] [%eval 4.09] [%bestmove b5b4]}  29.Kg4 {[%clk 0:01:06.9] [%eval 4.60] [%bestmove f3g4]}  29...Bc8 {[%clk 0:00:21.4] [%eval 4.60] [%bestmove b7c6]}  30.Rxg7+ {[%clk 0:00:56.3] [%eval 5.21] [%bestmove g6g7]}  30...Kxg7 {[%clk 0:00:21.3] [%eval 5.28] [%bestmove g8g7]}  31.Qe8 {[%clk 0:00:50.5] [%eval 3.67] [%bestmove f4g5]}  31...e5+ {[%clk 0:00:19.8] [%eval 5.84] [%bestmove b5b4]}  32.Kh5 {[%clk 0:00:48.6] [%eval 5.06] [%bestmove g4h5]}  32...exf4 {[%clk 0:00:11.1] [%eval 6.88] [%bestmove f1h1]}  33.Qe7+ {[%clk 0:00:38.3] [%eval 6.88] [%bestmove e8g6]}  33...Kg8 {[%clk 0:00:09.9] [%eval 7.20] [%bestmove g7g8]}  34.Kh6 {[%clk 0:00:34.9] [%eval #1] [%bestmove e7e8]}  34...fxg3 {[%clk 0:00:05.4] [%eval #1] [%bestmove f4g3]}  35.Qe8# {[%clk 0:00:33] [%bestmove e7e8]}  1-0`
  },
  {
    id: 19,
    white: "GothamChess", white_elo: 2893,
    black: "AwesomeAtti", black_elo: 2801,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.31", round: "?", result: "1-0",
    eco: "A45",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.31"]
[Round "?"]
[White "GothamChess"]
[Black "AwesomeAtti"]
[Result "1-0"]
[WhiteElo "2893"]
[BlackElo "2801"]
[ECO "A45"]
[PlyCount "31"]
[CurrentPosition "r1b1k2r/p3qpp1/2nNp2p/4P3/3Pp3/2p5/PPB3PP/R2Q1RK1 b kq - 1 16"]
[ECOUrl "https://www.chess.com/openings/Trompowsky-Attack...3.e3-e6-4.Nd2-Be7-5.Bd3"]
[EndDate "2026.08.31"]
[EndTime "19:03:54"]
[Link "https://www.chess.com/game/live/173807845438"]
[StartTime "19:02:45"]
[Termination "GothamChess won by resignation"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.31"]
[UTCTime "19:02:45"]

{[%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:46:36Z"]}  1.d4 {[%clk 0:02:58.7] [%eval 0.13] [%bestmove e2e4]}  1...Nf6 {[%clk 0:02:58.9] [%eval 0.17] [%bestmove g8f6]}  2.Bg5 {[%clk 0:02:57.3] [%eval 0.11] [%bestmove g1f3]}  2...e6 {[%clk 0:02:57.7] [%eval 0.27] [%bestmove d7d5]}  3.Nd2 {[%clk 0:02:56] [%eval 0.21] [%bestmove e2e4]}  3...d5 {[%clk 0:02:56.8] [%eval 0.21] [%bestmove h7h6]}  4.e3 {[%clk 0:02:55.1] [%eval 0.18] [%bestmove e2e4]}  4...Be7 {[%clk 0:02:55.5] [%eval 0.24] [%bestmove c7c5]}  5.Bd3 {[%clk 0:02:54.4] [%eval 0.25] [%bestmove c2c3]}  5...h6 {[%clk 0:02:54.3] [%eval 0.19] [%bestmove c7c5]}  6.Bxf6 {[%clk 0:02:52.6] [%eval 0.01] [%bestmove g5f4]}  6...Bxf6 {[%clk 0:02:54.2] [%eval 0.02] [%bestmove e7f6]}  7.f4 {[%clk 0:02:51.7] [%eval 0.10] [%bestmove c2c3]}  7...c5 {[%clk 0:02:52.9] [%eval 0.19] [%bestmove c7c5]}  8.c3 {[%clk 0:02:50.9] [%eval 0.17] [%bestmove c2c3]}  8...Nc6 {[%clk 0:02:51.6] [%eval 0.24] [%bestmove d8b6]}  9.Ngf3 {[%clk 0:02:50.1] [%eval 0.48] [%bestmove g1f3]}  9...c4 {[%clk 0:02:49.4] [%eval 0.82] [%bestmove c8d7]}  10.Bc2 {[%clk 0:02:49] [%eval 0.88] [%bestmove d3c2]}  10...b5 {[%clk 0:02:48.4] [%eval 0.98] [%bestmove b7b5]}  11.Ne5 {[%clk 0:02:47.2] [%eval 0.78] [%bestmove e1g1]}  11...Bxe5 {[%clk 0:02:46.8] [%eval 0.66] [%bestmove c6e5]}  12.fxe5 {[%clk 0:02:44.6] [%eval 0.85] [%bestmove f4e5]}  12...b4 {[%clk 0:02:43.7] [%eval 0.96] [%bestmove d8h4]}  13.O-O {[%clk 0:02:42.4] [%eval 0.77] [%bestmove e1g1]}  13...Qe7 {[%clk 0:02:38.2] [%eval 1.43] [%bestmove b4c3]}  14.e4 {[%clk 0:02:41.2] [%eval 0.92] [%bestmove d1g4]}  14...dxe4 {[%clk 0:02:33.1] [%eval 3.74] [%bestmove e8g8]}  15.Nxc4 {[%clk 0:02:37.2] [%eval 2.79] [%bestmove d2e4]}  15...bxc3 {[%clk 0:02:29.2] [%eval 4.76] [%bestmove e8g8]}  16.Nd6+ {[%clk 0:02:33.8] [%eval 4.83] [%bestmove c4d6]}  1-0`
  },
  {
    id: 20,
    white: "AwesomeAtti", white_elo: 2773,
    black: "GothamChess", black_elo: 2887,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.31", round: "?", result: "0-1",
    eco: "A40",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.31"]
[Round "?"]
[White "AwesomeAtti"]
[Black "GothamChess"]
[Result "0-1"]
[WhiteElo "2773"]
[BlackElo "2887"]
[ECO "A40"]
[PlyCount "42"]
[CurrentPosition "r5k1/3q1ppp/pp1b4/2p3r1/4N3/PP2n2P/1BQ2P2/3R1R1K w - - 0 22"]
[ECOUrl "https://www.chess.com/openings/Indian-Game-Accelerated-Variation...4.d5-e6-5.a3-Bd6-6.Nf3"]
[EndDate "2026.08.31"]
[EndTime "17:00:14"]
[Link "https://www.chess.com/game/live/173802435836"]
[StartTime "16:57:52"]
[Termination "GothamChess won by resignation"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.31"]
[UTCTime "16:57:52"]

{[%engine name="Stockfish 16" depth=10 hash=512 timestamp="2026-09-12T00:46:36Z"]}  1.c4 {[%clk 0:02:59.1] [%eval -0.08] [%bestmove e2e4]}  1...b6 {[%clk 0:02:59] [%eval 0.37] [%bestmove e7e5]}  2.d4 {[%clk 0:02:57.6] [%eval 0.65] [%bestmove g1f3]}  2...Bb7 {[%clk 0:02:58.9] [%eval 0.65] [%bestmove e7e6]}  3.Nc3 {[%clk 0:02:57.4] [%eval 0.73] [%bestmove b1c3]}  3...e6 {[%clk 0:02:58.3] [%eval 0.72] [%bestmove e7e6]}  4.a3 {[%clk 0:02:57.1] [%eval 0.58] [%bestmove e2e4]}  4...Nf6 {[%clk 0:02:55.9] [%eval 0.55] [%bestmove g8f6]}  5.d5 {[%clk 0:02:56.2] [%eval 0.38] [%bestmove d4d5]}  5...Bd6 {[%clk 0:02:51.4] [%eval 0.42] [%bestmove f8d6]}  6.Nf3 {[%clk 0:02:55.6] [%eval 0.48] [%bestmove g1f3]}  6...exd5 {[%clk 0:02:50.2] [%eval 0.57] [%bestmove e8g8]}  7.cxd5 {[%clk 0:02:55.5] [%eval 0.59] [%bestmove c4d5]}  7...O-O {[%clk 0:02:49.5] [%eval 0.71] [%bestmove e8g8]}  8.e3 {[%clk 0:02:51.4] [%eval 0.07] [%bestmove c1g5]}  8...c6 {[%clk 0:02:44.6] [%eval 0.27] [%bestmove c7c6]}  9.dxc6 {[%clk 0:02:48.5] [%eval -0.50] [%bestmove b2b4]}  9...dxc6 {[%clk 0:02:44.5] [%eval -0.51] [%bestmove d7c6]}  10.Be2 {[%clk 0:02:47.6] [%eval -0.47] [%bestmove d1c2]}  10...Qc7 {[%clk 0:02:38.1] [%eval -0.07] [%bestmove d8e7]}  11.O-O {[%clk 0:02:46.8] [%eval -0.31] [%bestmove b2b3]}  11...Re8 {[%clk 0:02:35.3] [%eval -0.29] [%bestmove b8d7]}  12.Qc2 {[%clk 0:02:45.5] [%eval -0.39] [%bestmove b2b4]}  12...Nbd7 {[%clk 0:02:32.9] [%eval -0.69] [%bestmove b8d7]}  13.b3 {[%clk 0:02:42.8] [%eval -0.46] [%bestmove b2b4]}  13...Ne5 {[%clk 0:02:28.4] [%eval -0.29] [%bestmove a7a6]}  14.h3 {[%clk 0:02:38.6] [%eval -0.34] [%bestmove h2h3]}  14...a6 {[%clk 0:02:20.9] [%eval -0.34] [%bestmove a8d8]}  15.Bb2 {[%clk 0:02:37.7] [%eval -0.38] [%bestmove a3a4]}  15...c5 {[%clk 0:02:20.2] [%eval -0.27] [%bestmove c6c5]}  16.Nxe5 {[%clk 0:02:35.3] [%eval -0.98] [%bestmove f1d1]}  16...Rxe5 {[%clk 0:02:16.2] [%eval -0.81] [%bestmove e8e5]}  17.Rad1 {[%clk 0:02:18.8] [%eval -1.08] [%bestmove f1d1]}  17...Bxg2 {[%clk 0:02:05.6] [%eval 0.37] [%bestmove b6b5]}  18.Kxg2 {[%clk 0:02:16.4] [%eval 0.37] [%bestmove g1g2]}  18...Rg5+ {[%clk 0:02:04.1] [%eval 0.59] [%bestmove e5g5]}  19.Kh1 {[%clk 0:02:14.9] [%eval -1.07] [%bestmove e2g4]}  19...Qd7 {[%clk 0:02:02.2] [%eval -3.40] [%bestmove c7c8]}  20.Bg4 {[%clk 0:02:07] [%eval -3.49] [%bestmove e2g4]}  20...Nxg4 {[%clk 0:01:55.6] [%eval -4.66] [%bestmove f6g4]}  21.Ne4 {[%clk 0:02:06.2] [%eval -5.37] [%bestmove h3g4]}  21...Nxe3 {[%clk 0:01:53.5] [%eval -5.14] [%bestmove g4e3]}  0-1`
  },
  {
    id: 21,
    white: "MagnusCarlsen", white_elo: 3307,
    black: "AwesomeAtti", black_elo: 2992,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.31", round: "?", result: "1-0",
    eco: "A18",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.31"]
[Round "?"]
[White "MagnusCarlsen"]
[Black "AwesomeAtti"]
[Result "1-0"]
[WhiteElo "3307"]
[BlackElo "2992"]
[ECO "A18"]
[PlyCount "50"]
[CurrentPosition "8/pp3Rpk/6pp/3p4/2q5/3Q4/P1p3PP/2R3K1 w - - 1 26"]
[ECOUrl "https://www.chess.com/openings/English-Opening-Mikenas-Carls-Variation...4.cxd5-exd5-5.e5-Ne4-6.Nf3"]
[EndDate "2026.08.31"]
[EndTime "18:52:27"]
[Link "https://www.chess.com/game/live/173807323882"]
[StartTime "18:50:07"]
[Termination "MagnusCarlsen won by resignation"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.31"]
[UTCTime "18:50:07"]

1.c4 {[%clk 0:02:58.8]}  1...Nf6 {[%clk 0:02:59.1]}  2.Nc3 {[%clk 0:02:57.9]}  2...e6 {[%clk 0:02:57.3]}  3.e4 {[%clk 0:02:56.7]}  3...d5 {[%clk 0:02:56.9]}  4.cxd5 {[%clk 0:02:53.5]}  4...exd5 {[%clk 0:02:56.4]}  5.e5 {[%clk 0:02:53.1]}  5...Ne4 {[%clk 0:02:56]}  6.Nf3 {[%clk 0:02:51.1]}  6...Nxc3 {[%clk 0:02:52.6]}  7.bxc3 {[%clk 0:02:49.9]}  7...Be7 {[%clk 0:02:51.7]}  8.d4 {[%clk 0:02:49.3]}  8...Bf5 {[%clk 0:02:49.4]}  9.Bd3 {[%clk 0:02:46.5]}  9...Bxd3 {[%clk 0:02:45]}  10.Qxd3 {[%clk 0:02:46.4]}  10...Qd7 {[%clk 0:02:44.4]}  11.Bg5 {[%clk 0:02:41.9]}  11...Nc6 {[%clk 0:02:41.1]}  12.O-O {[%clk 0:02:40.8]}  12...O-O {[%clk 0:02:39.5]}  13.Rae1 {[%clk 0:02:38.4]}  13...h6 {[%clk 0:02:37.3]}  14.Bxe7 {[%clk 0:02:35.8]}  14...Nxe7 {[%clk 0:02:32.5]}  15.Nh4 {[%clk 0:02:34.9]}  15...c5 {[%clk 0:02:28]}  16.f4 {[%clk 0:02:33.4]}  16...cxd4 {[%clk 0:02:23.5]}  17.f5 {[%clk 0:02:27.5]}  17...dxc3 {[%clk 0:02:20.4]}  18.f6 {[%clk 0:02:23]}  18...Ng6 {[%clk 0:02:12.7]}  19.e6 {[%clk 0:02:16.4]}  19...Qc7 {[%clk 0:02:02.8]}  20.Nxg6 {[%clk 0:02:08.9]}  20...fxg6 {[%clk 0:02:00.1]}  21.f7+ {[%clk 0:02:07.6]}  21...Kh7 {[%clk 0:01:58]}  22.e7 {[%clk 0:02:06.6]}  22...c2 {[%clk 0:01:55.6]}  23.exf8=Q {[%clk 0:02:00.7]}  23...Rxf8 {[%clk 0:01:55.5]}  24.Rc1 {[%clk 0:01:58.7]}  24...Rxf7 {[%clk 0:01:53.5]}  25.Rxf7 {[%clk 0:01:58.6]}  25...Qc4 {[%clk 0:01:50.2]}  1-0`
  },
  {
    id: 22,
    white: "AwesomeAtti", white_elo: 2994,
    black: "MagnusCarlsen", black_elo: 3305,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.31", round: "?", result: "0-1",
    eco: "B48",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.31"]
[Round "?"]
[White "AwesomeAtti"]
[Black "MagnusCarlsen"]
[Result "0-1"]
[WhiteElo "2994"]
[BlackElo "3305"]
[ECO "B48"]
[PlyCount "136"]
[CurrentPosition "8/5R2/4p3/8/8/kr5p/6q1/7K w - - 6 69"]
[ECOUrl "https://www.chess.com/openings/Sicilian-Defense-Taimanov-Bastrikov-Variation-6.Be3-a6-7.a3-b5"]
[EndDate "2026.08.31"]
[EndTime "18:50:03"]
[Link "https://www.chess.com/game/live/173807069954"]
[StartTime "18:44:02"]
[Termination "MagnusCarlsen won by checkmate"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.31"]
[UTCTime "18:44:02"]

1.e4 {[%clk 0:02:59.3]}  1...c5 {[%clk 0:02:57.8]}  2.Nf3 {[%clk 0:02:58.2]}  2...e6 {[%clk 0:02:56.9]}  3.d4 {[%clk 0:02:55.7]}  3...cxd4 {[%clk 0:02:56.8]}  4.Nxd4 {[%clk 0:02:55.6]}  4...Nc6 {[%clk 0:02:55.9]}  5.Nc3 {[%clk 0:02:52.4]}  5...Qc7 {[%clk 0:02:54.7]}  6.Be3 {[%clk 0:02:48.2]}  6...a6 {[%clk 0:02:53.3]}  7.a3 {[%clk 0:02:40]}  7...b5 {[%clk 0:02:47.8]}  8.f4 {[%clk 0:02:37.6]}  8...Bb7 {[%clk 0:02:34.9]}  9.Qf3 {[%clk 0:02:34.2]}  9...Nf6 {[%clk 0:02:28.6]}  10.Bd3 {[%clk 0:02:31.1]}  10...b4 {[%clk 0:02:17.7]}  11.axb4 {[%clk 0:02:29.1]}  11...Nxb4 {[%clk 0:02:17.6]}  12.O-O {[%clk 0:02:25.9]}  12...Bc5 {[%clk 0:02:16.7]}  13.Na4 {[%clk 0:02:15.1]}  13...Ba7 {[%clk 0:02:13.5]}  14.Kh1 {[%clk 0:02:06.4]}  14...O-O {[%clk 0:02:10.9]}  15.Rad1 {[%clk 0:02:00.2]}  15...Rac8 {[%clk 0:02:04.2]}  16.Nc3 {[%clk 0:01:54.9]}  16...Bc5 {[%clk 0:01:46.6]}  17.Nb3 {[%clk 0:01:48.4]}  17...Bxe3 {[%clk 0:01:35.7]}  18.Qxe3 {[%clk 0:01:48.3]}  18...e5 {[%clk 0:01:33.8]}  19.fxe5 {[%clk 0:01:43.9]}  19...Ng4 {[%clk 0:01:29.2]}  20.Qg3 {[%clk 0:01:34.2]}  20...Nxe5 {[%clk 0:01:27.2]}  21.Nd4 {[%clk 0:01:30.7]}  21...Nexd3 {[%clk 0:01:24.7]}  22.Qxc7 {[%clk 0:01:26.3]}  22...Rxc7 {[%clk 0:01:24.6]}  23.cxd3 {[%clk 0:01:25.5]}  23...d5 {[%clk 0:01:23]}  24.Nf5 {[%clk 0:01:22.8]}  24...dxe4 {[%clk 0:01:15.1]}  25.dxe4 {[%clk 0:01:22.7]}  25...g6 {[%clk 0:01:02.9]}  26.Nd6 {[%clk 0:01:21.1]}  26...Kg7 {[%clk 0:01:01.6]}  27.Nxb7 {[%clk 0:01:14.7]}  27...Rxb7 {[%clk 0:01:00.4]}  28.Rd6 {[%clk 0:01:14.6]}  28...Re8 {[%clk 0:00:56.4]}  29.h3 {[%clk 0:01:10.8]}  29...a5 {[%clk 0:00:55.4]}  30.Kh2 {[%clk 0:01:06.5]}  30...h5 {[%clk 0:00:53.9]}  31.Rf2 {[%clk 0:00:58.7]}  31...Re5 {[%clk 0:00:51.7]}  32.Rfd2 {[%clk 0:00:56]}  32...Rc5 {[%clk 0:00:42.2]}  33.Rd8 {[%clk 0:00:54.2]}  33...Rbc7 {[%clk 0:00:37.2]}  34.R2d6 {[%clk 0:00:51.8]}  34...Nc6 {[%clk 0:00:35.5]}  35.R8d7 {[%clk 0:00:48.6]}  35...Rxd7 {[%clk 0:00:33.8]}  36.Rxd7 {[%clk 0:00:48.5]}  36...Ne5 {[%clk 0:00:33.4]}  37.Rb7 {[%clk 0:00:43.9]}  37...Nd3 {[%clk 0:00:31.4]}  38.h4 {[%clk 0:00:36.5]}  38...Nxb2 {[%clk 0:00:29.4]}  39.Rxb2 {[%clk 0:00:36.4]}  39...Rxc3 {[%clk 0:00:28.3]}  40.Rb5 {[%clk 0:00:34.6]}  40...a4 {[%clk 0:00:27.7]}  41.Ra5 {[%clk 0:00:34.1]}  41...Rc4 {[%clk 0:00:27.1]}  42.e5 {[%clk 0:00:31.9]}  42...Rxh4+ {[%clk 0:00:25.8]}  43.Kg3 {[%clk 0:00:31.8]}  43...Rg4+ {[%clk 0:00:25.7]}  44.Kf3 {[%clk 0:00:31.7]}  44...Kf8 {[%clk 0:00:25.3]}  45.Ra7 {[%clk 0:00:30.4]}  45...Rb4 {[%clk 0:00:24.1]}  46.g3 {[%clk 0:00:29.7]}  46...g5 {[%clk 0:00:23.2]}  47.Ra6 {[%clk 0:00:28.2]}  47...Ke7 {[%clk 0:00:22]}  48.Ke3 {[%clk 0:00:26.4]}  48...h4 {[%clk 0:00:20.9]}  49.gxh4 {[%clk 0:00:25.5]}  49...gxh4 {[%clk 0:00:20.8]}  50.Kf3 {[%clk 0:00:25.4]}  50...h3 {[%clk 0:00:18.2]}  51.Kg3 {[%clk 0:00:24.8]}  51...Rb3+ {[%clk 0:00:17.3]}  52.Kh2 {[%clk 0:00:24.6]}  52...a3 {[%clk 0:00:17.2]}  53.Kg1 {[%clk 0:00:22.2]}  53...Kd7 {[%clk 0:00:16.1]}  54.Kh2 {[%clk 0:00:20.2]}  54...Kc7 {[%clk 0:00:14.9]}  55.Kh1 {[%clk 0:00:17.8]}  55...Kb7 {[%clk 0:00:13.5]}  56.Ra4 {[%clk 0:00:17.7]}  56...Kb6 {[%clk 0:00:12.5]}  57.Kh2 {[%clk 0:00:17.4]}  57...Kb5 {[%clk 0:00:12.4]}  58.Ra8 {[%clk 0:00:16.7]}  58...Kb4 {[%clk 0:00:12.3]}  59.e6 {[%clk 0:00:15.2]}  59...fxe6 {[%clk 0:00:11.4]}  60.Rc8 {[%clk 0:00:14.7]}  60...a2 {[%clk 0:00:10.3]}  61.Ra8 {[%clk 0:00:14.3]}  61...Ra3 {[%clk 0:00:08.5]}  62.Rb8+ {[%clk 0:00:13.9]}  62...Kc3 {[%clk 0:00:08]}  63.Rc8+ {[%clk 0:00:13.7]}  63...Kb2 {[%clk 0:00:07.9]}  64.Rb8+ {[%clk 0:00:13.3]}  64...Rb3 {[%clk 0:00:07.8]}  65.Rf8 {[%clk 0:00:12.1]}  65...a1=Q {[%clk 0:00:07.7]}  66.Rf2+ {[%clk 0:00:12]}  66...Ka3 {[%clk 0:00:07.2]}  67.Rf7 {[%clk 0:00:11.9]}  67...Qb2+ {[%clk 0:00:07]}  68.Kh1 {[%clk 0:00:10.3]}  68...Qg2# {[%clk 0:00:06.9]}  0-1`
  },
  {
    id: 23,
    white: "MagnusCarlsen", white_elo: 3303,
    black: "AwesomeAtti", black_elo: 2996,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.31", round: "?", result: "1-0",
    eco: "A45",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.31"]
[Round "?"]
[White "MagnusCarlsen"]
[Black "AwesomeAtti"]
[Result "1-0"]
[WhiteElo "3303"]
[BlackElo "2996"]
[ECO "A45"]
[PlyCount "95"]
[CurrentPosition "5R1k/2N5/6K1/2P5/6P1/7P/P7/8 b - - 4 48"]
[ECOUrl "https://www.chess.com/openings/Trompowsky-Attack-Poisoned-Pawn-Chepukaitis-Gambit-5.Bd2-Qb6-6.e4-d6-7.f4"]
[EndDate "2026.08.31"]
[EndTime "18:21:35"]
[Link "https://www.chess.com/game/live/173805859544"]
[StartTime "18:15:25"]
[Termination "MagnusCarlsen won by checkmate"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.31"]
[UTCTime "18:15:25"]

1.d4 {[%clk 0:02:57.5]}  1...Nf6 {[%clk 0:02:59.4]}  2.Bf4 {[%clk 0:02:56.2]}  2...c5 {[%clk 0:02:58.4]}  3.d5 {[%clk 0:02:55.3]}  3...Qb6 {[%clk 0:02:57.9]}  4.Nc3 {[%clk 0:02:54.1]}  4...Qxb2 {[%clk 0:02:50.1]}  5.Bd2 {[%clk 0:02:52.3]}  5...Qb6 {[%clk 0:02:45.7]}  6.e4 {[%clk 0:02:49.4]}  6...d6 {[%clk 0:02:44.6]}  7.f4 {[%clk 0:02:46.3]}  7...Bg4 {[%clk 0:02:41.5]}  8.Be2 {[%clk 0:02:41.5]}  8...Bxe2 {[%clk 0:02:40.2]}  9.Qxe2 {[%clk 0:02:41.4]}  9...g6 {[%clk 0:02:28.5]}  10.e5 {[%clk 0:02:40.4]}  10...Nh5 {[%clk 0:02:24.5]}  11.Nf3 {[%clk 0:02:33.3]}  11...Bh6 {[%clk 0:02:21.5]}  12.Rb1 {[%clk 0:02:32.1]}  12...Qd8 {[%clk 0:02:14.9]}  13.g3 {[%clk 0:02:09.7]}  13...dxe5 {[%clk 0:02:06.2]}  14.Rxb7 {[%clk 0:02:01.2]}  14...O-O {[%clk 0:02:00.7]}  15.fxe5 {[%clk 0:01:51.7]}  15...Bxd2+ {[%clk 0:01:59]}  16.Qxd2 {[%clk 0:01:46.9]}  16...Nd7 {[%clk 0:01:50.6]}  17.O-O {[%clk 0:01:45.7]}  17...Rb8 {[%clk 0:01:45.9]}  18.Rxa7 {[%clk 0:01:32]}  18...Ng7 {[%clk 0:01:36.2]}  19.g4 {[%clk 0:01:15]}  19...Rb4 {[%clk 0:01:29.9]}  20.h3 {[%clk 0:01:13.7]}  20...Nb6 {[%clk 0:01:04.3]}  21.Qh6 {[%clk 0:01:06.5]}  21...f6 {[%clk 0:00:38.4]}  22.d6 {[%clk 0:01:04.6]}  22...Nc8 {[%clk 0:00:29.2]}  23.Nd5 {[%clk 0:00:56.5]}  23...Rf7 {[%clk 0:00:17.5]}  24.dxe7 {[%clk 0:00:37.2]}  24...Qxd5 {[%clk 0:00:17.4]}  25.Qxg7+ {[%clk 0:00:18.3]}  25...Kxg7 {[%clk 0:00:15.9]}  26.exf6+ {[%clk 0:00:17.4]}  26...Rxf6 {[%clk 0:00:13.7]}  27.e8=Q+ {[%clk 0:00:16.3]}  27...Rf7 {[%clk 0:00:12.7]}  28.Rxf7+ {[%clk 0:00:14.8]}  28...Qxf7 {[%clk 0:00:12.6]}  29.Qxc8 {[%clk 0:00:14.7]}  29...Rf4 {[%clk 0:00:04.5]}  30.Qxc5 {[%clk 0:00:13.4]}  30...h6 {[%clk 0:00:04]}  31.Qe5+ {[%clk 0:00:12.3]}  31...Kh7 {[%clk 0:00:03.9]}  32.Nd2 {[%clk 0:00:10.8]}  32...Qa7+ {[%clk 0:00:03.8]}  33.Kg2 {[%clk 0:00:10]}  33...Qb7+ {[%clk 0:00:03.2]}  34.Kg3 {[%clk 0:00:09.4]}  34...Rf7 {[%clk 0:00:02.8]}  35.Rf3 {[%clk 0:00:08.2]}  35...Re7 {[%clk 0:00:02.2]}  36.Qf4 {[%clk 0:00:07.2]}  36...Qc7 {[%clk 0:00:02.1]}  37.Qxc7 {[%clk 0:00:05.8]}  37...Rxc7 {[%clk 0:00:02]}  38.c4 {[%clk 0:00:05.5]}  38...Rb7 {[%clk 0:00:01.9]}  39.Ne4 {[%clk 0:00:04.8]}  39...Rc7 {[%clk 0:00:01.8]}  40.Nf6+ {[%clk 0:00:04.7]}  40...Kg7 {[%clk 0:00:01.1]}  41.Ne8+ {[%clk 0:00:04.6]}  41...Kg8 {[%clk 0:00:01]}  42.Nxc7 {[%clk 0:00:03.9]}  42...h5 {[%clk 0:00:00.9]}  43.c5 {[%clk 0:00:03.8]}  43...h4+ {[%clk 0:00:00.8]}  44.Kxh4 {[%clk 0:00:03]}  44...Kg7 {[%clk 0:00:00.7]}  45.Kg5 {[%clk 0:00:02.9]}  45...Kh8 {[%clk 0:00:00.6]}  46.Kxg6 {[%clk 0:00:01.9]}  46...Kg8 {[%clk 0:00:00.3]}  47.Rf7 {[%clk 0:00:01.7]}  47...Kh8 {[%clk 0:00:00.2]}  48.Rf8# {[%clk 0:00:01.6]}  1-0`
  },
  {
    id: 24,
    white: "AwesomeAtti", white_elo: 2998,
    black: "MagnusCarlsen", black_elo: 3301,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.31", round: "?", result: "0-1",
    eco: "C01",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.31"]
[Round "?"]
[White "AwesomeAtti"]
[Black "MagnusCarlsen"]
[Result "0-1"]
[WhiteElo "2998"]
[BlackElo "3301"]
[ECO "C01"]
[PlyCount "51"]
[CurrentPosition "4r1k1/pp3pp1/7p/3p1b2/5q2/1NPB1N1P/PP1Q2P1/3n1K2 b - - 1 26"]
[ECOUrl "https://www.chess.com/openings/French-Defense-Exchange-Variation...5.dxc5-Bxc5-6.Nf3-Nf6"]
[EndDate "2026.08.31"]
[EndTime "18:15:20"]
[Link "https://www.chess.com/game/live/173805681010"]
[StartTime "18:11:15"]
[Termination "MagnusCarlsen won by resignation"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.31"]
[UTCTime "18:11:15"]

1.e4 {[%clk 0:02:58.3]}  1...e6 {[%clk 0:02:57.3]}  2.d4 {[%clk 0:02:56.7]}  2...d5 {[%clk 0:02:56.6]}  3.exd5 {[%clk 0:02:55.2]}  3...exd5 {[%clk 0:02:55.1]}  4.Bd3 {[%clk 0:02:55.1]}  4...c5 {[%clk 0:02:44.4]}  5.dxc5 {[%clk 0:02:54]}  5...Bxc5 {[%clk 0:02:42.9]}  6.Nf3 {[%clk 0:02:53.3]}  6...Nf6 {[%clk 0:02:41.3]}  7.h3 {[%clk 0:02:51.4]}  7...O-O {[%clk 0:02:40.3]}  8.O-O {[%clk 0:02:50.8]}  8...Nc6 {[%clk 0:02:39.6]}  9.Bg5 {[%clk 0:02:49.3]}  9...h6 {[%clk 0:02:37.1]}  10.Bxf6 {[%clk 0:02:41.5]}  10...Qxf6 {[%clk 0:02:34.9]}  11.c3 {[%clk 0:02:41.4]}  11...Bb6 {[%clk 0:02:13.7]}  12.Nbd2 {[%clk 0:02:39.1]}  12...Qf4 {[%clk 0:02:12.9]}  13.Nb3 {[%clk 0:02:26]}  13...Re8 {[%clk 0:02:08.6]}  14.Qd2 {[%clk 0:02:21.3]}  14...Qf6 {[%clk 0:02:05.7]}  15.Nfd4 {[%clk 0:02:15.9]}  15...Ne5 {[%clk 0:02:03.2]}  16.Rae1 {[%clk 0:02:11.9]}  16...Bd7 {[%clk 0:02:01.8]}  17.Re2 {[%clk 0:02:08.2]}  17...Nc4 {[%clk 0:01:57.7]}  18.Qc2 {[%clk 0:01:59.1]}  18...Rxe2 {[%clk 0:01:56.1]}  19.Bxe2 {[%clk 0:01:57]}  19...Re8 {[%clk 0:01:51.6]}  20.Rd1 {[%clk 0:01:46.5]}  20...Qg5 {[%clk 0:01:46.1]}  21.Kf1 {[%clk 0:01:27.8]}  21...Qf4 {[%clk 0:01:37.9]}  22.Nf3 {[%clk 0:01:17.9]}  22...Bf5 {[%clk 0:01:26.6]}  23.Bd3 {[%clk 0:01:13.4]}  23...Bxf2 {[%clk 0:01:22.7]}  24.Kxf2 {[%clk 0:00:56.3]}  24...Ne3 {[%clk 0:01:21.1]}  25.Qd2 {[%clk 0:00:49.8]}  25...Nxd1+ {[%clk 0:01:19.7]}  26.Kf1 {[%clk 0:00:44]}  0-1`
  },
  {
    id: 25,
    white: "AwesomeAtti", white_elo: 3094,
    black: "MagnusCarlsen", black_elo: 3299,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.28", round: "?", result: "1/2-1/2",
    eco: "B54",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.28"]
[Round "?"]
[White "AwesomeAtti"]
[Black "MagnusCarlsen"]
[Result "1/2-1/2"]
[WhiteElo "3094"]
[BlackElo "3299"]
[ECO "B54"]
[PlyCount "84"]
[CurrentPosition "6k1/5p2/6p1/p1bp3p/P6P/3p1BP1/2P2PK1/8 w - - 0 43"]
[ECOUrl "https://www.chess.com/openings/Sicilian-Defense-Open-Variation-4...Nf6-5.Bd3-Nc6"]
[EndDate "2026.08.28"]
[EndTime "12:59:53"]
[Link "https://www.chess.com/game/live/173651254400"]
[StartTime "12:55:14"]
[Termination "Game drawn by agreement"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.28"]
[UTCTime "12:55:14"]

1.e4 {[%clk 0:02:59.9]}  1...c5 {[%clk 0:02:57.6]}  2.Nf3 {[%clk 0:02:59.2]}  2...d6 {[%clk 0:02:56.9]}  3.d4 {[%clk 0:02:58.6]}  3...cxd4 {[%clk 0:02:56.8]}  4.Nxd4 {[%clk 0:02:58.5]}  4...Nf6 {[%clk 0:02:55]}  5.Bd3 {[%clk 0:02:58.1]}  5...Nc6 {[%clk 0:02:50.7]}  6.Be3 {[%clk 0:02:57.2]}  6...Ng4 {[%clk 0:02:32]}  7.Nxc6 {[%clk 0:02:56.2]}  7...bxc6 {[%clk 0:02:30.8]}  8.Bd2 {[%clk 0:02:55.8]}  8...g6 {[%clk 0:02:29.8]}  9.Bc3 {[%clk 0:02:55.3]}  9...e5 {[%clk 0:02:26.2]}  10.h3 {[%clk 0:02:52.4]}  10...Nf6 {[%clk 0:02:25.1]}  11.O-O {[%clk 0:02:51.9]}  11...Bg7 {[%clk 0:02:22.8]}  12.Nd2 {[%clk 0:02:50.9]}  12...O-O {[%clk 0:02:21.9]}  13.Nc4 {[%clk 0:02:49.9]}  13...Be6 {[%clk 0:02:20.9]}  14.Re1 {[%clk 0:02:48.4]}  14...Re8 {[%clk 0:02:18.6]}  15.b3 {[%clk 0:02:46.3]}  15...Nh5 {[%clk 0:02:05.3]}  16.Bf1 {[%clk 0:02:40.7]}  16...Bxc4 {[%clk 0:02:02.5]}  17.Bxc4 {[%clk 0:02:39.9]}  17...Nf4 {[%clk 0:02:02.1]}  18.Qf3 {[%clk 0:02:34.7]}  18...Qc7 {[%clk 0:01:55.6]}  19.Rad1 {[%clk 0:02:32.6]}  19...Rad8 {[%clk 0:01:54.5]}  20.Bf1 {[%clk 0:02:30.8]}  20...d5 {[%clk 0:01:50.7]}  21.Bd2 {[%clk 0:02:27]}  21...Ne6 {[%clk 0:01:47.8]}  22.Be3 {[%clk 0:02:20.6]}  22...Qa5 {[%clk 0:01:32.3]}  23.a4 {[%clk 0:02:07.6]}  23...Nd4 {[%clk 0:01:31]}  24.Bxd4 {[%clk 0:02:04.4]}  24...exd4 {[%clk 0:01:30.9]}  25.Re2 {[%clk 0:01:57.5]}  25...h5 {[%clk 0:01:22.7]}  26.exd5 {[%clk 0:01:55.3]}  26...cxd5 {[%clk 0:01:20.7]}  27.h4 {[%clk 0:01:48.8]}  27...Qc7 {[%clk 0:01:12.1]}  28.Rxe8+ {[%clk 0:01:47.1]}  28...Rxe8 {[%clk 0:01:11.2]}  29.Bd3 {[%clk 0:01:47]}  29...Re5 {[%clk 0:01:03.4]}  30.b4 {[%clk 0:01:44.4]}  30...Qe7 {[%clk 0:00:59.8]}  31.g3 {[%clk 0:01:41.9]}  31...Qxb4 {[%clk 0:00:58.6]}  32.Ra1 {[%clk 0:01:33.4]}  32...a5 {[%clk 0:00:52.5]}  33.Kg2 {[%clk 0:01:32.7]}  33...Bh6 {[%clk 0:00:45.3]}  34.Qf6 {[%clk 0:01:29.4]}  34...Qe7 {[%clk 0:00:34.9]}  35.Qxe7 {[%clk 0:01:27]}  35...Rxe7 {[%clk 0:00:34.8]}  36.Rb1 {[%clk 0:01:26.7]}  36...Bd2 {[%clk 0:00:34]}  37.Rb5 {[%clk 0:01:25.9]}  37...Rd7 {[%clk 0:00:32.9]}  38.Be2 {[%clk 0:01:17.5]}  38...Bb4 {[%clk 0:00:31.7]}  39.Bf3 {[%clk 0:01:13.8]}  39...Rc7 {[%clk 0:00:30.9]}  40.Bd1 {[%clk 0:01:13.1]}  40...Rc5 {[%clk 0:00:25.7]}  41.Rxc5 {[%clk 0:01:11.8]}  41...Bxc5 {[%clk 0:00:25.6]}  42.Bf3 {[%clk 0:01:10.9]}  42...d3 {[%clk 0:00:24.6]}  1/2-1/2`
  },
  {
    id: 26,
    white: "MagnusCarlsen", white_elo: 3303,
    black: "AwesomeAtti", black_elo: 3090,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.28", round: "?", result: "1-0",
    eco: "E06",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.28"]
[Round "?"]
[White "MagnusCarlsen"]
[Black "AwesomeAtti"]
[Result "1-0"]
[WhiteElo "3303"]
[BlackElo "3090"]
[ECO "E06"]
[PlyCount "53"]
[CurrentPosition "4rr1k/p7/4p1Q1/1qpnN3/1P2R3/Pn4P1/5PBP/6K1 b - - 4 27"]
[ECOUrl "https://www.chess.com/openings/Slav-Defense-Modern-Triangle-System...6.Bg2-O-O-7.O-O-b6-8.Qc2"]
[EndDate "2026.08.28"]
[EndTime "12:55:10"]
[Link "https://www.chess.com/game/live/173651102442"]
[StartTime "12:51:38"]
[Termination "MagnusCarlsen won by resignation"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.28"]
[UTCTime "12:51:38"]

1.c4 {[%clk 0:02:59.9]}  1...e6 {[%clk 0:02:58.9]}  2.g3 {[%clk 0:02:58.5]}  2...d5 {[%clk 0:02:58.2]}  3.Bg2 {[%clk 0:02:58.1]}  3...Nf6 {[%clk 0:02:58]}  4.Nf3 {[%clk 0:02:57.1]}  4...Be7 {[%clk 0:02:57.7]}  5.O-O {[%clk 0:02:56.8]}  5...O-O {[%clk 0:02:57.4]}  6.d4 {[%clk 0:02:56.3]}  6...c6 {[%clk 0:02:56.9]}  7.Qc2 {[%clk 0:02:54.7]}  7...b6 {[%clk 0:02:56.4]}  8.Nbd2 {[%clk 0:02:54.1]}  8...c5 {[%clk 0:02:55.4]}  9.e4 {[%clk 0:02:47.5]}  9...Nc6 {[%clk 0:02:54.1]}  10.dxc5 {[%clk 0:02:44.5]}  10...bxc5 {[%clk 0:02:53]}  11.cxd5 {[%clk 0:02:34.4]}  11...exd5 {[%clk 0:02:52.9]}  12.a3 {[%clk 0:02:33.3]}  12...h6 {[%clk 0:02:45.9]}  13.Re1 {[%clk 0:02:32.3]}  13...Be6 {[%clk 0:02:43.8]}  14.exd5 {[%clk 0:02:27.8]}  14...Nxd5 {[%clk 0:02:43.7]}  15.Rxe6 {[%clk 0:02:23.3]}  15...fxe6 {[%clk 0:02:43.6]}  16.Qe4 {[%clk 0:02:22.2]}  16...Qd7 {[%clk 0:02:26.2]}  17.Nc4 {[%clk 0:02:10.6]}  17...Bf6 {[%clk 0:02:23.9]}  18.Bd2 {[%clk 0:02:01.8]}  18...Nd4 {[%clk 0:02:17]}  19.Re1 {[%clk 0:01:55.6]}  19...Rae8 {[%clk 0:02:09.5]}  20.Nfe5 {[%clk 0:01:44.5]}  20...Bxe5 {[%clk 0:01:54.2]}  21.Nxe5 {[%clk 0:01:41.7]}  21...Qb5 {[%clk 0:01:50.6]}  22.b4 {[%clk 0:01:38.3]}  22...Nb3 {[%clk 0:01:21.9]}  23.Bxh6 {[%clk 0:01:34.8]}  23...gxh6 {[%clk 0:01:13.9]}  24.Qg6+ {[%clk 0:01:33.7]}  24...Kh8 {[%clk 0:01:13.4]}  25.Qxh6+ {[%clk 0:01:30.7]}  25...Kg8 {[%clk 0:01:12.1]}  26.Qg6+ {[%clk 0:01:30.1]}  26...Kh8 {[%clk 0:01:11.2]}  27.Re4 {[%clk 0:01:28]}  1-0`
  },
  {
    id: 27,
    white: "AwesomeAtti", white_elo: 3094,
    black: "MagnusCarlsen", black_elo: 3299,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.28", round: "?", result: "0-1",
    eco: "A81",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.28"]
[Round "?"]
[White "AwesomeAtti"]
[Black "MagnusCarlsen"]
[Result "0-1"]
[WhiteElo "3094"]
[BlackElo "3299"]
[ECO "A81"]
[PlyCount "104"]
[CurrentPosition "8/1k6/5R2/1pp2p2/p3n3/2K5/8/8 w - - 2 53"]
[ECOUrl "https://www.chess.com/openings/Dutch-Defense-Fianchetto-Semi-Leningrad-Variation-4.Nd2-Bg7"]
[EndDate "2026.08.28"]
[EndTime "12:51:35"]
[Link "https://www.chess.com/game/live/173650876592"]
[StartTime "12:46:18"]
[Termination "MagnusCarlsen won by resignation"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.28"]
[UTCTime "12:46:18"]

1.d4 {[%clk 0:02:59.9]}  1...f5 {[%clk 0:02:56.3]}  2.g3 {[%clk 0:02:58.6]}  2...Nf6 {[%clk 0:02:55.3]}  3.Bg2 {[%clk 0:02:58.2]}  3...g6 {[%clk 0:02:54.8]}  4.Nd2 {[%clk 0:02:57.6]}  4...Bg7 {[%clk 0:02:54.3]}  5.e4 {[%clk 0:02:57]}  5...fxe4 {[%clk 0:02:53.5]}  6.Nxe4 {[%clk 0:02:56.9]}  6...Nxe4 {[%clk 0:02:53.1]}  7.Bxe4 {[%clk 0:02:56.8]}  7...d5 {[%clk 0:02:52.6]}  8.Bg2 {[%clk 0:02:56.1]}  8...Nc6 {[%clk 0:02:51.9]}  9.c3 {[%clk 0:02:54.6]}  9...e5 {[%clk 0:02:51]}  10.dxe5 {[%clk 0:02:52.2]}  10...Nxe5 {[%clk 0:02:50.9]}  11.f4 {[%clk 0:02:39.8]}  11...Bg4 {[%clk 0:02:44.6]}  12.Ne2 {[%clk 0:02:31.7]}  12...Nc6 {[%clk 0:02:32.3]}  13.h3 {[%clk 0:02:26.5]}  13...Be6 {[%clk 0:02:29.7]}  14.O-O {[%clk 0:02:24.9]}  14...Qd7 {[%clk 0:02:27.2]}  15.Kh2 {[%clk 0:02:24.1]}  15...O-O-O {[%clk 0:02:18.8]}  16.Be3 {[%clk 0:02:21.9]}  16...h5 {[%clk 0:02:17.6]}  17.Nd4 {[%clk 0:02:20.4]}  17...Bxd4 {[%clk 0:02:16.5]}  18.Bxd4 {[%clk 0:02:20.3]}  18...Rhf8 {[%clk 0:02:02.3]}  19.b4 {[%clk 0:02:17.4]}  19...Kb8 {[%clk 0:02:00.6]}  20.Bg1 {[%clk 0:02:07.6]}  20...Bf5 {[%clk 0:01:57.1]}  21.Re1 {[%clk 0:02:06.6]}  21...Rfe8 {[%clk 0:01:38.5]}  22.Rxe8 {[%clk 0:01:56.4]}  22...Qxe8 {[%clk 0:01:37.1]}  23.Qd2 {[%clk 0:01:54.8]}  23...Be4 {[%clk 0:01:33.9]}  24.Re1 {[%clk 0:01:52.7]}  24...Qg8 {[%clk 0:01:31.5]}  25.a4 {[%clk 0:01:36]}  25...Bxg2 {[%clk 0:01:28.2]}  26.Qxg2 {[%clk 0:01:35.9]}  26...b6 {[%clk 0:01:11.9]}  27.Qe2 {[%clk 0:01:31.9]}  27...d4 {[%clk 0:01:03.2]}  28.Qe6 {[%clk 0:01:28]}  28...Qxe6 {[%clk 0:00:56.7]}  29.Rxe6 {[%clk 0:01:27.9]}  29...d3 {[%clk 0:00:56.6]}  30.Re1 {[%clk 0:01:24.9]}  30...d2 {[%clk 0:00:55]}  31.Rd1 {[%clk 0:01:24.3]}  31...Rd3 {[%clk 0:00:54.9]}  32.Kg2 {[%clk 0:01:18.5]}  32...Ne7 {[%clk 0:00:53.9]}  33.c4 {[%clk 0:01:14.6]}  33...Nf5 {[%clk 0:00:50.3]}  34.Bf2 {[%clk 0:01:13.9]}  34...Nd6 {[%clk 0:00:47.5]}  35.Kf1 {[%clk 0:01:06.5]}  35...Nxc4 {[%clk 0:00:46.2]}  36.Ke2 {[%clk 0:01:06.1]}  36...Rb3 {[%clk 0:00:40]}  37.b5 {[%clk 0:01:03.6]}  37...Kb7 {[%clk 0:00:37.2]}  38.Rg1 {[%clk 0:00:57.1]}  38...a6 {[%clk 0:00:35.6]}  39.g4 {[%clk 0:00:55.7]}  39...hxg4 {[%clk 0:00:28.8]}  40.hxg4 {[%clk 0:00:53]}  40...axb5 {[%clk 0:00:28]}  41.f5 {[%clk 0:00:52.7]}  41...gxf5 {[%clk 0:00:26.8]}  42.g5 {[%clk 0:00:52.3]}  42...Rb2 {[%clk 0:00:26.2]}  43.g6 {[%clk 0:00:49.8]}  43...d1=Q+ {[%clk 0:00:25.4]}  44.Kxd1 {[%clk 0:00:49.1]}  44...Rxf2 {[%clk 0:00:24.9]}  45.g7 {[%clk 0:00:48.5]}  45...Rd2+ {[%clk 0:00:24]}  46.Kc1 {[%clk 0:00:46.4]}  46...Rd8 {[%clk 0:00:23.9]}  47.g8=Q {[%clk 0:00:44.9]}  47...Rxg8 {[%clk 0:00:22.9]}  48.Rxg8 {[%clk 0:00:44.8]}  48...bxa4 {[%clk 0:00:22.5]}  49.Rf8 {[%clk 0:00:43.6]}  49...Nd6 {[%clk 0:00:21.5]}  50.Kc2 {[%clk 0:00:41.9]}  50...b5 {[%clk 0:00:20.9]}  51.Kc3 {[%clk 0:00:41.1]}  51...c5 {[%clk 0:00:20.5]}  52.Rf6 {[%clk 0:00:40.3]}  52...Ne4+ {[%clk 0:00:19.4]}  0-1`
  },
  {
    id: 28,
    white: "MagnusCarlsen", white_elo: 3295,
    black: "AwesomeAtti", black_elo: 3098,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.28", round: "?", result: "0-1",
    eco: "A14",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.28"]
[Round "?"]
[White "MagnusCarlsen"]
[Black "AwesomeAtti"]
[Result "0-1"]
[WhiteElo "3295"]
[BlackElo "3098"]
[ECO "A14"]
[PlyCount "130"]
[CurrentPosition "8/5kP1/2p1p2K/4Bb2/3P1P1R/6q1/8/8 w - - 18 66"]
[ECOUrl "https://www.chess.com/openings/English-Opening-Neo-Catalan-Defense-Declined...6.b3-a5-7.Nc3-c6"]
[EndDate "2026.08.28"]
[EndTime "12:46:13"]
[Link "https://www.chess.com/game/live/173650613636"]
[StartTime "12:40:04"]
[Termination "AwesomeAtti won on time"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.28"]
[UTCTime "12:40:04"]

1.c4 {[%clk 0:02:58.8]}  1...e6 {[%clk 0:02:58.9]}  2.g3 {[%clk 0:02:57.4]}  2...d5 {[%clk 0:02:57.7]}  3.Bg2 {[%clk 0:02:55.5]}  3...Nf6 {[%clk 0:02:57.4]}  4.Nf3 {[%clk 0:02:53.4]}  4...Be7 {[%clk 0:02:56.9]}  5.O-O {[%clk 0:02:52.1]}  5...O-O {[%clk 0:02:56.3]}  6.b3 {[%clk 0:02:50.7]}  6...a5 {[%clk 0:02:54.5]}  7.Nc3 {[%clk 0:02:45.3]}  7...c6 {[%clk 0:02:53.9]}  8.d4 {[%clk 0:02:43.3]}  8...b6 {[%clk 0:02:53.4]}  9.Qd3 {[%clk 0:02:37.4]}  9...Ba6 {[%clk 0:02:52]}  10.e4 {[%clk 0:02:35]}  10...b5 {[%clk 0:02:50.6]}  11.Nd2 {[%clk 0:02:07]}  11...bxc4 {[%clk 0:02:49.3]}  12.bxc4 {[%clk 0:02:05]}  12...Nbd7 {[%clk 0:02:47.4]}  13.e5 {[%clk 0:02:03.4]}  13...dxc4 {[%clk 0:02:47]}  14.Qf3 {[%clk 0:01:55.3]}  14...Nd5 {[%clk 0:02:46.3]}  15.Nde4 {[%clk 0:01:53.4]}  15...Rb8 {[%clk 0:02:24.7]}  16.Rd1 {[%clk 0:01:51]}  16...N7b6 {[%clk 0:02:17.7]}  17.h4 {[%clk 0:01:46.7]}  17...Nxc3 {[%clk 0:02:16.2]}  18.Qxc3 {[%clk 0:01:44.9]}  18...Nd5 {[%clk 0:02:15.1]}  19.Qf3 {[%clk 0:01:43.2]}  19...Kh8 {[%clk 0:02:08.8]}  20.Qh5 {[%clk 0:01:40.9]}  20...c3 {[%clk 0:02:06.1]}  21.Ng5 {[%clk 0:01:38]}  21...Bxg5 {[%clk 0:01:59.9]}  22.Bxg5 {[%clk 0:01:36.3]}  22...Qd7 {[%clk 0:01:57.5]}  23.Rac1 {[%clk 0:01:34.3]}  23...Rb2 {[%clk 0:01:52.5]}  24.Be4 {[%clk 0:00:57.7]}  24...f5 {[%clk 0:01:51]}  25.exf6 {[%clk 0:00:56.7]}  25...gxf6 {[%clk 0:01:50.4]}  26.Qh6 {[%clk 0:00:54.7]}  26...Qg7 {[%clk 0:01:41]}  27.Bf4 {[%clk 0:00:52.2]}  27...Bc4 {[%clk 0:01:27.6]}  28.Re1 {[%clk 0:00:48.4]}  28...Rxa2 {[%clk 0:01:21.4]}  29.Bxd5 {[%clk 0:00:33.9]}  29...Bxd5 {[%clk 0:01:21.3]}  30.Rxc3 {[%clk 0:00:32.9]}  30...Qxh6 {[%clk 0:01:11.1]}  31.Bxh6 {[%clk 0:00:32.8]}  31...Rb8 {[%clk 0:01:10.5]}  32.g4 {[%clk 0:00:30.9]}  32...Kg8 {[%clk 0:01:07.7]}  33.g5 {[%clk 0:00:29.4]}  33...f5 {[%clk 0:01:06.2]}  34.h5 {[%clk 0:00:28.1]}  34...Kf7 {[%clk 0:01:05.5]}  35.Rg3 {[%clk 0:00:26.3]}  35...Rab2 {[%clk 0:00:54.8]}  36.g6+ {[%clk 0:00:25.1]}  36...hxg6 {[%clk 0:00:54.6]}  37.hxg6+ {[%clk 0:00:24.8]}  37...Kf6 {[%clk 0:00:54.1]}  38.Bf4 {[%clk 0:00:20.9]}  38...Rb1 {[%clk 0:00:52.3]}  39.Be5+ {[%clk 0:00:18.4]}  39...Ke7 {[%clk 0:00:51.8]}  40.Re3 {[%clk 0:00:17.4]}  40...Rxe1+ {[%clk 0:00:46]}  41.Rxe1 {[%clk 0:00:17.3]}  41...Rg8 {[%clk 0:00:41.2]}  42.g7 {[%clk 0:00:15.5]}  42...a4 {[%clk 0:00:41.1]}  43.Ra1 {[%clk 0:00:13]}  43...Ra8 {[%clk 0:00:37.3]}  44.Ra3 {[%clk 0:00:10.3]}  44...Kf7 {[%clk 0:00:35.9]}  45.Kh2 {[%clk 0:00:10.2]}  45...Bb3 {[%clk 0:00:33.6]}  46.Kg3 {[%clk 0:00:10.1]}  46...Kg6 {[%clk 0:00:33.2]}  47.Kf4 {[%clk 0:00:09.5]}  47...Kf7 {[%clk 0:00:32.1]}  48.Ra1 {[%clk 0:00:09.4]}  48...a3 {[%clk 0:00:30.4]}  49.Kg5 {[%clk 0:00:08.1]}  49...a2 {[%clk 0:00:29.5]}  50.Kh6 {[%clk 0:00:08]}  50...f4 {[%clk 0:00:22.5]}  51.Bxf4 {[%clk 0:00:06.9]}  51...Bd5 {[%clk 0:00:19.8]}  52.Be5 {[%clk 0:00:06.8]}  52...Ra3 {[%clk 0:00:19.3]}  53.f4 {[%clk 0:00:06.7]}  53...Rh3+ {[%clk 0:00:18.3]}  54.Kg5 {[%clk 0:00:06]}  54...Rh2 {[%clk 0:00:17.3]}  55.Rg1 {[%clk 0:00:04.1]}  55...Rg2+ {[%clk 0:00:15.5]}  56.Rxg2 {[%clk 0:00:04]}  56...a1=Q {[%clk 0:00:15.2]}  57.Rg4 {[%clk 0:00:03.3]}  57...Qb1 {[%clk 0:00:14.5]}  58.Kh6 {[%clk 0:00:02.6]}  58...Qh1+ {[%clk 0:00:13.7]}  59.Kg5 {[%clk 0:00:02.5]}  59...Be4 {[%clk 0:00:13.4]}  60.Rh4 {[%clk 0:00:01.8]}  60...Qg2+ {[%clk 0:00:12.2]}  61.Rg4 {[%clk 0:00:01.1]}  61...Qh3 {[%clk 0:00:12]}  62.Rh4 {[%clk 0:00:01]}  62...Qg3+ {[%clk 0:00:11.5]}  63.Rg4 {[%clk 0:00:00.9]}  63...Qf3 {[%clk 0:00:11.4]}  64.Rh4 {[%clk 0:00:00.8]}  64...Bf5 {[%clk 0:00:10.7]}  65.Kh6 {[%clk 0:00:00.1]}  65...Qg3 {[%clk 0:00:09.8]}  0-1`
  },
  {
    id: 29,
    white: "AwesomeAtti", white_elo: 3086,
    black: "MagnusCarlsen", black_elo: 3307,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.28", round: "?", result: "1/2-1/2",
    eco: "C03",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.28"]
[Round "?"]
[White "AwesomeAtti"]
[Black "MagnusCarlsen"]
[Result "1/2-1/2"]
[WhiteElo "3086"]
[BlackElo "3307"]
[ECO "C03"]
[PlyCount "68"]
[CurrentPosition "2R1Q3/6pk/4p2p/4qp2/1r6/4p2P/1P3PP1/6K1 w - - 8 35"]
[ECOUrl "https://www.chess.com/openings/French-Defense-Tarrasch-Open-Euwe-Keres-Line...5.dxc5-Bxc5-6.Bd3-Nc6"]
[EndDate "2026.08.28"]
[EndTime "12:39:58"]
[Link "https://www.chess.com/game/live/173650413718"]
[StartTime "12:35:18"]
[Termination "Game drawn by repetition"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.28"]
[UTCTime "12:35:18"]

1.e4 {[%clk 0:02:59.9]}  1...e6 {[%clk 0:02:58.7]}  2.d4 {[%clk 0:02:58.7]}  2...d5 {[%clk 0:02:56.6]}  3.Nd2 {[%clk 0:02:58.4]}  3...a6 {[%clk 0:02:53.8]}  4.Ngf3 {[%clk 0:02:57.1]}  4...c5 {[%clk 0:02:52.9]}  5.dxc5 {[%clk 0:02:56.5]}  5...Bxc5 {[%clk 0:02:51.7]}  6.Bd3 {[%clk 0:02:56.1]}  6...Nc6 {[%clk 0:02:49.8]}  7.a3 {[%clk 0:02:54.4]}  7...Nf6 {[%clk 0:02:48.4]}  8.Qe2 {[%clk 0:02:53.5]}  8...Qc7 {[%clk 0:02:43.2]}  9.h3 {[%clk 0:02:46]}  9...b5 {[%clk 0:02:29.7]}  10.O-O {[%clk 0:02:36.9]}  10...Bb7 {[%clk 0:02:26.6]}  11.e5 {[%clk 0:02:33]}  11...Nh5 {[%clk 0:02:19.3]}  12.Nb3 {[%clk 0:02:31.6]}  12...Ng3 {[%clk 0:02:15.7]}  13.Qd1 {[%clk 0:02:23.7]}  13...Bb6 {[%clk 0:02:11.6]}  14.Re1 {[%clk 0:02:22.9]}  14...Ne4 {[%clk 0:02:10.3]}  15.Be3 {[%clk 0:02:15.8]}  15...Bxe3 {[%clk 0:02:07.6]}  16.Rxe3 {[%clk 0:02:15.7]}  16...Nxe5 {[%clk 0:02:06.2]}  17.Nxe5 {[%clk 0:02:10.5]}  17...Qxe5 {[%clk 0:02:06.1]}  18.Na5 {[%clk 0:01:47.1]}  18...Rb8 {[%clk 0:01:52.1]}  19.Nxb7 {[%clk 0:01:32.3]}  19...Rxb7 {[%clk 0:01:50.5]}  20.a4 {[%clk 0:01:27.9]}  20...O-O {[%clk 0:01:46.9]}  21.axb5 {[%clk 0:01:27.2]}  21...axb5 {[%clk 0:01:45.3]}  22.c3 {[%clk 0:01:23.7]}  22...b4 {[%clk 0:01:38.7]}  23.Bxe4 {[%clk 0:01:20.5]}  23...dxe4 {[%clk 0:01:36.3]}  24.Ra4 {[%clk 0:01:18.3]}  24...f5 {[%clk 0:01:31.9]}  25.Rxb4 {[%clk 0:01:14.9]}  25...Rxb4 {[%clk 0:01:27.1]}  26.cxb4 {[%clk 0:01:14.8]}  26...Rb8 {[%clk 0:01:23.3]}  27.Qd7 {[%clk 0:01:10.7]}  27...h6 {[%clk 0:01:11.3]}  28.Rc3 {[%clk 0:01:06.3]}  28...Rxb4 {[%clk 0:01:04.3]}  29.Rc8+ {[%clk 0:00:50.4]}  29...Kh7 {[%clk 0:01:02.6]}  30.Qe8 {[%clk 0:00:50.2]}  30...e3 {[%clk 0:01:01.1]}  31.Qg8+ {[%clk 0:00:37.5]}  31...Kg6 {[%clk 0:00:58.6]}  32.Qe8+ {[%clk 0:00:37.4]}  32...Kh7 {[%clk 0:00:57.1]}  33.Qg8+ {[%clk 0:00:36.4]}  33...Kg6 {[%clk 0:00:54.7]}  34.Qe8+ {[%clk 0:00:36]}  34...Kh7 {[%clk 0:00:53.5]}  1/2-1/2`
  },
  {
    id: 30,
    white: "MagnusCarlsen", white_elo: 3312,
    black: "AwesomeAtti", black_elo: 3081,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.28", round: "?", result: "1-0",
    eco: "A45",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.28"]
[Round "?"]
[White "MagnusCarlsen"]
[Black "AwesomeAtti"]
[Result "1-0"]
[WhiteElo "3312"]
[BlackElo "3081"]
[ECO "A45"]
[PlyCount "71"]
[CurrentPosition "2Q5/1r2kpr1/4pqB1/pp1pN3/3P4/nPP3P1/P4PK1/2R5 b - - 8 36"]
[ECOUrl "https://www.chess.com/openings/Trompowsky-Attack-2...d5-3.Nd2-c5"]
[EndDate "2026.08.28"]
[EndTime "12:35:12"]
[Link "https://www.chess.com/game/live/173650232756"]
[StartTime "12:30:56"]
[Termination "MagnusCarlsen won by resignation"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.28"]
[UTCTime "12:30:56"]

1.d4 {[%clk 0:02:58.9]}  1...Nf6 {[%clk 0:02:58.8]}  2.Bg5 {[%clk 0:02:58.1]}  2...d5 {[%clk 0:02:57.9]}  3.Nd2 {[%clk 0:02:56]}  3...c5 {[%clk 0:02:55.4]}  4.e3 {[%clk 0:02:53.9]}  4...Nc6 {[%clk 0:02:54.7]}  5.c3 {[%clk 0:02:52.7]}  5...cxd4 {[%clk 0:02:49.1]}  6.exd4 {[%clk 0:02:51.3]}  6...Bf5 {[%clk 0:02:48.8]}  7.Qb3 {[%clk 0:02:48.8]}  7...Qb6 {[%clk 0:02:40.9]}  8.Ngf3 {[%clk 0:02:44.5]}  8...e6 {[%clk 0:02:39.9]}  9.Nh4 {[%clk 0:02:42.1]}  9...Bg6 {[%clk 0:02:36.1]}  10.Nxg6 {[%clk 0:02:39]}  10...hxg6 {[%clk 0:02:36]}  11.Bd3 {[%clk 0:02:37.9]}  11...Be7 {[%clk 0:02:34.5]}  12.Nf3 {[%clk 0:02:35.2]}  12...Qc7 {[%clk 0:02:29]}  13.g3 {[%clk 0:02:27.6]}  13...Rb8 {[%clk 0:02:25]}  14.Kf1 {[%clk 0:02:15.9]}  14...Nd7 {[%clk 0:02:21.5]}  15.Bd2 {[%clk 0:02:11.2]}  15...b5 {[%clk 0:02:16.6]}  16.Kg2 {[%clk 0:02:09.2]}  16...Na5 {[%clk 0:02:13.9]}  17.Qc2 {[%clk 0:02:07]}  17...Nc4 {[%clk 0:02:13.4]}  18.Bf4 {[%clk 0:02:05.3]}  18...Bd6 {[%clk 0:02:10.8]}  19.Bxd6 {[%clk 0:02:03.9]}  19...Qxd6 {[%clk 0:02:08.3]}  20.b3 {[%clk 0:02:03]}  20...Na3 {[%clk 0:02:06]}  21.Qe2 {[%clk 0:02:02]}  21...a5 {[%clk 0:02:03.3]}  22.Rac1 {[%clk 0:02:00.7]}  22...Nf6 {[%clk 0:01:59.6]}  23.h4 {[%clk 0:01:57.6]}  23...Ke7 {[%clk 0:01:38.3]}  24.Ne5 {[%clk 0:01:54.7]}  24...Rhc8 {[%clk 0:01:37.3]}  25.Qe3 {[%clk 0:01:52.1]}  25...Kf8 {[%clk 0:01:30.6]}  26.Qf4 {[%clk 0:01:48.7]}  26...Rb6 {[%clk 0:01:28.1]}  27.h5 {[%clk 0:01:46.6]}  27...gxh5 {[%clk 0:01:23.7]}  28.Rxh5 {[%clk 0:01:45.1]}  28...Ke7 {[%clk 0:01:21.2]}  29.Qg5 {[%clk 0:01:41]}  29...Rg8 {[%clk 0:01:16.3]}  30.Rh7 {[%clk 0:01:38.8]}  30...Kf8 {[%clk 0:01:13.2]}  31.Rxg7 {[%clk 0:01:32.6]}  31...Rxg7 {[%clk 0:01:13.1]}  32.Qxf6 {[%clk 0:01:31.8]}  32...Qe7 {[%clk 0:01:12.7]}  33.Qh6 {[%clk 0:01:28.9]}  33...Rb7 {[%clk 0:01:05.8]}  34.Bg6 {[%clk 0:01:10.3]}  34...Qf6 {[%clk 0:01:01.4]}  35.Qh8+ {[%clk 0:01:08.5]}  35...Ke7 {[%clk 0:01:00.1]}  36.Qc8 {[%clk 0:01:01.7]}  1-0`
  },
  {
    id: 31,
    white: "AwesomeAtti", white_elo: 2335,
    black: "Hikaru", black_elo: 3332,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.01", round: "?", result: "0-1",
    eco: "A40",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.01"]
[Round "?"]
[White "AwesomeAtti"]
[Black "Hikaru"]
[Result "0-1"]
[WhiteElo "2335"]
[BlackElo "3332"]
[ECO "A40"]
[PlyCount "46"]
[CurrentPosition "6k1/p3ppbp/2p3p1/8/8/4P3/1r3PPP/2R3K1 w - - 0 24"]
[ECOUrl "https://www.chess.com/openings/English-Opening-Symmetrical-Variation...8.O-O-d5-9.cxd5-Nxd5"]
[EndDate "2026.08.01"]
[EndTime "16:06:32"]
[Link "https://www.chess.com/game/live/179914071825"]
[StartTime "16:05:15"]
[Termination "Hikaru won by resignation"]
[TimeControl "60"]
[Timezone "UTC"]
[Tournament "https://www.chess.com/tournament/live/bullet-brawl-august-01-2026-31342223"]
[UTCDate "2026.08.01"]
[UTCTime "16:05:15"]

1.d4 {[%clk 0:00:57.7]}  1...g6 {[%clk 0:00:59.9]}  2.Nf3 {[%clk 0:00:56.9]}  2...Bg7 {[%clk 0:00:59.6]}  3.c4 {[%clk 0:00:56.4]}  3...c5 {[%clk 0:00:59.4]}  4.Nc3 {[%clk 0:00:56]}  4...cxd4 {[%clk 0:00:58.6]}  5.Nxd4 {[%clk 0:00:55.9]}  5...Nc6 {[%clk 0:00:58.5]}  6.e3 {[%clk 0:00:55.3]}  6...Nf6 {[%clk 0:00:57.7]}  7.Be2 {[%clk 0:00:54.8]}  7...O-O {[%clk 0:00:57.4]}  8.O-O {[%clk 0:00:54.4]}  8...d5 {[%clk 0:00:57.2]}  9.cxd5 {[%clk 0:00:53.2]}  9...Nxd5 {[%clk 0:00:56.5]}  10.Nxd5 {[%clk 0:00:52.3]}  10...Qxd5 {[%clk 0:00:55.4]}  11.Bf3 {[%clk 0:00:51.8]}  11...Qa5 {[%clk 0:00:54.3]}  12.Nxc6 {[%clk 0:00:50.9]}  12...bxc6 {[%clk 0:00:54.2]}  13.Qe1 {[%clk 0:00:50]}  13...Qc7 {[%clk 0:00:53.1]}  14.Rb1 {[%clk 0:00:46.8]}  14...Rb8 {[%clk 0:00:51.3]}  15.b3 {[%clk 0:00:45.5]}  15...Ba6 {[%clk 0:00:49.5]}  16.Be2 {[%clk 0:00:44]}  16...Bxe2 {[%clk 0:00:48.9]}  17.Qxe2 {[%clk 0:00:43.4]}  17...Qa5 {[%clk 0:00:48.8]}  18.Qc2 {[%clk 0:00:38.4]}  18...Rfd8 {[%clk 0:00:46.9]}  19.Rd1 {[%clk 0:00:36.3]}  19...Qxa2 {[%clk 0:00:45.2]}  20.Bb2 {[%clk 0:00:17.5]}  20...Rxd1+ {[%clk 0:00:43.6]}  21.Qxd1 {[%clk 0:00:17]}  21...Qxb3 {[%clk 0:00:42.5]}  22.Qxb3 {[%clk 0:00:13.6]}  22...Rxb3 {[%clk 0:00:42.4]}  23.Rc1 {[%clk 0:00:12.9]}  23...Rxb2 {[%clk 0:00:41.9]}  0-1`
  },
  {
    id: 32,
    white: "Hikaru", white_elo: 3332,
    black: "AwesomeAtti", black_elo: 2603,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.01", round: "?", result: "1-0",
    eco: "B08",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.01"]
[Round "?"]
[White "Hikaru"]
[Black "AwesomeAtti"]
[Result "1-0"]
[WhiteElo "3332"]
[BlackElo "2603"]
[ECO "B08"]
[PlyCount "63"]
[CurrentPosition "2R3k1/3r1p1p/4n1pB/8/8/7P/R1P2PP1/6K1 b - - 0 32"]
[ECOUrl "https://www.chess.com/openings/Pirc-Defense-Classical-Variation-4...Bg7-5.Bc4-O-O-6.Bb3"]
[EndDate "2026.08.01"]
[EndTime "16:05:14"]
[Link "https://www.chess.com/game/live/179914071509"]
[StartTime "16:04:00"]
[Termination "Hikaru won by resignation"]
[TimeControl "60"]
[Timezone "UTC"]
[Tournament "https://www.chess.com/tournament/live/bullet-brawl-august-01-2026-31342223"]
[UTCDate "2026.08.01"]
[UTCTime "16:04:00"]

1.e4 {[%clk 0:00:59.9]}  1...g6 {[%clk 0:00:59.2]}  2.Nc3 {[%clk 0:00:59.8]}  2...Bg7 {[%clk 0:00:58.9]}  3.d4 {[%clk 0:00:59.5]}  3...d6 {[%clk 0:00:58.5]}  4.Nf3 {[%clk 0:00:59.4]}  4...Nf6 {[%clk 0:00:57.5]}  5.Bc4 {[%clk 0:00:59.1]}  5...O-O {[%clk 0:00:57.1]}  6.Bb3 {[%clk 0:00:59]}  6...Nbd7 {[%clk 0:00:56.5]}  7.O-O {[%clk 0:00:58.3]}  7...c6 {[%clk 0:00:56.2]}  8.h3 {[%clk 0:00:58.2]}  8...Qc7 {[%clk 0:00:55.8]}  9.a4 {[%clk 0:00:57.6]}  9...e5 {[%clk 0:00:55.4]}  10.Re1 {[%clk 0:00:57.3]}  10...a5 {[%clk 0:00:54.9]}  11.Bg5 {[%clk 0:00:55.4]}  11...b6 {[%clk 0:00:54.1]}  12.d5 {[%clk 0:00:54.4]}  12...cxd5 {[%clk 0:00:50.7]}  13.Nxd5 {[%clk 0:00:54.3]}  13...Nxd5 {[%clk 0:00:49.8]}  14.Bxd5 {[%clk 0:00:54.2]}  14...Bb7 {[%clk 0:00:49]}  15.Bxb7 {[%clk 0:00:53.1]}  15...Qxb7 {[%clk 0:00:48.9]}  16.Qxd6 {[%clk 0:00:52.6]}  16...Nc5 {[%clk 0:00:46.8]}  17.Qd5 {[%clk 0:00:50]}  17...Qxd5 {[%clk 0:00:41.5]}  18.exd5 {[%clk 0:00:49.9]}  18...e4 {[%clk 0:00:41.4]}  19.Nd2 {[%clk 0:00:49.2]}  19...Bxb2 {[%clk 0:00:40.5]}  20.Rab1 {[%clk 0:00:48.9]}  20...Bc3 {[%clk 0:00:38.9]}  21.Re2 {[%clk 0:00:48]}  21...Bxd2 {[%clk 0:00:35.6]}  22.Bxd2 {[%clk 0:00:47.9]}  22...Nxa4 {[%clk 0:00:35.4]}  23.Rxe4 {[%clk 0:00:47.1]}  23...Nc5 {[%clk 0:00:33.8]}  24.Rc4 {[%clk 0:00:46.5]}  24...Rfd8 {[%clk 0:00:32.9]}  25.Rxb6 {[%clk 0:00:45.3]}  25...Rxd5 {[%clk 0:00:32.4]}  26.Bh6 {[%clk 0:00:44.5]}  26...a4 {[%clk 0:00:30.5]}  27.Rb1 {[%clk 0:00:41.7]}  27...a3 {[%clk 0:00:29.1]}  28.Ra1 {[%clk 0:00:41.4]}  28...a2 {[%clk 0:00:27.9]}  29.Rb4 {[%clk 0:00:41]}  29...Rd7 {[%clk 0:00:21.6]}  30.Rxa2 {[%clk 0:00:39.6]}  30...Rc8 {[%clk 0:00:18.1]}  31.Rc4 {[%clk 0:00:38.6]}  31...Ne6 {[%clk 0:00:18]}  32.Rxc8+ {[%clk 0:00:37.6]}  1-0`
  },
  {
    id: 33,
    white: "AwesomeAtti", white_elo: 3015,
    black: "Hikaru", black_elo: 3332,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.01", round: "?", result: "0-1",
    eco: "B06",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.01"]
[Round "?"]
[White "AwesomeAtti"]
[Black "Hikaru"]
[Result "0-1"]
[WhiteElo "3015"]
[BlackElo "3332"]
[ECO "B06"]
[PlyCount "88"]
[CurrentPosition "8/5pk1/6p1/1q6/1p1bp1Pp/1P5P/2P2P2/6K1 w - - 0 45"]
[ECOUrl "https://www.chess.com/openings/Indian-Game-Knights-Variation-East-Indian-Defense...4.e4-d6-5.Bc4-O-O"]
[EndDate "2026.08.01"]
[EndTime "16:03:58"]
[Link "https://www.chess.com/game/live/179914071151"]
[StartTime "16:02:21"]
[Termination "Hikaru won by resignation"]
[TimeControl "60"]
[Timezone "UTC"]
[Tournament "https://www.chess.com/tournament/live/bullet-brawl-august-01-2026-31342223"]
[UTCDate "2026.08.01"]
[UTCTime "16:02:21"]

1.e4 {[%clk 0:00:59.6]}  1...g6 {[%clk 0:00:58.9]}  2.Nf3 {[%clk 0:00:59.2]}  2...Bg7 {[%clk 0:00:58.3]}  3.d4 {[%clk 0:00:59]}  3...d6 {[%clk 0:00:58.2]}  4.Bc4 {[%clk 0:00:58.8]}  4...Nf6 {[%clk 0:00:57.4]}  5.Nbd2 {[%clk 0:00:58.2]}  5...O-O {[%clk 0:00:57.2]}  6.O-O {[%clk 0:00:57.6]}  6...c5 {[%clk 0:00:57.1]}  7.dxc5 {[%clk 0:00:56.5]}  7...dxc5 {[%clk 0:00:57]}  8.Qe2 {[%clk 0:00:55.9]}  8...Nc6 {[%clk 0:00:56.5]}  9.h3 {[%clk 0:00:55.5]}  9...Nd7 {[%clk 0:00:55.7]}  10.Nb3 {[%clk 0:00:54.6]}  10...Nde5 {[%clk 0:00:55.1]}  11.Nxe5 {[%clk 0:00:53.6]}  11...Nxe5 {[%clk 0:00:54.7]}  12.a4 {[%clk 0:00:51.8]}  12...Qc7 {[%clk 0:00:53.7]}  13.Bf4 {[%clk 0:00:50.6]}  13...e6 {[%clk 0:00:52.6]}  14.Rfd1 {[%clk 0:00:49.5]}  14...b6 {[%clk 0:00:52]}  15.a5 {[%clk 0:00:48]}  15...Bb7 {[%clk 0:00:51.3]}  16.Bb5 {[%clk 0:00:47]}  16...Rfd8 {[%clk 0:00:48.2]}  17.a6 {[%clk 0:00:45.8]}  17...Bc6 {[%clk 0:00:47.6]}  18.Bxc6 {[%clk 0:00:44.3]}  18...Qxc6 {[%clk 0:00:47.5]}  19.Rxd8+ {[%clk 0:00:42.4]}  19...Rxd8 {[%clk 0:00:46.5]}  20.Rd1 {[%clk 0:00:42.3]}  20...Rxd1+ {[%clk 0:00:45.7]}  21.Qxd1 {[%clk 0:00:42.2]}  21...Nd7 {[%clk 0:00:44.5]}  22.Nd2 {[%clk 0:00:41.1]}  22...c4 {[%clk 0:00:43.6]}  23.Nxc4 {[%clk 0:00:40.2]}  23...h5 {[%clk 0:00:40.4]}  24.b3 {[%clk 0:00:39.7]}  24...b5 {[%clk 0:00:37.4]}  25.Na5 {[%clk 0:00:38.7]}  25...Qxe4 {[%clk 0:00:36.9]}  26.Qxd7 {[%clk 0:00:37.9]}  26...Qxf4 {[%clk 0:00:36.3]}  27.Qxa7 {[%clk 0:00:32.7]}  27...Bd4 {[%clk 0:00:35.1]}  28.Qa8+ {[%clk 0:00:32]}  28...Kg7 {[%clk 0:00:34.8]}  29.Qf3 {[%clk 0:00:31.7]}  29...Qd6 {[%clk 0:00:30.9]}  30.Nc6 {[%clk 0:00:30.8]}  30...Bb6 {[%clk 0:00:29.5]}  31.a7 {[%clk 0:00:29.5]}  31...Qa3 {[%clk 0:00:27.1]}  32.Ne5 {[%clk 0:00:27.6]}  32...Qa1+ {[%clk 0:00:26]}  33.Kh2 {[%clk 0:00:25.3]}  33...Qxe5+ {[%clk 0:00:25.2]}  34.g3 {[%clk 0:00:24.9]}  34...Bxa7 {[%clk 0:00:24.3]}  35.Kg1 {[%clk 0:00:23.8]}  35...Qf5 {[%clk 0:00:23.6]}  36.Qc3+ {[%clk 0:00:22.6]}  36...Qf6 {[%clk 0:00:23.2]}  37.Qd2 {[%clk 0:00:22.5]}  37...Qd4 {[%clk 0:00:22.2]}  38.Qe2 {[%clk 0:00:21.1]}  38...h4 {[%clk 0:00:21.9]}  39.g4 {[%clk 0:00:20.1]}  39...b4 {[%clk 0:00:21.7]}  40.Kf1 {[%clk 0:00:19.4]}  40...Qd5 {[%clk 0:00:20.9]}  41.Kg1 {[%clk 0:00:18.3]}  41...Bd4 {[%clk 0:00:20.5]}  42.Qd3 {[%clk 0:00:16.9]}  42...e5 {[%clk 0:00:19.8]}  43.Qe2 {[%clk 0:00:16.1]}  43...e4 {[%clk 0:00:19.2]}  44.Qb5 {[%clk 0:00:16]}  44...Qxb5 {[%clk 0:00:18.4]}  0-1`
  },
  {
    id: 34,
    white: "Hikaru", white_elo: 3330,
    black: "AwesomeAtti", black_elo: 3191,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.01", round: "?", result: "1/2-1/2",
    eco: "B43",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.01"]
[Round "?"]
[White "Hikaru"]
[Black "AwesomeAtti"]
[Result "1/2-1/2"]
[WhiteElo "3330"]
[BlackElo "3191"]
[ECO "B43"]
[PlyCount "133"]
[CurrentPosition "8/1b6/5K2/1Bk5/8/8/8/8 b - - 0 67"]
[ECOUrl "https://www.chess.com/openings/Sicilian-Defense-Kan-Knight-Variation-5...Qc7"]
[EndDate "2026.08.01"]
[EndTime "16:02:19"]
[Link "https://www.chess.com/game/live/179913471991"]
[StartTime "16:00:01"]
[Termination "Game drawn by insufficient material"]
[TimeControl "60"]
[Timezone "UTC"]
[Tournament "https://www.chess.com/tournament/live/bullet-brawl-august-01-2026-31342223"]
[UTCDate "2026.08.01"]
[UTCTime "16:00:01"]

1.e4 {[%clk 0:00:59.9]}  1...c5 {[%clk 0:00:59]}  2.Nc3 {[%clk 0:00:59.8]}  2...e6 {[%clk 0:00:58.3]}  3.Nf3 {[%clk 0:00:59.7]}  3...a6 {[%clk 0:00:57.7]}  4.d4 {[%clk 0:00:58.8]}  4...cxd4 {[%clk 0:00:57.6]}  5.Nxd4 {[%clk 0:00:58.6]}  5...Qc7 {[%clk 0:00:57]}  6.Nb3 {[%clk 0:00:58.2]}  6...Nf6 {[%clk 0:00:56.3]}  7.Bd3 {[%clk 0:00:58.1]}  7...b5 {[%clk 0:00:55.5]}  8.O-O {[%clk 0:00:58]}  8...Bb7 {[%clk 0:00:54.9]}  9.Re1 {[%clk 0:00:57.5]}  9...d6 {[%clk 0:00:54.5]}  10.f4 {[%clk 0:00:57.1]}  10...Nbd7 {[%clk 0:00:53.7]}  11.Qf3 {[%clk 0:00:56.6]}  11...g6 {[%clk 0:00:52.7]}  12.Bd2 {[%clk 0:00:54.5]}  12...Bg7 {[%clk 0:00:52.2]}  13.Rad1 {[%clk 0:00:54.2]}  13...O-O {[%clk 0:00:51.9]}  14.h3 {[%clk 0:00:53.8]}  14...Nc5 {[%clk 0:00:51]}  15.a3 {[%clk 0:00:47.3]}  15...Rfd8 {[%clk 0:00:49.3]}  16.Qf2 {[%clk 0:00:46.4]}  16...Na4 {[%clk 0:00:46]}  17.Nxa4 {[%clk 0:00:44.6]}  17...bxa4 {[%clk 0:00:45.9]}  18.Ba5 {[%clk 0:00:44.4]}  18...Qe7 {[%clk 0:00:36]}  19.Bxd8 {[%clk 0:00:43.5]}  19...Rxd8 {[%clk 0:00:35.9]}  20.Nd2 {[%clk 0:00:42.8]}  20...e5 {[%clk 0:00:34.4]}  21.fxe5 {[%clk 0:00:41.7]}  21...dxe5 {[%clk 0:00:33]}  22.Nf3 {[%clk 0:00:41.4]}  22...Bh6 {[%clk 0:00:32.2]}  23.Kh1 {[%clk 0:00:39.8]}  23...Kg7 {[%clk 0:00:31.6]}  24.Qa7 {[%clk 0:00:36.4]}  24...Rd7 {[%clk 0:00:30.2]}  25.Qb6 {[%clk 0:00:35]}  25...Bf4 {[%clk 0:00:29.2]}  26.Qb4 {[%clk 0:00:34.5]}  26...Qd8 {[%clk 0:00:27.9]}  27.Qxa4 {[%clk 0:00:33]}  27...Nh5 {[%clk 0:00:27.5]}  28.Qb4 {[%clk 0:00:30.8]}  28...a5 {[%clk 0:00:26.9]}  29.Qc5 {[%clk 0:00:29.1]}  29...Ng3+ {[%clk 0:00:25.7]}  30.Kg1 {[%clk 0:00:28.8]}  30...Bxe4 {[%clk 0:00:25.4]}  31.Qf2 {[%clk 0:00:23.9]}  31...Rd5 {[%clk 0:00:22.4]}  32.Be2 {[%clk 0:00:20.9]}  32...Bxc2 {[%clk 0:00:21.6]}  33.Rxd5 {[%clk 0:00:19.8]}  33...Qxd5 {[%clk 0:00:21.5]}  34.Bf1 {[%clk 0:00:19.5]}  34...Be4 {[%clk 0:00:20.7]}  35.h4 {[%clk 0:00:18.6]}  35...h6 {[%clk 0:00:19.8]}  36.b4 {[%clk 0:00:17.4]}  36...axb4 {[%clk 0:00:18.9]}  37.axb4 {[%clk 0:00:17.3]}  37...Qb3 {[%clk 0:00:18.2]}  38.b5 {[%clk 0:00:16.3]}  38...Bb7 {[%clk 0:00:17.7]}  39.Nxe5 {[%clk 0:00:15.6]}  39...g5 {[%clk 0:00:17]}  40.hxg5 {[%clk 0:00:14.8]}  40...hxg5 {[%clk 0:00:16.7]}  41.Nd3 {[%clk 0:00:14.7]}  41...Ne4 {[%clk 0:00:13.9]}  42.Qd4+ {[%clk 0:00:13.8]}  42...Nf6 {[%clk 0:00:13.1]}  43.Nxf4 {[%clk 0:00:13.4]}  43...gxf4 {[%clk 0:00:12.7]}  44.Qxf4 {[%clk 0:00:13.3]}  44...Qc3 {[%clk 0:00:12]}  45.Qg5+ {[%clk 0:00:12.9]}  45...Kf8 {[%clk 0:00:11]}  46.Qe5 {[%clk 0:00:12.8]}  46...Qd2 {[%clk 0:00:08.8]}  47.Qb8+ {[%clk 0:00:12.1]}  47...Kg7 {[%clk 0:00:08.4]}  48.Qg3+ {[%clk 0:00:12]}  48...Kf8 {[%clk 0:00:07.3]}  49.Qf2 {[%clk 0:00:11.9]}  49...Qd6 {[%clk 0:00:06.2]}  50.Re3 {[%clk 0:00:10.8]}  50...Ng4 {[%clk 0:00:05.3]}  51.Qg3 {[%clk 0:00:10.5]}  51...Qd4 {[%clk 0:00:04.9]}  52.Qb8+ {[%clk 0:00:09.6]}  52...Kg7 {[%clk 0:00:04.6]}  53.Qg3 {[%clk 0:00:09.5]}  53...Qxe3+ {[%clk 0:00:04.3]}  54.Qxe3 {[%clk 0:00:09.2]}  54...Nxe3 {[%clk 0:00:04.2]}  55.Be2 {[%clk 0:00:09.1]}  55...Nxg2 {[%clk 0:00:04]}  56.Kf2 {[%clk 0:00:08.5]}  56...Nf4 {[%clk 0:00:03.9]}  57.Bc4 {[%clk 0:00:08.4]}  57...Nd5 {[%clk 0:00:03.5]}  58.Ke2 {[%clk 0:00:07.8]}  58...Nb6 {[%clk 0:00:03.4]}  59.Bd3 {[%clk 0:00:07]}  59...Kf6 {[%clk 0:00:03.3]}  60.Kd2 {[%clk 0:00:06.6]}  60...Ke5 {[%clk 0:00:03.2]}  61.Ke3 {[%clk 0:00:06.5]}  61...Kd6 {[%clk 0:00:03]}  62.Be4 {[%clk 0:00:06]}  62...f6 {[%clk 0:00:02.9]}  63.Bd3 {[%clk 0:00:05.6]}  63...Kc5 {[%clk 0:00:02.8]}  64.Kf4 {[%clk 0:00:05.1]}  64...Nc4 {[%clk 0:00:02.7]}  65.Kf5 {[%clk 0:00:05]}  65...Nd6+ {[%clk 0:00:02.4]}  66.Kxf6 {[%clk 0:00:04.8]}  66...Nxb5 {[%clk 0:00:02.1]}  67.Bxb5 {[%clk 0:00:04.7]}  1/2-1/2`
  },
  {
    id: 35,
    white: "AwesomeAtti", white_elo: 2895,
    black: "Hikaru", black_elo: 3455,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.01", round: "?", result: "0-1",
    eco: "B52",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.01"]
[Round "?"]
[White "AwesomeAtti"]
[Black "Hikaru"]
[Result "0-1"]
[WhiteElo "2895"]
[BlackElo "3455"]
[ECO "B52"]
[PlyCount "114"]
[CurrentPosition "8/3k3p/6p1/1P2bnK1/P7/8/8/8 w - - 0 58"]
[ECOUrl "https://www.chess.com/openings/Sicilian-Defense-Canal-Main-Line-4.Bxd7-Nxd7-5.d4-cxd4"]
[EndDate "2026.08.01"]
[EndTime "15:54:35"]
[Link "https://www.chess.com/game/live/172386867960"]
[StartTime "15:49:20"]
[Termination "Hikaru won by resignation"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.01"]
[UTCTime "15:49:20"]

1.e4 {[%clk 0:03:00]}  1...c5 {[%clk 0:03:00]}  2.Nf3 {[%clk 0:02:59.1]}  2...d6 {[%clk 0:02:59.5]}  3.Bb5+ {[%clk 0:02:57.3]}  3...Bd7 {[%clk 0:02:58.4]}  4.Bxd7+ {[%clk 0:02:55.9]}  4...Nxd7 {[%clk 0:02:58.3]}  5.d4 {[%clk 0:02:52.9]}  5...cxd4 {[%clk 0:02:57.5]}  6.Nxd4 {[%clk 0:02:49.9]}  6...Ngf6 {[%clk 0:02:56.6]}  7.f3 {[%clk 0:02:46.7]}  7...g6 {[%clk 0:02:54.7]}  8.O-O {[%clk 0:02:45.3]}  8...Rc8 {[%clk 0:02:53.7]}  9.Be3 {[%clk 0:02:44.1]}  9...Bg7 {[%clk 0:02:52.5]}  10.Qe2 {[%clk 0:02:41.3]}  10...d5 {[%clk 0:02:51.2]}  11.Nd2 {[%clk 0:02:32.3]}  11...dxe4 {[%clk 0:02:49.4]}  12.Nxe4 {[%clk 0:02:29.2]}  12...Nxe4 {[%clk 0:02:48.8]}  13.fxe4 {[%clk 0:02:29.1]}  13...O-O {[%clk 0:02:48.3]}  14.c3 {[%clk 0:02:28]}  14...a6 {[%clk 0:02:47.6]}  15.Rad1 {[%clk 0:02:26.4]}  15...Qc7 {[%clk 0:02:47.1]}  16.Nf3 {[%clk 0:02:19.2]}  16...Qc6 {[%clk 0:02:40.6]}  17.Bd4 {[%clk 0:02:16.6]}  17...e5 {[%clk 0:02:39.2]}  18.Bf2 {[%clk 0:02:16.3]}  18...Rfe8 {[%clk 0:02:38.7]}  19.h3 {[%clk 0:02:10.6]}  19...Nf6 {[%clk 0:02:37.7]}  20.Rfe1 {[%clk 0:02:09.9]}  20...Nh5 {[%clk 0:02:37.2]}  21.Qe3 {[%clk 0:02:04.4]}  21...Re6 {[%clk 0:02:18]}  22.Rd2 {[%clk 0:01:54.7]}  22...Nf4 {[%clk 0:02:15.1]}  23.Red1 {[%clk 0:01:51.9]}  23...Bh6 {[%clk 0:02:13.5]}  24.Rd8+ {[%clk 0:01:49.5]}  24...Kg7 {[%clk 0:02:12.5]}  25.Rxc8 {[%clk 0:01:36]}  25...Qxc8 {[%clk 0:02:11.9]}  26.Qc5 {[%clk 0:01:35.7]}  26...Qxc5 {[%clk 0:02:05.9]}  27.Bxc5 {[%clk 0:01:35.6]}  27...Rc6 {[%clk 0:02:05.5]}  28.Bf2 {[%clk 0:01:29.1]}  28...Re6 {[%clk 0:01:53.7]}  29.Rd7 {[%clk 0:01:27.8]}  29...b5 {[%clk 0:01:53.2]}  30.Kf1 {[%clk 0:01:10.7]}  30...Nh5 {[%clk 0:01:45.8]}  31.Nxe5 {[%clk 0:01:00.4]}  31...Rxe5 {[%clk 0:01:26.3]}  32.Bd4 {[%clk 0:00:59.1]}  32...Bf4 {[%clk 0:01:26]}  33.Ra7 {[%clk 0:00:57.5]}  33...Kf8 {[%clk 0:01:14.2]}  34.Bxe5 {[%clk 0:00:56]}  34...Bxe5 {[%clk 0:01:14.1]}  35.Kf2 {[%clk 0:00:51.4]}  35...b4 {[%clk 0:01:12.1]}  36.Ra8+ {[%clk 0:00:48.1]}  36...Ke7 {[%clk 0:01:11.2]}  37.cxb4 {[%clk 0:00:48]}  37...Nf4 {[%clk 0:01:10]}  38.Kf3 {[%clk 0:00:44.1]}  38...Nd3 {[%clk 0:01:09.5]}  39.Ra7+ {[%clk 0:00:42.3]}  39...Ke8 {[%clk 0:01:08.3]}  40.Rxa6 {[%clk 0:00:40.3]}  40...Nxb4 {[%clk 0:01:06.4]}  41.Ra4 {[%clk 0:00:37.4]}  41...Nd3 {[%clk 0:01:04.2]}  42.b4 {[%clk 0:00:36.2]}  42...Kd7 {[%clk 0:01:02.7]}  43.Ra5 {[%clk 0:00:34.3]}  43...Ke6 {[%clk 0:01:00.4]}  44.Ra6+ {[%clk 0:00:32.2]}  44...Bd6 {[%clk 0:00:58.6]}  45.b5 {[%clk 0:00:31.4]}  45...Kd7 {[%clk 0:00:51.4]}  46.Ra7+ {[%clk 0:00:30.5]}  46...Kc8 {[%clk 0:00:51.1]}  47.Rxf7 {[%clk 0:00:29.3]}  47...Ne5+ {[%clk 0:00:50.5]}  48.Ke3 {[%clk 0:00:28.7]}  48...Nxf7 {[%clk 0:00:50.4]}  49.Kd4 {[%clk 0:00:28.4]}  49...Kd7 {[%clk 0:00:49.5]}  50.Kd5 {[%clk 0:00:28]}  50...Bc7 {[%clk 0:00:48.4]}  51.a4 {[%clk 0:00:27.9]}  51...Ng5 {[%clk 0:00:47]}  52.h4 {[%clk 0:00:25.8]}  52...Ne6 {[%clk 0:00:46.4]}  53.e5 {[%clk 0:00:24.8]}  53...Nf4+ {[%clk 0:00:45.2]}  54.Ke4 {[%clk 0:00:24]}  54...Nxg2 {[%clk 0:00:44.6]}  55.Kf3 {[%clk 0:00:19.6]}  55...Nxh4+ {[%clk 0:00:43.6]}  56.Kg4 {[%clk 0:00:19.5]}  56...Nf5 {[%clk 0:00:43.2]}  57.Kg5 {[%clk 0:00:19.1]}  57...Bxe5 {[%clk 0:00:42.6]}  0-1`
  },
  {
    id: 36,
    white: "Hikaru", white_elo: 3454,
    black: "AwesomeAtti", black_elo: 2896,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.01", round: "?", result: "0-1",
    eco: "A46",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.01"]
[Round "?"]
[White "Hikaru"]
[Black "AwesomeAtti"]
[Result "0-1"]
[WhiteElo "3454"]
[BlackElo "2896"]
[ECO "A46"]
[PlyCount "102"]
[CurrentPosition "2r3k1/5p2/2B2bp1/1p2r3/pP6/P4K2/8/8 w - - 0 52"]
[ECOUrl "https://www.chess.com/openings/Indian-Game-Knights-Variation...4.Bg2-Bd6-5.O-O-O-O"]
[EndDate "2026.08.01"]
[EndTime "15:49:17"]
[Link "https://www.chess.com/game/live/172386665410"]
[StartTime "15:44:27"]
[Termination "AwesomeAtti won by resignation"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.01"]
[UTCTime "15:44:27"]

1.d4 {[%clk 0:03:00]}  1...Nf6 {[%clk 0:03:00]}  2.Nf3 {[%clk 0:02:59.4]}  2...e6 {[%clk 0:02:59.1]}  3.g3 {[%clk 0:02:58.7]}  3...d5 {[%clk 0:02:58.2]}  4.Bg2 {[%clk 0:02:58.6]}  4...Bd6 {[%clk 0:02:57.4]}  5.O-O {[%clk 0:02:58.2]}  5...O-O {[%clk 0:02:56.9]}  6.Nbd2 {[%clk 0:02:57.5]}  6...Nc6 {[%clk 0:02:55.9]}  7.c4 {[%clk 0:02:56.3]}  7...Re8 {[%clk 0:02:52]}  8.b3 {[%clk 0:02:55.4]}  8...a5 {[%clk 0:02:47.6]}  9.a3 {[%clk 0:02:53.3]}  9...b6 {[%clk 0:02:45.1]}  10.Bb2 {[%clk 0:02:52.1]}  10...Bb7 {[%clk 0:02:42.3]}  11.e3 {[%clk 0:02:51.2]}  11...e5 {[%clk 0:01:55.9]}  12.cxd5 {[%clk 0:02:41.5]}  12...Nxd5 {[%clk 0:01:55.8]}  13.e4 {[%clk 0:02:40.8]}  13...Nf6 {[%clk 0:01:55.1]}  14.d5 {[%clk 0:02:40.1]}  14...Ne7 {[%clk 0:01:54.6]}  15.Re1 {[%clk 0:02:36.9]}  15...Ng6 {[%clk 0:01:38.7]}  16.Nc4 {[%clk 0:02:35.7]}  16...b5 {[%clk 0:01:36.7]}  17.Ne3 {[%clk 0:02:31.3]}  17...Nxe4 {[%clk 0:01:34.5]}  18.h4 {[%clk 0:02:24.6]}  18...Nf6 {[%clk 0:01:25.4]}  19.Ng5 {[%clk 0:02:23.7]}  19...h6 {[%clk 0:01:23.6]}  20.Ne4 {[%clk 0:02:23.1]}  20...Bc8 {[%clk 0:01:18.7]}  21.h5 {[%clk 0:02:15.3]}  21...Nf8 {[%clk 0:01:15.7]}  22.Rc1 {[%clk 0:02:13]}  22...N8h7 {[%clk 0:01:14.4]}  23.Nxf6+ {[%clk 0:02:04.4]}  23...Nxf6 {[%clk 0:01:14.3]}  24.Qd3 {[%clk 0:02:02.7]}  24...Rb8 {[%clk 0:01:11.3]}  25.Qc2 {[%clk 0:01:59.5]}  25...Nxh5 {[%clk 0:01:07.2]}  26.Nf5 {[%clk 0:01:59.1]}  26...Nf6 {[%clk 0:01:04]}  27.Re2 {[%clk 0:01:56.9]}  27...Bxf5 {[%clk 0:00:59.4]}  28.Qxf5 {[%clk 0:01:56.7]}  28...Qd7 {[%clk 0:00:59.3]}  29.Qd3 {[%clk 0:01:54.4]}  29...a4 {[%clk 0:00:58.7]}  30.b4 {[%clk 0:01:53.4]}  30...g6 {[%clk 0:00:55.8]}  31.Rc6 {[%clk 0:01:51.7]}  31...Qf5 {[%clk 0:00:54.8]}  32.Qd2 {[%clk 0:01:34.8]}  32...h5 {[%clk 0:00:54.1]}  33.Re3 {[%clk 0:01:33.3]}  33...e4 {[%clk 0:00:51.1]}  34.Bxf6 {[%clk 0:01:26.3]}  34...Qxf6 {[%clk 0:00:51]}  35.Bxe4 {[%clk 0:01:25.7]}  35...h4 {[%clk 0:00:48.4]}  36.Kg2 {[%clk 0:01:24.1]}  36...hxg3 {[%clk 0:00:46.4]}  37.fxg3 {[%clk 0:01:24]}  37...Qg5 {[%clk 0:00:45.2]}  38.Kf3 {[%clk 0:01:02.6]}  38...Qxg3+ {[%clk 0:00:37.1]}  39.Ke2 {[%clk 0:01:02.1]}  39...Qh2+ {[%clk 0:00:36.7]}  40.Kd3 {[%clk 0:01:01.6]}  40...Qxd2+ {[%clk 0:00:36.6]}  41.Kxd2 {[%clk 0:01:01.5]}  41...Bf4 {[%clk 0:00:36]}  42.Kd3 {[%clk 0:01:00]}  42...Bxe3 {[%clk 0:00:35.4]}  43.Rxc7 {[%clk 0:00:59.9]}  43...Bf4 {[%clk 0:00:33.8]}  44.Rc6 {[%clk 0:00:59.6]}  44...Be5 {[%clk 0:00:33.2]}  45.d6 {[%clk 0:00:58.8]}  45...Red8 {[%clk 0:00:32.2]}  46.Rc5 {[%clk 0:00:58.7]}  46...Rxd6+ {[%clk 0:00:31.5]}  47.Ke2 {[%clk 0:00:58.4]}  47...Bf6 {[%clk 0:00:31.1]}  48.Bd5 {[%clk 0:00:57]}  48...Re8+ {[%clk 0:00:30.5]}  49.Kf3 {[%clk 0:00:56.6]}  49...Re5 {[%clk 0:00:30.4]}  50.Rc8+ {[%clk 0:00:56.2]}  50...Rd8 {[%clk 0:00:29.4]}  51.Bc6 {[%clk 0:00:56.1]}  51...Rxc8 {[%clk 0:00:28.8]}  0-1`
  },
  {
    id: 37,
    white: "AwesomeAtti", white_elo: 2881,
    black: "Hikaru", black_elo: 3469,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.01", round: "?", result: "0-1",
    eco: "B06",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.01"]
[Round "?"]
[White "AwesomeAtti"]
[Black "Hikaru"]
[Result "0-1"]
[WhiteElo "2881"]
[BlackElo "3469"]
[ECO "B06"]
[PlyCount "33"]
[CurrentPosition "r1bqr1k1/pp4bp/2p3p1/3n1p2/7P/2P1nPN1/PPB1N1P1/R1Q1BRK1 b - - 3 17"]
[ECOUrl "https://www.chess.com/openings/Modern-Defense-with-1-e4-2.d4-Bg7-3.c3-c6-4.Bd3"]
[EndDate "2026.08.01"]
[EndTime "15:44:26"]
[Link "https://www.chess.com/game/live/172386591738"]
[StartTime "15:42:40"]
[Termination "Hikaru won by resignation"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.01"]
[UTCTime "15:42:40"]

1.e4 {[%clk 0:03:00]}  1...g6 {[%clk 0:03:00]}  2.d4 {[%clk 0:02:58.6]}  2...c6 {[%clk 0:02:59.9]}  3.Bd3 {[%clk 0:02:54.8]}  3...Bg7 {[%clk 0:02:59]}  4.c3 {[%clk 0:02:53.7]}  4...d6 {[%clk 0:02:58.1]}  5.h4 {[%clk 0:02:51.7]}  5...Nf6 {[%clk 0:02:57.2]}  6.Ne2 {[%clk 0:02:47.7]}  6...e5 {[%clk 0:02:56.1]}  7.f3 {[%clk 0:02:43.5]}  7...Nbd7 {[%clk 0:02:47.6]}  8.dxe5 {[%clk 0:02:42.2]}  8...Nxe5 {[%clk 0:02:46.2]}  9.Bc2 {[%clk 0:02:41.1]}  9...O-O {[%clk 0:02:45.5]}  10.Be3 {[%clk 0:02:28.3]}  10...d5 {[%clk 0:02:43.7]}  11.Nd2 {[%clk 0:02:24.7]}  11...Re8 {[%clk 0:02:41.5]}  12.O-O {[%clk 0:02:17.4]}  12...dxe4 {[%clk 0:02:32.8]}  13.Nxe4 {[%clk 0:02:07.2]}  13...Nd5 {[%clk 0:02:32]}  14.Bf2 {[%clk 0:02:00.4]}  14...Nc4 {[%clk 0:02:31.4]}  15.Qc1 {[%clk 0:01:57]}  15...f5 {[%clk 0:02:29.8]}  16.N4g3 {[%clk 0:01:55.9]}  16...Nce3 {[%clk 0:02:27.6]}  17.Be1 {[%clk 0:01:54.6]}  0-1`
  },
  {
    id: 38,
    white: "AwesomeAtti", white_elo: 3468,
    black: "Hikaru", black_elo: 2882,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.01", round: "?", result: "1-0",
    eco: "A43",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.01"]
[Round "?"]
[White "AwesomeAtti"]
[Black "Hikaru"]
[Result "1-0"]
[WhiteElo "3468"]
[BlackElo "2882"]
[ECO "A43"]
[PlyCount "99"]
[CurrentPosition "8/4R3/1r1pk1p1/3Npp2/2P1P3/3K1Pr1/8/8 b - - 1 50"]
[ECOUrl "https://www.chess.com/openings/Old-Benoni-Defense-2.dxc5"]
[EndDate "2026.08.01"]
[EndTime "15:42:38"]
[Link "https://www.chess.com/game/live/172386375458"]
[StartTime "15:37:26"]
[Termination "Hikaru won by checkmate"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.01"]
[UTCTime "15:37:26"]

1.d4 {[%clk 0:03:00]}  1...c5 {[%clk 0:03:00]}  2.dxc5 {[%clk 0:02:58.8]}  2...Nf6 {[%clk 0:02:59]}  3.Nc3 {[%clk 0:02:58.1]}  3...e6 {[%clk 0:02:53.9]}  4.e4 {[%clk 0:02:56.9]}  4...Nc6 {[%clk 0:02:44.6]}  5.Nf3 {[%clk 0:02:27.6]}  5...e5 {[%clk 0:02:16.7]}  6.Be3 {[%clk 0:02:07.5]}  6...Qa5 {[%clk 0:02:13]}  7.Bd3 {[%clk 0:02:03.3]}  7...Bxc5 {[%clk 0:02:10.9]}  8.Bd2 {[%clk 0:02:03]}  8...Qd8 {[%clk 0:02:04.2]}  9.O-O {[%clk 0:02:02.4]}  9...O-O {[%clk 0:02:03.2]}  10.Bg5 {[%clk 0:02:01.4]}  10...h6 {[%clk 0:02:02.1]}  11.Bh4 {[%clk 0:02:00.3]}  11...Be7 {[%clk 0:02:01.8]}  12.Bxf6 {[%clk 0:01:58.6]}  12...Bxf6 {[%clk 0:02:00.9]}  13.Nd5 {[%clk 0:01:58.2]}  13...d6 {[%clk 0:01:57.1]}  14.c3 {[%clk 0:01:57.8]}  14...Be6 {[%clk 0:01:55.8]}  15.Bc4 {[%clk 0:01:57.2]}  15...Rc8 {[%clk 0:01:52.9]}  16.Bb3 {[%clk 0:01:52.5]}  16...Na5 {[%clk 0:01:43.1]}  17.Qd3 {[%clk 0:01:49]}  17...Nxb3 {[%clk 0:01:17.5]}  18.axb3 {[%clk 0:01:48]}  18...a6 {[%clk 0:01:17.2]}  19.Rfd1 {[%clk 0:01:43.9]}  19...Bxd5 {[%clk 0:01:14.9]}  20.Qxd5 {[%clk 0:01:42.5]}  20...Qb6 {[%clk 0:01:12.4]}  21.b4 {[%clk 0:01:40.5]}  21...Rfd8 {[%clk 0:01:08.5]}  22.Nd2 {[%clk 0:01:38.8]}  22...Qc6 {[%clk 0:01:05.8]}  23.Qxc6 {[%clk 0:01:34.9]}  23...Rxc6 {[%clk 0:01:05.7]}  24.g3 {[%clk 0:01:34.4]}  24...Be7 {[%clk 0:01:03.7]}  25.Nf1 {[%clk 0:01:33.1]}  25...g6 {[%clk 0:01:03.1]}  26.Ne3 {[%clk 0:01:32.3]}  26...Kg7 {[%clk 0:01:01.7]}  27.Kg2 {[%clk 0:01:31.1]}  27...h5 {[%clk 0:01:00.4]}  28.Rd3 {[%clk 0:01:27.6]}  28...Kf6 {[%clk 0:00:58.8]}  29.Rd5 {[%clk 0:01:25]}  29...Ke6 {[%clk 0:00:57.6]}  30.b5 {[%clk 0:01:24.4]}  30...Rb6 {[%clk 0:00:52.2]}  31.bxa6 {[%clk 0:01:23.7]}  31...bxa6 {[%clk 0:00:51.4]}  32.b4 {[%clk 0:01:21.9]}  32...Rc8 {[%clk 0:00:49.7]}  33.Rd3 {[%clk 0:01:20.4]}  33...f5 {[%clk 0:00:44.2]}  34.f3 {[%clk 0:01:19.8]}  34...Rbc6 {[%clk 0:00:39.9]}  35.Ra3 {[%clk 0:01:16.6]}  35...h4 {[%clk 0:00:37.1]}  36.Nd5 {[%clk 0:01:15]}  36...hxg3 {[%clk 0:00:35]}  37.hxg3 {[%clk 0:01:14.9]}  37...Bd8 {[%clk 0:00:33.9]}  38.Rd1 {[%clk 0:01:11.1]}  38...Ra8 {[%clk 0:00:32.7]}  39.Kf2 {[%clk 0:01:04.6]}  39...a5 {[%clk 0:00:29.5]}  40.Rda1 {[%clk 0:01:03.8]}  40...Rca6 {[%clk 0:00:27.8]}  41.b5 {[%clk 0:01:02.2]}  41...R6a7 {[%clk 0:00:26.6]}  42.Ke3 {[%clk 0:01:00.2]}  42...Rc8 {[%clk 0:00:25.4]}  43.Kd3 {[%clk 0:00:59.8]}  43...Rb7 {[%clk 0:00:24.5]}  44.c4 {[%clk 0:00:59.2]}  44...Rh7 {[%clk 0:00:21.7]}  45.b6 {[%clk 0:00:57]}  45...Rb8 {[%clk 0:00:20.3]}  46.Rxa5 {[%clk 0:00:55.3]}  46...Bxb6 {[%clk 0:00:19.6]}  47.Rb5 {[%clk 0:00:55]}  47...Rh3 {[%clk 0:00:13.8]}  48.Rxb6 {[%clk 0:00:53]}  48...Rxb6 {[%clk 0:00:13.2]}  49.Ra7 {[%clk 0:00:48.5]}  49...Rxg3 {[%clk 0:00:13.1]}  50.Re7# {[%clk 0:00:47.1]}  1-0`
  },
  {
    id: 39,
    white: "AwesomeAtti", white_elo: 2883,
    black: "Hikaru", black_elo: 3467,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.01", round: "?", result: "0-1",
    eco: "B06",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.01"]
[Round "?"]
[White "AwesomeAtti"]
[Black "Hikaru"]
[Result "0-1"]
[WhiteElo "2883"]
[BlackElo "3467"]
[ECO "B06"]
[PlyCount "60"]
[CurrentPosition "4r2r/p3k2p/2n5/2NB4/6P1/1P5b/P1P5/6K1 w - - 0 31"]
[ECOUrl "https://www.chess.com/openings/Caro-Kann-Defense-Gurgenidze-System-4.h3-Bg7"]
[EndDate "2026.08.01"]
[EndTime "15:37:24"]
[Link "https://www.chess.com/game/live/172386187656"]
[StartTime "15:32:52"]
[Termination "Hikaru won by resignation"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.01"]
[UTCTime "15:32:52"]

1.e4 {[%clk 0:03:00]}  1...g6 {[%clk 0:03:00]}  2.d4 {[%clk 0:02:58.8]}  2...c6 {[%clk 0:02:59.7]}  3.Nc3 {[%clk 0:02:56.1]}  3...d5 {[%clk 0:02:58.2]}  4.h3 {[%clk 0:02:55.1]}  4...Bg7 {[%clk 0:02:56.3]}  5.e5 {[%clk 0:02:54.5]}  5...b6 {[%clk 0:02:55.6]}  6.g4 {[%clk 0:02:52.2]}  6...Ba6 {[%clk 0:02:54.3]}  7.Bg2 {[%clk 0:02:51.6]}  7...e6 {[%clk 0:02:51.9]}  8.Nge2 {[%clk 0:02:50.9]}  8...c5 {[%clk 0:02:51.3]}  9.Be3 {[%clk 0:02:44.7]}  9...cxd4 {[%clk 0:02:49.4]}  10.Qxd4 {[%clk 0:02:40.8]}  10...Ne7 {[%clk 0:02:45.4]}  11.f4 {[%clk 0:02:38.7]}  11...Nbc6 {[%clk 0:02:42.1]}  12.Qd2 {[%clk 0:02:33.6]}  12...g5 {[%clk 0:02:36.9]}  13.f5 {[%clk 0:02:08.6]}  13...Nxe5 {[%clk 0:02:28.1]}  14.Bxg5 {[%clk 0:01:57.7]}  14...Nc4 {[%clk 0:02:26.1]}  15.Qc1 {[%clk 0:01:51.7]}  15...Be5 {[%clk 0:02:20.6]}  16.fxe6 {[%clk 0:01:48]}  16...fxe6 {[%clk 0:02:19.4]}  17.b3 {[%clk 0:01:32.3]}  17...Nd6 {[%clk 0:02:17.1]}  18.Qe3 {[%clk 0:01:31.2]}  18...Nf7 {[%clk 0:02:15.9]}  19.Bxe7 {[%clk 0:01:22.1]}  19...Qxe7 {[%clk 0:02:14]}  20.O-O {[%clk 0:01:17.6]}  20...Qc5 {[%clk 0:02:07]}  21.Qxc5 {[%clk 0:01:09]}  21...bxc5 {[%clk 0:02:05.8]}  22.Rae1 {[%clk 0:00:56.8]}  22...Bxc3 {[%clk 0:02:04.5]}  23.Nxc3 {[%clk 0:00:56.7]}  23...Bxf1 {[%clk 0:02:04.1]}  24.Rxe6+ {[%clk 0:00:49.8]}  24...Kd7 {[%clk 0:02:00.5]}  25.Bxd5 {[%clk 0:00:49.2]}  25...Bxh3 {[%clk 0:01:56.2]}  26.Ne4 {[%clk 0:00:36.9]}  26...Rae8 {[%clk 0:01:37.1]}  27.Nxc5+ {[%clk 0:00:19.2]}  27...Kd8 {[%clk 0:01:36.5]}  28.Rc6 {[%clk 0:00:15.6]}  28...Ne5 {[%clk 0:01:30.6]}  29.Nb7+ {[%clk 0:00:13.3]}  29...Ke7 {[%clk 0:01:26.2]}  30.Nc5 {[%clk 0:00:13]}  30...Nxc6 {[%clk 0:01:25.3]}  0-1`
  },
  {
    id: 40,
    white: "Hikaru", white_elo: 3466,
    black: "AwesomeAtti", black_elo: 2884,
    event: "Live Chess", site: "Chess.com",
    date: "2026.08.01", round: "?", result: "1-0",
    eco: "D02",
    ply_count: null,
    movetext: null,
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.08.01"]
[Round "?"]
[White "Hikaru"]
[Black "AwesomeAtti"]
[Result "1-0"]
[WhiteElo "3466"]
[BlackElo "2884"]
[ECO "D02"]
[PlyCount "81"]
[CurrentPosition "2r3k1/4Np2/6q1/2bBB1p1/4Q3/6P1/P4PK1/8 b - - 6 41"]
[ECOUrl "https://www.chess.com/openings/Indian-Game-Spielmann-Indian-Variation...4.Nxd4-d5-5.Bg2-e5"]
[EndDate "2026.08.01"]
[EndTime "15:32:51"]
[Link "https://www.chess.com/game/live/172385979790"]
[StartTime "15:27:49"]
[Termination "Hikaru won by resignation"]
[TimeControl "180"]
[Timezone "UTC"]
[UTCDate "2026.08.01"]
[UTCTime "15:27:49"]

1.d4 {[%clk 0:03:00]}  1...d5 {[%clk 0:03:00]}  2.Nf3 {[%clk 0:02:58.3]}  2...Nf6 {[%clk 0:02:59.3]}  3.g3 {[%clk 0:02:57.8]}  3...c5 {[%clk 0:02:57.2]}  4.Bg2 {[%clk 0:02:57.1]}  4...cxd4 {[%clk 0:02:56]}  5.Nxd4 {[%clk 0:02:56.2]}  5...e5 {[%clk 0:02:54.4]}  6.Nf3 {[%clk 0:02:54.9]}  6...Nc6 {[%clk 0:02:53.1]}  7.O-O {[%clk 0:02:54.3]}  7...Be7 {[%clk 0:02:51.2]}  8.c4 {[%clk 0:02:53.7]}  8...d4 {[%clk 0:02:45.4]}  9.e3 {[%clk 0:02:52.6]}  9...O-O {[%clk 0:02:43.5]}  10.exd4 {[%clk 0:02:52.1]}  10...exd4 {[%clk 0:02:42.1]}  11.Re1 {[%clk 0:02:50.9]}  11...a5 {[%clk 0:02:36.6]}  12.Ne5 {[%clk 0:02:48.2]}  12...Nxe5 {[%clk 0:02:31.4]}  13.Rxe5 {[%clk 0:02:48.1]}  13...h6 {[%clk 0:02:25]}  14.Re1 {[%clk 0:02:42.7]}  14...Bc5 {[%clk 0:02:18.3]}  15.Nd2 {[%clk 0:02:37.7]}  15...Bf5 {[%clk 0:02:10.4]}  16.Nb3 {[%clk 0:02:35.9]}  16...Ba7 {[%clk 0:02:05.4]}  17.c5 {[%clk 0:02:31.9]}  17...d3 {[%clk 0:01:57.4]}  18.Qf3 {[%clk 0:02:17.5]}  18...Be4 {[%clk 0:01:46.8]}  19.Rxe4 {[%clk 0:02:16.5]}  19...Nxe4 {[%clk 0:01:46.7]}  20.Qxe4 {[%clk 0:02:16.4]}  20...Re8 {[%clk 0:01:46]}  21.Qf3 {[%clk 0:02:07.2]}  21...Re1+ {[%clk 0:01:43.9]}  22.Bf1 {[%clk 0:02:06.6]}  22...d2 {[%clk 0:00:59.7]}  23.Nxd2 {[%clk 0:02:05.1]}  23...Bxc5 {[%clk 0:00:58.3]}  24.Nb3 {[%clk 0:02:01.3]}  24...Ba7 {[%clk 0:00:39.7]}  25.Bf4 {[%clk 0:01:57.9]}  25...Rxa1 {[%clk 0:00:38]}  26.Nxa1 {[%clk 0:01:57.8]}  26...a4 {[%clk 0:00:34.7]}  27.Nc2 {[%clk 0:01:52.9]}  27...Rc8 {[%clk 0:00:31.4]}  28.Ne3 {[%clk 0:01:50.2]}  28...Qd4 {[%clk 0:00:30.2]}  29.Qxb7 {[%clk 0:01:43.4]}  29...Re8 {[%clk 0:00:29.1]}  30.Bc4 {[%clk 0:01:39.9]}  30...Rf8 {[%clk 0:00:27.9]}  31.h4 {[%clk 0:01:23.6]}  31...Bc5 {[%clk 0:00:26.1]}  32.Kg2 {[%clk 0:01:21.3]}  32...Qd8 {[%clk 0:00:14.4]}  33.b3 {[%clk 0:01:19.4]}  33...g5 {[%clk 0:00:12.7]}  34.hxg5 {[%clk 0:01:18]}  34...hxg5 {[%clk 0:00:12.6]}  35.Bc7 {[%clk 0:01:17.4]}  35...Qe7 {[%clk 0:00:11.4]}  36.Nf5 {[%clk 0:01:15]}  36...Qf6 {[%clk 0:00:10.2]}  37.Qe4 {[%clk 0:01:12.7]}  37...axb3 {[%clk 0:00:09.8]}  38.Bxb3 {[%clk 0:01:11.5]}  38...Rc8 {[%clk 0:00:07.3]}  39.Be5 {[%clk 0:01:10.4]}  39...Qc6 {[%clk 0:00:06.7]}  40.Bd5 {[%clk 0:01:09.1]}  40...Qg6 {[%clk 0:00:06.1]}  41.Ne7+ {[%clk 0:01:08.4]}  1-0`
  },
];
