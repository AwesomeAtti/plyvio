import { describe, it, expect } from 'vitest';
import {
  SECTION_HEADER_H, SECTION_BODY_PAD, SECTION_ROW_H, TOOLBAR_H, TIMELINE_H,
  MOVE_LIST_MIN_ROWS, MOVE_LIST_FLOOR, TIMELINE_RESTORE_BAND,
  sectionHeight, sectionRows, allocateSections, timelineFits, timelineWindowHeight
} from '../src/lib/game/layout.js';
import { SECTIONS } from '../src/lib/game/sections.js';
import {
  resultText, parseGameDate, formatGameDate, known, ratingText,
  infoRows, infoContentHeight
} from '../src/lib/game/info.js';

const TAB_BAR = 40;

/** The worst case the composition has to survive: everything at its maximum. */
const worst = () =>
  SECTIONS.map((s) => ({ ...s, contentHeight: s.ceiling ?? s.height ?? s.floor }));

/** Height the panel has for Sections and the Timeline together. */
const availableAt = (windowH) => windowH - TAB_BAR - TOOLBAR_H;

describe('§5.4.2 the panel row grid', () => {
  it('is 30 + 6 + n × 24, written once', () => {
    expect(SECTION_HEADER_H).toBe(30);
    expect(SECTION_BODY_PAD).toBe(6);
    expect(SECTION_ROW_H).toBe(24);
    expect(sectionHeight(1)).toBe(60);
    expect(sectionHeight(3)).toBe(108);
    expect(sectionHeight(4)).toBe(132);
  });

  it('round-trips a height back to a whole row count', () => {
    for (let n = 1; n <= 12; n++) expect(sectionRows(sectionHeight(n))).toBe(n);
    // A part row counts as the rows below it, never as the one it is half of.
    expect(sectionRows(sectionHeight(3) + 23)).toBe(3);
    expect(sectionRows(sectionHeight(3) + 24)).toBe(4);
  });

  it('every Section in the composition sits on it', () => {
    /*
      The point of writing the grid down. Before it, the Engine declared a fixed
      104 — a height sitting between two lines and three, which is not a height
      that Section can ever want. Nothing can land there now without this
      failing.
    */
    for (const s of SECTIONS) {
      expect(sectionRows(s.floor), `${s.id} floor`).toBe((s.floor - 36) / 24);
      expect(s.floor).toBe(sectionHeight(sectionRows(s.floor)));
      if (s.ceiling) expect(s.ceiling).toBe(sectionHeight(sectionRows(s.ceiling)));
    }
  });
});

describe('§5.6.1 the Move List keeps three moves', () => {
  it('states its floor in rows, not in pixels', () => {
    expect(MOVE_LIST_MIN_ROWS).toBe(3);
    expect(MOVE_LIST_FLOOR).toBe(108);
    expect(SECTIONS.find((s) => s.id === 'moves').floor).toBe(MOVE_LIST_FLOOR);
  });

  it('never renders fewer than three moves, at any permitted window height', () => {
    /*
      THE INVARIANT. This is the whole design in one assertion: sweep every
      window height the application permits, in both hysteresis states, and the
      absorbing Section never drops below three rows — and the panel never has
      to scroll to manage it.
    */
    const comp = worst();
    for (let win = 600; win <= 2160; win++) {
      for (const showing of [true, false]) {
        const available = availableAt(win);
        const fits = timelineFits(comp, available, showing);
        const alloc = allocateSections(comp, available - (fits ? TIMELINE_H : 0));
        expect(sectionRows(alloc.heights.moves), `${win}px showing=${showing}`)
          .toBeGreaterThanOrEqual(MOVE_LIST_MIN_ROWS);
        expect(alloc.scrolls, `${win}px showing=${showing}`).toBe(false);
      }
    }
  });
});

