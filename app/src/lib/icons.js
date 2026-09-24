/**
 * Icon vocabulary — one place where a concept maps to a glyph.
 *
 * Lucide 1.41.0, ISC. Imported through the `@lucide/svelte/icons/*` subpath so
 * only the icons named here reach the bundle; importing from the package root
 * would pull all 2,076 in.
 *
 * WHY AN ICON SET AT ALL. The prototype previously used Unicode characters as
 * icons. Thirteen of them — including every media-control glyph, the warning
 * sign and the ellipsis — are absent from the bundled IBM Plex faces, so they
 * were being drawn by whatever the operating system fell back to: different on
 * every platform, sometimes colour emoji, and not actually offline (§1.1).
 * Everything below is bundled SVG.
 *
 * SIZING. Lucide is drawn on a 24px grid with a 2px stroke. This UI renders at
 * 13–18px, where that stroke is optically heavy, so `Icon.svelte` sets 1.5 and
 * the sizes below are deliberately a little larger than the shapes they
 * replace.
 */

/*
 * navigation and destinations — Library Sidebar §3.2.3
 *
 * `AllGames` is a VIEW, not the library: the unfiltered sibling of Favorites
 * and Recently Added. It used to borrow the library glyph, which collided with
 * the switcher — a Library IS a database file, so one icon means that file and
 * nothing else. See LibraryIcon below.
 */
export { default as AllGames }   from '@lucide/svelte/icons/list';
export { default as Favorites }  from '@lucide/svelte/icons/star';
export { default as Recent }     from '@lucide/svelte/icons/clock';
export { default as Feed }       from '@lucide/svelte/icons/rss';
export { default as Collection } from '@lucide/svelte/icons/folder';
export { default as SmartCollection } from '@lucide/svelte/icons/folder-search-2';
export { default as TagIcon }    from '@lucide/svelte/icons/tag';
export { default as TrashIcon }  from '@lucide/svelte/icons/trash-2';

/* sidebar state — §3.2.3.8 */
export { default as CollapseSidebar } from '@lucide/svelte/icons/panel-left-close';
export { default as ExpandSidebar }   from '@lucide/svelte/icons/panel-left-open';

/* subscription state — §3.2.3.3 */
export { default as Syncing }  from '@lucide/svelte/icons/refresh-cw';
export { default as SyncError } from '@lucide/svelte/icons/triangle-alert';
export { default as Offline }  from '@lucide/svelte/icons/cloud-off';

/* content toolbar — §3.2.4.1 */
export { default as SearchIcon } from '@lucide/svelte/icons/search';
export { default as ClearIcon }  from '@lucide/svelte/icons/x';
export { default as AddGames }   from '@lucide/svelte/icons/plus';

/* shell — §2.1, §2.2 */
export { default as NewTab }   from '@lucide/svelte/icons/plus';
export { default as CloseTab } from '@lucide/svelte/icons/x';
export { default as ScrollLeft }  from '@lucide/svelte/icons/chevron-left';
export { default as ScrollRight } from '@lucide/svelte/icons/chevron-right';
export { default as TabList }  from '@lucide/svelte/icons/chevron-down';
export { default as AppMenuIcon } from '@lucide/svelte/icons/menu';
export { default as LanguageIcon } from '@lucide/svelte/icons/languages';
export { default as ThemeLight } from '@lucide/svelte/icons/sun';
export { default as ThemeDark }  from '@lucide/svelte/icons/moon';
export { default as SettingsIcon } from '@lucide/svelte/icons/settings';
export { default as AboutIcon }  from '@lucide/svelte/icons/info';
export { default as EnterFullscreen } from '@lucide/svelte/icons/maximize';
export { default as ExitFullscreen }  from '@lucide/svelte/icons/minimize';
export { default as QuitIcon } from '@lucide/svelte/icons/log-out';
export { default as SubmenuArrow } from '@lucide/svelte/icons/chevron-right';
export { default as Checked } from '@lucide/svelte/icons/check';

