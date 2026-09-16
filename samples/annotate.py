import argparse
import sys
from datetime import datetime, timezone

import chess
import chess.engine
import chess.pgn


STOCKFISH_EXECUTABLE = "stockfish"


def format_eval(score):
    """
    Convert a python-chess PovScore into the PGN [%eval] format.

    Examples:
        +0.35  -> 0.35
        -1.20  -> -1.20
        Mate in 3 -> #3
        Mate in -2 -> #-2
    """
    # Convert to White's point of view.
    score = score.pov(chess.WHITE)

    if score.is_mate():
        mate = score.mate()
        return f"#{mate}"

    cp = score.score()

    if cp is None:
        return "0.00"

    return f"{cp / 100:.2f}"


def annotate_game(game, engine, engine_name, depth, hash_mb):
    """
    Annotate every move in the main line with:
        [%eval ...]      the position the move led to
        [%bestmove ...]  what the engine would have played instead

    So a comment reports what the move that precedes it achieved, beside
    the move the engine preferred in the position it was played from.
    One search per position: each search supplies the eval for the move
    just played and the recommendation for the move played next.
    """

    # Timestamp for this analysis run. String attribute values are quoted,
    # and UTC is written with the Z designator, per
    # spec/pgn-engine-evaluation-context-extension.md §2.
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Engine metadata comment goes before the first move.
    game.comment = (
        f'[%engine name="{engine_name}" '
        f'depth={depth} '
        f'hash={hash_mb} '
        f'timestamp="{timestamp}"]'
    )

    board = game.board()

    # The position before the first move, so move 1 has a recommendation.
    info = engine.analyse(
        board,
        chess.engine.Limit(depth=depth),
    )

    for node in game.mainline():
        # What the engine wanted in the position this move was played from.
        pv = info.get("pv") if info else None

        if pv:
            best_move_uci = pv[0].uci()
        else:
            best_move_uci = ""

        # Play the move, then evaluate the position it led to.
        board.push(node.move)

        if board.is_game_over():
            # Nothing left to search; the game is over.
            info = None
            eval_text = ""
        else:
            info = engine.analyse(
                board,
                chess.engine.Limit(depth=depth),
            )

            eval_text = format_eval(info["score"])

        # Preserve existing comments, such as [%clk ...].
        existing_comment = node.comment.strip()

        annotations = []

        if eval_text:
            annotations.append(f"[%eval {eval_text}]")

        if best_move_uci:
            annotations.append(f"[%bestmove {best_move_uci}]")

        if not annotations:
            continue

        annotation_text = " ".join(annotations)

        if existing_comment:
            node.comment = f"{existing_comment} {annotation_text}"
        else:
            node.comment = annotation_text


def annotate_pgn(input_file, output_file, engine_name, depth, hash_mb):
    """
    Read all games from input_file, annotate them, and write them
    to output_file.
    """

    print("Starting Stockfish...", file=sys.stderr)

    engine = chess.engine.SimpleEngine.popen_uci(
        STOCKFISH_EXECUTABLE
    )

    try:
        engine.configure({
            "Hash": hash_mb,
        })

        with open(input_file, "r", encoding="utf-8") as pgn_in, \
             open(output_file, "w", encoding="utf-8") as pgn_out:

            game_number = 0

            while True:
                game = chess.pgn.read_game(pgn_in)

                if game is None:
                    break

                game_number += 1

                white = game.headers.get("White", "?")
                black = game.headers.get("Black", "?")

                print(
                    f"Analyzing game {game_number}: "
                    f"{white} - {black}",
                    file=sys.stderr,
                )

                annotate_game(
                    game,
                    engine,
                    engine_name,
                    depth,
                    hash_mb,
                )

                print(
                    game,
                    file=pgn_out,
                    end="\n\n",
                )

                pgn_out.flush()

                print(
                    f"Finished game {game_number}",
                    file=sys.stderr,
                )

    finally:
        engine.quit()

    print(
        f"Done. Annotated {game_number} game(s).",
        file=sys.stderr,
    )


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Annotate a PGN with Stockfish evaluations and "
            "best moves."
        )
    )

    parser.add_argument(
        "input",
        help="Input PGN file",
    )

    parser.add_argument(
        "output",
        help="Output PGN file",
    )

    parser.add_argument(
        "--engine",
        required=True,
        help="Engine name written into the PGN metadata comment",
    )

    parser.add_argument(
        "--depth",
        type=int,
        default=10,
        help="Stockfish search depth (default: 10)",
    )

    parser.add_argument(
        "--hash",
        type=int,
        default=4096,
        help="Stockfish hash size in MB (default: 4096)",
    )

    args = parser.parse_args()

    annotate_pgn(
        input_file=args.input,
        output_file=args.output,
        engine_name=args.engine,
        depth=args.depth,
        hash_mb=args.hash,
    )


if __name__ == "__main__":
    main()
