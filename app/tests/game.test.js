import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';

import AppShell from '../src/lib/components/AppShell.svelte';
import { stripTabs, activeId, workspaceState, openGame, closeTab } from '../src/lib/stores/tabs.js';
import { locale } from '../src/lib/stores/i18n.js';
import { STRINGS } from '../src/lib/i18n/locales.js';
import {
  PAD, BAR_W, BAR_GAP, BOARD_MIN, DETAILS_W, GAME_VIEW_MIN, H_CHROME, V_CHROME,
  SECTION_HEADER_H, TOOLBAR_H,
  boardSize, gameViewLayout, crossoverWidth,
  evalLabel, evalSide, evalFraction, evalIsStep, evalScore, allocateSections, scrollThreshold
} from '../src/lib/game/layout.js';
import { GAMES } from '../src/lib/mock-data/sample-games.js';
import { pliesFor, pliesOf, treeOf, readGame, engineFor } from '../src/lib/game/plies.js';
import MoveList from '../src/lib/components/game/MoveList.svelte';
import EngineLines from '../src/lib/components/game/EngineLines.svelte';
import { movetextFromRow } from '../src/lib/data/games.js';
import {
  trackX, plyAtX, boundaryY, evaluatedRuns, areaPath, regionsOf, moveNumberOf
} from '$lib/game/timeline.js';
import {
  resultSplit, segments, explorerRows, positionGames, explorerHeight,
  positionKey, labelWidth, labelFits, smallestLabelled
} from '$lib/game/explorer.js';
import {
  engineHeight, engineSources, engineLabel, formatPv, formatDepth,
  clampLines, clampDepth, ENGINE_DEFAULT_LINES, ENGINE_DEFAULT_DEPTH
} from '$lib/game/engine.js';
import { analyse, hasLegalMoves } from '$lib/game/engineMock.js';
import { SECTIONS } from '../src/lib/game/sections.js';
import {
  gameStates, activeGame, gameById, ensureGameState, resetGameState, composition,
  goToPly, nextPly, prevPly, firstPly, lastPly, atLastPly,
  flipBoard, toggleCollapsed, toggleHidden, toggleEvalBar,
  setEngineOn, setEngineSource, setEngineLines, setEngineDepth, engineContentHeight,
  promoteVariation, makeMainLine,
  seedDraftGame, engineAnalysis, setEngineTransport, playMove
} from '../src/lib/stores/game.js';
import { createFakeEngine, settle } from './helpers/fakeEngine.js';
import { setEngineEnabled } from '../src/lib/stores/settings.js';
import { BUILTIN_ENGINE_ID } from '$lib/engine/builtin.js';
import { games as libraryGames } from '../src/lib/stores/library.js';
import { activeLibraryId } from '../src/lib/stores/libraries.js';

const readSrc = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

/**
 * Thirty of the forty sample games carry no engine annotation; ten carry a full one
 * (the GothamChess-vs-AwesomeAtti games) -- the whole sample set is one curated PGN now,
 * with no separate demo corpus alongside it.
 *
 * Detected by content, not by name or id: §2.1 makes the id a row number that carries
 * no meaning, and a hardcoded name list would silently stop covering the set the moment
 * a game was renamed or another one added without updating it here too.
 */
/*
 * Games are found by their tags, never by their id: §2.1 makes the id a row number that
 * carries no meaning and is not stable across a re-import, so a test that looked one up
 * by id would be reading exactly the meaning the schema says is not there.
 */
const game = (white, black) =>
  GAMES.find((g) => g.white.startsWith(white) && g.black.startsWith(black));

const isEngineAnnotated = (g) => g.pgn.includes('[%eval ');

const ANNOTATED = game('GothamChess', 'AwesomeAtti');
const ANNOTATED_GAMES = GAMES.filter(isEngineAnnotated);
const UNANNOTATED_GAMES = GAMES.filter((g) => !isEngineAnnotated(g));
const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  stripTabs.set([]);
  activeId.set('library');
  workspaceState.set({ library: { scratch: '' } });
  locale.set('en');
  resetGameState();
});
afterEach(cleanup);

/* ======================= §5.2 / §5.4.1 geometry ========================= */

describe('§5.4.1 Game View geometry', () => {
  it('composes the 427px floor from its declared parts', () => {
    expect(PAD).toBe(16);
    expect(BAR_W).toBe(27);
    expect(BAR_GAP).toBe(8);
    expect(BOARD_MIN).toBe(360);
    expect(PAD + BAR_W + BAR_GAP + BOARD_MIN + PAD).toBe(GAME_VIEW_MIN);
    expect(GAME_VIEW_MIN).toBe(427);
    expect(H_CHROME).toBe(67);
    expect(V_CHROME).toBe(32);
  });

  it('leaves 13px of slack against the 800px window minimum', () => {
    expect(GAME_VIEW_MIN + DETAILS_W).toBe(787);
    expect(800 - GAME_VIEW_MIN - DETAILS_W).toBe(13);
  });

  it('caps a fixed Game Details at 373px — the derived ceiling', () => {
    expect(800 - GAME_VIEW_MIN).toBe(373);
    expect(DETAILS_W).toBeLessThanOrEqual(373);
  });

  // The table in GW-03. These are the numbers the wireframe shows, so a change
  // here means the wireframe and the prototype have drifted apart.
  it.each([
    [800, 600, 440, 373, 'width'],
    [1024, 768, 664, 597, 'width'],
    [1280, 800, 920, 728, 'height'],
    [1440, 900, 1080, 828, 'height'],
    [1920, 1080, 1560, 1008, 'height'],
    [2560, 1440, 2200, 1368, 'height']
  ])('at %ix%i the board is %i→%ipx, %s-constrained', (W, H, view, board, by) => {
    const g = gameViewLayout(W - DETAILS_W, H - 40);
    expect(W - DETAILS_W).toBe(view);
    expect(g.board).toBe(board);
    expect(g.constrainedBy).toBe(by);
  });

  it('is square and consumes one axis exactly, at every size', () => {
    for (let W = 800; W <= 3000; W += 7) {
      for (const H of [600, 720, 800, 1080, 1440]) {
        const vw = W - DETAILS_W, vh = H - 40;
        const b = boardSize(vw, vh);
        expect(b).toBe(Math.max(BOARD_MIN, Math.min(vw - H_CHROME, vh - V_CHROME)));
        expect(b).toBeLessThanOrEqual(Math.max(BOARD_MIN, vw - H_CHROME));
        expect(b).toBeLessThanOrEqual(Math.max(BOARD_MIN, vh - V_CHROME));
      }
    }
  });

  it('never renders the board below its floor (§3.1.1)', () => {
    for (let w = 0; w <= 500; w += 3) expect(boardSize(w, w)).toBeGreaterThanOrEqual(BOARD_MIN);
  });

  it('has no maximum — the board grows without bound', () => {
    // On a square region the width is the tighter axis: the bar and gap cost
    // 35px more horizontally than the padding costs vertically.
    expect(boardSize(9000, 9000)).toBe(9000 - H_CHROME);
    expect(boardSize(40000, 40000)).toBeGreaterThan(30000);
  });

  it('crosses over at W = H + 355', () => {
    for (const H of [600, 768, 800, 900, 1080, 1440]) {
      expect(crossoverWidth(H)).toBe(H + 355);
      const at = crossoverWidth(H);
      expect(gameViewLayout(at - DETAILS_W, H - 40).constrainedBy).toBe('width');
      expect(gameViewLayout(at + 1 - DETAILS_W, H - 40).constrainedBy).toBe('height');
    }
  });

  it('centres the assembly, so slack is symmetric margin', () => {
    const g = gameViewLayout(1920 - DETAILS_W, 1080 - 40);
    expect(g.marginX).toBe(242);          // GW-03: 485px of slack, halved
    expect(g.marginY).toBe(0);            // height-constrained: no vertical slack
    const t = gameViewLayout(800 - DETAILS_W, 600 - 40);
    expect(t.marginX).toBe(0);            // width-constrained: none horizontally
    expect(t.marginY).toBe(77);
  });

  it('the eval bar width never varies with the board', () => {
    const widths = new Set();
    for (let W = 800; W <= 4000; W += 13) widths.add(gameViewLayout(W - DETAILS_W, 900).barW);
    expect([...widths]).toEqual([27]);
  });
});

/* ========================= §5.4.1 evaluation label ====================== */

describe('§5.4.1 Evaluation Bar label', () => {
  it('leaves positive values unsigned and signs negatives', () => {
    expect(evalLabel({ e: 40 })).toBe('0.4');
    expect(evalLabel({ e: 980 })).toBe('9.8');
    expect(evalLabel({ e: -240 })).toBe('-2.4');
  });

  it('uses the HYPHEN-MINUS, not U+2212 — 2px in a 27px column', () => {
    const label = evalLabel({ e: -240 });
    expect(label.charCodeAt(0)).toBe(0x2d);      // -
    expect(label).not.toContain('\u2212');
    // and the rule is written where an implementer will meet it
    expect(readSrc('../src/lib/game/layout.js')).toMatch(/U\+2212/);
  });

  it('never shows a minus on a value that displays as zero', () => {
    expect(evalLabel({ e: -4 })).toBe('0.0');
    expect(evalLabel({ e: -1 })).toBe('0.0');
    expect(evalLabel({ e: 0 })).toBe('0.0');
    expect(evalSide({ e: -4 })).toBe('white');   // and does not claim Black is ahead
  });

  it('clamps below 10, so the label stays three glyphs plus a sign', () => {
    expect(evalLabel({ e: 1076 })).toBe('9.9');
    expect(evalLabel({ e: -5000 })).toBe('-9.9');
    for (let cp = -6000; cp <= 6000; cp += 7) {
      const l = evalLabel({ e: cp });
      expect(l.replace('-', '')).toMatch(/^\d\.\d$/);
      expect(l.length).toBeLessThanOrEqual(4);
    }
  });

  it('renders mate unsigned as M<n>, and a mated position as #', () => {
    expect(evalLabel({ x: 3 })).toBe('M3');
    expect(evalLabel({ x: -3 })).toBe('M3');     // side is carried by position
    expect(evalLabel({ x: 12 })).toBe('M12');
    expect(evalLabel({ x: 0 })).toBe('#');
    expect(evalSide({ x: -3 })).toBe('black');
    expect(evalSide({ x: 3 })).toBe('white');
  });

  it('returns no label when there is no evaluation', () => {
    expect(evalLabel({})).toBeNull();
    expect(evalLabel({ e: null, x: null })).toBeNull();
  });

  it('every label the formatter can produce fits 27px at 10px', () => {
    // Advance widths measured from the bundled IBM Plex Sans (see §5.4.1).
    const ADV = { '.': 0.272, '-': 0.399, '#': 0.713, M: 0.812 };
    const width = (s) => [...s].reduce((a, c) => a + (ADV[c] ?? 0.6), 0) * 10;

    // Swept over the formatter's own range rather than over the sample games:
    // the games carry no [%eval] at all, and what has to fit is every label the
    // bar CAN draw, not the subset some particular game happens to produce.
    const seen = new Set();
    for (let cp = -30000; cp <= 30000; cp += 7) {
      const l = evalLabel({ e: cp });
      if (l) seen.add(l);
    }
    for (let mate = -40; mate <= 40; mate++) {
      const l = evalLabel({ x: mate });
      if (l) seen.add(l);
    }
    expect(seen.size).toBeGreaterThan(20);
    for (const l of seen) expect(width(l)).toBeLessThanOrEqual(27 - 2);
  });
});

