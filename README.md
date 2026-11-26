# Animal Squad

A small puzzle game about pushing your luck. Hold the gate open to let the herd into the pen,
then let go. The calves grow up into full-size cows, and some of them are mutants that take more
(or less) room than you expected. Let in too many and the fence breaks.

<p>
  <img src="docs/screenshots/menu.png" alt="The menu: daily challenge and four pens" width="48%">
  <img src="docs/screenshots/play.png" alt="Calves walking into the pen" width="48%">
</p>
<p>
  <img src="docs/screenshots/fence-broke.png" alt="The fence broke" width="48%">
  <img src="docs/screenshots/phone.png" alt="The game on a phone" width="22%">
</p>

Plain TypeScript and CSS, built with Vite. No framework and no runtime dependencies: the whole
game is about 14 KB of JavaScript over the wire.

## How to play

Hold the mouse button, a finger or Space: cows walk in one by one. Let go to close the gate, and
the calves in the pen grow up.

| Cow        | Squares | Points | Notes                                           |
| ---------- | ------- | ------ | ----------------------------------------------- |
| Cow        | 1       | 1      |                                                 |
| Two-headed | 1       | 2      | Rare, and worth waiting for                     |
| Fat        | 2       | 1      | A trap for the greedy: it fits either way round |

You can see which calves are mutants (a paler calf) but not which kind they are, so every mutant
is a small gamble. Rocks and odd pen shapes decide whether a fat cow still fits: the game checks
this exactly, not by counting squares.

- **A run** is 8 rounds. Three broken fences end it early.
- **A safe round** scores the points of its cows. Chains of perfect rounds (you could not have
  fit more) add a growing bonus.
- **Letting go before the first cow** costs nothing: the round is replayed.
- **Stars:** every pen has three score goals, and a star on one pen opens the next.

| Pen        | Size | Squares | Stars at     |
| ---------- | ---- | ------- | ------------ |
| Meadow     | 3x3  | 9       | 30 / 50 / 65 |
| Paddock    | 4x3  | 12      | 40 / 62 / 80 |
| Lane       | 2x5  | 10      | 30 / 48 / 64 |
| Rocky Yard | 5x4  | 16      | 45 / 80 / 105 |

- **Daily challenge:** the same pen and the same herds for everybody on a given (UTC) day, so
  scores can be compared. Best scores and day streaks are kept in the browser.

**Controls:** Space or a press holds the gate. Enter goes on to the next round. M mutes.

## Getting started

Requires Node 20.19+ (22 recommended).

```bash
npm install
npm run dev
```

| Command                | What it does                                                      |
| ---------------------- | ----------------------------------------------------------------- |
| `npm run dev`          | Dev server with hot reload                                        |
| `npm run check`        | Typecheck, lint, unit tests and formatting: the fast gate         |
| `npm test`             | Unit tests only (`npm run test:watch` while developing)           |
| `npm run e2e`          | Browser tests against the production build (see below)            |
| `npm run build`        | Production build into `dist/`                                     |
| `npm run preview`      | Serves `dist/` the way GitHub Pages will                          |
| `npm run format`       | Prettier                                                          |

Handy URLs: `#meadow`, `#paddock`, `#lane`, `#rocky-yard` open a pen directly (once unlocked),
`#daily` is today's challenge, and `?seed=123` replays exactly the same game of a pen (any text
works as a seed too). On the dev server `?unlock=all` opens every pen.

## Testing

| Layer         | Where                       | What it protects                                                  |
| ------------- | --------------------------- | ----------------------------------------------------------------- |
| Unit          | `src/**/*.test.ts`          | Rules, solver, state machine, scoring, storage, sound cues, texts |
| Balance       | `src/levels/balance.test.ts` | That the star goals stay between what careful and skilled players score |
| End to end    | `e2e/*.spec.ts`             | The real bundle in a real browser: input, flows, loading, security |

- The packing solver is cross-checked against a brute-force search on random small pens.
- Robot players (`src/game/simulate.ts`) play whole runs to calibrate the star goals. The goals are
  a starting point: tune them after watching real people play, and the balance tests will say
  what moved.
