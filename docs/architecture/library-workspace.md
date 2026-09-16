# Library Workspace (§3.2)

`src/lib/library/columns.js` holds the Content Table column model as pure
functions, for the same reason `layout.js` does: vitest applies no stylesheets,
so a computed width cannot be asserted. The model is swept across every width
from 516px to 4000px in `library.test.js`.

| | Min | Max | Behaviour |
|---|---|---|---|
| Date | 90 | 90 | fixed |
| White | 90 | 180 | half the surplus, then stops |
| Elo | 41 | 41 | fixed |
| Black | 90 | 180 | always identical to White |
| Elo | 41 | 41 | fixed |
| Event | 90 | none | absorbs everything the names do not take |
| Res | 34 | 34 | fixed |
| Mvs | 40 | 40 | fixed |

```
surplus = available − 516
White = Black = 90 + min(⌊surplus ÷ 2⌋, 90)
Event = 90 + (surplus − 2 × name growth)
```

Because Event is uncapped the columns always sum exactly to the available
width, so **trailing whitespace cannot occur** and the table never scrolls
sideways. The 516px minimum fits an 800px window with the 220px sidebar
expanded, with 64px to spare.

**Cell padding is 6px between columns and 12px at the table's outer edges.**
The extra 6px is part of the first and last columns' widths (`EDGE_EXTRA`),
which is why Date is 90 rather than 84 and Moves 40 rather than 34. Header and
rows share the padding, so labels stay over their values.

**Draws are drawn `½-½`** whatever the record holds (`formatResult`), and the
`Res` and `Mvs` headers carry their full names for assistive technology. A
translated condensed header must fit 22px — three monospace characters.

**The fixed widths depend on the bundled font.** They are derived from IBM Plex
Mono's 0.600em advance at 12px — verified from the font file itself, not
assumed. A system fallback of different metrics would make all five wrong.

**Rows are virtualised.** 1,248 mock games, roughly 30 rows in the DOM.
`aria-rowcount` reports the true total.

**Mock data** (`src/lib/library/mock.js`) is a seeded generator, so every run
and every test sees the same corpus. It deliberately includes the awkward
cases: `*` unfinished games, `?` unrated players, `????.??.??` unknown dates,
and names with diacritics — which is also what exercises the font's Latin
Extended-A subset.

**Search folds diacritics**, so `polgar` finds `Polgár`. A chess database is
unusable otherwise. It composes with the sidebar filter rather than replacing
it, and changing the filter does not clear it — the scoped placeholder
(`Search in Favorites…`) is what makes that visible.

Accepted wireframes: `design/library-workspace-wireframes.html`,
`design/library-add-games-dialog-r5.html`, `design/library-add-games-dialog-r6.html`,
`design/library-switcher-options.html`.
