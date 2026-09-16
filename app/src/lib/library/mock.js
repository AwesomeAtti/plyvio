import { GAMES } from '$lib/game/games.js';

/**
 * Mock library data for the prototype.
 *
 * Deterministic: a small seeded PRNG, so every run and every test sees the
 * same 1,248 games. Names deliberately include diacritics and some very long
 * entries, because those are what stress the Content Table's name columns and
 * the bundled font's Latin Extended-A coverage.
 */

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PLAYERS = [
  ['Carlsen', 'Magnus'], ['Nepomniachtchi', 'Ian'], ['Fischer', 'Robert J'],
  ['Spassky', 'Boris V'], ['Kasparov', 'Garry'], ['Topalov', 'Veselin'],
  ['Tal', 'Mikhail'], ['Botvinnik', 'Mikhail'], ['Polgár', 'Judit'],
  ['Vachier-Lagrave', 'Maxime'], ['Ding', 'Liren'], ['Caruana', 'Fabiano'],
  ['Firouzja', 'Alireza'], ['Giri', 'Anish'], ['So', 'Wesley'],
  ['Aronian', 'Levon'], ['Nakamura', 'Hikaru'], ['Rapport', 'Richárd'],
  ['Duda', 'Jan-Krzysztof'], ['Radjabov', 'Teimour'], ['Grischuk', 'Alexander'],
  ['Karjakin', 'Sergey'], ['Anand', 'Viswanathan'], ['Kramnik', 'Vladimir'],
  ['Gelfand', 'Boris'], ['Świercz', 'Dariusz'], ['Dominguez Perez', 'Leinier'],
  ['Praggnanandhaa', 'Rameshbabu'], ['Goryachkina', 'Aleksandra'],
  ['Muzychuk', 'Mariya'], ['Ju', 'Wenjun'], ['Hou', 'Yifan'],
  ['Đurić', 'Stefan'], ['Škoda', 'Petr'], ['Nyzhnyk', 'Illia'],
  ['Korchnoi', 'Viktor'], ['Petrosian', 'Tigran V'], ['Smyslov', 'Vasily'],
  ['Keres', 'Paul'], ['Bronstein', 'David'], ['Larsen', 'Bent'],
  ['Portisch', 'Lajos'], ['Timman', 'Jan H'], ['Short', 'Nigel D'],
  ['Ivanchuk', 'Vassily'], ['Shirov', 'Alexei'], ['Morozevich', 'Alexander'],
  ['Svidler', 'Peter'], ['Leko', 'Peter'], ['Adams', 'Michael']
];

const EVENTS = [
  'FIDE World Championship', 'Tata Steel Masters', 'Sinquefield Cup',
  'Norway Chess', 'Linares', 'Hoogovens', 'Candidates Tournament',
  'Chess Olympiad', 'Grand Chess Tour Finals', 'World Rapid Championship',
  'Gibraltar Masters', 'Aeroflot Open', 'Dortmund Sparkassen',
  'Chess.com Global Championship Finals', 'Wijk aan Zee Challengers',
  'European Individual Championship', 'Isle of Man International',
  'Saint Louis Rapid & Blitz', 'FIDE Grand Prix', 'World Cup'
];

// Draws dominate, as they do in master play. `*` — unfinished or ongoing — is
// drawn separately at ~1%, because a database in which one game in eight is
// unfinished would not look like a real library.
const RESULTS = ['1-0', '0-1', '½-½', '½-½', '1-0', '0-1', '½-½'];

