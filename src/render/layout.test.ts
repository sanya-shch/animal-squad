import { describe, expect, it } from "vitest";

import { compileLevels, createRng } from "../core";
import { pen } from "../core/testing";
import { LEVEL_DEFINITIONS } from "../levels/definitions";
import {
  burstSpot,
  crowdSpot,
  fenceTileFor,
  layoutScene,
  penSquares,
  queueSpots,
  SCENE_MARGIN,
  spriteGeometry,
  YARD_ROWS,
  type FenceTile,
  type Point,
} from "./layout";

const tileAt = (fence: readonly FenceTile[], x: number, y: number): number | undefined =>
  fence.find((post) => post.x === x && post.y === y)?.tile;

describe("fenceTileFor", () => {
  it("picks the sprite that joins exactly the rails that exist", () => {
    expect([1, 2]).toContain(fenceTileFor(true, true, false, 0));
    expect(fenceTileFor(true, false, true, 0)).toBe(7); // top-left corner
    expect(fenceTileFor(false, true, true, 0)).toBe(8); // top-right corner
    expect([3, 10]).toContain(fenceTileFor(true, false, false, 0));
    expect([4, 9]).toContain(fenceTileFor(false, true, false, 0));
    expect([5, 11]).toContain(fenceTileFor(false, false, true, 0));
    expect(fenceTileFor(false, false, false, 0)).toBe(6); // a lonely post
  });

  it("alternates between the two look-alike sprites", () => {
    expect(fenceTileFor(true, true, false, 0)).not.toBe(fenceTileFor(true, true, false, 1));
  });
});

describe("layoutScene", () => {
  const rectangle = layoutScene(pen("...", "...", "..."));

  it("sizes the scene around the pen", () => {
    expect(rectangle.cols).toBe(3 + 2 * SCENE_MARGIN);
    expect(rectangle.rows).toBe(SCENE_MARGIN + 3 + 1 + YARD_ROWS);
    expect(rectangle.origin).toEqual({ x: SCENE_MARGIN, y: SCENE_MARGIN });
  });

  it("closes a rectangular pen with a full ring of posts, minus the gate", () => {
    // Ring around a 3x3 pen: 5x5 posts on the outline = 16, one of them opened as the gate.
    expect(rectangle.fence).toHaveLength(16 - 1);
  });

  it("draws the right corner pieces", () => {
    const { fence } = rectangle;
    const [left, top, right, bottom] = [1, 1, 5, 5]; // ring around the pen, in scene squares
    expect(tileAt(fence, left, top)).toBe(7);
    expect(tileAt(fence, right, top)).toBe(8);
    expect([3, 10]).toContain(tileAt(fence, left, bottom)); // east rail only
    expect([4, 9]).toContain(tileAt(fence, right, bottom)); // west rail only
  });

  it("puts the gate in the middle of the bottom wall, at the fence's row", () => {
    expect(rectangle.gate.y).toBe(SCENE_MARGIN + 3 + 0.5);
    expect(rectangle.gate.x).toBe(rectangle.cols / 2);
    // Nothing is drawn where cows walk through.
    expect(tileAt(rectangle.fence, 3, SCENE_MARGIN + 3)).toBeUndefined();
  });

  it("opens a two square wide gate when the wall is wide enough", () => {
    const wide = layoutScene(pen("....", "....", "...."));
    expect(wide.fence).toHaveLength(18 - 2);
    expect(wide.gate.x).toBe(wide.cols / 2);
  });

  it("leaves the gate ends as rail stubs", () => {
    const wide = layoutScene(pen("....", "....", "...."));
    const gateRow = SCENE_MARGIN + 3;
    expect([4, 9]).toContain(tileAt(wide.fence, 2, gateRow)); // rail only on the west side
    expect([3, 10]).toContain(tileAt(wide.fence, 5, gateRow)); // rail only on the east side
  });

  it("follows irregular outlines: notches get their own posts", () => {
    const notched = layoutScene(pen("..-", "..."));
    // The outside square in the corner touches the pen, so it carries a post as well.
    expect(tileAt(notched.fence, SCENE_MARGIN + 2, SCENE_MARGIN)).toBeDefined();
  });

  it("keeps rocks inside the fence", () => {
    const withRock = layoutScene(pen("...", ".#.", "..."));
    expect(withRock.fence).toHaveLength(rectangle.fence.length);
  });

  it("refuses a pen with no floor behind any wall", () => {
    expect(() => layoutScene(pen("#"))).toThrow();
  });

  it("can lay out every shipped level, with the gate on its bottom wall", () => {
    for (const level of compileLevels(LEVEL_DEFINITIONS)) {
      const layout = layoutScene(level.pen);
      expect(layout.fence.length).toBeGreaterThan(0);
      expect(layout.gate.y).toBeGreaterThan(layout.origin.y + level.pen.height - 1);
      expect(layout.gate.y).toBeLessThan(layout.yard.top);
      for (const post of layout.fence) {
        expect(post.tile >= 1 && post.tile <= 11).toBe(true);
      }
    }
  });
});