/* game controls — §5.3, §5.4.2 */
export { default as FirstPly } from '@lucide/svelte/icons/skip-back';
export { default as PrevPly }  from '@lucide/svelte/icons/chevron-left';
export { default as NextPly }  from '@lucide/svelte/icons/chevron-right';
export { default as LastPly }  from '@lucide/svelte/icons/skip-forward';
export { default as PlayIcon } from '@lucide/svelte/icons/play';
export { default as PauseIcon } from '@lucide/svelte/icons/pause';
export { default as FlipBoardIcon } from '@lucide/svelte/icons/flip-vertical-2';

/* section headers — §5.4.2 */
export { default as SectionCollapse } from '@lucide/svelte/icons/chevron-up';
export { default as SectionExpand }   from '@lucide/svelte/icons/chevron-down';
export { default as SectionOptions }  from '@lucide/svelte/icons/ellipsis';
export { default as SaveGame }         from '@lucide/svelte/icons/save';

/*
 * A move that carries a comment — §5.4.2, Moves.
 *
 * The glyph marks the move, and the chevron beside it is the control. They are two
 * things on purpose: the icon says a comment exists whether or not it is open, and the
 * chevron says which way it will go. Reusing the Section chevrons keeps one meaning for
 * one shape down the whole panel.
 */
export { default as CommentIcon } from '@lucide/svelte/icons/message-square';

/*
 * The comment banner — §5.4.2, Moves.
 *
 * `EngineMark` fronts an evaluation because the number is an engine's opinion and not a
 * fact about the position; `BestMoveMark` fronts the move the engine would have played.
 * The star is Lucide's `star`, the same glyph Favorites uses, which is acceptable because
 * the two never appear in one surface — if they ever do, one of them changes here.
 */
export { default as EngineMark }    from '@lucide/svelte/icons/cpu';
export { default as BestMoveMark }  from '@lucide/svelte/icons/star';
export { default as VariationMark } from '@lucide/svelte/icons/git-branch';
/*
 * The Section Header's control slot — §5.4.2.
 *
 * THE HEADER NOW HAS NO EXCEPTIONS. Every Section fills the shared 26px icon
 * button, the Engine included.
 *
 * It did have one. Q1 of `wireframes/game-engine.html`, settled 21 Sep, gave
 * the Engine a SWITCH instead of this button, because its control is a
 * running/stopped state the user sets and then watches rather than an action
 * they fire — and a power glyph says what pressing it will do while saying
 * nothing about what it is doing now.
 *
 * That objection was to the GLYPH, not to the button, and `toggle-left` /
 * `toggle-right` answers it: the knob's position IS the state, drawn rather
 * than described, which is the one thing the power glyph could not do. So the
 * exception retires rather than being overruled — the reasoning that earned it
 * is the reasoning that now closes it.
 *
 * The button keeps `role="switch"` and `aria-checked`. What changed is the
 * picture, not the semantics: it still sets a state, and assistive technology
 * is told so.
 */
export { default as EngineOff } from '@lucide/svelte/icons/toggle-left';
export { default as EngineOn }  from '@lucide/svelte/icons/toggle-right';
/*
 * Game Info's card — §5.6.5.
 *
 * Two new glyphs and three reused ones. The reuse is the point: the star that
 * marks a favourite here is the star that names the Favorites view in the
 * Library, and the tag and folder are the Library's own. A second star drawn
 * for "favourite on a card" would be the same meaning under a second glyph,
 * which is the thing this register exists to prevent.
 *
 * `BestMoveMark` is also a star and is NOT the same meaning — it marks the
 * engine's preferred move in movetext. Same glyph, two meanings, in two places
 * that never appear in one another's company. Noted here so the collision is a
 * recorded decision rather than a discovery.
 */
export { default as GameDate }  from '@lucide/svelte/icons/calendar';
export { default as GameSite }  from '@lucide/svelte/icons/map-pin';
export { default as EditIcon }  from '@lucide/svelte/icons/pencil';