describe('§5.4.1 Evaluation Bar fill — the shared scale', () => {
  /*
    Agreed 13 Sep and drawn in wireframes/game-eval-timeline.html. The previous
    three tests were written against a curve that never stops rising, and two of
    them cannot be repaired by adjusting a number: the scale now has a plateau
    and two discontinuities on purpose. They are replaced by what is actually
    being claimed.
  */
  const cp = (pawns) => evalFraction({ e: Math.round(pawns * 100) });

  it('is a linear ramp of three thirty-seconds to the pawn, inside ±4.00', () => {
    expect(cp(0)).toBeCloseTo(16 / 32, 10);
    expect(cp(1)).toBeCloseTo(19 / 32, 10);
    expect(cp(2)).toBeCloseTo(22 / 32, 10);
    expect(cp(3)).toBeCloseTo(25 / 32, 10);
    expect(cp(4)).toBeCloseTo(28 / 32, 10);
    expect(cp(-4)).toBeCloseTo(4 / 32, 10);

    // Linear means equal swings are equal distances, anywhere in the range.
    expect(cp(1) - cp(0)).toBeCloseTo(cp(4) - cp(3), 10);
  });

  it('steps beyond the ramp, and does not keep climbing', () => {
    expect(cp(4.01)).toBeCloseTo(30 / 32, 10);
    expect(cp(7.2)).toBeCloseTo(30 / 32, 10);
    expect(cp(40)).toBeCloseTo(30 / 32, 10);
    expect(cp(-7.2)).toBeCloseTo(2 / 32, 10);

    // 4.00 and 4.01 are a sixteenth apart: the boundary is a step, not a bend.
    expect(cp(4.01) - cp(4)).toBeCloseTo(2 / 32, 10);
  });

  it('pegs for mate, and mate alone reaches the ends', () => {
    expect(evalFraction({ x: 2 })).toBe(1);
    expect(evalFraction({ x: -2 })).toBe(0);
    expect(evalFraction({ x: 0 })).toBe(0.5);   // mated: the side is not in the value

    for (const pawns of [4, 4.01, 9.9, 50, 1000]) {
      expect(cp(pawns)).toBeLessThan(1);
      expect(cp(-pawns)).toBeGreaterThan(0);
    }
  });

  it('leaves two thirty-seconds empty on each side, and renders nothing in them', () => {
    // The gaps are what make the three readings tellable apart by position:
    // measured advantage, decided, mate.
    const gaps = [[28 / 32, 30 / 32], [30 / 32, 1], [2 / 32, 4 / 32], [0, 2 / 32]];
    for (let e = -400000; e <= 400000; e += 137) {
      const f = evalFraction({ e });
      for (const [lo, hi] of gaps) {
        expect(f > lo + 1e-9 && f < hi - 1e-9).toBe(false);
      }
    }
  });

  it('never decreases as the evaluation rises, and stays inside the bar', () => {
    let prev = -1;
    for (let e = -3000; e <= 3000; e += 10) {
      const f = evalFraction({ e });
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
  });

  it('marks exactly the values that sit on a level, for the Timeline\'s risers', () => {
    expect(evalIsStep({ e: 400 })).toBe(false);
    expect(evalIsStep({ e: 401 })).toBe(true);
    expect(evalIsStep({ e: -401 })).toBe(true);
    expect(evalIsStep({ x: 3 })).toBe(true);
    expect(evalIsStep({ x: 0 })).toBe(false);
    expect(evalIsStep({})).toBe(false);
  });

  it('prints the score with two decimals and a sign, unlike the bar\'s own label', () => {
    // Same value, different format: evalLabel has 27px to live in and this does not.
    expect(evalScore({ e: 95 })).toBe('+0.95');
    expect(evalScore({ e: -95 })).toBe('\u22120.95');
    expect(evalScore({ e: 120 })).toBe('+1.20');
    expect(evalScore({ e: -4 })).toBe('\u22120.04');
    expect(evalScore({ e: -0.4 })).toBe('0.00');  // a displayed zero takes no sign
    expect(evalScore({ x: 3 })).toBe('M3');
    expect(evalScore({ x: 0 })).toBe('#');
    expect(evalScore({})).toBeNull();
    expect(evalLabel({ e: 120 })).toBe('1.2');    // and they agree on the value
  });
});

/* ====================== §5.4.2 Game Details shell ======================= */

describe('§5.4.2 Section allocation', () => {
  const S = [
    { id: 'a', floor: 60 },
    { id: 'b', floor: 60 },
    { id: 'c', floor: 100, absorb: true }
  ];

  it('gives surplus to the absorbing Section only', () => {
    const r = allocateSections(S, 500);
    expect(r.heights.a).toBe(60);
    expect(r.heights.b).toBe(60);
    expect(r.heights.c).toBe(380);
    expect(r.scrolls).toBe(false);
  });

  it('honours floors and scrolls rather than compressing below them', () => {
    const r = allocateSections(S, 150);
    expect(r.scrolls).toBe(true);
    expect(r.heights.a).toBe(60);
    expect(r.heights.b).toBe(60);
    expect(r.heights.c).toBe(100);
    expect(r.contentHeight).toBe(220);
  });

  it('collapsing frees everything but the header, and the absorber takes it', () => {
    const collapsed = S.map((s) => (s.id === 'b' ? { ...s, collapsed: true } : s));
    const r = allocateSections(collapsed, 500);
    expect(r.heights.b).toBe(SECTION_HEADER_H);
    expect(r.heights.c).toBe(500 - 60 - SECTION_HEADER_H);
  });

  it('hiding removes a Section entirely, unlike collapsing', () => {
    const hidden = S.map((s) => (s.id === 'b' ? { ...s, hidden: true } : s));
    const r = allocateSections(hidden, 500);
    expect(r.heights.b).toBeUndefined();
    expect(r.heights.c).toBe(440);
  });

  it('always fills the available height exactly when it fits', () => {
    for (let h = 220; h <= 2000; h++) {
      const r = allocateSections(S, h);
      if (!r.scrolls) expect(r.contentHeight).toBe(h);
    }
  });

  it('the prototype composition has exactly one absorbing Section', () => {
    expect(SECTIONS.filter((s) => s.absorb).length).toBe(1);
    expect(SECTIONS.find((s) => s.absorb).id).toBe('moves');
  });

  it('derives the scroll threshold from the stack, not a written constant', () => {
    const stack = SECTIONS.filter((s) => !s.anchored);
    const floors = scrollThreshold(SECTIONS);

    /*
      THE ANCHORED SECTION IS NOT IN THIS SUM. The Evaluation Timeline sits
      below the stack, outside its scrolling, so it can neither push the stack
      into scrolling nor be scrolled by it. scrollThreshold filters it out
      itself rather than trusting every caller to remember.
    */
    expect(floors).toBe(stack.reduce((a, s) => a + s.floor, 0));
    expect(floors).toBe(336);
    expect(floors).toBeLessThan(scrollThreshold(SECTIONS.map((s) => ({ ...s, anchored: false }))));

    /*
      336 is the grid stated four times: 108 + 60 + 108 + 60. Every floor in the
      panel is now sectionHeight(n) — Game Info three rows, the Engine one, the
      Move List three, the Explorer one — so the figure is a derivation rather
      than four numbers that happen to add up.

          600 window − 40 tab bar − 40 toolbar = 520 available
          336 of stack floors                  = 184 headroom
          108 of that goes to the Timeline when it is shown

      The shell's scrolling state is therefore unreachable at any permitted
      window size, which is the point of the whole arrangement: the Timeline
      yields before the stack ever has to.
    */
    const available = 600 - 40 - TOOLBAR_H;
    expect(available - floors).toBe(184);
    expect(allocateSections(SECTIONS, available).scrolls).toBe(false);

    // 47px on each of the four stacked Sections outruns the 184 left.
    const grown = SECTIONS.map((s) => ({ ...s, floor: s.floor + 47 }));
    expect(scrollThreshold(grown)).toBe(floors + 47 * stack.length);
    expect(allocateSections(grown, available).scrolls).toBe(true);
  });
});

/* ============================ mock game data ============================ */

describe('sample games', () => {
  it('looks like a real row: pgn present, movetext null, nothing derived', () => {
    expect(GAMES.length).toBe(40);
    expect(UNANNOTATED_GAMES).toHaveLength(30);
    expect(ANNOTATED_GAMES).toHaveLength(10);
    for (const g of GAMES) {
      // Every row in samples/ is in this state — import writes pgn and leaves
      // movetext NULL (§4) — so the sample games are shaped the same way.
      expect(g.movetext).toBeNull();
      expect(typeof g.pgn).toBe('string');
      expect(g.pgn).toMatch(/^\[Event "/);
      // A row holds what the schema stores. Positions are not a column.
      expect(g.plies).toBeUndefined();
    }
  });

  /**
   * AS IMPORTED, NOT AN INVARIANT. A tag column exists so that a search does not have
   * to read every `pgn` in the database to answer a simple question — it is a lifted,
   * searchable copy, and it is the editable one. `pgn` is read-only and is never
   * patched, exactly as `movetext` is the editable copy of the moves and `pgn` the
   * original. So editing a game's White would change the column and leave the tag pair
   * alone, and the two would legitimately disagree from then on.
   *
   * These four rows have been imported and never edited, so they still agree, and this
   * checks that — the provenance of this sample data, not a rule about rows. It is
   * expected to need relaxing to specific rows when field editing arrives; a drifted
   * row is then correct data, not a defect to repair.
   */
  it('has sample rows in their as-imported state, columns still matching their tags', () => {
    for (const g of GAMES) {
      const tags = Object.fromEntries(
        [...g.pgn.matchAll(/^\[(\w+) "(.*)"\]$/gm)].map((m) => [m[1], m[2]])
      );
      expect(tags.White).toBe(g.white);
      expect(tags.Black).toBe(g.black);
      expect(tags.Event).toBe(g.event);
      expect(tags.Site).toBe(g.site);
      expect(tags.Date).toBe(g.date);
      expect(tags.Round).toBe(g.round);
      expect(tags.Result).toBe(g.result);
      /* §2.2 normalizes these two on the way in: cast to INTEGER, and the standard's
         placeholder for an unrated player becomes NULL. So the column and its tag are
         compared through that rule rather than as raw strings — the lifted value is what
         the schema says the tag means, not a copy of how it was written. */
      const rating = (tag) => (/^\d+$/.test(tag ?? '') ? Number(tag) : null);
      expect(rating(tags.WhiteElo)).toBe(g.white_elo);
      expect(rating(tags.BlackElo)).toBe(g.black_elo);
      expect(tags.ECO ?? null).toBe(g.eco);
    }
  });

  /**
   * §3.1: a row's own movetext wins, and a row without one is read from its PGN.
   * The sample games take the second branch, as every row in samples/ does.
   */
  it('resolves a row through §3.1 precedence, pgn branch', () => {
    for (const g of GAMES) {
      const { movetext, source } = movetextFromRow(g);
      expect(source).toBe('pgn');
      // Tag pairs stripped. An annotated game opens with its [%engine] comment, so the
      // movetext may begin with a comment rather than with move 1.
      expect(movetext).toMatch(/^(\{[^}]*\}\s*)?1\.\s*/);
      expect(movetext).not.toMatch(/\[Event /);
    }
  });

  it('prefers a row\u2019s own movetext when it has one', () => {
    const row = { ...GAMES[0], movetext: '1. f3 e5 2. g4 Qh4# 0-1' };
    expect(movetextFromRow(row)).toEqual({ movetext: '1. f3 e5 2. g4 Qh4# 0-1', source: 'movetext', fen: row.fen ?? null });
    expect(pliesFor(row).at(-1).s).toBe('Qh4#');
  });

  it('reports a row with neither rather than guessing', () => {
    expect(movetextFromRow({ movetext: null, pgn: null })).toEqual({ movetext: '', source: 'none', fen: null });
    expect(movetextFromRow(null)).toEqual({ movetext: '', source: 'none', fen: null });
  });

  it('carries a row\u2019s custom starting position (\u00a72.2) alongside its movetext', () => {
    expect(movetextFromRow({ movetext: '1. e4', pgn: null, fen: '8/8/8/8/8/8/8/K6k w - - 0 1' }))
      .toEqual({ movetext: '1. e4', source: 'movetext', fen: '8/8/8/8/8/8/8/K6k w - - 0 1' });
    expect(movetextFromRow({ movetext: null, pgn: '1. e4 *' }).fen).toBeNull();
  });

  it('reads four complete games out of their PGN', () => {
    for (const g of GAMES) {
      const plies = pliesFor(g);
      expect(plies.length).toBeGreaterThan(30);
      expect(plies[0].f).toMatch(/^rnbqkbnr\/pppppppp/);      // starting position
      expect(plies[0].m).toBeNull();                          // no move made it
      expect(plies[0].s).toBeNull();
    }
  });

  it('gives every ply after the first a move and both squares', () => {
    for (const g of GAMES) for (const p of pliesFor(g).slice(1)) {
      expect(p.s).toBeTruthy();
      expect(p.m).toHaveLength(2);
      expect(p.m[0]).toMatch(/^[a-h][1-8]$/);
      expect(p.m[1]).toMatch(/^[a-h][1-8]$/);
    }
  });

  it('ends the two mates on the move that gives them', () => {
    const white = game('Morhpy, Paul', 'Allies');
    const black = game('Donald Byrne', 'Robert James Fischer');
    expect(pliesFor(white).at(-1).s).toBe('Rd8#');
    expect(pliesFor(black).at(-1).s).toBe('Rc2#');
    expect(pliesFor(white).at(-1).k).toBe(true);
    expect(pliesFor(black).at(-1).k).toBe(true);
  });

  /**
   * chessops encodes castling as king-takes-rook, which is what Chess960 needs and
   * what a board must NOT be handed: the highlight would mark the rook's square
   * rather than the one the king is standing on.
   */
  it('reports the square the king lands on when castling, not the rook it took', () => {
    const kasparov = pliesFor(game('Garry Kasparov', 'Veselin Topalov'));
    expect(kasparov.find((p) => p.s === 'O-O-O' && p.m[0] === 'e1').m).toEqual(['e1', 'c1']);
    expect(kasparov.find((p) => p.s === 'O-O-O' && p.m[0] === 'e8').m).toEqual(['e8', 'c8']);

    const castledAt = (g, from) => pliesFor(g).find((p) => p.s === 'O-O' && p.m[0] === from);
    const bothCastledShort = GAMES.find((g) => castledAt(g, 'e1') && castledAt(g, 'e8'));
    expect(bothCastledShort).toBeTruthy();
    expect(castledAt(bothCastledShort, 'e8').m).toEqual(['e8', 'g8']);
    expect(castledAt(bothCastledShort, 'e1').m).toEqual(['e1', 'g1']);
  });

  /*
   * Forty curated games carry no annotation; twenty-six carry a full one. The annotated
   * set exists so the comment control, the banner and the Evaluation Bar's populated
   * state are reachable from shipped data rather than only from a test fixture.
   */
  it('leaves the unannotated games unevaluated', () => {
    for (const g of UNANNOTATED_GAMES) for (const p of pliesFor(g)) {
      expect(p.e).toBeNull();
      expect(p.x).toBeNull();
      expect(p.b).toBeNull();
      // Not p.c: several of these games carry real prose commentary (§ the curated
      // historical set) despite having no engine evaluation -- a comment is not
      // evidence of annotation the way [%eval]/[%bestmove] are.
    }
  });

  it('ships annotated games, so the banner is reachable in the application', () => {
    expect(ANNOTATED).toBeTruthy();
    for (const g of ANNOTATED_GAMES) {
      const plies = pliesFor(g);
      const evaluated = plies.filter((p) => p.e !== null || p.x !== null);
      const best = plies.filter((p) => p.b !== null);
      expect(evaluated.length, g.id).toBeGreaterThan(20);
      expect(best.length, g.id).toBeGreaterThan(20);
      expect(engineFor(g).name, g.id).toBe('Stockfish 16');
    }
  });

  /*
   * The corpus these came from is one player's games, so the same opponent appears more
   * than once and two rows can share a date. Ids are what the Library and the workspace
   * join on, so they are the thing that has to be unique — not the players or the date.
   */
  it('gives every sample game an id of its own', () => {
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length);
  });

  /*
   * Coverage, asserted rather than assumed: the ten GothamChess-vs-AwesomeAtti games (the
   * only annotated rows left once the old 26-game demo set was dropped) split evenly by
   * colour and span short and long games, but they carry no draw among them — unlike the
   * dropped demo set, "all three results" isn't a property of this corpus.
   */
  it('covers both colours and a range of lengths, across two results', () => {
    const lengths = ANNOTATED_GAMES.map((g) => pliesFor(g).length - 1);
    expect(Math.min(...lengths)).toBeLessThan(35);
    expect(Math.max(...lengths)).toBeGreaterThan(100);
    expect(new Set(ANNOTATED_GAMES.map((g) => g.result)).size).toBe(2);
    const white = ANNOTATED_GAMES.filter((g) => g.white === 'GothamChess').length;
    expect(white).toBe(5);
    expect(ANNOTATED_GAMES.length - white).toBe(5);
    expect(ANNOTATED_GAMES.some((g) => pliesFor(g).some((p) => p.x !== null))).toBe(true);
  });

  /**
   * The bar's data path is live even though nothing shipped exercises it: the gap
   * is in the sample data, not in the reader.
   */
  it('reads [%eval] into the bar\u2019s two fields when a game does carry it', () => {
    const plies = pliesOf('1. e4 {[%eval 0.35]} e5 {[%eval -0.12]} 2. Qh5 {[%eval #4]} *');
    expect(plies[0].e).toBeNull();                  // nothing said about the start
    expect(plies[1].e).toBe(35);                    // centipawns, White's point of view
    expect(plies[2].e).toBe(-12);
    expect(plies[3].x).toBe(4);                     // mate overrides the pawn score
    expect(plies[3].e).toBeNull();
  });

  it('takes an evaluation written before the first move as the start position\u2019s', () => {
    expect(pliesOf('{[%eval 0.2]} 1. e4 *')[0].e).toBe(20);
  });

  it('parses a game once and hands back the same array', () => {
    expect(pliesFor(GAMES[0])).toBe(pliesFor(GAMES[0]));
  });

  it('ships no chess engine at runtime beyond the one it reads with', () => {
    const pkg = JSON.parse(readSrc('../package.json'));
    expect(pkg.dependencies?.['chess.js']).toBeUndefined();
    expect(pkg.devDependencies?.['chess.js']).toBeUndefined();
    expect(pkg.dependencies['@lichess-org/chessground']).toBe('10.1.1');
    expect(pkg.dependencies['chessops']).toBe('0.15.1');
  });
});

/* ======================= the Evaluation Timeline ======================== */

describe('Evaluation Timeline geometry', () => {
  const W = 357;
  const H = 80;
  const game = (...evals) => evals.map((e) => (e === null ? {} : typeof e === 'object' ? e : { e }));

  it('puts N + 1 stops on the track, first and last flush to the edges', () => {
    // 82 plies is 83 positions: the starting position is a stop like any other.
    expect(trackX(0, 82, W)).toBe(0);
    expect(trackX(82, 82, W)).toBe(W);
    expect(trackX(41, 82, W)).toBeCloseTo(W / 2, 10);

    // Every step is the same width; nothing is inset half a cell.
    const step = trackX(1, 82, W) - trackX(0, 82, W);
    expect(trackX(82, 82, W) - trackX(81, 82, W)).toBeCloseTo(step, 10);
    expect(step * 82).toBeCloseTo(W, 10);
  });

  it('a game with no moves has one stop and no track to divide', () => {
    // N = 0 would be a division by zero; it cannot reach the renderer.
    expect(trackX(0, 0, W)).toBe(0);
    expect(plyAtX(200, W, 0)).toBe(0);
  });

  it('picks the nearest stop, and clamps rather than running off the end', () => {
    expect(plyAtX(0, W, 82)).toBe(0);
    expect(plyAtX(W, W, 82)).toBe(82);
    expect(plyAtX(-40, W, 82)).toBe(0);
    expect(plyAtX(W + 40, W, 82)).toBe(82);

    // Nearest, not floor: a press a third of the way into a step still means
    // the stop it is nearest to.
    const step = W / 82;
    expect(plyAtX(10 * step + step * 0.3, W, 82)).toBe(10);
    expect(plyAtX(10 * step + step * 0.7, W, 82)).toBe(11);
  });

  it('agrees with the Evaluation Bar at every value, which is the whole point', () => {
    // The bar computes its top fill as `flipped ? whiteFrac : 1 - whiteFrac`.
    // If this drifts from that, the two surfaces show one number twice, and
    // differently, about a thousand pixels apart.
    for (const p of [{ e: 0 }, { e: 35 }, { e: 400 }, { e: 401 }, { e: -260 }, { x: 4 }, {}]) {
      const whiteFrac = evalFraction(p);
      expect(boundaryY(p, H, false)).toBeCloseTo((1 - whiteFrac) * H, 10);
      expect(boundaryY(p, H, true)).toBeCloseTo(whiteFrac * H, 10);
    }
  });

  it('splits at gaps and never interpolates across one', () => {
    const plies = game(20, 30, null, null, 50, 60, 70);
    expect(evaluatedRuns(plies)).toEqual([[0, 1], [4, 5, 6]]);

    // A game that has not been analysed has no runs at all — and so draws no
    // curve. A flat line at dead even would assert a level game.
    expect(evaluatedRuns(game(null, null, null))).toEqual([]);
    expect(evaluatedRuns([])).toEqual([]);
  });

  it('mate counts as an evaluation, and an empty ply does not', () => {
    expect(evaluatedRuns([{ x: 3 }, {}, { e: 0 }])).toEqual([[0], [2]]);
  });

  /**
   * Consecutive L commands sharing an x are a vertical riser.
   *
   * The last two points are the area closing to the foot of the plot, not part
   * of the curve, so they are dropped before counting.
   */
  const risers = (d) => {
    const pts = [...d.matchAll(/[ML] (-?[\d.]+) (-?[\d.]+)/g)].map((m) => [+m[1], +m[2]]).slice(0, -2);
    let n = 0;
    for (let i = 1; i < pts.length; i++) if (pts[i][0] === pts[i - 1][0] && pts[i][1] !== pts[i - 1][1]) n++;
    return n;
  };

  it('draws a move onto a level as a riser, not a slope', () => {
    // 3.90 is on the ramp; 4.50 is on the level above it. The band between them
    // holds no value, so a slope there would be ink over a hole in the scale.
    const stepped = areaPath([0, 1], game(390, 450), { w: W, h: H, n: 1 });
    expect(risers(stepped)).toBe(1);

    // Both inside the ramp: an ordinary segment, drawn as one.
    const ramped = areaPath([0, 1], game(100, 200), { w: W, h: H, n: 1 });
    expect(risers(ramped)).toBe(0);
  });

  it('gives a decisive game two risers of equal height', () => {
    // ramp -> beyond the ramp -> mate: 2/32 of the plot each time.
    const plies = game(380, 450, 600, { x: 3 });
    const d = areaPath([0, 1, 2, 3], plies, { w: W, h: H, n: 3 });
    expect(risers(d)).toBe(2);
    expect(boundaryY({ e: 450 }, H) - boundaryY({ x: 3 }, H)).toBeCloseTo((2 / 32) * H, 10);
    expect(boundaryY({ e: 400 }, H) - boundaryY({ e: 450 }, H)).toBeCloseTo((2 / 32) * H, 10);
  });

  it('closes the area to the foot of the plot', () => {
    const d = areaPath([0, 1], game(100, 200), { w: W, h: H, n: 1 });
    expect(d.endsWith(`L ${W} ${H} L 0 ${H} Z`)).toBe(true);
  });

  it('draws a single evaluated ply as something rather than nothing', () => {
    const d = areaPath([2], game(null, null, 150, null), { w: W, h: H, n: 3 });
    expect(d).not.toBe('');
    expect(d.endsWith('Z')).toBe(true);
  });

  it('fills the first move\'s interval, so no game opens on a sliver of bare ground', () => {
    // Ply 0 carries no evaluation in practically every analysed game: it can
    // only be written before the first move, where annotators put [%engine] and
    // little else. Left as a gap it is a mark on every chart that means nothing.
    const d = areaPath([1, 2, 3], game(null, 100, 150, 120), { w: W, h: H, n: 3 });
    expect(d.startsWith('M 0 ')).toBe(true);
    expect(d.endsWith(`L 0 ${H} Z`)).toBe(true);

    // Flat across that interval, at ply 1's height — it asserts nothing about
    // ply 0, only what the first move led to.
    const y1 = boundaryY({ e: 100 }, H);
    expect(d.startsWith(`M 0 ${Number(y1.toFixed(2))} L ${Number(trackX(1, 3, W).toFixed(2))} ${Number(y1.toFixed(2))}`)).toBe(true);
  });

  it('does not extend a run that starts anywhere but the first move', () => {
    // Nineteen unanalysed plies are unanalysed; only the leading interval is
    // the special case, and only because an evaluation names the move it follows.
    const plies = game(...Array(20).fill(null), 100, 150);
    const runs = evaluatedRuns(plies);
    expect(runs[0][0]).toBe(20);
    const d = areaPath(runs[0], plies, { w: W, h: H, n: 21 });
    expect(d.startsWith('M 0 ')).toBe(false);
    expect(d.startsWith(`M ${Number(trackX(20, 21, W).toFixed(2))} `)).toBe(true);
  });

  it('runs edge to edge when every ply is evaluated', () => {
    // The last stop IS the right edge, exactly — no half-step inset, nothing
    // left over. A gap at either end has to mean "unanalysed" and nothing else,
    // so neither end may produce one by arithmetic.
    const plies = game(null, 100, 120, 90, 110);
    const run = evaluatedRuns(plies)[0];
    const d = areaPath(run, plies, { w: W, h: H, n: 4 });
    expect(d.startsWith('M 0 ')).toBe(true);
    expect(d).toContain(`L ${W} `);
    expect(d.endsWith(`L ${W} ${H} L 0 ${H} Z`)).toBe(true);
  });

  it('leaves a gap at the right only when the analysis really stopped there', () => {
    const plies = game(null, 100, 120, null, null);
    const d = areaPath(evaluatedRuns(plies)[0], plies, { w: W, h: H, n: 4 });
    const lastX = Number(trackX(2, 4, W).toFixed(2));
    expect(d.endsWith(`L ${lastX} ${H} L 0 ${H} Z`)).toBe(true);
    expect(d).not.toContain(`L ${W} `);
  });

  it('reads two ply numbers into three regions', () => {
    const r = regionsOf({ middle: 22, end: 56 }, 82, W);
    expect(r.map((x) => x.key)).toEqual(['opening', 'middle', 'end']);
    expect(r[0].w).toBeCloseTo(trackX(22, 82, W), 10);
    expect(r[2].x + r[2].w).toBeCloseTo(W, 10);
    // The ends are overlaid; the middlegame keeps the undimmed ground.
    expect(r.map((x) => x.overlay)).toEqual([true, false, true]);
  });

  it('draws nothing at all from a tag it cannot trust', () => {
    // Not the sound half of it: a region in the wrong place reads as information.
    expect(regionsOf({ middle: 56, end: 22 }, 82, W)).toEqual([]);
    expect(regionsOf({ middle: 0, end: 56 }, 82, W)).toEqual([]);
    expect(regionsOf({ middle: 22, end: 999 }, 82, W)).toEqual([]);
    expect(regionsOf({ middle: 22.5, end: 56 }, 82, W)).toEqual([]);
    expect(regionsOf({ middle: 22 }, 82, W)).toEqual([]);
    expect(regionsOf(null, 82, W)).toEqual([]);
    // And there is no fallback to equal thirds.
    expect(regionsOf({}, 82, W)).toEqual([]);
  });

  it('numbers the moves from a ply, with the starting position outside them', () => {
    expect(moveNumberOf(0)).toBe(0);
    expect(moveNumberOf(1)).toBe(1);   // 1. e4
    expect(moveNumberOf(2)).toBe(1);   // 1... e5
    expect(moveNumberOf(63)).toBe(32);
  });
});

/* ========================== the Explorer =========================== */

describe('Explorer', () => {
  const row = (move, games, white, draws, black) => ({ move, games, white, draws, black });

  it('splits the result against decided games, not against all of them', () => {
    // §6.3 — a game with no recorded result was still played, so it counts
    // toward how often a move was chosen and toward no side's score. Dividing by
    // `games` would quietly shrink every bar by the unfinished games behind it.
    const r = row('e4', 110, 40, 40, 20);          // 10 of the 110 unfinished
    expect(resultSplit(r)).toEqual({ white: 40, draws: 40, black: 20 });
  });

  it('always shows three numbers that total 100', () => {
    // Three independently rounded values do not, and a bar labelled 34/42/23 is
    // a bar the reader has to distrust.
    for (const [w, d, b] of [[1, 1, 1], [2, 3, 4], [17, 17, 17], [5, 0, 1], [99, 1, 1], [7, 11, 13]]) {
      const sp = resultSplit({ white: w, draws: d, black: b });
      expect(sp.white + sp.draws + sp.black).toBe(100);
    }
  });

  it('titles its Section Explorer', () => {
    expect(STRINGS.en['game.sec.explorer']).toBe('Explorer');
  });

  it('the source menu\u2019s Settings item is a shortcut to Settings \u203a Databases', async () => {
    const { default: GameSection } = await import('../src/lib/components/game/GameSection.svelte');
    const section = SECTIONS.find((s) => s.id === 'explorer');
    const onexplorersettings = vi.fn();
    const { container, getByText } = render(GameSection, { props: {
      section, height: 108, explorer: { library: null, libraries: [], total: 0, rows: [] },
      onexplorersettings
    } });
    await fireEvent.click(container.querySelector('.hd .src'));
    await fireEvent.click(getByText('Settings'));
    expect(onexplorersettings).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.srcmenu')).toBeNull();

    // And the workspace sends that shortcut to the Databases section.
    const ws = readSrc('../src/lib/components/game/GameWorkspace.svelte');
    expect(ws).toMatch(/function openDatabaseSettings\(\)\s*\{\s*selectSection\('databases'\);\s*openSettings\(\);/);
    expect(ws).toMatch(/onexplorersettings=\{openDatabaseSettings\}/);
  });

  it('has nothing to split when no game is decided', () => {
    expect(resultSplit({ white: 0, draws: 0, black: 0 })).toBeNull();
  });

  it('draws a label only where the segment holds it — never clipped, never moved', () => {
    // §4's table, computed against the 201px the wireframe budgets.
    expect(labelWidth(38)).toBe(13);
    expect(labelWidth(100)).toBe(20);
    expect(labelFits(21, 38)).toBe(true);
    expect(labelFits(20.9, 38)).toBe(false);
    expect(smallestLabelled(201)).toBeCloseTo(10.4, 1);
    // The cost of the "%", which is why it is dropped: 13.9% instead of 10.4%.
    expect(((labelWidth(380) + 8) / 201) * 100).toBeCloseTo(13.9, 1);
  });

  it('draws nothing for a zero result, and never a hairline for a real one', () => {
    // "Never happened" and "happened rarely" have to stay distinguishable.
    const zero = segments({ white: 100, draws: 0, black: 0 }, 201);
    expect(zero.map((s) => s.drawn)).toEqual([true, false, false]);

    const rare = segments({ white: 99, draws: 1, black: 0 }, 201);
    const draws = rare.find((s) => s.key === 'draws');
    expect(draws.drawn).toBe(true);
    expect(draws.px).toBeGreaterThanOrEqual(2);
    expect(draws.label).toBeNull();                 // too small to carry its own
  });

  it('fills the bar exactly, whatever the minimum costs', () => {
    for (const sp of [{ white: 99, draws: 1, black: 0 }, { white: 33, draws: 34, black: 33 }, { white: 1, draws: 1, black: 98 }]) {
      const total = segments(sp, 201).reduce((a, s) => a + s.px, 0);
      expect(total).toBeCloseTo(201, 6);
    }
  });

  it('orders by share, descending, and shares the position between its moves', () => {
    const rows = explorerRows([row('Nf3', 20, 8, 8, 4), row('e4', 60, 30, 20, 10), row('d4', 20, 9, 7, 4)]);
    // Nf3 before d4 on the tie: a plain string comparison, the same everywhere,
    // rather than a collation that would reorder them for a German user.
    expect(rows.map((r) => r.move)).toEqual(['e4', 'Nf3', 'd4']);
    expect(rows[0].share).toBe(60);
    expect(positionGames([row('e4', 60, 30, 20, 10), row('d4', 40, 20, 12, 8)])).toBe(100);
  });

  it('is sized to content between a floor of 60 and a ceiling of 108', () => {
    expect(explorerHeight(0)).toBe(60);      // a state message sits at the floor
    expect(explorerHeight(1)).toBe(60);
    expect(explorerHeight(2)).toBe(84);
    expect(explorerHeight(3)).toBe(108);
    expect(explorerHeight(9)).toBe(108);     // a fourth move scrolls, it does not grow
  });

  it('keeps a capped Section from taking more than its ceiling', () => {
    const S = [
      { id: 'x', floor: 60, ceiling: 108, contentHeight: 400 },
      { id: 'y', floor: 100, absorb: true }
    ];
    const { heights } = allocateSections(S, 600);
    expect(heights.x).toBe(108);
    expect(heights.y).toBe(492);             // the surplus goes to the absorber
  });

  it('keys a position by four FEN fields, not six', () => {
    // The halfmove clock and fullmove number describe a game's progress, not a
    // position: including either stops two games reaching the same position by
    // different move orders from being recognised as the same position.
    const a = positionKey('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
    const b = positionKey('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 9 40');
    expect(a).toBe(b);
    expect(a.split(' ')).toHaveLength(4);
  });

  it('records an en passant square only when the capture is actually legal', () => {
    // §6.2's deliberate departure from strict FEN, which writes the square
    // whenever a pawn advanced two — under that rule a genuine transposition
    // fails to merge.
    const canTake = 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3';
    expect(positionKey(canTake).endsWith(' f6')).toBe(true);

    const nobodyCan = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    expect(positionKey(nobodyCan).endsWith(' -')).toBe(true);
  });
});


/* =========================== the Engine Section ========================= */

describe('Engine Section', () => {
  /*
    Drawn in wireframes/game-engine.html Rev A. G1 and G2 granted 21 Sep.

    A LIVE VIEW OF THE CURRENT POSITION. The tests that matter most here are the
    ones about what it does NOT do: it does not write `[%eval]`, it does not
    survive navigation, and it does not share the Evaluation Bar with a stored
    evaluation.
  */

  /* `activeGame` reports the ACTIVE tab, so a store-level test has to be in
     one rather than merely have state for one.

     These tests are about the Section's own behaviour, so they pick a MOCK
     engine (`engine-1`): its lines come back at once and are deterministic.
     The built-in engine, which really searches, is the next describe block.
     No test here should ever reach a real Worker, so the app's engine talks
     to a scripted one throughout. */
  const openEngineTab = (ply = 6) => {
    resetGameState();
    ensureGameState('e1', 'g1');
    activeId.set('e1');
    goToPly('e1', ply);
    setEngineSource('e1', 'engine-1');
  };
  beforeEach(() => { setEngineTransport(createFakeEngine().createTransport); });
  afterEach(() => { resetGameState(); setEngineTransport(); });

  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const MATED = '7k/5QK1/8/8/8/8/8/8 b - - 0 1';          // black is mated
  const inputs = { engineId: 'engine-1', lines: 3, depth: 24 };

  it('is sized to content between a floor of 60 and a ceiling of 108', () => {
    // The same two numbers as the Explorer, reached from the same header,
    // padding and row height rather than copied from it.
    expect(engineHeight(0)).toBe(60);      // a state message sits at the floor
    expect(engineHeight(1)).toBe(60);
    expect(engineHeight(2)).toBe(84);
    expect(engineHeight(3)).toBe(108);
    expect(engineHeight(9)).toBe(108);     // Q5 caps the lines; nothing taller
  });

  it('offers the engines Settings has installed and turned on', () => {
    const engines = [
      { id: 'a', name: 'Stockfish', version: '17.1', status: 'ready', enabled: true, protocol: 'UCI' },
      { id: 'b', name: 'Torch', version: '3', status: 'ready', enabled: false },
      { id: 'c', name: 'Half', version: '1', status: 'downloading', enabled: true }
    ];
    const offered = engineSources(engines);
    expect(offered.map((e) => e.id)).toEqual(['a']);
    expect(offered[0].name).toBe('Stockfish 17.1');
    expect(offered[0].protocol).toBe('UCI');
    expect(engineLabel({ name: 'Komodo', version: '3' })).toBe('Komodo 3');
  });

  it('numbers a variation the way the rest of the panel numbers moves', () => {
    expect(formatPv(['Nd2', 'Bd8', 'Nb3', 'Bb6', 'Rc1'], 19, false))
      .toBe('19. Nd2 Bd8 20. Nb3 Bb6 21. Rc1');
    // A line that starts on Black's move leads with the ellipsis, as the Move
    // Explorer's rows do.
    expect(formatPv(['h6', 'a4'], 19, true)).toBe('19\u2026 h6 20. a4');
    expect(formatDepth(28)).toBe('d28');
  });

  it('holds the settings the options menu can reach inside their bounds (Q5)', () => {
    expect(clampLines(0)).toBe(1);
    expect(clampLines(9)).toBe(3);
    expect(clampLines(ENGINE_DEFAULT_LINES)).toBe(2);
    expect(clampDepth(2)).toBe(10);
    expect(clampDepth(400)).toBe(40);
    expect(clampDepth(ENGINE_DEFAULT_DEPTH)).toBe(24);
  });

  it('reports legal moves, ranked, from the position on the board', () => {
    const lines = analyse(START, inputs);
    expect(lines).toHaveLength(3);
    expect(lines.map((l) => l.rank)).toEqual([1, 2, 3]);
    // Every first move is legal from the starting position, and distinct: two
    // MultiPV lines that opened with the same move would be one line twice.
    const firsts = lines.map((l) => l.pv[0]);
    expect(new Set(firsts).size).toBe(3);
    expect(lines.every((l) => l.pv.length > 1)).toBe(true);
    expect(lines.every((l) => l.depth === 24)).toBe(true);
  });

  it('never ranks a line above the one before it, from the mover\u2019s side', () => {
    // White to move: White-relative scores descend. A second line that outscored
    // the first would read as a bug on sight.
    const white = analyse(START, inputs);
    expect(white[0].e).toBeGreaterThanOrEqual(white[1].e);
    expect(white[1].e).toBeGreaterThanOrEqual(white[2].e);

    // Black to move: the same rule, the other way up, because the score stays
    // White-relative — the bar and `[%eval]` are not turned over per ply.
    const black = analyse('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', inputs);
    expect(black[0].e).toBeLessThanOrEqual(black[1].e);
  });

  it('never fabricates a mate score', () => {
    // A plausible centipawn number is mock data; `M3` is a claim about the
    // position, stated in the strongest terms the row has.
    for (const ply of [START, 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4']) {
      expect(analyse(ply, inputs).every((l) => l.x === null)).toBe(true);
    }
  });

  it('has nothing to say without an engine, or in a finished game', () => {
    expect(analyse(START, { ...inputs, engineId: '' })).toEqual([]);
    expect(analyse(MATED, inputs)).toEqual([]);
    // The two empties are different states and the Section draws them
    // differently, so they are answered by different questions.
    expect(hasLegalMoves(START)).toBe(true);
    expect(hasLegalMoves(MATED)).toBe(false);
  });

  it('is deterministic: the same position and settings agree every time', () => {
    expect(analyse(START, inputs)).toEqual(analyse(START, inputs));
  });

  it('Q2 \u2014 cannot run without an engine selected', () => {
    openEngineTab(0);
    setEngineSource('e1', null);                             // follow Settings
    setEngineOn('e1', true);
    expect(get(activeGame).engineView.running).toBe(true);   // one is offered by default

    setEngineSource('e1', 'no-such-engine');
    // The source falls back to the first engine Settings offers rather than
    // leaving the tab pointing at nothing.
    expect(get(activeGame).engineView.source).not.toBeNull();
  });

  it('Q8 \u2014 switching off retains the lines; leaving the position clears them', () => {
    openEngineTab();
    setEngineOn('e1', true);

    const live = get(activeGame).engineView;
    expect(live.running).toBe(true);
    expect(live.lines.length).toBeGreaterThan(0);

    // Off: stopped, not cleared. The same lines, no longer live.
    setEngineOn('e1', false);
    const held = get(activeGame).engineView;
    expect(held.running).toBe(false);
    expect(held.lines).toEqual(live.lines);

    // Away and back: cleared, and the round trip does not bring it back. What
    // an engine said about a position it is no longer searching is not a fact
    // about the game.
    goToPly('e1', 7);
    expect(get(activeGame).engineView.lines).toEqual([]);
    goToPly('e1', 6);
    expect(get(activeGame).engineView.lines).toEqual([]);
  });

  it('Q8 \u2014 the Section reports; it never writes an evaluation into the game', () => {
    openEngineTab();
    const before = structuredClone(get(activeGame).plies);
    setEngineOn('e1', true);
    expect(get(activeGame).engineView.lines.length).toBeGreaterThan(0);
    // The plies are the game's own movetext, `[%eval]` included. Running a live
    // search changes none of it.
    expect(get(activeGame).plies).toEqual(before);
  });

  it('asks the shell for the height its line count needs', () => {
    openEngineTab();

    // Off, showing a state message: the floor.
    expect(engineContentHeight(get(activeGame).engineView.lines)).toBe(60);

    setEngineLines('e1', 3);
    setEngineOn('e1', true);
    expect(engineContentHeight(get(activeGame).engineView.lines)).toBe(108);

    setEngineLines('e1', 1);
    expect(engineContentHeight(get(activeGame).engineView.lines)).toBe(60);
  });

  it('keeps the depth limit and the depth reached apart (Q5)', () => {
    openEngineTab();
    setEngineDepth('e1', 30);
    setEngineOn('e1', true);
    const v = get(activeGame).engineView;
    expect(v.depth).toBe(30);                            // the limit, in the menu
    expect(v.lines.every((l) => l.depth === 30)).toBe(true);   // reached, per row
  });
});

/* ================= the Engine Section — the built-in engine ============== */

describe('Engine Section — the built-in engine (Stage 1)', () => {
  /*
    The bundled Stockfish WASM engine, driven through the store exactly as the
    Section drives it. The engine itself is scripted (`helpers/fakeEngine.js`)
    and says only what the real one said for the same position
    (`fixtures/stockfish-uci.json`); `engine-real.test.js` runs the real one.
  */
  const FIXTURE = JSON.parse(readSrc('./fixtures/stockfish-uci.json'));
  const CASE = Object.fromEntries(FIXTURE.cases.map((c) => [c.name, c]));
  const BLACK = CASE['black-to-move-multipv2'];     // 1. e4 e5 2. Nf3, Black to move
  const START = CASE['startpos-multipv3'];
  const infos = (c) => c.output.filter((l) => l.startsWith('info'));
  const bestmove = (c) => c.output.at(-1);

  let fake;
  beforeEach(() => {
    fake = createFakeEngine();
    setEngineTransport(fake.createTransport);
  });
  afterEach(() => {
    resetGameState();                  // no tab asking for a search…
    setEngineEnabled(BUILTIN_ENGINE_ID, true);
    setEngineTransport();              // …before the real transport is back
  });

  /** A tab on the fixture's position, the Section set to the fixture's settings. */
  const openAt = (c, tabId = 'w1') => {
    ensureGameState(tabId, seedDraftGame({ fen: c.fen }));
    activeId.set(tabId);
    setEngineLines(tabId, c.multipv);
    setEngineDepth(tabId, c.depth);
  };
  const view = () => get(activeGame).engineView;

  it('is the default engine, and the first the picker offers', () => {
    openAt(BLACK);
    expect(view().source.id).toBe(BUILTIN_ENGINE_ID);
    expect(view().source.name).toBe('Stockfish 19 lite');
    expect(view().sources[0].id).toBe(BUILTIN_ENGINE_ID);
    // The mock rows are still offered after it, unchanged.
    expect(view().sources.map((s) => s.id)).toContain('engine-1');
  });

  it('searches the position on the board, with the tab’s settings, only once switched on', async () => {
    openAt(BLACK);
    await settle();
    expect(fake.starts).toBe(0);                    // nothing loads until it is wanted

    setEngineOn('w1', true);
    await settle();
    expect(fake.sent).toEqual([
      'uci', 'setoption name Hash value 32', 'isready',
      'setoption name MultiPV value 2', `position fen ${BLACK.fen}`, 'go depth 12'
    ]);
    // Running, and nothing to show yet: no lines are invented meanwhile.
    expect(view().running).toBe(true);
    expect(view().lines).toEqual([]);
  });

  it('shows the engine’s real lines, White-relative, and the Bar can read the top one', async () => {
    openAt(BLACK);
    setEngineOn('w1', true);
    await settle();
    fake.emit(infos(BLACK), bestmove(BLACK));
    const v = view();
    expect(v.lines.map((l) => l.rank)).toEqual([1, 2]);
    expect(v.lines.map((l) => l.e)).toEqual([27, 34]);
    expect(v.lines[0].pv.slice(0, 3)).toEqual(['Nf6', 'Nxe5', 'd6']);
    expect(v.lines.every((l) => l.depth === 12)).toBe(true);
    expect(get(engineAnalysis).w1.status).toBe('done');
    // The Section is sized from the rows it really has.
    expect(engineContentHeight(v.lines)).toBe(84);
  });

  it('holds steady while a search has no line yet: no Off message, no drop in height', async () => {
    openAt(BLACK);
    setEngineOn('w1', true);
    await settle();
    const v = view();
    expect(v.running).toBe(true);
    expect(v.lines).toEqual([]);
    // The height of the two lines asked for, not the floor.
    expect(engineContentHeight(v.lines, v)).toBe(84);
    expect(engineContentHeight(v.lines)).toBe(60);            // without the view: unchanged

    const { container } = render(EngineLines, {
      props: { lines: v.lines, running: true, hasEngine: true, hasMoves: true }
    });
    expect(container.textContent).not.toContain('Off');
    expect(container.querySelector('.body[aria-busy="true"]')).toBeTruthy();
    // Off, with nothing computed, still says so.
    cleanup();
    const off = render(EngineLines, { props: { lines: [], running: false } });
    expect(off.container.textContent).toContain('Off');
  });

  it('Q8 — switching off stops the engine and keeps exactly the rows on screen', async () => {
    openAt(BLACK);
    setEngineOn('w1', true);
    await settle();
    fake.emit(infos(BLACK).slice(0, 8));
    const live = view().lines;
    expect(live.length).toBeGreaterThan(0);
    fake.take();

    setEngineOn('w1', false);
    expect(fake.take()).toEqual(['stop']);
    // Anything the engine says on its way out changes nothing on screen.
    fake.emit(infos(BLACK).slice(8), bestmove(BLACK));
    expect(view().running).toBe(false);
    expect(view().lines).toEqual(live);
    // A setting changed afterwards doesn't rewrite a stopped result.
    setEngineLines('w1', 3);
    expect(view().lines).toEqual(live);
  });

  it('leaving the position clears the lines and searches the new one, never mixing them', async () => {
    openAt(BLACK);
    setEngineOn('w1', true);
    await settle();
    fake.emit(infos(BLACK).slice(0, 8));
    fake.take();

    playMove('w1', { from: 'g8', to: 'f6' });
    const fen = get(activeGame).position.f;
    expect(view().lines).toEqual([]);
    expect(fake.take()).toEqual(['stop']);             // waits for the old bestmove
    fake.emit(infos(BLACK).slice(8));                  // the old search, still talking
    expect(view().lines).toEqual([]);
    fake.emit(bestmove(BLACK));
    expect(fake.take()).toEqual([`position fen ${fen}`, 'go depth 12']);
  });

  it('restarts the search when the line count or the depth limit changes', async () => {
    openAt(BLACK);
    setEngineOn('w1', true);
    await settle();
    fake.take();
    setEngineLines('w1', 3);
    expect(fake.take()).toEqual(['stop']);
    fake.emit('bestmove g8f6');
    expect(fake.take()).toEqual([
      'setoption name MultiPV value 3', `position fen ${BLACK.fen}`, 'go depth 12'
    ]);
    setEngineDepth('w1', 20);
    fake.emit('bestmove g8f6');                         // (the search above, ending)
    fake.take();
    expect(get(engineAnalysis).w1.key).toContain('|3|20');
  });

  it('only the active tab searches', async () => {
    openAt(BLACK, 'w1');
    setEngineOn('w1', true);
    await settle();
    fake.take();

    openAt(START, 'w2');                                // a second tab, its Section off
    expect(fake.take()).toEqual(['stop']);
    setEngineOn('w2', true);
    fake.emit('bestmove g8f6');
    expect(fake.take()).toEqual([
      'setoption name MultiPV value 3', `position fen ${START.fen}`, 'go depth 12'
    ]);

    activeId.set('w1');                                 // back to the first tab
    expect(fake.take()).toEqual(['stop']);
    fake.emit('bestmove e2e4');
    expect(fake.take()).toEqual([
      'setoption name MultiPV value 2', `position fen ${BLACK.fen}`, 'go depth 12'
    ]);

    activeId.set('library');                            // no game on screen: no search
    expect(fake.take()).toEqual(['stop']);
    fake.emit('bestmove g8f6');
    expect(fake.take()).toEqual([]);
  });

  it('turned off in Settings, it stops and the Section falls back to the next engine', async () => {
    openAt(BLACK);
    setEngineOn('w1', true);
    await settle();
    fake.take();
    setEngineEnabled(BUILTIN_ENGINE_ID, false);
    expect(fake.take()).toEqual(['stop']);
    expect(view().sources.map((s) => s.id)).not.toContain(BUILTIN_ENGINE_ID);
    expect(view().source.id).toBe('engine-1');
  });

  it('a mock engine still gives mock lines, and never wakes the real one', async () => {
    openAt(BLACK);
    setEngineSource('w1', 'engine-1');
    setEngineOn('w1', true);
    await settle();
    expect(fake.starts).toBe(0);
    expect(view().lines).toEqual(analyse(BLACK.fen, { engineId: 'engine-1', lines: 2, depth: 12 }));
  });

  it('asks nothing of the engine where the game has ended', async () => {
    ensureGameState('w3', seedDraftGame({ fen: '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1' }));
    activeId.set('w3');
    setEngineOn('w3', true);
    await settle();
    expect(fake.starts).toBe(0);
    expect(view().hasMoves).toBe(false);
  });
});

/* ============================ the Move List ============================= */

describe('§5.4.2 Move List', () => {
  const openGameTab = async () => {
    const r = render(AppShell);
    openGame('Morphy', 'g1');
    await tick();
    await tick();
    return r;
  };

  const listMoves = (container) =>
    [...container.querySelectorAll('.ml .mv')].map((b) => b.textContent.trim());

  it('is built, and so is every other Section — no placeholder is left', async () => {
    const { container } = await openGameTab();
    expect(container.querySelector('.ml')).toBeTruthy();
    expect(container.querySelector('.row .bar, .msg')).toBeTruthy();

    /*
      Game Info was the last placeholder in the composition and is now drawn, so
      the shell renders no `.ph` at all. The Timeline is not asserted here: at
      the height these tests render it is DISPLACED, which is the specified
      behaviour rather than an absence — see the Timeline's own tests.
    */
    expect(container.querySelector('.gi')).toBeTruthy();
    expect(container.querySelectorAll('#settings-content .ph, .sec .ph').length).toBe(0);
  });

  it('pairs the plies into numbered rows', async () => {
    const { container } = await openGameTab();
    // Scoped to the mainline: this corpus game (the Opera Game) carries real
    // variations (Stage 5), which get their own rows nested inside `.var` --
    // counted separately below, not here.
    const rows = [...container.querySelectorAll('.ml .row')].filter((r) => !r.closest('.var'));
    const plies = pliesFor(gameById(get(activeGame).state.gameId));
    // plies[0] is the starting position and belongs to no row.
    expect(rows.length).toBe(Math.ceil((plies.length - 1) / 2));
    expect(rows[0].querySelector('.no').textContent.trim()).toBe('1.');
  });

  it('renders the movetext’s own variations as nested, indented blocks (Stage 5)', async () => {
    const { container } = await openGameTab();
    // The Opera Game's movetext carries real variations, e.g. "(2... Nc6)" --
    // Stage 5's whole point is that these are no longer silently dropped.
    const vars = container.querySelectorAll('.ml .var');
    expect(vars.length).toBeGreaterThan(0);
    const first = vars[0];
    expect(first.querySelector('.var-hdr')).toBeTruthy();
    expect([...first.querySelectorAll(':scope > .row, :scope > .blk .row')].length)
      .toBeGreaterThan(0);
  });

  it('renders the game\u2019s actual moves, read from its movetext', async () => {
    const { container } = await openGameTab();
    const plies = pliesFor(gameById(get(activeGame).state.gameId));
    expect(listMoves(container).slice(0, 4)).toEqual(plies.slice(1, 5).map((p) => p.s));
  });

  it('marks nothing at ply 0 — no move produced the starting position', async () => {
    const { container } = await openGameTab();
    expect(get(activeGame).ply).toBe(0);
    expect(container.querySelectorAll('.ml .mv.on').length).toBe(0);
  });

  it('marks the current ply, and exactly one of them', async () => {
    const { container } = await openGameTab();
    const tabId = get(activeId);
    goToPly(tabId, 3);
    await tick();
    const on = container.querySelectorAll('.ml .mv.on');
    expect(on.length).toBe(1);
    const plies = pliesFor(gameById(get(activeGame).state.gameId));
    expect(on[0].textContent.trim()).toBe(plies[3].s);
    expect(on[0].getAttribute('aria-current')).toBe('true');
  });

  it('navigates when a move is clicked', async () => {
    const { container } = await openGameTab();
    const target = [...container.querySelectorAll('.ml .mv')][5];
    const san = target.textContent.trim();
    await fireEvent.click(target);
    await tick();
    expect(get(activeGame).ply).toBe(6);
    expect(get(activeGame).position.s).toBe(san);
  });

  it('leaves the trailing cell empty when White has the last word', async () => {
    const { container } = await openGameTab();
    const plies = pliesFor(gameById(get(activeGame).state.gameId));
    const rows = container.querySelectorAll('.ml .row');
    const last = rows[rows.length - 1];
    const odd = (plies.length - 1) % 2 === 1;
    expect(!!last.querySelector('.mv.empty')).toBe(odd);
  });

  it('keeps the move list and the board on the same ply', async () => {
    const { container } = await openGameTab();
    const tabId = get(activeId);
    lastPly(tabId);
    await tick();
    const on = container.querySelector('.ml .mv.on');
    expect(on.textContent.trim()).toBe(get(activeGame).position.s);
  });

  /* -------------------- editing variations (context menu) ------------------- */

  // Not hardcoded to any particular SAN or opening: the corpus data has real
  // variations (Stage 5's own test above already leans on that), but which
  // moves they are is an implementation detail of the sample data, not of
  // Stage 6 -- these tests find whichever variation move is actually there.
  const firstVariationMove = (container) =>
    [...container.querySelectorAll('.ml .var .mv')].find((b) => b.textContent.trim() !== '');
  const firstMainlineMove = (container) =>
    [...container.querySelectorAll('.ml .mv')].find((b) => !b.closest('.var') && b.textContent.trim() !== '');
  // Mainline-only, in document order -- `.ml .mv` alone also picks up moves
  // nested inside `.var` (interleaved with the mainline in DOM order) and
  // the empty placeholder half of a solo row, neither of which belongs here.
  const mainlineMoves = (container) =>
    [...container.querySelectorAll('.ml .mv')]
      .filter((b) => !b.closest('.var') && b.textContent.trim() !== '')
      .map((b) => b.textContent.trim());
  const depthOf = (btn) => btn.dataset.path.split('.').length;

  const MENU_LABELS = [
    'game.moves.promoteVariation', 'game.moves.demoteVariation', 'game.moves.makeMainLine',
    'game.moves.deleteFromHere', 'game.moves.deleteVariation'
  ].map((k) => STRINGS.en[k]);
  const menuItem = (container, command) =>
    container.querySelector(`.ctx [role="menuitem"][data-command="${command}"]`);

  it('right-clicking a variation move opens the five-item menu, all in the same order', async () => {
    const { container } = await openGameTab();
    const target = firstVariationMove(container);
    expect(target).toBeTruthy();

    await fireEvent.contextMenu(target, { clientX: 40, clientY: 60 });
    await tick();

    const items = [...container.querySelectorAll('.ctx [role="menuitem"]')].map((b) => b.textContent.trim());
    expect(items).toEqual(MENU_LABELS);
    expect(menuItem(container, 'promote').disabled).toBe(false);
    expect(menuItem(container, 'mainline').disabled).toBe(false);
    expect(menuItem(container, 'deleteVariation').disabled).toBe(false);
  });

  it('a main-line move gets the same menu, with the variation-only commands disabled', async () => {
    const { container } = await openGameTab();
    const target = firstMainlineMove(container);
    await fireEvent.contextMenu(target, { clientX: 40, clientY: 60 });
    await tick();

    const items = [...container.querySelectorAll('.ctx [role="menuitem"]')].map((b) => b.textContent.trim());
    expect(items).toEqual(MENU_LABELS);
    expect(menuItem(container, 'promote').disabled).toBe(true);
    expect(menuItem(container, 'mainline').disabled).toBe(true);
    expect(menuItem(container, 'deleteVariation').disabled).toBe(true);
    expect(menuItem(container, 'deleteFromHere').disabled).toBe(false);

    // A disabled command does nothing and leaves the menu open.
    await fireEvent.click(menuItem(container, 'promote'));
    await tick();
    expect(container.querySelector('.ctx')).toBeTruthy();
    expect(get(activeGame).dirty).toBe(false);
  });

  it('"Delete from Here" on a main-line move truncates the main line there', async () => {
    const { container } = await openGameTab();
    const before = mainlineMoves(container);
    const target = [...container.querySelectorAll('.ml .mv')]
      .filter((b) => !b.closest('.var') && b.textContent.trim() !== '')[2];
    await fireEvent.contextMenu(target, { clientX: 40, clientY: 60 });
    await tick();
    await fireEvent.click(menuItem(container, 'deleteFromHere'));
    await tick();

    expect(container.querySelector('.ctx')).toBeFalsy();
    expect(get(activeGame).dirty).toBe(true);
    expect(mainlineMoves(container).length).toBeLessThan(before.length);
    expect(mainlineMoves(container).slice(0, 2)).toEqual(before.slice(0, 2));
  });

  it('Escape and clicking the scrim both dismiss the menu without acting', async () => {
    const { container } = await openGameTab();
    const target = firstVariationMove(container);

    await fireEvent.contextMenu(target, { clientX: 40, clientY: 60 });
    await tick();
    expect(container.querySelector('.ctx')).toBeTruthy();
    await fireEvent.keyDown(window, { key: 'Escape' });
    await tick();
    expect(container.querySelector('.ctx')).toBeFalsy();
    expect(get(activeGame).dirty).toBe(false);

    await fireEvent.contextMenu(target, { clientX: 40, clientY: 60 });
    await tick();
    await fireEvent.pointerDown(container.querySelector('.ctx-scrim'));
    await tick();
    expect(container.querySelector('.ctx')).toBeFalsy();
    expect(get(activeGame).dirty).toBe(false);
  });

  it('"Promote Variation" moves the clicked line onto the mainline and closes the menu', async () => {
    const { container } = await openGameTab();
    const target = firstVariationMove(container);
    const san = target.textContent.trim();
    const depth = depthOf(target);

    await fireEvent.contextMenu(target, { clientX: 40, clientY: 60 });
    await tick();
    await fireEvent.click(menuItem(container, 'promote'));
    await tick();

    expect(container.querySelector('.ctx')).toBeFalsy();
    expect(get(activeGame).dirty).toBe(true);
    // The promoted move now sits at its own depth on the actual mainline.
    expect(mainlineMoves(container)[depth - 1]).toBe(san);
  });

  it('"Make Main Line" is available from the same menu', async () => {
    const { container } = await openGameTab();
    const target = firstVariationMove(container);
    const san = target.textContent.trim();
    const depth = depthOf(target);

    await fireEvent.contextMenu(target, { clientX: 40, clientY: 60 });
    await tick();
    await fireEvent.click(menuItem(container, 'mainline'));
    await tick();

    expect(container.querySelector('.ctx')).toBeFalsy();
    expect(get(activeGame).dirty).toBe(true);
    expect(mainlineMoves(container)[depth - 1]).toBe(san);
  });
});

/* ===================== comments in the Moves Section ==================== */

describe('§5.4.2 Moves — comments', () => {
  /* Row 1: both plies commented. Row 2: Black only. Row 3: neither. */
  const MOVETEXT = '1. e4 {White has something to say} e5 {So does Black} '
    + '2. Nf3 Nc6 {Only Black here} 3. Bc4 Nf6 *';

  const mount = (path = []) =>
    render(MoveList, { props: { tree: treeOf(MOVETEXT), path, onselect: () => {} } });

  const moveCells = (c) => [...c.querySelectorAll('.mv')].map((e) => e.textContent.trim());
  const comments = (c) => [...c.querySelectorAll('.cmt')].map((e) => e.textContent.trim());
  const controls = (c) => [...c.querySelectorAll('.cc')];
  const numbers = (c) => [...c.querySelectorAll('.no')].map((e) => e.textContent.trim());

  it('reads the comment off the movetext onto the ply', () => {
    const plies = pliesOf(MOVETEXT);
    expect(plies[1].c).toBe('White has something to say');
    expect(plies[2].c).toBe('So does Black');
    expect(plies[3].c).toBeNull();
    expect(plies[4].c).toBe('Only Black here');
  });

  /* A command the banner does not draw is text, and stays exactly as written. */
  it('leaves a command without a banner in the text, verbatim', () => {
    const plies = pliesOf('1. e4 {[%clk 0:02:57.8] [%eval 0.45] [%bestmove e2e4]} *');
    expect(plies[1].c).toBe('[%clk 0:02:57.8]');
  });

  it('starts with every comment collapsed and every move paired', () => {
    const { container } = mount();
    expect(comments(container)).toEqual([]);
    expect(numbers(container)).toEqual(['1.', '2.', '3.']);
    expect(moveCells(container)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6']);
    for (const c of controls(container)) expect(c.getAttribute('aria-expanded')).toBe('false');
  });

  /* A row is a move, which is two plies, so the control belongs to the row. */
  it('gives one control to a row, however many of its plies are commented', () => {
    const { container } = mount();
    expect(controls(container).length).toBe(2);   // rows 1 and 2; row 3 has none
    expect(container.querySelectorAll('.row').length).toBe(3);
  });

  /*
   * Opening a move whose White ply is commented breaks it across two rows, so each
   * comment sits under the ply that earned it.
   */
  /*
   * The number is repeated, but not identically: `1.` announces White's move, so the row
   * carrying only Black's ply takes the ellipsis form PGN uses for exactly this case.
   * Two rows reading `1.` and `1.` were what the retired box was drawn to disambiguate.
   */
  it('splits the move when White is commented, continuing the number', async () => {
    const { container } = mount();
    await fireEvent.click(controls(container)[0]);

    expect(numbers(container)).toEqual(['1.', '1\u2026', '2.', '3.']);
    expect(comments(container)).toEqual([
      'White has something to say',
      'So does Black'
    ]);
  });

  it('leaves the cell of the ply that moved to its own row empty', async () => {
    const { container } = mount();
    await fireEvent.click(controls(container)[0]);
    const rows = [...container.querySelectorAll('.row')];
    // White's row: the move, then an empty Black cell.
    expect([...rows[0].querySelectorAll('.mv')].map((e) => e.textContent.trim())).toEqual(['e4', '']);
    // Black's row: an empty White cell, then the move.
    expect([...rows[1].querySelectorAll('.mv')].map((e) => e.textContent.trim())).toEqual(['', 'e5']);
  });

  it('puts the control on the first of the two rows only', async () => {
    const { container } = mount();
    await fireEvent.click(controls(container)[0]);
    const rows = [...container.querySelectorAll('.row')];
    expect(rows[0].querySelector('.cc')).toBeTruthy();
    expect(rows[1].querySelector('.cc')).toBeNull();
  });

  it('does not split when only Black is commented', async () => {
    const { container } = mount();
    await fireEvent.click(controls(container)[1]);
    expect(comments(container)).toEqual(['Only Black here']);
    expect(numbers(container)).toEqual(['1.', '2.', '3.']);
    expect(moveCells(container)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6']);
  });

  /* Position is the attribution. Anything else would be text the document does not hold. */
  it('shows the comment and nothing but the comment', async () => {
    const { container } = mount();
    await fireEvent.click(controls(container)[0]);
    expect(container.querySelectorAll('.who').length).toBe(0);
    for (const c of comments(container)) {
      expect(c).not.toMatch(/^(e4|e5|Nf3|Nc6)/);
    }
  });

  it('binds an open move\u2019s rows and comments into one group', async () => {
    const { container } = mount();
    expect(container.querySelectorAll('.blk').length).toBe(0);

    await fireEvent.click(controls(container)[0]);
    const groups = [...container.querySelectorAll('.blk')];
    expect(groups.length).toBe(1);
    // The split move: both its rows and both its comments, and nothing else.
    expect(groups[0].querySelectorAll('.row').length).toBe(2);
    expect(groups[0].querySelectorAll('.cmt').length).toBe(2);
    expect(container.querySelectorAll('.row').length).toBe(4);
  });

  it('groups an unsplit open move too', async () => {
    const { container } = mount();
    await fireEvent.click(controls(container)[1]);
    const groups = [...container.querySelectorAll('.blk')];
    expect(groups.length).toBe(1);
    expect(groups[0].querySelectorAll('.row').length).toBe(1);
    expect(groups[0].querySelectorAll('.cmt').length).toBe(1);
  });

  it('collapses again, restoring the pair', async () => {
    const { container } = mount();
    await fireEvent.click(controls(container)[0]);
    expect(numbers(container)).toEqual(['1.', '1\u2026', '2.', '3.']);
    await fireEvent.click(controls(container)[0]);
    expect(comments(container)).toEqual([]);
    expect(numbers(container)).toEqual(['1.', '2.', '3.']);
  });

  it('opens each move independently', async () => {
    const { container } = mount();
    await fireEvent.click(controls(container)[0]);
    await fireEvent.click(controls(container)[1]);
    expect(comments(container).length).toBe(3);
  });

  it('names every block the control opens', async () => {
    const { container } = mount();
    await fireEvent.click(controls(container)[0]);
    const ids = controls(container)[0].getAttribute('aria-controls').split(' ');
    expect(ids.length).toBe(2);
    for (const id of ids) expect(container.querySelector(`#${id}`)).toBeTruthy();
  });

  it('leaves a command without a banner in the annotated game\u2019s text', () => {
    // Every ply of the corpus carries [%clk], which has no banner, so it stays as text.
    const withText = pliesFor(ANNOTATED).filter((p) => p.c !== null);
    expect(withText.length).toBeGreaterThan(20);
    for (const p of withText.slice(0, 5)) {
      expect(p.c).toMatch(/^\[%clk /);
      expect(p.c).not.toMatch(/\[%eval|\[%bestmove/);
    }
  });
});

/* ========================= the comment banner =========================== */

describe('readGame — a custom starting position (\u00a72.2\u2019s games.fen)', () => {
  const CUSTOM_FEN = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

  it('a game with no moves shows its own starting position, not the standard array', () => {
    const { plies } = readGame('', { fen: CUSTOM_FEN });
    expect(plies).toHaveLength(1);
    expect(plies[0].f).toBe(CUSTOM_FEN);
  });

  it('falls back to the standard array when no fen is given, same as before', () => {
    const { plies } = readGame('');
    expect(plies[0].f).not.toBe(CUSTOM_FEN);
  });

  it('a game WITH moves resolves every ply from the custom start, not just ply 0', () => {
    const { plies } = readGame('1. Kf1 Kd8 2. Kg1', { fen: CUSTOM_FEN });
    expect(plies[0].f).toBe(CUSTOM_FEN);
    // Ply 1 (after 1. Kf1) is a real position reached FROM the custom
    // start, not from the standard game's own opening.
    expect(plies[1].s).toBe('Kf1');
    expect(plies[1].f).not.toBe(CUSTOM_FEN);
    expect(plies).toHaveLength(4);
  });

  it('pliesFor threads a mock row\u2019s own fen the same way', () => {
    const row = { ...GAMES[0], movetext: null, pgn: '*', fen: CUSTOM_FEN };
    expect(pliesFor(row)[0].f).toBe(CUSTOM_FEN);
  });
});

describe('§5.4.2 Moves — comment banner', () => {
  const ANNOTATED = '{ [%engine name="Stockfish 16" depth=32 hash=512] } '
    + '1. e4 { [%clk 0:02:57.8] [%eval 0.95] [%bestmove e2e4] } '
    + 'e5 { Just prose here } '
    + '2. Nf3 { [%eval -0.12] Mixed with a sentence } Nc6 *';

  const mount = () => {
    const { tree, engine } = readGame(ANNOTATED);
    return render(MoveList, { props: { tree, path: [], engine, onselect: () => {} } });
  };
  const open = async (c, i = 0) => {
    await fireEvent.click([...c.querySelectorAll('.cc')][i]);
  };

  it('reads the engine context off the document, not off a move', () => {
    const { engine } = readGame(ANNOTATED);
    expect(engine.name).toBe('Stockfish 16');
    expect(engine.depth).toBe(32);
  });

  it('takes the banner commands out of the comment text', () => {
    const { plies } = readGame(ANNOTATED);
    // e4 carried eval, bestmove and clk. Only clk is left, written as it was.
    expect(plies[1].c).toBe('[%clk 0:02:57.8]');
    expect(plies[1].e).toBe(95);
    expect(plies[1].b).toBe('e4');
  });

  it('leaves prose untouched', () => {
    const { plies } = readGame(ANNOTATED);
    expect(plies[2].c).toBe('Just prose here');
    expect(plies[2].e).toBeNull();
    expect(plies[2].b).toBeNull();
  });

  it('keeps the prose when a comment mixes it with a banner command', () => {
    const { plies } = readGame(ANNOTATED);
    expect(plies[3].c).toBe('Mixed with a sentence');
    expect(plies[3].e).toBe(-12);
  });

  it('draws the banner and never the same command twice', async () => {
    const { container } = mount();
    await open(container, 0);
    // `.ban.game` is the document's own banner; a move's banner is any other.
    const banner = container.querySelector('.ban:not(.game)');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('+0.95');
    expect(banner.textContent).toContain('e4');

    /* Values only. One [%engine] governs every evaluation in the document, so the engine
       and its depth are stated once in the game comment rather than on each statement. */
    expect(banner.textContent).not.toContain('Stockfish 16');
    expect(banner.textContent).not.toContain('d32');
    expect(container.querySelector('.ban.game').textContent).toContain('Stockfish 16');
    // The clk survived as text; the eval and bestmove did not.
    const text = [...container.querySelectorAll('.cmt')].map((e) => e.textContent).join(' ');
    expect(text).toContain('[%clk');
    expect(text).not.toContain('[%eval');
    expect(text).not.toContain('[%bestmove');
  });

  it('signs the score, and shows the two decimals the document stores', async () => {
    const { container } = mount();
    await open(container, 1);   // move 2: eval −0.12
    expect(container.querySelector('.ban:not(.game)').textContent).toContain('−0.12');
  });

  it('gives a move with only a banner a control of its own', async () => {
    const { tree, engine } = readGame('1. e4 { [%eval 0.30] } e5 2. Nf3 *');
    const { container } = render(MoveList, { props: { tree, path: [], engine, onselect: () => {} } });
    expect(container.querySelectorAll('.cc').length).toBe(1);
    await fireEvent.click(container.querySelector('.cc'));
    expect(container.querySelector('.ban')).toBeTruthy();
    // Nothing but commands, so there is no text left to show.
    expect(container.querySelectorAll('.cmt').length).toBe(0);
  });

  it('draws no banner for a move that has only prose', async () => {
    const { container } = mount();
    await open(container, 0);
    // Row 1 is split: e4 has a banner, e5 has prose only.
    const blocks = [...container.querySelectorAll('.blk .ann')];
    expect(blocks[0].querySelector('.ban')).toBeTruthy();
    expect(blocks[1].querySelector('.ban')).toBeNull();
    expect(blocks[1].querySelector('.cmt').textContent.trim()).toBe('Just prose here');
  });

  it('has no engine to name when the document declares none', () => {
    const { engine } = readGame('1. e4 { [%eval 0.30] } *');
    expect(engine).toBeNull();
  });

  it('reports no engine for a game that declares none', () => {
    for (const g of UNANNOTATED_GAMES) expect(engineFor(g)).toBeNull();
  });

  /*
   * The group tint is full-bleed. A horizontal margin on it indents everything inside —
   * the number gutter and the trailing control both — so opening a comment would knock
   * that move's columns out of line with every other row. jsdom has no layout and cannot
   * measure that, so the rule is asserted at the source.
   */
  /*
   * The open move is inset by 4px on each side, which would push its gutter and its
   * control off the line every other row uses — so the rows inside it narrow by the same
   * amount to pay for it. jsdom has no layout and cannot measure the result, so the
   * compensation is asserted at the source: whatever the block's inset, the grid inside
   * must give it back.
   */
  /*
   * RETIRED WITH THE BOX. This used to read the open block's margin and border out of the
   * CSS and check that the rows inside gave the same number back, because a box that is
   * inset moves the columns of the rows it holds. Nothing is inset now, so there is no
   * arithmetic to check — only one grid to prove, which is the invariant the compensating
   * one was standing in for. jsdom still cannot measure, so this is read from the source.
   */
  it('uses one grid for every row, open or closed', () => {
    const src = readSrc('../src/lib/components/game/MoveList.svelte');

    const grids = [...src.matchAll(/grid-template-columns:\s*([^;]+);/g)].map((m) => m[1].trim());
    expect(grids, 'no grid declared').not.toHaveLength(0);
    expect(new Set(grids).size, `more than one row grid: ${grids.join(' | ')}`).toBe(1);

    // Nothing inside the list may inset a row, or the columns move under it again.
    expect(src).not.toMatch(/\.blk\s*\{[^}]*\bmargin:/);
    expect(src).not.toMatch(/\.blk\s*\{[^}]*\bborder:\s*1px/);

    // The leading rule is painted inside the box; a border would shift the contents.
    expect(src).toMatch(/box-shadow:\s*inset 3px 0 0/);
    expect(src).not.toMatch(/\.blk \.ann\s*\{[^}]*border-left:/);
  });

  /*
   * The axis has to be declared. `overflow-y: auto` on its own computes the other axis to
   * `auto` as well, which is what put a horizontal scrollbar under this Section as soon as
   * anything exceeded its track — and a reserved scrollbar lane is what stopped every tint
   * and rule short of the Section edge.
   */
  /*
   * THE GAME COMMENT. The document's own remark, before any move was made, is where the
   * extension writes its [%engine] — so the Section states who was analysing, how deep and
   * when, once at the top, rather than leaving that context reachable only by opening a
   * move. It is not about a position, so it carries no evaluation and no best move.
   */
  it('states the document\u2019s engine context at the top of the Section', () => {
    const { tree, engine } = readGame(
      '{ [%engine name="Stockfish 16" depth=10 timestamp="2026-09-12T00:47:41Z"] } '
      + '1. e4 { [%eval 0.30] } e5 *'
    );
    const { container } = render(MoveList, { props: { tree, path: [], engine, onselect: () => {} } });

    const game = container.querySelector('.ban.game');
    expect(game, 'no game banner').toBeTruthy();
    expect(game.textContent).toContain('Stockfish 16');
    expect(game.textContent).toContain('d10');
    expect(game.textContent).toMatch(/2026/);

    // It is the document's, not a move's: no evaluation, no best move.
    expect(game.textContent).not.toMatch(/[+\u2212]\d/);
    expect(game.querySelector('.best')).toBeNull();

    // And it is first, before any row.
    const first = container.querySelector('.ml > *');
    expect(first.querySelector('.ban.game')).toBeTruthy();
  });

  it('says nothing about an engine when the document declares none', () => {
    const { tree, engine } = readGame('1. e4 { [%eval 0.30] } e5 *');
    const { container } = render(MoveList, { props: { tree, path: [], engine, onselect: () => {} } });
    expect(container.querySelector('.ban.game')).toBeNull();
  });

  it('declares both overflow axes and scrolls like the Explorer', () => {
    // The rules, not the prose about them — the comment above them names what was removed.
    const css = /<style>([\s\S]*)<\/style>/.exec(
      readSrc('../src/lib/components/game/MoveList.svelte')
    )?.[1];
    expect(css, 'no style block').toBeTruthy();
    expect(css).toMatch(/overflow:\s*hidden auto/);
    expect(css).not.toMatch(/scrollbar-gutter:\s*stable/);
    // The platform scrollbar is shown, as it is in the Explorer — not hidden.
    expect(css).not.toMatch(/scrollbar-width:\s*none/);
    expect(css).not.toMatch(/::-webkit-scrollbar/);
  });
});

/* ======================= §5.3 ply navigation ============================ */

describe('§5.3 ply navigation', () => {
  beforeEach(() => { ensureGameState('t1', 'g1'); });

  it('starts at the initial position', () => {
    expect(get(gameStates).t1.ply).toBe(0);
  });

  it('steps, and clamps at both ends', () => {
    nextPly('t1'); nextPly('t1');
    expect(get(gameStates).t1.ply).toBe(2);
    firstPly('t1'); prevPly('t1');
    expect(get(gameStates).t1.ply).toBe(0);
    lastPly('t1'); nextPly('t1');
    expect(atLastPly('t1')).toBe(true);
  });

  it('clamps an out-of-range jump rather than throwing', () => {
    goToPly('t1', 99999);
    expect(atLastPly('t1')).toBe(true);
    goToPly('t1', -50);
    expect(get(gameStates).t1.ply).toBe(0);
  });

  it('keeps each tab on its own ply (§2.3)', () => {
    ensureGameState('t2', 'g1');
    nextPly('t1'); nextPly('t1'); nextPly('t1');
    nextPly('t2');
    expect(get(gameStates).t1.ply).toBe(3);
    expect(get(gameStates).t2.ply).toBe(1);
  });

  it('keeps orientation and Section state per tab too', () => {
    ensureGameState('t2', 'g1');
    flipBoard('t1');
    toggleCollapsed('t1', 'engine');
    expect(get(gameStates).t1.orientation).toBe('black');
    expect(get(gameStates).t2.orientation).toBe('white');
    expect(get(gameStates).t1.sections.engine.collapsed).toBe(true);
    expect(get(gameStates).t2.sections.engine.collapsed).toBe(false);
  });

  it('maps a library game onto a real game deterministically', () => {
    resetGameState();
    ensureGameState('a', 'g42');
    ensureGameState('b', 'g42');
    expect(get(gameStates).a.gameId).toBe(get(gameStates).b.gameId);
    expect(GAMES.some((g) => g.id === get(gameStates).a.gameId)).toBe(true);
  });
});

/*
  Game Info reads a REAL library row, not the mock GAMES table, once one is
  attached to the tab (gameForLibraryId's hash only ever resolves a numeric
  library id to GAMES[0] — see the BUG FIX comment in stores/game.js). This
  guards the fix: a real row's identity fields must win over the mock game's.
*/
describe('Game Info reads the real library row when one is open', () => {
  afterEach(() => { libraryGames.set([]); });

  it('prefers the library row\'s player names, ratings, result, date and event over the mock game', () => {
    libraryGames.set([{
      id: 42,
      white: 'Carlsen, Magnus',
      black: 'Caruana, Fabiano',
      whiteElo: 2839,
      blackElo: 2822,
      result: '1/2-1/2',
      date: '2024.04.12',
      event: 'Candidates',
      favorite: false,
      tags: [],
      collections: []
    }]);
    resetGameState();
    ensureGameState('real-1', 42);
    activeId.set('real-1');

    const info = get(activeGame).info;
    expect(info.white).toBe('Carlsen, Magnus');
    expect(info.black).toBe('Caruana, Fabiano');
    expect(info.result).toBe('1/2-1/2');
    expect(info.date).toBe('2024.04.12');
    expect(info.event).toBe('Candidates');
    expect(info.hasRow).toBe(true);
  });

  it('falls back to the mock game when no library row matches the tab', () => {
    libraryGames.set([]);
    resetGameState();
    ensureGameState('mock-1', 999);
    activeId.set('mock-1');

    const info = get(activeGame).info;
    expect(info.hasRow).toBe(false);
    expect(info.white).toBe(GAMES[0].white);
  });
});

/*
  A NUMERIC `libraryGameId` always names a real `games.id`, on either
  backend.

  Until 22 Sep 2026 this had one exception: the PWA's seeded Sample Games
  library (`db-2`) had no real database behind it, so `loadGames()` filled
  `games` from `library/mock.js`'s `realRows()` instead — rows carrying
  `sample-games.js`'s own ids, integers exactly like a real `games.id` — and
  a tab opened on one needed `mockLibraryGame()` to special-case it, or it
  took the real-database path, found no connection, and showed an empty
  board. `stores/settings.js`'s `ensureSampleGamesLibrary()` now registers
  Sample Games as a genuine, `config.db`-backed library on first PWA launch
  (see `CLOSED.md`), so that exception is gone and `mockLibraryGame()` with
  it — `isRealGameId()`'s plain `typeof` test is the whole story again.
*/
describe('a numeric libraryGameId always takes the real-database path', () => {
  const libraryDefault = get(activeLibraryId);
  afterEach(() => { libraryGames.set([]); activeLibraryId.set(libraryDefault); });

  it('takes the real-database path for a numeric id, regardless of which library is active', () => {
    activeLibraryId.set(99);                            // any real libraries.id
    libraryGames.set([]);
    resetGameState();

    ensureGameState('pwa-2', GAMES[4].id);
    activeId.set('pwa-2');

    expect(get(activeGame).state.realGame).toBe(true);
  });
});

describe('§5.4.2 Section visibility rules', () => {
  beforeEach(() => { ensureGameState('t1', 'g1'); });

  it('collapses any Section', () => {
    toggleCollapsed('t1', 'moves');
    expect(get(gameStates).t1.sections.moves.collapsed).toBe(true);
  });

  it('hides only Sections that permit hiding', () => {
    toggleHidden('t1', 'engine');
    expect(get(gameStates).t1.sections.engine.hidden).toBe(true);

    // Move List is not hideable — it is the absorbing Section.
    toggleHidden('t1', 'moves');
    expect(get(gameStates).t1.sections.moves.hidden).toBe(false);

    /*
      Game Info is not hideable either, provisionally: it is the game's identity
      and sits first in the panel. Its `Hideable` is the one item the G1 round
      left open, and locked is the reversible half of the choice.
    */
    toggleHidden('t1', 'info');
    expect(get(gameStates).t1.sections.info.hidden).toBe(false);
  });

  it('merges definitions with per-tab state', () => {
    toggleCollapsed('t1', 'engine');
    const c = composition(get(gameStates).t1);
    expect(c.find((s) => s.id === 'engine').collapsed).toBe(true);
    expect(c.find((s) => s.id === 'engine').floor).toBe(60);
  });

  it('reserves the eval bar slot even when the bar is hidden', () => {
    toggleEvalBar('t1');
    expect(get(gameStates).t1.evalVisible).toBe(false);
    // the geometry is unchanged — the board must not move
    expect(gameViewLayout(440, 560).board).toBe(373);
  });
});

/* ============================== rendering ============================== */

describe('the Game Workspace in the shell', () => {
  it('renders both regions when a game tab is active', async () => {
    const { container, getByRole } = render(AppShell);
    openGame('Kasparov, Garry — Topalov, Veselin');
    await tick();

    expect(container.querySelector('.cg-wrap')).toBeTruthy();       // Chessground mounted
    expect(getByRole('toolbar', { name: 'Game controls' })).toBeTruthy();
    /*
      FOUR, not five. The Evaluation Timeline is anchored and is displayed only
      where the composition leaves room for it; jsdom reports no height, so the
      shell falls back to its 560px minimum and the Timeline is displaced —
      which is the state a real 800x600 window is in.
    */
    const stack = SECTIONS.filter((x) => !x.anchored);
    expect(container.querySelectorAll('section.sec').length).toBe(stack.length);
  });

  it('never scrolls the workspace itself (§5.5)', () => {
    const src = readSrc('../src/lib/components/game/GameWorkspace.svelte');
    expect(src).toMatch(/\.game\s*\{[^}]*overflow:\s*hidden/s);
    const view = readSrc('../src/lib/components/game/GameView.svelte');
    expect(view).toMatch(/\.view\s*\{[^}]*overflow:\s*hidden/s);
  });

  it('anchors the toolbar and the Timeline outside the scrolling stack', () => {
    const src = readSrc('../src/lib/components/game/GameDetails.svelte');

    /*
      Two anchored things below the stack now, in this order: the Evaluation
      Timeline, then the toolbar. Both are SIBLINGS of `.stack` rather than
      children, which is what stops either being scrolled away — the Timeline
      moved here precisely so it sits against the transport it drives.
    */
    expect(src).toMatch(/<div class="anchored">/);
    expect(src.indexOf('class="anchored"')).toBeLessThan(src.indexOf('<GameControls'));
    expect(src.indexOf('class="stack"')).toBeLessThan(src.indexOf('class="anchored"'));
    expect(src).toMatch(/\.anchored\s*\{\s*flex:\s*none/);
    expect(src).toMatch(/\.stack\.scrolls\s*\{\s*overflow-y:\s*auto/);
  });

  it('holds Game Details at a fixed width', () => {
    const src = readSrc('../src/lib/components/game/GameDetails.svelte');
    expect(src).toMatch(/width:\{DETAILS_W\}px/);
    expect(src).toMatch(/flex:\s*none/);
  });

  it('sets the eval label in the proportional sans, not the mono', () => {
    const src = readSrc('../src/lib/components/game/EvalBar.svelte');
    expect(src).toMatch(/font:\s*10px\/1 var\(--sans\)/);
    expect(src).toMatch(/proportional-nums/);
    expect(src).not.toMatch(/\.lab[^}]*var\(--mono\)/s);
  });

  it('advances the ply from the toolbar', async () => {
    const { getByLabelText, container } = render(AppShell);
    openGame('Test Game');
    await tick();

    const id = get(activeId);
    expect(get(gameStates)[id].ply).toBe(0);
    await fireEvent.click(getByLabelText('Next move'));
    expect(get(gameStates)[id].ply).toBe(1);
    await fireEvent.click(getByLabelText('Last move'));
    expect(atLastPly(id)).toBe(true);
  });

  it('flips the board without resizing anything', async () => {
    const { getByLabelText } = render(AppShell);
    openGame('Test Game');
    await tick();
    const id = get(activeId);
    await fireEvent.click(getByLabelText('Flip board'));
    expect(get(gameStates)[id].orientation).toBe('black');
  });

  it('collapses a Section from its header', async () => {
    const { getAllByLabelText } = render(AppShell);
    openGame('Test Game');
    await tick();
    const id = get(activeId);
    const buttons = getAllByLabelText('Collapse section');
    // The anchored Timeline is displaced at this height, so the stack's four.
    const stack = SECTIONS.filter((x) => !x.anchored);
    expect(buttons.length).toBe(stack.length);
    await fireEvent.click(buttons[0]);
    expect(get(gameStates)[id].sections[stack[0].id].collapsed).toBe(true);
  });

  it('drops per-tab game state when the tab closes', async () => {
    render(AppShell);
    const id = openGame('Test Game');
    await tick();
    expect(get(gameStates)[id]).toBeTruthy();
    closeTab(id);
    await tick();
    expect(get(workspaceState)[id]).toBeUndefined();
  });
});
