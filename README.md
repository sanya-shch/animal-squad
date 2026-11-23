# Animal Squad

A small puzzle game about pushing your luck. Hold the mouse to let cows into the pen, release to
see how they grow up. Some of them are mutants:

| Cow         | Squares | Points | Notes                                    |
| ----------- | ------- | ------ | ---------------------------------------- |
| Normal      | 1       | 1      |                                          |
| Golden      | 1       | 2      | Rare and valuable                        |
| Two-headed  | 2       | 1      | A trap for the greedy, fits either way up |

Too many cows (or the wrong mix) and the fence breaks. Stop at the right moment and get three stars.

![Home page](/assets/Screenshot%20(137).png)

![Game](/assets/Screenshot%20(134).png)

## Development

```bash
npm install
npm run dev        # dev server
npm run check      # typecheck + lint + tests + formatting
npm run build      # production build into dist/
```

Requires Node 20.19+ (22 recommended).

## Architecture

```
src/
  core/      pure game rules: cows, pens, exact packing solver, rounds, seeded RNG (no DOM)
  levels/    levels as validated data (ASCII layouts)
```

`core/` has no dependency on the browser, so the whole rule set is covered by fast unit tests,
including a cross-check of the solver against a brute force search. Every random decision goes
through a seeded RNG: the same seed always gives the same game.

The project is being rewritten from Create React App + MobX to plain TypeScript + Vite.
