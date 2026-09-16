# PGN Engine Best Move Extension

**Status:** Proposed Extension  
**Version:** 1.1  
**Date:** 2026-09-12  
**Scope:** PGN movetext comments

## 1. Purpose

A chess engine calculates both an evaluation and a best move for a position. Evaluations are commonly encoded in PGN movetext with `[%eval]`, often without the engine context that produced them. This extension defines `[%bestmove]`, an optional comment command that encodes, for each move played, the engine's best move in the position that move was played from, so the calculation can be read by PGN readers and parsers.

It is designed to:

- record a best move with or without an evaluation;
- leave the move tree unchanged, so a best move is never mistaken for a played move or a variation;
- leave the engine's representation of the move unchanged;
- require no modification to the PGN grammar or to existing `[%eval]` conventions;
- be treated as an ordinary comment by applications that do not support it.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 (RFC 2119, RFC 8174) when, and only when, they appear in all capitals, as shown here.

## 2. Syntax

```text
{[%bestmove <move>]}
```

For example:

```text
{[%bestmove e2e4]}
```

- The command name is case-sensitive and MUST be written in lowercase.
- `<move>` is a single move in UCI notation, as reported by the engine: for example `e7e5`, or `e7e8q` for a promotion. The value is not quoted.
- A comment SHOULD contain at most one `[%bestmove]`.

This extension does not change how an engine represents a move, including castling and promotion. Applications MAY display the move in SAN or as a board arrow.

## 3. Meaning

A `[%bestmove]` identifies the engine's best move in the position the move it follows was played from: the position *before* that move. It names the move the engine would have chosen instead, and is therefore a move for the side that played the move the comment follows.

```text
1. e4 {[%bestmove e2e4]}
```

records that in the position 1. e4 was played from — here the initial position — the engine's best move for White was `e2e4`, which is the move played.

```text
1. h3 {[%bestmove e2e4]}
```

records that `e2e4` was preferred to the `h3` actually played.

- `[%bestmove]` applies from the first move onward, including within variations. A `[%bestmove]` in a comment that does not follow a move, such as a comment before the first move, does not apply and MAY be ignored.
- The move MUST be legal in the position before the move the comment follows.
- A `[%bestmove]` is not a played move and does not alter the move tree. Applications SHOULD NOT create a variation solely to represent it.
- A move that ends the game still carries a `[%bestmove]`, because the position it was played from has a best move. The final position itself has no move after it and therefore no `[%bestmove]`.

## 4. Relationship to other commands

`[%bestmove]` is independent of `[%eval]`. Either MAY appear without the other. When both appear in the same comment they describe **two different positions**: `[%eval]` records the evaluation of the position the move led to, and `[%bestmove]` the engine's choice in the position the move was played from.

```text
1. e4 {[%eval +0.20,24] [%bestmove e2e4]} e5 {[%eval +0.15,24] [%bestmove e7e5]}
```

Here `+0.20` evaluates the position after 1. e4, while `e2e4` is the move the engine preferred in the position 1. e4 was played from. This pairing costs no additional analysis: one search of the position after move *n* supplies that move's `[%eval]` and move *n+1*'s `[%bestmove]`. Only the position before the first move requires a search of its own.

`[%bestmove]` does not depend on the PGN Engine Evaluation Context Extension. As with `[%eval]`, a `[%bestmove]` without an `[%engine]` context remains valid, but using one is RECOMMENDED. It provides the necessary context: which engine produced the best move, with what settings, and when.

## 5. Compatibility

The extension does not modify the PGN grammar. `[%bestmove]` is embedded within an ordinary PGN comment and remains syntactically valid to existing PGN readers. Applications that do not recognize it SHOULD treat it as an ordinary comment.

Applications that support this extension SHOULD:

1. recognize `[%bestmove]` when present;
2. ignore a `[%bestmove]` whose move is not legal in the position, rather than rejecting the comment or the game;
3. preserve `[%bestmove]` when importing and exporting PGN where practical.

Version 1.0 of this extension placed the best move in the position *after* the move the comment follows, making it a move for the opposing side. Version 1.1 supersedes that reading. The two cannot be told apart from syntax alone: under either, the value is a legal-looking UCI move in an ordinary comment, and a file written under one and read under the other is silently wrong rather than malformed. Applications reading files of unknown provenance MAY use legality in each candidate position to distinguish them. A file-level declaration of which reading applies is not defined in this version.

## 6. Example

```text
[Event "Engine Analysis"]
[Site "?"]
[Date "2026.08.15"]
[Round "-"]
[White "White"]
[Black "Black"]
[Result "*"]

{[%engine name="Stockfish 18.1" timestamp="2026-09-11T13:49:00Z" depth=24]}
1. e4 {[%eval +0.20,24] [%bestmove e2e4]} e5 {[%eval +0.15,24] [%bestmove e7e5]}
2. Nf3 {[%eval +0.25,24] [%bestmove g1f3]} Nc6 {[%eval +0.18,24] [%bestmove b8c6]}
3. Bb5 {[%eval +0.12,24] [%bestmove f1b5]} a6 {[%bestmove a7a6]} *
```

Every `[%bestmove]` names a move for the side that has just moved: `e2e4` for White's first move, `e7e5` for Black's reply, and so on. Where an evaluation accompanies it, that evaluation belongs to the position reached, not to the position the recommendation was made in.