describe('§5.6.2 the Timeline is anchored, and yields', () => {
  it('is declared anchored and is the only one', () => {
    const anchored = SECTIONS.filter((s) => s.anchored);
    expect(anchored.map((s) => s.id)).toEqual(['timeline']);
    expect(anchored[0].height).toBe(TIMELINE_H);
    expect(TIMELINE_H).toBe(sectionHeight(3));
  });

  it('sits last in the composition, below the stack', () => {
    expect(SECTIONS.at(-1).id).toBe('timeline');
  });

  it('takes no part in the stack’s allocation', () => {
    const alloc = allocateSections(worst(), 520);
    expect(alloc.heights.timeline).toBeUndefined();
  });

  it('shows at 644px and not at 643', () => {
    const comp = worst();
    expect(timelineFits(comp, availableAt(644), true)).toBe(true);
    expect(timelineFits(comp, availableAt(643), true)).toBe(false);
    expect(timelineWindowHeight(comp, TAB_BAR)).toBe(644);
  });

  it('leaves the Move List at exactly its floor on the threshold', () => {
    /*
      644 is not a chosen number — it is the height at which the Move List is
      exactly three rows. One pixel shorter and it would be two, which is why
      the Timeline goes rather than the invariant.
    */
    const comp = worst();
    const available = availableAt(644);
    expect(timelineFits(comp, available, true)).toBe(true);
    const alloc = allocateSections(comp, available - TIMELINE_H);
    expect(alloc.heights.moves).toBe(MOVE_LIST_FLOOR);
    expect(sectionRows(alloc.heights.moves)).toBe(3);
  });

  it('is displaced at the window minimum, and the Move List gains by it', () => {
    const comp = worst();
    const available = availableAt(600);
    expect(timelineFits(comp, available, true)).toBe(false);
    const alloc = allocateSections(comp, available);
    // The 108 it did not take goes to the absorber, not to spare space.
    expect(alloc.heights.moves).toBe(172);
    expect(sectionRows(alloc.heights.moves)).toBe(5);
  });

  it('has a dead band, so a drag across the threshold does not flicker', () => {
    const comp = worst();
    // Falls out below 644 and does NOT come back until 660.
    expect(timelineFits(comp, availableAt(650), false)).toBe(false);
    expect(timelineFits(comp, availableAt(659), false)).toBe(false);
    expect(timelineFits(comp, availableAt(660), false)).toBe(true);
    // Having returned, it survives back down to the threshold itself.
    expect(timelineFits(comp, availableAt(650), true)).toBe(true);
    expect(timelineFits(comp, availableAt(644), true)).toBe(true);
    expect(TIMELINE_RESTORE_BAND).toBe(16);
  });

  it('measures against the maximum, never the current content', () => {
    /*
      The bug this prevents: keying the rule off what Sections happen to want
      right now makes the Timeline vanish when a tag is added to a game or the
      engine finds a third line. Composition must not depend on data.
    */
    const quiet = SECTIONS.map((s) => ({ ...s, contentHeight: s.floor }));
    const busy = worst();
    for (let win = 600; win <= 900; win++) {
      expect(timelineFits(quiet, availableAt(win), true))
        .toBe(timelineFits(busy, availableAt(win), true));
    }
  });

  it('yields to a hidden Section rather than staying out', () => {
    // Hiding the Engine frees 108, so the Timeline fits at the minimum window.
    const comp = worst().map((s) => (s.id === 'engine' ? { ...s, hidden: true } : s));
    expect(timelineFits(comp, availableAt(600), true)).toBe(true);
  });
});

describe('§5.6.5 Game Info has exactly two heights', () => {
  it('is three rows, or four with the chip rail', () => {
    expect(infoRows(false)).toBe(3);
    expect(infoRows(true)).toBe(4);
    expect(infoContentHeight(false)).toBe(108);
    expect(infoContentHeight(true)).toBe(132);
  });

  it('declares a floor and a ceiling one row apart, not a range', () => {
    /*
      The rail scrolls SIDEWAYS, so a fourth tag costs nothing and no height
      between the two is reachable. "Sized to content with a ceiling" described
      a Section that can land anywhere in between; this one cannot.
    */
    const info = SECTIONS.find((s) => s.id === 'info');
    expect(info.floor).toBe(infoContentHeight(false));
    expect(info.ceiling).toBe(infoContentHeight(true));
    expect(info.ceiling - info.floor).toBe(SECTION_ROW_H);
  });

  it('sits first in the panel and is not hideable', () => {
    expect(SECTIONS[0].id).toBe('info');
    expect(SECTIONS[0].hideable).toBeFalsy();
  });
});

describe('§5.6.5 the card’s values', () => {
  it('prints the result in its plain PGN form', () => {
    expect(resultText('1-0')).toBe('1-0');
    expect(resultText('0-1')).toBe('0-1');
    // NOT §5.4.1's ½-½ substitution: this card reads the record.
    expect(resultText('1/2-1/2')).toBe('1/2-1/2');
  });

  it('treats an undecided game as absent rather than as a value', () => {
    expect(resultText('*')).toBeNull();
    expect(resultText('')).toBeNull();
    expect(resultText('?')).toBeNull();
  });

  it('formats the date in one fixed form, not a locale-dependent one', () => {
    const m = (k) => ({ 'month.aug': 'Aug', 'month.jan': 'Jan' })[k] ?? k;
    expect(formatGameDate('2026.08.30', m)).toBe('30 Aug 2026');
    expect(formatGameDate('2026.01.01', m)).toBe('1 Jan 2026');
  });

  it('degrades a partly unknown date to what is known', () => {
    const m = (k) => ({ 'month.aug': 'Aug' })[k] ?? k;
    expect(formatGameDate('2026.08.??', m)).toBe('Aug 2026');
    expect(formatGameDate('2026.??.??', m)).toBe('2026');
    expect(formatGameDate('????.??.??', m)).toBeNull();
    expect(formatGameDate('', m)).toBeNull();
  });

  it('parses the parts it can and nulls the ones it cannot', () => {
    expect(parseGameDate('2026.08.30')).toEqual({ year: 2026, monthIndex: 7, day: 30 });
    expect(parseGameDate('2026.13.30')).toEqual({ year: 2026, monthIndex: null, day: null });
    expect(parseGameDate('nonsense')).toBeNull();
  });

  it('never shows a PGN placeholder verbatim', () => {
    expect(known('?')).toBeNull();
    expect(known('  ')).toBeNull();
    expect(known('Chess.com')).toBe('Chess.com');
  });

  it('draws a rating only where there is one', () => {
    expect(ratingText(3065)).toBe('3065');
    expect(ratingText(null)).toBeNull();
    expect(ratingText(0)).toBeNull();      // 0 is not a rating
    expect(ratingText('2828')).toBe('2828');
  });
});