describe("queueSpots", () => {
  const layout = layoutScene(pen("...", "...", "..."));

  it("is deterministic and gives one spot per cow", () => {
    expect(queueSpots(layout, 12, createRng(1))).toEqual(queueSpots(layout, 12, createRng(1)));
    expect(queueSpots(layout, 12, createRng(1))).toHaveLength(12);
  });

  it("keeps everybody inside the yard", () => {
    for (const spot of queueSpots(layout, 12, createRng(3))) {
      expect(spot.x >= layout.yard.left && spot.x <= layout.yard.right).toBe(true);
      expect(spot.y >= layout.yard.top && spot.y <= layout.yard.bottom).toBe(true);
    }
  });

  it("puts the first cow nearest to the gate", () => {
    const spots = queueSpots(layout, 12, createRng(3));
    const distance = (p: Point): number => Math.hypot(p.x - layout.gate.x, p.y - layout.gate.y);
    const first = spots[0] as Point;
    for (const spot of spots.slice(1)) {
      expect(distance(first) <= distance(spot) + 0.5).toBe(true);
    }
  });

  it("makes room for a big herd by adding rows", () => {
    expect(queueSpots(layout, 40, createRng(1))).toHaveLength(40);
  });
});

describe("crowdSpot and burstSpot", () => {
  const level = pen("...", ".#.", "...");
  const layout = layoutScene(level);
  const squares = penSquares(level, layout.origin);

  it("lists only the squares that can hold cows", () => {
    expect(squares).toHaveLength(8);
    expect(squares.some((s) => s.x === layout.origin.x + 1 && s.y === layout.origin.y + 1)).toBe(
      false,
    );
  });

  it("keeps a crowded calf on its square", () => {
    const rng = createRng(4);
    for (let i = 0; i < 50; i++) {
      const spot = crowdSpot(squares, rng);
      const onSquare = squares.some(
        (s) => spot.x >= s.x && spot.x <= s.x + 1 && spot.y >= s.y && spot.y <= s.y + 1,
      );
      expect(onSquare).toBe(true);
    }
  });

  it("scatters a burst cow away from the middle but never out of the scene", () => {
    const rng = createRng(6);
    for (let i = 0; i < 50; i++) {
      const spot = burstSpot(layout, crowdSpot(squares, rng), rng);
      expect(spot.x >= 1 && spot.x <= layout.cols - 1).toBe(true);
      expect(spot.y >= 1.5 && spot.y <= layout.rows).toBe(true);
    }
  });
});

describe("spriteGeometry", () => {
  const origin = { x: 2, y: 2 };

  it("stands a single square cow on the bottom edge of its square", () => {
    const geometry = spriteGeometry("normal", [{ x: 1, y: 0 }], origin);
    expect(geometry.centre).toEqual({ x: 3.5, y: 2.5 });
    expect(geometry.rotation).toBe(0);
    // Its lower edge lands just below the square's bottom edge.
    const lowerEdge = geometry.centre.y + geometry.offsetY + geometry.size / 2;
    expect(lowerEdge).toBeCloseTo(3.1, 5);
  });

  it("lets a fat cow rise above the squares it stands on", () => {
    const geometry = spriteGeometry(
      "fat",
      [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      origin,
    );
    const upperEdge = geometry.centre.y + geometry.offsetY - geometry.size / 2;
    expect(upperEdge).toBeLessThan(origin.y + 1); // above the top of its row
  });

  it("centres a fat cow on both of its squares", () => {
    const geometry = spriteGeometry(
      "fat",
      [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      origin,
    );
    expect(geometry.centre).toEqual({ x: 3, y: 3.5 });
    expect(geometry.rotation).toBe(0);
  });

  it("turns a fat cow that stands lengthways", () => {
    const geometry = spriteGeometry(
      "fat",
      [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ],
      origin,
    );
    expect(geometry.rotation).toBe(90);
    expect(geometry.centre).toEqual({ x: 2.5, y: 3 });
    expect(geometry.offsetY).toBe(0);
  });
});
