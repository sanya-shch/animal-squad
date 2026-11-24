# Animal Squad

A small puzzle game about pushing your luck. Hold the gate open to let the herd into the pen,
then let go. The calves grow up into full-size cows, and some of them are mutants:

| Cow        | Squares | Points | Notes                                           |
| ---------- | ------- | ------ | ----------------------------------------------- |
| Cow        | 1       | 1      |                                                 |
| Two-headed | 1       | 2      | Rare, and worth waiting for                     |
| Fat        | 2       | 1      | A trap for the greedy: it fits either way round |

Mutants are visible in the queue (a paler calf) but not which kind they are. Too many cows, or
the wrong mix for the shape of the pen, and the fence breaks. You have three lives. A safe round
scores the points of its cows, and chains of perfect rounds (you could not have fit more) add a
growing bonus.

Four pens, from a plain 3x3 meadow to an L-shaped yard with rocks, so the same herd plays very
differently in each.

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

Handy URLs: `#meadow`, `#paddock`, `#lane`, `#rocky-yard` open a level directly, and
`?seed=123` replays exactly the same game (any text works as a seed too).

## Architecture

```
src/
  core/      pure game rules: cows, pens, exact packing solver, rounds, seeded RNG (no DOM)
  game/      state machine for a run, scoring, and the controller that owns the one timer
  input/     one hold gesture for mouse, touch, pen and keyboard
  levels/    levels as validated data (ASCII layouts)
  render/    the DOM view: scene layout maths, fence auto-tiling, herd, HUD, result panel
  screens/   the start screen
  styles/    plain CSS
```

- `core/` and `game/` know nothing about the browser, so the whole rule set is covered by fast
  unit tests (including a cross-check of the solver against a brute force search).
- Every random decision goes through a seeded RNG, so the same seed gives the same game.
- The view only reacts to state changes. Animations are CSS (transform and opacity only), driven
  by one `data-phase` attribute per cow, so there is no per-frame script.
- Sprites are resolved to URLs up front, but the browser only downloads those that are shown.

The project is being rewritten from Create React App + MobX to plain TypeScript + Vite.

## Fonts

The title font (Granita) is a demo version: it paints a watermark over digits and punctuation,
so `unicode-range` limits it to letters and the system font draws everything else. Replace it
with a properly licensed font before publishing commercially.