- The e2e tests run against `vite preview`, so they cover the bundle, the sprite files and the
  Content-Security-Policy too. One-time setup: `npx playwright install chromium`. They cover the
  menu and unlocks, a full run, the daily challenge, touch and keyboard play, sound, reduced
  motion, a clean console, blocked storage, the CSP, and the loading and rendering budget.
- CI (`.github/workflows/ci.yml`) runs the fast gate and the e2e tests on every push and pull request.

## Architecture

```
src/
  core/      pure game rules: cows, pens, exact packing solver, rounds, seeded RNG (no DOM)
  game/      state machine for a run, scoring, the controller that owns the one timer,
             and robot players used to balance the game
  input/     one hold gesture for mouse, touch, pen and keyboard
  audio/     which sounds the game state calls for, and a small Web Audio synthesizer
  levels/    levels as validated data (ASCII layouts, spawn weights, star goals)
  progress/  best scores, stars, unlocks, the daily challenge, a defensive localStorage store
  render/    the DOM view: scene layout maths, fence auto-tiling, herd, HUD, result panel
  screens/   the start screen
  styles/    plain CSS
e2e/         Playwright tests
docs/        screenshots and the release checklist
```

A few decisions worth knowing about:

- **The rules know nothing about the browser.** `core/` and `game/` are pure functions and a state
  machine. The one timer lives in the controller and runs only while the gate is open, so an idle
  game does nothing at all.
- **An exact packing solver** decides whether a herd fits. Counting squares is wrong as soon as
  rocks, odd shapes and two-square cows exist. It stays instant (about 0.2 ms per round) because
  single-square cows never need searching and identical cows are placed in a fixed order.
- **Everything random is seeded.** The same seed gives the same game: reproducible bugs, stable
  tests and a fair daily challenge.
- **Levels are data**, validated when the app starts. Pens are drawn as ASCII art, and the fence
  and gate are generated from the pen's outline, so a new pen is a few lines.
- **The view only reacts to state.** Each cow is an element whose positions are CSS variables, and
  one `data-phase` attribute drives its animations, so there is no per-frame script. About 4 DOM
  changes per cow, measured, and none while the animations run.
- **Saves hold raw best scores only.** Stars and unlocks are derived from them and from the goals,
  so goals can be rebalanced without migrating anybody. A damaged, foreign or blocked
  `localStorage` never stops the game.
- **Sound is a pure function of state** (`cuesFor`), timed to the animations and synthesized with
  the Web Audio API, so there are no audio files and the soundtrack is unit-tested.

## Performance and security

Measured during development, so re-measure after changes:

- JavaScript is about 14 KB and CSS about 3 KB (gzip).
- The cow sprites are lossy WebP (quality 80, full-quality alpha): 472 KB instead of 2.1 MB of
  PNG, with no visible difference at the size they are drawn. The two flat calf icons are
  lossless and small enough to be inlined. The pixel-art fence and scenery stay PNG.
  To convert a new sprite: `cwebp -q 80 -alpha_q 100 -m 6 sprite.png -o sprite.webp`.
- Sprites are decoded as soon as a round starts, and the next round's sprites are fetched while
  the result is on screen, so nothing pops in.
- The production build carries a strict Content-Security-Policy (no inline code, no third-party
  origins). If you ever add an external script or font, widen it in `vite.config.ts`.

## Content and licenses

- The title font (Granita) is a demo version: it paints a watermark over digits and punctuation,
  so `unicode-range` limits it to letters and the system font draws everything else. Replace it
  with a properly licensed font before publishing commercially.
- Check the license of the cow illustrations and the fence and scenery packs in `src/assets`, and
  credit their authors. The code has no license file yet: choose one (see the checklist).

## Ideas for later

More kinds of mutant (the cow kinds are plain data in `core/cows.ts`), a service worker for
offline play, a shared leaderboard for the daily challenge, and more pens.
