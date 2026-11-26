import { createRng, hashSeed, terrainAt, type Level } from "../core";
import { assetUrl } from "./assets";
import { create, setVars, sprite } from "./dom";
import { layoutScene, penSquares, type SceneLayout } from "./layout";
import { DECOR_FILES, fenceFile } from "./spriteFiles";

export interface Scene {
  readonly element: HTMLElement;
  readonly layout: SceneLayout;
  // The layer the herd is added to. It shares the scene's depth sorting with the fence.
  readonly cowLayer: HTMLElement;
  // Knocks the fence down (or puts it back up). Cheap to call repeatedly.
  setBroken: (broken: boolean) => void;
}

// Things lower on the screen are drawn in front. `baseline` is where the sprite's feet are.
const depth = (y: number, baseline: number): number => Math.round((y + baseline) * 10);

/**
 * Builds the static part of a level: grass, rocks, scenery and the fence that follows the
 * outline of the pen. It is built once per level. After that only the herd changes.
 * Decoration is seeded by the level id, so a level always looks the same.
 */
export function createScene(level: Level): Scene {
  const layout = layoutScene(level.pen);
  const rng = createRng(hashSeed(`scene:${level.id}`));
  const { pen } = level;
  const { origin } = layout;

  const root = create("div", "scene");
  setVars(root, { cols: layout.cols, rows: layout.rows });
  const cowLayer = create("div", "cows");

  const tile = (file: string, className: string, x: number, y: number, baseline: number) => {
    const element = sprite(assetUrl(file), `tile ${className}`);
    setVars(element, { x, y, z: depth(y, baseline) });
    return element;
  };

  const parts: HTMLElement[] = [];

  // The floor squares make the grid the herd has to fit into visible, then grass tufts on
  // top of them, and rocks where the layout has them.
  for (const square of penSquares(pen, origin)) {
    const floor = create("span", "floor");
    setVars(floor, { x: square.x, y: square.y });
    parts.push(floor);
  }
  for (const square of penSquares(pen, origin)) {
    if (rng.next() < 0.4) {
      parts.push(tile(rng.pick(DECOR_FILES.groundCover), "tile--ground", square.x, square.y, 0));
    }
  }
  for (let y = 0; y < pen.height; y++) {
    for (let x = 0; x < pen.width; x++) {
      if (terrainAt(pen, x, y) === "rock") {
        parts.push(tile(DECOR_FILES.rock, "tile--rock", origin.x + x, origin.y + y, 0.85));
      }
    }
  }

  // Scenery goes on the outer edge of the scene, framing the pen but leaving the yard free,
  // and into any outside corner of the grid that the fence does not use.
  const fenced = new Set(layout.fence.map((post) => `${post.x},${post.y}`));
  const holdsScenery = (x: number, y: number): boolean => {
    if (fenced.has(`${x},${y}`)) return false;
    const onEdge = x === 0 || x === layout.cols - 1 || y === 0;
    const penX = x - origin.x;
    const penY = y - origin.y;
    const inPenGrid = penX >= 0 && penY >= 0 && penX < pen.width && penY < pen.height;
    return onEdge || (inPenGrid && terrainAt(pen, penX, penY) === "outside");
  };
  for (let y = 0; y < layout.rows; y++) {
    for (let x = 0; x < layout.cols; x++) {
      if (holdsScenery(x, y) && rng.next() < 0.55) {
        parts.push(tile(rng.pick(DECOR_FILES.scenery), "tile--scenery", x, y, 0.8));
      }
    }
  }

  // The fence. Each post gets its own random fall, used only when the fence breaks.
  for (const post of layout.fence) {
    const element = tile(fenceFile(post.tile), "tile--fence", post.x, post.y, 0.75);
    setVars(element, {
      bx: (rng.next() - 0.5) * 0.7,
      by: 0.15 + rng.next() * 0.35,
      br: `${Math.round((rng.next() - 0.5) * 50)}deg`,
      bd: `${Math.round(rng.next() * 150)}ms`,
    });
    parts.push(element);
  }

  root.append(...parts, cowLayer);

  return {
    element: root,
    layout,
    cowLayer,
    setBroken: (broken) => root.classList.toggle("is-broken", broken),
  };
}
