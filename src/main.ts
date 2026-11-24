import "./styles/base.css";
import "./styles/debug.css";

import { compileLevels, hashSeed, randomSeed } from "./core";
import { mountDevView } from "./dev/devView";
import { createGame } from "./game";
import { LEVEL_DEFINITIONS } from "./levels/definitions";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing #app root element");

const levels = compileLevels(LEVEL_DEFINITIONS);
const params = new URLSearchParams(location.search);

const level = levels.find((candidate) => candidate.id === params.get("level")) ?? levels[0];
if (!level) throw new Error("No levels defined");

// ?seed=123 (a number) or ?seed=any-text replays exactly the same game.
function parseSeed(raw: string | null): number {
  if (raw === null) return randomSeed();
  return /^\d+$/.test(raw) ? Number(raw) : hashSeed(raw);
}
const seed = parseSeed(params.get("seed"));

const game = createGame({ level, seed });
const unmount = mountDevView(app, game);

// Hot reload would otherwise leave the old game's timer and listeners running.
import.meta.hot?.dispose(() => {
  unmount();
  game.dispose();
});
