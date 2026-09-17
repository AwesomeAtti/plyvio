# PGN Extension: Evaluation Context (`[%engine]`)

**Status:** Proposed Extension  
**Version:** 1.0  
**Date:** 2026-09-11  
**Scope:** PGN movetext comments

## 1. Purpose

Many chess applications store engine evaluations in PGN movetext using a comment command, sometimes with the search depth:

```text
{[%eval +0.42]}
{[%eval +0.42,24]}
```

These record the evaluation but not how it was generated. The engine, engine version, search depth, hash-table size, thread count, analysis configuration, and time of analysis are lost when a PGN is exchanged between applications.

This extension defines an optional `[%engine]` comment command that records that context. It is designed to:

- provide provenance for engine evaluations: the engine, its principal analysis configuration, and when the analysis was performed;
- require no modification to the PGN grammar or to existing `[%eval]` conventions;
- be treated as an ordinary comment by applications that do not support it;
- permit future engine settings to be added without changing the syntax.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 (RFC 2119, RFC 8174) when, and only when, they appear in all capitals, as shown here.

## 2. Syntax

```text
{[%engine name="<name>" timestamp="<timestamp>" depth=<depth> hash=<hash> threads=<threads> multipv=<multipv> options="<options>"]}
```

For example:

```text
{[%engine name="Stockfish 18.1" timestamp="2026-09-08T13:49:00Z" depth=24 hash=4096 threads=8 multipv=1]}
```

- Attributes are written as `key=value` pairs.
- Attribute names are case-sensitive and SHOULD be written in lowercase.
- String values MUST be enclosed in double quotation marks. Numeric values MUST NOT be.
- Applications SHOULD permit attributes to appear in any order.
- All attributes are OPTIONAL. Applications SHOULD include those for which reliable information is available, and SHOULD NOT require any to be present.

## 3. Attributes

| Attribute   | Type                        | Description                                           |
| ----------- | --------------------------- | ----------------------------------------------------- |
| `name`      | string                      | Name and version of the chess engine                  |
| `timestamp` | string (ISO 8601 timestamp) | Date and time at which the engine analysis was performed |
| `depth`     | integer                     | Search depth configured for the analysis              |
| `hash`      | integer                     | Engine hash-table size, in megabytes                  |
| `threads`   | integer                     | Number of engine search threads                       |
| `multipv`   | integer                     | Number of principal variations requested              |
| `options`   | string                      | Engine-specific settings not covered by the attributes above |

**`name`** SHOULD include the engine's version when known, and SHOULD use the engine's commonly recognized name and version rather than an application-specific display name: `name="Stockfish 18.1"`.

**`timestamp`** refers to the engine analysis, not to the game; the game date remains in the standard `Date` tag. The value SHOULD include a timezone designator or UTC offset. When the timezone is known, applications SHOULD record the time in UTC using the `Z` designator:

```text
timestamp="2026-09-08T13:49:00Z"
timestamp="2026-09-08T09:49:00-04:00"
```

**`depth`** SHOULD be the depth limit the engine was given for the analysis, such as the `N` in the UCI command `go depth N`. The depth the engine reached for an individual position belongs in `[%eval]` (§4). When the analysis was not limited by depth, the attribute is omitted.

**`hash`** SHOULD be the hash-table size configured at the time of analysis. `hash=4096` is a 4096 MB (4 GB) table.

**`multipv`** of `1` means the engine was configured to produce a single principal variation.

**`options`** MAY contain several settings within the quoted value, and applications SHOULD preserve its contents even when they do not recognize the individual settings:

```text
options="UCI_Chess960=false;Use NNUE=true"
```

## 4. Placement and relationship to `[%eval]`

```text
[%engine]    →  describes the engine, configuration, and analysis time
[%eval]      →  records the evaluation associated with a particular position
[%bestmove]  →  records the best move associated with a particular position
```

In version 1.0, an `[%engine]` command SHOULD appear in a comment before the first move of the main movetext. It establishes the engine context for the `[%eval]` and `[%bestmove]` commands that follow, and applies to the game movetext unless another `[%engine]` context is explicitly introduced. `[%bestmove]` is defined by the PGN Engine Best Move Extension.

Version 1.0 does not require applications to support multiple engine contexts within a single game. Applications MAY support them, for example when different portions of a game were analyzed with different engines or configurations.

Existing `[%eval]` syntax is unchanged. When an `[%eval]` carries its own depth, as in `[%eval +0.42,24]`, that depth describes that particular evaluation, while the `[%engine]` depth describes the configured or intended analysis depth.

A PGN MAY contain `[%engine]` without any `[%eval]` commands, or `[%eval]` commands without `[%engine]`. Neither invalidates the PGN, and without `[%engine]`, `[%eval]` commands retain their existing meaning.

## 5. Compatibility

The extension does not modify the PGN grammar. `[%engine]` is embedded within an ordinary PGN comment and remains syntactically valid to existing PGN readers.

Applications that do not recognize `[%engine]` SHOULD treat it as an ordinary comment. An application that supports `[%eval]` but not `[%engine]` processes evaluations normally. If an application discards unknown comments, the game remains valid and any `[%eval]` annotations keep their meaning.

Applications that support this extension SHOULD:

1. recognize `[%engine]` when present;
2. associate the engine context with applicable `[%eval]` and `[%bestmove]` annotations;
3. ignore attributes they do not recognize rather than rejecting the command, and preserve them when rewriting a PGN;
4. preserve the `[%engine]` comment when importing and exporting PGN where practical.

Applications MAY display the engine context, use it to label analysis, or use it to determine whether evaluations were generated by the same engine and configuration.

Future versions MAY define additional attributes using the same `key=value` convention. Potential future attributes include `nodes` (nodes searched), `time` (engine analysis time), `ponder` (whether pondering was enabled), `syzygy` (tablebase configuration), `nnue` (NNUE network identifier), `command` (engine command or invocation information), and `cpu` (CPU or hardware used).

## 6. Example

```text
[Event "Engine Analysis"]
[Site "?"]
[Date "2026.08.15"]
[Round "-"]
[White "White"]
[Black "Black"]
[Result "*"]

{[%engine name="Stockfish 18.1" timestamp="2026-09-08T13:49:00Z" depth=24 hash=4096 threads=8 multipv=1]}
1. e4 {[%eval +0.20,24]} e5 {[%eval +0.15,24]}
2. Nf3 {[%eval +0.25,24]} Nc6 {[%eval +0.18,24]}
3. Bb5 {[%eval +0.12,24]} a6 {[%eval +0.10,24]} *
```

`Date` records when the game was played (2026.08.15); `timestamp` records when it was analyzed (2026-09-08).
