/**
 * Evaluation Timeline geometry — the arithmetic behind the Section drawn in
 * `wireframes/game-eval-timeline.html`.
 *
 * It lives here rather than inside the component for the reason the Moves
 * Section learned twice: jsdom has no layout, so anything computed from a
 * measured box inside a component cannot be asserted by a rendering test. The
 * component measures and draws; every number it draws with is decided here and
 * tested directly.
 */

import { evalFraction, evalIsStep } from './layout.js';

/** A ply carries an evaluation only once the game has been analysed. */
export const evaluated = (p) =>
  !!p && ((p.e !== null && p.e !== undefined) || (p.x !== null && p.x !== undefined));

/**
 * Position i of n, across a track of width w.
 *
 * The axis is 0 to N plies, so it carries N + 1 stops — the starting position is
 * one of them — and the first and last sit flush against the edges rather than
 * inset half a step. The playhead reaches the frame at both ends, and the track
 * is honest about being full.
 */
export const trackX = (i, n, w) => (n > 0 ? (i * w) / n : 0);

/**
 * The ply a pointer at x means.
 *
 * Rounding, not flooring: the stops are points on the axis, not cells, so the
 * nearest one is the one meant. A pointer is placed within about 2px, which
 * across a real corpus is between a third of a step and a step and a half — the
 * control cannot be aimed at a ply and does not pretend to be.
 */
export const plyAtX = (x, w, n) => {
  if (n < 1 || !w) return 0;
  const rel = Math.min(Math.max(x, 0), w);
  return Math.round((rel / w) * n);
};

/**
 * Height of the boundary between the two sides.
 *
 * This is the bar's own arithmetic (§5.4.1) turned on its side: the fraction
 * ABOVE the boundary, which is Black's share unflipped and White's when the
 * board is flipped. It flips for the same reason the bar does — at the playhead
 * the two describe one number, and a timeline that did not flip would disagree
 * with the bar about which end is White's the moment the board turned.
 */
export const boundaryY = (p, h, flipped = false) => {
  const f = evalFraction(p ?? {});
  return (flipped ? f : 1 - f) * h;
};

/**
 * Runs of consecutive evaluated plies.
 *
 * A game analysed in part draws what exists and stops. Nothing is interpolated
 * across a gap: an unanalysed stretch is a normal state, not a missing value,
 * and a line drawn through it would be an evaluation nobody made.
 */
export function evaluatedRuns(plies) {
  const out = [];
  let cur = null;
  for (let i = 0; i < plies.length; i++) {
    if (evaluated(plies[i])) (cur ??= []).push(i);
    else if (cur) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * One run as a closed area, filled to the foot of the plot.
 *
 * A move onto or off one of the two levels above the ramp is drawn as a vertical
 * RISER — along to the ply, then straight up — never as a slope. Nothing renders
 * in the band a slope would cross, so the slope would be ink over a hole in the
 * scale; at the short end of a corpus it is wide enough to read as a value
 * passing through.
 *
 * THE LEADING INTERVAL. A run that starts at ply 1 is drawn from x = 0, flat at
 * ply 1's height, rather than starting a step in.
 *
 * This is not a hole in the no-interpolation rule. `[%eval]` for the starting
 * position can only be written in the comment before the first move, and
 * annotators put `[%engine]` there and almost nothing else, so ply 0 is
 * unevaluated in practically every analysed game. Left as a gap it is one step
 * of bare ground at the left edge of every chart — a mark that appears
 * unconditionally, and so carries no information while looking like a
 * misaligned chart.
 *
 * What is drawn instead states only what the evaluation already says: an
 * evaluation describes the position its move LED TO, so the strip between stop 0
 * and stop 1 is the first move, and filling it at ply 1's height asserts nothing
 * about ply 0. The exception is exactly that interval — a run starting at ply 20
 * begins at ply 20, because the nineteen plies before it really are unanalysed.
 */
export function areaPath(run, plies, { w, h, n, flipped = false }) {
  if (!run?.length || !w || !h) return '';
  const px = (i) => trackX(i, n, w);
  const py = (i) => boundaryY(plies[i], h, flipped);
  const f = (v) => Number(v.toFixed(2));

  // The first move's interval belongs to the value it produced (above).
  const lead = run[0] === 1 ? 0 : px(run[0]);
  let d = `M ${f(lead)} ${f(py(run[0]))}`;
  if (lead !== px(run[0])) d += ` L ${f(px(run[0]))} ${f(py(run[0]))}`;
  if (run.length === 1) {
    // A single evaluated ply is still a value. One pixel of it is drawn so that
    // it is visible as something rather than silently dropped.
    d += ` L ${f(px(run[0]) + 1)} ${f(py(run[0]))}`;
  }
  for (let k = 1; k < run.length; k++) {
    const steps = evalIsStep(plies[run[k]] ?? {}) || evalIsStep(plies[run[k - 1]] ?? {});
    if (steps) d += ` L ${f(px(run[k]))} ${f(py(run[k - 1]))}`;
    d += ` L ${f(px(run[k]))} ${f(py(run[k]))}`;
  }
  const x0 = f(lead);
  const x1 = f(run.length === 1 ? px(run[0]) + 1 : px(run[run.length - 1]));
  return `${d} L ${x1} ${f(h)} L ${x0} ${f(h)} Z`;
}

/**
 * The three regions, from two ply numbers.
 *
 * The Section READS these; it does not compute them. Where they come from is
 * still being researched, and nothing here changes when that is settled.
 *
 * A tag that does not satisfy 0 < middle < end <= n draws NOTHING — not the
 * sound half of itself. A region in the wrong place reads as information, which
 * is worse than no region. There is likewise no fallback to equal thirds:
 * thirds would be the application claiming a phase boundary it has not earned.
 */
export function regionsOf(bounds, n, w) {
  if (!bounds || n < 1 || !w) return [];
  const { middle, end } = bounds;
  const ok = (v) => Number.isInteger(v) && v > 0 && v <= n;
  if (!ok(middle) || !ok(end) || middle >= end) return [];
  const a = trackX(middle, n, w);
  const b = trackX(end, n, w);
  return [
    { key: 'opening', x: 0, w: a, overlay: true },
    { key: 'middle', x: a, w: b - a, overlay: false },
    { key: 'end', x: b, w: w - b, overlay: true }
  ];
}

/** The move number a ply belongs to. Ply 0 is the starting position. */
export const moveNumberOf = (ply) => Math.ceil(ply / 2);