/**
 * The rows for games that actually exist.
 *
 * Every other row in this file is fabricated metadata with no moves behind it, which is
 * what the Content Table needs to be designed against — but it also meant the Library
 * could not list a single game the Game Workspace can open. These rows are built FROM
 * `$lib/game/games.js`, so a row and the game it names cannot drift apart: there is one
 * source for both, and a row that says GothamChess is a game whose PGN is in the bundle.
 *
 * `ply_count` stays NULL because the game rows leave it NULL, which is what an imported
 * row looks like — the Moves column is empty for these, exactly as it is for the sample
 * databases. `result` is the tag pair's own spelling, so a drawn game reads `1/2-1/2`
 * here where a generated row reads `½-½`.
 *
 * They come first in the array, but nothing depends on that: the Content Table sorts by
 * date descending by default and these are dated 2026, where the generated set stops at
 * 2025, so they lead the list on their own merits.
 */
export function realRows() {
  return GAMES.map((g, i) => {
    const [y, m, d] = g.date.split('.').map(Number);
    return {
      id: g.id,
      date: g.date,
      sortDate: y * 10000 + m * 100 + d,
      white: g.white,
      white_elo: g.white_elo,
      black: g.black,
      black_elo: g.black_elo,
      event: g.event,
      round: g.round,
      result: g.result,
      ply_count: g.ply_count,
      favorite: false,
      addedDaysAgo: i,
      subscription: null,
      collection: null,
      tags: [],
      trashed: false
    };
  });
}

/**
 * ~1,250 games, generated once, identical every time.
 *
 * Ids continue past the real rows rather than using a shape of their own. Every row here
 * stands for a row of a `games` table, and schema §1 declares that key INTEGER — so a
 * generated row carries an integer like any other, and the list holds one kind of id.
 */
export function makeGames(count = 1248, seed = 20260903) {
  const rnd = mulberry32(seed);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const games = realRows();
  const firstGenerated = games.length + 1;

  for (let i = 0; i < count; i++) {
    let a = pick(PLAYERS), b = pick(PLAYERS);
    while (b === a) b = pick(PLAYERS);

    // Mostly "Last, First"; a minority abbreviated, as real databases are.
    const abbrev = rnd() < 0.35;
    const fmt = (n) => (abbrev ? `${n[0]}, ${n[1][0]}` : `${n[0]}, ${n[1]}`);

    const year = 1950 + Math.floor(rnd() * 76);
    const month = 1 + Math.floor(rnd() * 12);
    const day = 1 + Math.floor(rnd() * 28);
    const unknownDate = rnd() < 0.02;

    const ev = pick(EVENTS);
    const withYear = rnd() < 0.5;
    const unfinished = rnd() < 0.012;
    const result = unfinished ? '*' : pick(RESULTS);
    const unrated = rnd() < 0.04;

    games.push({
      id: firstGenerated + i,
      date: unknownDate
        ? '????.??.??'
        : `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`,
      sortDate: unknownDate ? 0 : year * 10000 + month * 100 + day,
      white: fmt(a),
      /* §2.2: the standard's placeholder for an unrated player becomes NULL, so an
         unrated player and an unrecorded rating are treated alike. The table draws
         nothing for it, as it already draws nothing for an absent `ply_count`. */
      white_elo: unrated ? null : 2300 + Math.floor(rnd() * 583),
      black: fmt(b),
      black_elo: unrated ? null : 2300 + Math.floor(rnd() * 583),
      event: withYear ? `${ev} ${year}` : ev,
      round: String(1 + Math.floor(rnd() * 14)),
      result,
      /*
        `ply_count` is what the schema stores, and it is optional: about one row in
        sixteen leaves it NULL so the empty cell is visible while the table is being
        designed rather than discovered against real data. The Moves column derives
        its number from this; nothing stores a move count.
      */
      ply_count: rnd() < 0.06 ? null : 16 + Math.floor(rnd() * 244),
      favorite: rnd() < 0.03,
      addedDaysAgo: Math.floor(rnd() * 400),
      subscription: rnd() < 0.42 ? Math.floor(rnd() * 7) : null,
      collection: rnd() < 0.22 ? Math.floor(rnd() * 3) : null,
      tags: rnd() < 0.12 ? [Math.floor(rnd() * 4)] : [],
      trashed: rnd() < 0.004
    });
  }
  return games;
}

