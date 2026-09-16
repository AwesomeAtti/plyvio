/**
 * Game Workspace geometry — §5.2, §5.4.1, §5.4.2.
 *
 * Pure functions, no DOM. vitest applies no stylesheets, so the only way to
 * verify rendered geometry is to compute it here and assert on the numbers.
 * The components below read these values; they do not re-derive them.
 */

/* ------------------------------- Game View ------------------------------ */

export const PAD = 16;          // §5.4.1 [A] — assumed, reconciles the floor exactly
export const BAR_W = 27;        // fixed; derived from the label's fit, never grows
export const BAR_GAP = 8;
export const BOARD_MIN = 360;   // ~45px squares
export const DETAILS_W = 360;   // §5.2 — fixed

/** 16 + 27 + 8 + 360 + 16. */
export const GAME_VIEW_MIN = PAD + BAR_W + BAR_GAP + BOARD_MIN + PAD;   // 427

/** Horizontal furniture around the board: padding, bar and gap. */
export const H_CHROME = PAD * 2 + BAR_W + BAR_GAP;                      // 67
export const V_CHROME = PAD * 2;                                        // 32

/**
 * §5.4.1 — the board is square and has no maximum. It consumes one axis
 * completely; the other keeps the slack, which becomes symmetric margin.
 *
 * Never returns below BOARD_MIN: content is not rendered below its floor
 * (§3.1.1). Where the region is smaller than its floor the board overflows a
 * hidden box rather than shrinking, which is what the window gate exists to
 * prevent being seen.
 */
export function boardSize(viewW, viewH) {
  return Math.max(BOARD_MIN, Math.min(viewW - H_CHROME, viewH - V_CHROME));
}

export function gameViewLayout(viewW, viewH) {
  const board = boardSize(viewW, viewH);
  const assemblyW = BAR_W + BAR_GAP + board;
  const wAvail = viewW - H_CHROME;
  const hAvail = viewH - V_CHROME;
  return {
    board,
    assemblyW,
    barW: BAR_W,
    // Centred on both axes. Slack can go negative below the floor; the caller
    // clamps to zero so the assembly stays pinned to the padding edge.
    marginX: Math.max(0, Math.floor((viewW - PAD * 2 - assemblyW) / 2)),
    marginY: Math.max(0, Math.floor((viewH - PAD * 2 - board) / 2)),
    constrainedBy: wAvail <= hAvail ? 'width' : 'height'
  };
}

/**
 * The window width at which the board's constraint crosses from width to
 * height, for a given window height. Narrower is width-constrained.
 *
 *   W − DETAILS_W − H_CHROME  =  H − barH − V_CHROME     →   W = H + 355
 */
export function crossoverWidth(windowH, barH = 40) {
  return windowH - barH - V_CHROME + H_CHROME + DETAILS_W;
}

/* ---------------------------- Evaluation Bar ---------------------------- */

export const EVAL_CLAMP = 9.9;      // §5.4.1 — one integer digit, for the LABEL
export const EVAL_LABEL_PX = 10;

/*
  The scale, agreed 13 Sep, shared by the Evaluation Bar (§5.4.1) and the
  Evaluation Timeline. Everything lands on a thirty-second of the bar, three of
  them to the pawn:

      share = (16 + 3v) / 32     for |v| <= 4.00     the ramp, 24/32 of the bar
      30/32  v >  +4.00     2/32  v <  -4.00         a step
      32/32  mate for White 0/32  mate for Black     a step

  The last two stops are LEVELS, not more axis: 4.00 renders at 28/32 and 4.01
  at 30/32, with nothing in between. Four gaps of 2/32 — two a side — hold no
  value at all, which is what makes the three readings tellable apart by
  position: measured advantage, decided, mate.

  The bar is exactly as tall as the board, so a rank is 4/32 and the structure
  falls on lines the board already draws — dead even on the rank 4/5 line,
  ±4.00 on the rank 1/2 and 7/8 lines, the two levels at the middle of ranks 1
  and 8, mate at the outer edges.

  EVAL_CLAMP is NOT this. It bounds the printed label at 9.9; the fill is not
  clamped, it steps. A position at +7.2 prints 7.2 and fills exactly what 4.01
  fills, and that is the intended reading rather than a rounding artefact.
*/
export const EVAL_RAMP_MAX = 4.0;        // pawns — the top of the linear ramp
export const EVAL_RAMP_PER_PAWN = 3 / 32;
export const EVAL_STEP_LEVEL = 30 / 32;  // beyond the ramp, either side

/**
 * Centipawns to a 0…1 fraction of the bar filled by White, from White's end.
 *
 * One function, because two surfaces draw it. The Timeline's plot is this same
 * mapping swept through the game, so at the playhead its boundary and the bar's
 * divider have to describe one number. Tuning either by eye would put two
 * answers to one question on screen at once, about a thousand pixels apart, and
 * no rendering test would catch it.
 */
