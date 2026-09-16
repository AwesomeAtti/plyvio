/**
 * Game Details Sections — §5.4.2.
 *
 * Each Section declares what the shell needs from it: an id, a floor, a height
 * behaviour, and which header slots it fills. The shell owns the frame, the
 * common header, collapse and visibility, and height allocation.
 *
 * EVERY HEIGHT HERE IS sectionHeight(n) — 30px of header, 6px of body padding,
 * and n rows of 24. The Explorer and the Engine already composed their
 * heights that way and §5.6.4 called the agreement deliberate; Game Info and
 * the Move List now join them, so the panel has one grid rather than four
 * Sections that happen to agree. A Section can no longer land between two rows
 * the way the Engine's old fixed 104 did.
 *
 * ORDER IN THIS ARRAY IS ORDER IN THE PANEL. The Evaluation Timeline is last
 * and `anchored`, which puts it below the stack rather than in it.
 */
import { sectionHeight, MOVE_LIST_FLOOR, TIMELINE_H } from './layout.js';

/**
 * @typedef {object} Section
 * @property {string}  id
 * @property {string}  titleKey   i18n key for the header title
 * @property {number}  floor      minimum rendered height, header included
 * @property {number}  [height]   fixed height; ignored when absorb is set
 * @property {number}  [ceiling]  maximum for a Section sized to content
 * @property {boolean} [absorb]   takes surplus height — exactly one Section
 * @property {boolean} [anchored] sits below the stack, outside its scrolling
 * @property {boolean} [scrolls]  scrolls internally; default is no (§5.4.2)
 * @property {boolean} [source]   uses the header's source slot
 * @property {boolean} [status]   uses the header's status slot
 * @property {boolean} [control]  uses the header's single control slot
 * @property {boolean} [options]  has an options menu
 * @property {boolean} [hideable] the user may remove it from the panel
 */

/** @type {Section[]} */
export const SECTIONS = [
  {
    /*
      Drawn in wireframes/game-info-g1.html; G1 granted, option A.

      SIZED TO CONTENT, AND IT HAS EXACTLY TWO HEIGHTS — three rows, or four
      when the game carries tags or collections. Not a range: the chip rail
      scrolls sideways rather than wrapping, so no height between the two is
      reachable. The previous declaration called this "sized to content with a
      ceiling", which described a Section that can land anywhere in between and
      is not this one.

        3 rows  names · rating/result/rating · date and location      108
        4 rows  + the chip rail                                       132

      NOT HIDEABLE, provisionally. Game Info is the game's identity and sits
      first in the panel, but its Hideable is the one item this round left open
      (§6). Locked is the reversible choice of the two.
    */
    id: 'info',
    titleKey: 'game.sec.info',
    floor: sectionHeight(3),
    ceiling: sectionHeight(4),
    /*
      `status` carries the FAVOURITE, mirrored from the meta row so the fact
      survives collapse (GI-F). A collapsed Game Info is a header and nothing
      else, and whether this game is a favourite is the one thing on the card
      worth knowing without expanding it.
    */
    status: true,
    options: true
  },
  {
    /*
      Drawn in wireframes/game-engine.html Rev A; G1 and G2 granted 21 Sep.

      Sized to content between one and three principal variations. The figures
      are unchanged — they were already 30 + 6 + n × 24 — and are now written
      as such rather than as 60 and 108, which is the same panel grid stated
      once instead of per Section.

      `status` is gone rather than reserved: the depth reached is printed per
      row, which left the slot with nothing to say, and a slot kept for nothing
      is a slot the next passing number fills.
    */
    id: 'engine',
    titleKey: 'game.sec.engine',
    floor: sectionHeight(1),
    ceiling: sectionHeight(3),
    hideable: true,
    scrolls: false,   // shows exactly its lines; nothing to scroll (15 Sep)
    source: true,
    control: true,
    options: true
  },
  {
    /*
      THE MOVE LIST ABSORBS SURPLUS, AND NEVER RENDERS FEWER THAN THREE MOVES.

      The floor is three rows — 108px, which is the 110 it used to declare,
      tidied onto the grid. §5.6.1 specifies this row's widths in detail but
      never stated a row height, so 110 was a figure and 108 is a derivation.

      That floor is now the panel's one invariant: it is what decides whether
      the Evaluation Timeline is displayed, rather than the Timeline carrying a
      rule of its own. See timelineFits() in layout.js.
    */
    id: 'moves',
    titleKey: 'game.sec.moves',
    floor: MOVE_LIST_FLOOR,
    absorb: true,
    scrolls: true,
    options: true
  },
  {
    /*
      Drawn in wireframes/game-move-explorer.html Rev B; G1 and G2 granted 14 Sep.

      Sized to content between one and three moves; a fourth scrolls rather
      than growing it. Same grid as the Engine, and they land on the same two
      numbers by construction rather than by coincidence.
    */
    id: 'explorer',
    titleKey: 'game.sec.explorer',
    floor: sectionHeight(1),
    ceiling: sectionHeight(3),
    hideable: true,
    source: true,
    status: true,
    scrolls: true,
    options: true
  },
  {
    /*
      ANCHORED, NOT STACKED — G1 granted in wireframes/game-info-g1.html.

      It sits between the stack and the Game Controls Toolbar. §5.6.2 calls it
      "a transport control that is also a chart", and this puts the scrubber
      directly above the transport it drives, so the two navigation controls
      read as one group rather than as a chart that happens to be last.

      It KEEPS THE COMMON SECTION HEADER (option A). The alternative considered
      was dropping it to furniture like the Evaluation Bar, which would have
      saved 30px but left the playhead evaluation and the collapse control
      without homes. Not taken.

      It is also the only Section the layout will displace for space — see
      timelineFits(). Displacement is never written to the user's stored
      visibility: `hidden` stays the user's word, and the layout's is separate.
    */
    id: 'timeline',
    titleKey: 'game.sec.timeline',
    floor: TIMELINE_H,
    height: TIMELINE_H,
    anchored: true,
    hideable: true,
    status: true
  }
];

export const DEFAULT_VISIBILITY = Object.fromEntries(
  SECTIONS.map((s) => [s.id, { collapsed: false, hidden: false }])
);