/**
 * Subscriptions — §3.2.3.3.
 *
 * Every subscription has a `source`, and there are exactly two: `chesscom` and
 * `lichess`. A subscription names a feed ON a source, so several rows
 * share a source — which is what makes the source mark worth showing. A name
 * alone ("Blitz — 2024") does not say where the games came from.
 *
 * Seven of them, so the sidebar's five-plus-More… rule stays live.
 */
export const SOURCES = {
  chesscom: { id: 'chesscom', label: 'Chess.com' },
  lichess:  { id: 'lichess',  label: 'Lichess'   }
};

export const SUBSCRIPTIONS = [
  { id: 0, source: 'chesscom', name: 'magnuscarlsen',        state: 'new',     count: 12, syncedDaysAgo: 0 },
  { id: 1, source: 'lichess',  name: 'Broadcasts — Top',     state: 'syncing', count: 0,  syncedDaysAgo: 0 },
  { id: 2, source: 'lichess',  name: 'DrNykterstein',        state: 'error',   count: 0,  syncedDaysAgo: 3 },
  { id: 3, source: 'chesscom', name: 'Titled Tuesday',       state: 'idle',    count: 0,  syncedDaysAgo: 1 },
  { id: 4, source: 'chesscom', name: 'Events — Champions',   state: 'new',     count: 3,  syncedDaysAgo: 2 },
  { id: 5, source: 'lichess',  name: 'penguingm1',           state: 'idle',    count: 0,  syncedDaysAgo: 9 },
  { id: 6, source: 'chesscom', name: 'hikaru',               state: 'new',     count: 41, syncedDaysAgo: 14 }
];

export const COLLECTIONS = [
  { id: 0, name: 'Opening Prep',    smart: false },
  { id: 1, name: 'Hikaru as White', smart: true  },
  { id: 2, name: 'Endgame Studies', smart: false }
];

export const TAGS = [
  { id: 0, name: 'Brilliancy' },
  { id: 1, name: 'To Analyse' },
  { id: 2, name: 'Miniature' },
  { id: 3, name: 'Blunder' }
];

/**
 * Games produced by an import. §3.2.4.5
 *
 * The prototype reads no PGN, so an import has to put SOMETHING in the table:
 * without rows arriving the Content Table, the counts and the Sidebar say
 * nothing happened, and those three are the entire result of an import now
 * that r5 §4 drops the banner.
 *
 * Recent by construction — `addedDaysAgo: 0` — so Recently Added is the view
 * that fills, which is where the workspace navigates when an import finishes.
 */
export function makeImportedGames(count, { offset = 0, seed = 424242, tags = [], collection = null } = {}) {
  const rnd = mulberry32(seed + offset);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const out = [];

  for (let i = 0; i < count; i++) {
    let a = pick(PLAYERS), b = pick(PLAYERS);
    while (b === a) b = pick(PLAYERS);
    const fmt = (n) => `${n[0]}, ${n[1]}`;
    const year = 2024 + Math.floor(rnd() * 3);
    const month = 1 + Math.floor(rnd() * 12);
    const day = 1 + Math.floor(rnd() * 28);

    out.push({
      id: `imp-${seed}-${offset + i}`,
      date: `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`,
      sortDate: year * 10000 + month * 100 + day,
      white: fmt(a),
      white_elo: 2300 + Math.floor(rnd() * 583),
      black: fmt(b),
      black_elo: 2300 + Math.floor(rnd() * 583),
      event: pick(EVENTS),
      round: String(1 + Math.floor(rnd() * 14)),
      result: pick(RESULTS),
      ply_count: 16 + Math.floor(rnd() * 244),
      favorite: false,
      addedDaysAgo: 0,
      subscription: null,
      collection,
      tags: [...tags],
      trashed: false
    });
  }
  return out;
}