export function evalFraction({ e = null, x = null } = {}) {
  if (x !== null && x !== undefined) {
    if (x === 0) return 0.5;                 // mated: the side is not in the value
    return x > 0 ? 1 : 0;                    // mate pegs the bar fully
  }
  if (e === null || e === undefined) return 0.5;
  const v = e / 100;
  if (v > EVAL_RAMP_MAX) return EVAL_STEP_LEVEL;
  if (v < -EVAL_RAMP_MAX) return 1 - EVAL_STEP_LEVEL;
  return 0.5 + v * EVAL_RAMP_PER_PAWN;
}

/**
 * True where the value sits on one of the two levels above the ramp rather
 * than on the ramp itself.
 *
 * The Timeline draws a move onto a level as a vertical riser rather than a
 * slope, because nothing renders in the band the slope would cross.
 */
export function evalIsStep({ e = null, x = null } = {}) {
  if (x !== null && x !== undefined) return x !== 0;
  if (e === null || e === undefined) return false;
  return Math.abs(e / 100) > EVAL_RAMP_MAX;
}

/**
 * The evaluation as the comment banner and the Timeline's header print it:
 * two decimals, signed with the typographic minus.
 *
 * Deliberately NOT evalLabel(). That one is one decimal and unsigned because it
 * has 27px to live in (§5.4.1); nothing else in the application does, and
 * making them share a format would impose the bar's constraint on surfaces that
 * do not have it. They agree on the value and differ in the last digit, which
 * is rounding rather than disagreement.
 */
export function evalScore({ e = null, x = null } = {}) {
  if (x !== null && x !== undefined) return x === 0 ? '#' : `M${Math.abs(x)}`;
  if (e === null || e === undefined) return null;
  const v = e / 100;
  const text = Math.abs(v).toFixed(2);
  if (text === '0.00') return '0.00';        // −0.004 is not "−0.00"
  return (v < 0 ? '\u2212' : '+') + text;
}

/**
 * §5.4.1 — one decimal, negatives signed with the HYPHEN-MINUS, positives bare.
 *
 * The hyphen-minus (U+002D, 0.399em) is not interchangeable with the
 * typographic minus (U+2212, 0.600em) here: at 10px the difference is 2px in a
 * 27px column, which is the margin between `-M12` fitting and not. A
 * typography pass that "corrects" this sign will break the layout.
 *
 * Mate is rendered unsigned as M<n>; the end the label sits at carries the
 * side. A mated position renders `#`.
 */
export function evalLabel({ e = null, x = null } = {}) {
  if (x !== null && x !== undefined) return x === 0 ? '#' : 'M' + Math.abs(x);
  if (e === null || e === undefined) return null;

  const v = e / 100;
  const mag = Math.min(Math.abs(v), EVAL_CLAMP);
  const text = mag.toFixed(1);

  // -0.04 rounds to "0.0"; a minus on a displayed zero would be a lie.
  if (v < 0 && text !== '0.0') return '-' + text;
  return text;
}

/**
 * Which end of the bar the label rides — the advantaged side.
 *
 * Decided from the *displayed* value, not the raw one. A −4cp position rounds
 * to "0.0"; hanging that at Black's end would read as a claim the label itself
 * does not make.
 */
export function evalSide({ e = null, x = null } = {}) {
  if (x !== null && x !== undefined) return x < 0 ? 'black' : 'white';
  return evalLabel({ e })?.startsWith('-') ? 'black' : 'white';
}

/* -------------------------- Game Details shell -------------------------- */

export const SECTION_HEADER_H = 30;
export const TOOLBAR_H = 40;

/*
  THE PANEL'S ROW GRID.

  The Explorer (§5.6.3) and the Engine (§5.6.4) already compose their
  heights the same way — a 30px header, 6px of body padding, and rows of 24 —
  and §5.6.4 states the agreement is deliberate rather than a number copied
  across. Three Sections now share it: Game Info is three rows or four, and the
  Move List's floor is three moves.

  Writing it once is the point. Every height in this panel that is not the
  Timeline's chart is sectionHeight(n), so a Section cannot land between two
  rows the way the Engine's old fixed 104 did.
*/
export const SECTION_BODY_PAD = 6;   // 3px top and bottom
export const SECTION_ROW_H = 24;

/** 30 + 6 + n × 24 — the only way a Section height should be written. */
export function sectionHeight(rows) {
  return SECTION_HEADER_H + SECTION_BODY_PAD + rows * SECTION_ROW_H;
}

/** How many whole rows a given rendered height holds. */
export function sectionRows(height) {
  return Math.floor((height - SECTION_HEADER_H - SECTION_BODY_PAD) / SECTION_ROW_H);
}

/*
  THE MOVE LIST NEVER RENDERS FEWER THAN THREE MOVES.

  This is the panel's one invariant and everything below is a consequence of it.
  Three rows is 108px, which is the 110 the Move List used to declare, tidied
  onto the grid — §5.6.1 specifies that row's widths in detail but never stated
  a row height, so 110 was a figure and 108 is a derivation.
*/
export const MOVE_LIST_MIN_ROWS = 3;
export const MOVE_LIST_FLOOR = sectionHeight(MOVE_LIST_MIN_ROWS);   // 108

