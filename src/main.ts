import "./styles/base.css";

import { compileLevels, computePar, createRng, generateHerd, randomSeed } from "./core";
import { LEVEL_DEFINITIONS } from "./levels/definitions";

// Temporary entry point while the new UI is being built (patches 3+).
// It only proves that the whole core pipeline runs in the browser.
const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing #app root element");

const seed = randomSeed();
const rng = createRng(seed);

const lines = [`ANIMAL SQUAD: rewrite in progress (seed ${seed})`, ""];
for (const level of compileLevels(LEVEL_DEFINITIONS)) {
  const herd = generateHerd(level, rng);
  const par = computePar(level.pen, herd);
  lines.push(
    `${level.name}: ${level.pen.capacity} squares, herd of ${herd.length}, ` +
      `par ${par.points} points with ${par.cows} cows`,
  );
}

const output = document.createElement("pre");
output.textContent = lines.join("\n");
app.append(output);
