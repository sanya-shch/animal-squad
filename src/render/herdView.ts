import {
  createRng,
  hashSeed,
  shapesOf,
  type Cell,
  type Cow,
  type Level,
  type Placement,
} from "../core";
import type { GameState } from "../game";
import { assetUrl } from "./assets";
import { create, setVars, sprite } from "./dom";
import {
  burstSpot,
  crowdSpot,
  footprintOf,
  penSquares,
  queueSpots,
  spriteGeometry,
  type Point,
} from "./layout";
import type { Scene } from "./scene";
import { calfFile, cowSpriteFile } from "./spriteFiles";
import { REVEAL_STAGGER_MS } from "./timing";

type CowPhase = "queued" | "inside" | "grown" | "burst";

interface CowView {
  readonly element: HTMLElement;
  readonly crowd: Point;
  phase: CowPhase;
}

export interface HerdView {
  // Brings the view in line with the game. Only what really changed touches the DOM.
  update: (state: GameState) => void;
  destroy: () => void;
}

const depth = (y: number): number => Math.round(y * 10);

/**
 * Shows the herd. Cows are real elements that live for one round. Their positions are
 * CSS custom properties, and a cow only ever changes `data-phase`: the stylesheet does all
 * the animating, so the browser can run it on the compositor without any per-frame script.
 */
export function createHerdView(scene: Scene, level: Level): HerdView {
  const { layout } = scene;
  const squares = penSquares(level.pen, layout.origin);
  const pending = new Set<ReturnType<typeof setTimeout>>();

  let herd: readonly Cow[] | undefined;
  let group: HTMLElement | undefined;
  let views: CowView[] = [];
  let revealedFor: unknown;

  const setPhase = (view: CowView, phase: CowPhase): void => {
    if (view.phase === phase) return;
    view.phase = phase;
    view.element.dataset["phase"] = phase;
  };

  const retire = (old: HTMLElement): void => {
    old.classList.add("is-leaving");
    const timer = setTimeout(() => {
      old.remove();
      pending.delete(timer);
    }, 250);
    pending.add(timer);
  };

  const build = (state: GameState): void => {
    if (group) retire(group);
    herd = state.herd;
    revealedFor = undefined;
    scene.setBroken(false);

    const { run } = state;
    const rng = createRng(hashSeed(`herd:${level.id}:${run.seed}:${run.round}`));
    const spots = queueSpots(layout, state.herd.length, rng);
    group = create("div", "herd");

    views = state.herd.map((cow, index) => {
      const queue = spots[index] as Point;
      const crowd = crowdSpot(squares, rng);
      const element = create("div", "cow");
      element.dataset["phase"] = "queued";
      setVars(element, {
        qx: queue.x,
        qy: queue.y,
        qz: depth(queue.y + 0.3),
        gx: layout.gate.x,
        gy: layout.gate.y,
        cx: crowd.x,
        cy: crowd.y,
        cz: depth(crowd.y + 0.3),
        i: index,
      });
      // The full-grown sprite starts loading and decoding now, so it can appear without a hitch.
      const grown = sprite(assetUrl(cowSpriteFile(cow.kind, cow.skin)), "cow__sprite");
      void grown.decode().catch(() => undefined);
      element.append(
        create("span", "cow__shadow"),
        grown,
        sprite(assetUrl(calfFile(cow.kind)), "cow__calf"),
      );
      group?.append(element);
      return { element, crowd, phase: "queued" };
    });

    scene.cowLayer.append(group);
  };

  // Puts a grown cow on `cells` (pen coordinates), or anywhere if `at` is given.
  const grow = (view: CowView, cow: Cow, cells: readonly Cell[], at: Point | undefined): void => {
    const { left, right, top, bottom } = footprintOf(cells);
    // For a burst the cow is centred on `at`. Otherwise the cells say where it stands.
    const origin: Point = at
      ? { x: at.x - (left + right) / 2, y: at.y - (top + bottom) / 2 }
      : layout.origin;
    const geometry = spriteGeometry(cow.kind, cells, origin);
    const stands = geometry.rotation === 0 ? bottom - top : right - left;
    setVars(view.element, {
      fx: geometry.centre.x,
      fy: geometry.centre.y,
      fz: depth(geometry.centre.y + (bottom - top) / 2),
      sd: geometry.size,
      sdy: geometry.offsetY,
      rot: `${geometry.rotation}deg`,
      shw: Math.max(right - left, bottom - top) * 0.8,
      shy: stands / 2 - 0.12,
    });
  };

  const reveal = (state: Extract<GameState, { phase: "result" }>): void => {
    const { result } = state;
    if (result.status === "empty") return;

    const rng = createRng(hashSeed(`reveal:${level.id}:${state.run.seed}:${state.run.round}`));
    const admitted = views.slice(0, result.admitted.length);

    if (result.status === "success") {
      const byCow = new Map<number, Placement>(result.placements.map((p) => [p.cowId, p]));
      admitted.forEach((view, index) => {
        const cow = result.admitted[index] as Cow;
        const placement = byCow.get(cow.id);
        if (!placement) return;
        grow(view, cow, placement.cells, undefined);
        setVars(view.element, { delay: `${index * REVEAL_STAGGER_MS}ms` });
        setPhase(view, "grown");
      });
    } else {
      scene.setBroken(true);
      admitted.forEach((view, index) => {
        const cow = result.admitted[index] as Cow;
        const shape = shapesOf(cow.kind)[0] ?? [];
        const cells = shape.map(([dx, dy]) => ({ x: dx, y: dy }));
        grow(view, cow, cells, burstSpot(layout, view.crowd, rng));
        setVars(view.element, { delay: `${index * REVEAL_STAGGER_MS}ms` });
        setPhase(view, "burst");
      });
    }
  };

  return {
    update: (state) => {
      if (state.herd !== herd) build(state);

      if (state.phase === "admitting") {
        views.forEach((view, index) => {
          if (index < state.admitted) setPhase(view, "inside");
        });
      } else if (state.phase === "result" && revealedFor !== state) {
        revealedFor = state;
        reveal(state);
      }
    },
    destroy: () => {
      for (const timer of pending) clearTimeout(timer);
      pending.clear();
      group?.remove();
      views = [];
    },
  };
}