/*
  THE EVALUATION TIMELINE IS ANCHORED, NOT STACKED.

  It sits between the Section stack and the Game Controls Toolbar, outside the
  stack and outside its scrolling, because §5.6.2 calls it "a transport control
  that is also a chart" and this puts the scrubber against the transport it
  drives. Its height is the grid's three rows so it agrees with everything else
  in the panel, spent as 30px of header and 78px of chart.
*/
export const TIMELINE_H = sectionHeight(3);   // 108

/*
  HYSTERESIS.

  A single threshold pops a 108px block in and out on the pixel while a window
  is being dragged, and each transition relays the whole panel. The Timeline is
  displaced below the threshold and does not come back until the window is
  RESTORE_BAND taller, so the two transitions never sit on the same pixel.
*/
export const TIMELINE_RESTORE_BAND = 16;

/**
 * Is there room for the Timeline, given the Sections and the height above the
 * toolbar?
 *
 * MEASURED AGAINST EACH SECTION'S MAXIMUM, NEVER ITS CURRENT CONTENT. Keying
 * this off what the Sections happen to want right now would make the Timeline
 * vanish when a tag is added to a game or the engine finds a third variation —
 * composition would depend on data, which is the one thing it must not do.
 *
 * `showing` is the current state, so the band applies on the way back up only.
 */
export function timelineFits(sections, available, showing = false) {
  const need = sections
    .filter((s) => !s.hidden && s.id !== 'timeline')
    .reduce((a, s) => a + (s.collapsed ? SECTION_HEADER_H : (s.ceiling ?? s.height ?? s.floor)), 0);

  const threshold = need + TIMELINE_H + (showing ? 0 : TIMELINE_RESTORE_BAND);
  return available >= threshold;
}

/**
 * The window height at or above which the Timeline is displayed, for a given
 * composition. Computed rather than written down, for the same reason the
 * scroll threshold is: it moves when a Section's height does.
 */
export function timelineWindowHeight(sections, tabBarH = 40) {
  const need = sections
    .filter((s) => !s.hidden && s.id !== 'timeline')
    .reduce((a, s) => a + (s.collapsed ? SECTION_HEADER_H : (s.ceiling ?? s.height ?? s.floor)), 0);
  return need + TIMELINE_H + TOOLBAR_H + tabBarH;
}

/**
 * §5.4.2 — allocate heights down the Section stack.
 *
 * Each Section declares a floor and a height behaviour. Exactly one absorbs
 * surplus. Content is never rendered below its floor; when the floors cannot
 * all be honoured the shell scrolls instead of compressing them.
 *
 * @param sections {Array<{id, floor, height?, absorb?, collapsed?, hidden?}>}
 * @param available {number} height above the toolbar
 */
export function allocateSections(sections, available) {
  /* Anchored Sections are not in the stack and take no part in its allocation.
     Filtered here rather than at the call site so a caller cannot forget. */
  const shown = sections.filter((s) => !s.hidden && !s.anchored);

  const min = (s) => (s.collapsed ? SECTION_HEADER_H : Math.max(s.floor, SECTION_HEADER_H));

  /*
    A Section states a fixed `height`, or is SIZED TO CONTENT by reporting a
    `contentHeight` — and may cap that with a `ceiling`.

    The ceiling is new with the Explorer, which is so far the only Section
    that needs one: its rows come from a query, so without a cap a deep opening
    could grow it until it pushed the Move List off the screen. A capped
    content-sized Section keeps the panel predictable in a way an absorbing one
    cannot.
  */
  const want = (s) => {
    if (s.collapsed) return SECTION_HEADER_H;
    const asked = s.height ?? s.contentHeight ?? s.floor;
    const capped = s.ceiling ? Math.min(asked, s.ceiling) : asked;
    return Math.max(min(s), capped);
  };

  const floorTotal = shown.reduce((a, s) => a + min(s), 0);

  // Floors do not fit: everything renders at its floor and the shell scrolls.
  if (floorTotal > available) {
    return {
      scrolls: true,
      contentHeight: floorTotal,
      heights: Object.fromEntries(shown.map((s) => [s.id, min(s)]))
    };
  }

  const absorber = shown.find((s) => s.absorb && !s.collapsed);
  const fixedTotal = shown
    .filter((s) => s !== absorber)
    .reduce((a, s) => a + want(s), 0);

  const heights = {};
  for (const s of shown) {
    heights[s.id] =
      s === absorber ? Math.max(min(s), available - fixedTotal) : want(s);
  }

  const total = Object.values(heights).reduce((a, h) => a + h, 0);
  return { scrolls: total > available, contentHeight: total, heights };
}

/**
 * The Game Details height below which the shell begins to scroll, for a given
 * composition. Its value is set by the Sections' floors, so it moves when a
 * Section is specified — which is why it is computed rather than written down.
 */
export function scrollThreshold(sections) {
  const shown = sections.filter((s) => !s.hidden && !s.anchored);
  return shown.reduce(
    (a, s) => a + (s.collapsed ? SECTION_HEADER_H : Math.max(s.floor, SECTION_HEADER_H)),
    0
  );
}
