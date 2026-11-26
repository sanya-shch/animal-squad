# Animal Squad

A small puzzle game about pushing your luck. Hold the gate open to let the herd into the pen,
then let go. The calves grow up into full-size cows, and some of them are mutants:

| Cow        | Squares | Points | Notes                                           |
| ---------- | ------- | ------ | ----------------------------------------------- |
| Cow        | 1       | 1      |                                                 |
| Two-headed | 1       | 2      | Rare, and worth waiting for                     |
| Fat        | 2       | 1      | A trap for the greedy: it fits either way round |

Mutants are visible in the queue (a paler calf) but not which kind they are. Too many cows, or
the wrong mix for the shape of the pen, and the fence breaks. A run is 8 rounds, and three
broken fences end it early. A safe round scores the points of its cows, and chains of perfect
rounds (you could not have fit more) add a growing bonus.

Four pens, from a plain 3x3 meadow to an L-shaped yard with rocks, so the same herd plays very
differently in each. Every pen has three star goals; a star on one pen opens the next. The
**daily challenge** is the same pen and the same herds for everybody on a given (UTC) day, so
scores can be compared. Best scores and day streaks are kept in the browser.

**Controls:** hold the mouse button, a finger or Space. Enter (or the button) goes on to the
next round.

![Home page](</assets/Screenshot%20(137).png>)

![Game](</assets/Screenshot%20(134).png>)

## Development

```bash
npm install
npm run dev        # dev server
npm run check      # typecheck + lint + tests + formatting
npm run build      # production build into dist/
```

Requires Node 20.19+ (22 recommended).

Handy URLs: `#meadow`, `#paddock`, `#lane`, `#rocky-yard` open a pen directly (once unlocked),
`#daily` is today's challenge, and `?seed=123` replays exactly the same game of a pen (any text
works as a seed too). On the dev server `?unlock=all` opens every pen.

## Architecture

```
src/
  core/      pure game rules: cows, pens, exact packing solver, rounds, seeded RNG (no DOM)
  game/      state machine for a run, scoring, the controller that owns the one timer,
             and robot players used to balance the game
  input/     one hold gesture for mouse, touch, pen and keyboard
  audio/     which sounds the game state calls for, and a small Web Audio synthesizer
  levels/    levels as validated data (ASCII layouts, spawn weights, star goals)
  progress/  best scores, stars, unlocks, the daily challenge and a defensive localStorage store
  render/    the DOM view: scene layout maths, fence auto-tiling, herd, HUD, result panel
  screens/   the start screen
  styles/    plain CSS
```

- `core/` and `game/` know nothing about the browser, so the whole rule set is covered by fast
  unit tests (including a cross-check of the solver against a brute force search).
- Every random decision goes through a seeded RNG, so the same seed gives the same game.
- The view only reacts to state changes. Animations are CSS (transform and opacity only), driven
  by one `data-phase` attribute per cow, so there is no per-frame script.
- Star goals are calibrated with simulated players (`game/simulate.ts`), and
  `levels/balance.test.ts` fails when a rule or a level change makes them too easy or too hard.
  They are a starting point: tune them after watching real people play.
- Saves only hold raw best scores. Stars and unlocks are derived, so goals can be rebalanced
  without migrating anybody's save, and a damaged save is repaired entry by entry.
- Sprites are resolved to URLs up front, but the browser only downloads those that are shown.
- Sound is a pure function of the game state too: `cuesFor(previous, next)` lists what to play and
  when, so the soundtrack is unit-tested without a speaker.

The project is being rewritten from Create React App + MobX to plain TypeScript + Vite.

## Assets and loading

- The cow sprites are lossy WebP (quality 80, full-quality alpha): 472 KB instead of 2.1 MB of
  PNG, with no visible difference at the size they are drawn. The two flat calf icons are
  lossless WebP and small enough for Vite to inline into the bundle. The pixel-art fence and
  scenery stay PNG, where lossless is already tiny. To convert a new sprite:
  `cwebp -q 80 -alpha_q 100 -m 6 sprite.png -o sprite.webp`.
- Sprites are decoded as soon as a round starts, and the sprites of the next round are fetched
  while the result is on screen, so nothing pops in.
- The production build carries a strict Content-Security-Policy (no inline code, no third-party
  origins). If you ever add an external script or font, widen it in `vite.config.ts`.

## Sound

Every sound is synthesized with the Web Audio API (`src/audio`), so there are no audio files. What
plays is a pure function of the game state (`cues.ts`), timed to the animations; the engine only
schedules oscillators. Audio unlocks on the first touch or key press, as browsers require. The
speaker button or the M key mutes, and the choice is remembered.

## Deployment

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to the main
branch. Switch it on once under Settings > Pages > Source > "GitHub Actions".

## Fonts

The title font (Granita) is a demo version: it paints a watermark over digits and punctuation,
so `unicode-range` limits it to letters and the system font draws everything else. Replace it
with a properly licensed font before publishing commercially.
