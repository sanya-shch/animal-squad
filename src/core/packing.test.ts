import { describe, expect, it } from "vitest";

import { shapesOf, type Cow, type CowKindId } from "./cows";
import { findPacking } from "./packing";
import { createRng } from "./rng";
import { assertValidPacking, herdOf, pen, squaresNeeded } from "./testing";
import type { Pen } from "./pen";

describe("findPacking", () => {
  it("fits single-square cows up to the capacity and not beyond", () => {
    const p = pen("...", "...", "...");
    const nine = herdOf(...Array.from({ length: 9 }, () => "normal" as const));
    const ten = herdOf(...Array.from({ length: 10 }, () => "normal" as const));
    const placements = findPacking(p, nine);
    expect(placements).not.toBeNull();
    assertValidPacking(p, nine, placements ?? []);
    expect(findPacking(p, ten)).toBeNull();
  });

  it("accepts an empty herd", () => {
    expect(findPacking(pen("."), [])).toEqual([]);
  });

  it("never uses rocks or outside squares", () => {
    const p = pen("-.#", "...");
    const cows = herdOf("normal", "normal", "normal", "normal");
    const placements = findPacking(p, cows);
    expect(placements).not.toBeNull();
    assertValidPacking(p, cows, placements ?? []);
    expect(findPacking(p, herdOf("normal", "normal", "normal", "normal", "normal"))).toBeNull();
  });

  it("never stands a fat cow on its end, so a one-wide pen cannot hold one", () => {
    expect(findPacking(pen(".", "."), herdOf("fat"))).toBeNull();
    const twoWide = pen("..");
    const cows = herdOf("fat");
    const placements = findPacking(twoWide, cows);
    expect(placements).not.toBeNull();
    assertValidPacking(twoWide, cows, placements ?? []);
    expect(placements?.[0]?.cells.map((cell) => cell.y)).toEqual([0, 0]);
  });

  it("lays fat cows side by side: a 3x3 pen holds three of them, not four", () => {
    const p = pen("...", "...", "...");
    const three = herdOf("fat", "fat", "fat");
    const placements = findPacking(p, three);
    expect(placements).not.toBeNull();
    assertValidPacking(p, three, placements ?? []);
    const fourth = { id: 3, kind: "fat" as const, skin: 0 };
    expect(findPacking(p, [...three, fourth])).toBeNull();
  });

  it("knows geometry, not just counting: a pen can be full with squares to spare", () => {
    // 8 free squares, but the rock splits the top row into two single squares:
    // four lying dominoes can never cover it even though 4 x 2 = 8.
    const p = pen(".#.", "...", "...");
    const four = herdOf("fat", "fat", "fat", "fat");
    expect(squaresNeeded(four)).toBe(p.capacity);
    expect(findPacking(p, four)).toBeNull();
    // A pen of the same size with full rows tiles fine.
    expect(findPacking(pen("..", "..", "..", ".."), four)).not.toBeNull();
  });

  it("mixes single and two-square cows", () => {
    const p = pen("....", "....");
    const cows = herdOf("fat", "normal", "twoHeaded", "fat", "normal", "normal");
    const placements = findPacking(p, cows);
    expect(placements).not.toBeNull();
    assertValidPacking(p, cows, placements ?? []);
  });

  it("returns placements ordered by cow id", () => {
    const p = pen("...", "...");
    const placements = findPacking(p, herdOf("normal", "fat", "twoHeaded")) ?? [];
    expect(placements.map((placement) => placement.cowId)).toEqual([0, 1, 2]);
  });

  it("agrees with an independent brute force search on random small instances", () => {
    const rng = createRng(2026);
    const kinds: CowKindId[] = ["normal", "twoHeaded", "fat"];

    for (let round = 0; round < 400; round++) {
      let p: Pen | undefined;
      while (p === undefined) {
        const w = rng.int(2, 3);
        const h = rng.int(2, 3);
        const rows = Array.from({ length: h }, () =>
          Array.from({ length: w }, () => rng.pick([".", ".", ".", "#", "-"])).join(""),
        );
        if (rows.join("").includes(".")) p = pen(...rows);
      }
      const cows: Cow[] = Array.from({ length: rng.int(1, 6) }, (_, id) => ({
        id,
        kind: rng.pick(kinds),
        skin: 0,
      }));

      const result = findPacking(p, cows);
      expect(result !== null).toBe(bruteForceFits(p, cows));
      if (result) assertValidPacking(p, cows, result);
    }
  });
});

// Deliberately naive: tries every position of every cow with no pruning of any kind.
function bruteForceFits(p: Pen, cows: readonly Cow[]): boolean {
  const taken = p.terrain.map((square) => square !== "pen");

  const place = (index: number): boolean => {
    const cow = cows[index];
    if (cow === undefined) return true;
    for (const shape of shapesOf(cow.kind)) {
      for (let y = 0; y < p.height; y++) {
        for (let x = 0; x < p.width; x++) {
          const indices = shape.map(([dx, dy]) => ({ x: x + dx, y: y + dy }));
          const legal = indices.every(
            (c) => c.x < p.width && c.y < p.height && taken[c.y * p.width + c.x] === false,
          );
          if (!legal) continue;
          indices.forEach((c) => (taken[c.y * p.width + c.x] = true));
          const solved = place(index + 1);
          indices.forEach((c) => (taken[c.y * p.width + c.x] = false));
          if (solved) return true;
        }
      }
    }
    return false;
  };

  return place(0);
}