export { default as SectionToggle }   from '@lucide/svelte/icons/power';
export { default as MoreIcon }        from '@lucide/svelte/icons/ellipsis';

/*
 * The library / database file — §3.4.8 (the switcher itself is unnumbered).
 *
 * One glyph for one object. Settings keeps the word "Databases" and the
 * Sidebar says "Library"; they are the same thing, so they share an icon.
 * The expanded switcher shows no icon at all — the name is enough in a panel
 * that is unambiguously the library — but the collapsed rail has no room for
 * a name, so this is what it shows.
 */
export { default as LibraryIcon }  from '@lucide/svelte/icons/database';
export { default as DatabaseIcon } from '@lucide/svelte/icons/database';

/* settings objects — §3.4.8 */
export { default as EngineIcon }   from '@lucide/svelte/icons/cpu';

/*
 * settings sections — §3.4.4
 *
 * Four of the six reuse a glyph already defined above, because §7.4's
 * one-concept-one-glyph rule makes that mandatory rather than merely tidy:
 *
 *   Engines       EngineIcon    cpu
 *   Subscriptions Feed          rss       — a Feed in the Library Sidebar and a
 *                                          Subscription here are the same object
 *   Databases     DatabaseIcon  database  — shared with LibraryIcon (§3.2.3.10)
 *   About         AboutIcon     info      — shared with the menu's About (§2.2)
 *
 * Only these two are new. `settings` — the gear — is deliberately NOT used for
 * the General section: §2.2's Application Menu already spends it on the
 * Settings Tab itself, so the gear denotes the workspace, not a section in it.
 */
export { default as GeneralIcon }    from '@lucide/svelte/icons/sliders-horizontal';
export { default as AppearanceIcon } from '@lucide/svelte/icons/palette';

/*
 * adding games — §3.2.4.5
 *
 * Three of these reuse a glyph already defined above, because §7.4's
 * one-concept-one-glyph rule makes that mandatory rather than merely tidy:
 *
 *   ProblemIcon       triangle-alert  — shared with SyncError; a problem is a
 *                                       problem whether it came from a sync or
 *                                       an import
 *   ImportingIcon     refresh-cw      — shared with Syncing; both are work in
 *                                       progress that the Status Bar reports
 *   NetworkErrorIcon  cloud-off       — shared with Offline; the network is
 *                                       the thing that is not there
 *
 * ChevronDown is the same glyph as TabList and SectionExpand under a third
 * name, for the same reason: a disclosure chevron is one concept, and naming
 * it after the control it opens would make four names for one shape.
 */
export { default as FileIcon }     from '@lucide/svelte/icons/file-text';
export { default as PasteIcon }    from '@lucide/svelte/icons/clipboard';
export { default as OnlineIcon }   from '@lucide/svelte/icons/globe';
export { default as DownloadIcon } from '@lucide/svelte/icons/download';
export { default as CopyIcon }     from '@lucide/svelte/icons/copy';
export { default as ChevronDown }  from '@lucide/svelte/icons/chevron-down';
export { default as ProblemIcon }  from '@lucide/svelte/icons/triangle-alert';
export { default as ImportingIcon } from '@lucide/svelte/icons/refresh-cw';
export { default as NetworkErrorIcon } from '@lucide/svelte/icons/cloud-off';

/**
 * Default rendering. Lucide exposes a context provider for these, but it is
 * not re-exported from the package root, so they are applied by Icon.svelte
 * instead of set globally.
 *
 * ICON_SIZE is the fallback for a call site that names no size. It is not the
 * size icons are drawn at: §7.4 sizes by role, and every role in Settings names
 * its own — 18 for a row or sidebar glyph, 16 for a brand mark, 15 for the
 * disclosure chevron, 13 in a button, 12 for a status indicator.
 *
 * ICON_STROKE is held constant at every size by Icon.svelte's
 * `absoluteStrokeWidth`, so a 12px status glyph is not hairline beside an 18px
 * row glyph.
 */
export const ICON_SIZE = 16;
export const ICON_STROKE = 1.5;
