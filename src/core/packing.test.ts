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

  it("turns a two-headed cow to fit a one-wide pen", () => {
    const p = pen(".", ".");
    const cows = herdOf("twoHeaded");
    const placements = findPacking(p, cows);
    expect(placements).not.toBeNull();
    assertValidPacking(p, cows, placements ?? []);
  });

  it("tiles a 3x3 pen with four two-headed cows but not five", () => {
    const p = pen("...", "...", "...");
    const four = herdOf("twoHeaded", "twoHeaded", "twoHeaded", "twoHeaded");
    const placements = findPacking(p, four);
    expect(placements).not.toBeNull();
    assertValidPacking(p, four, placements ?? []);
    const fifth = { id: 4, kind: "twoHeaded" as const, skin: 0 };
    expect(findPacking(p, [...four, fifth])).toBeNull();
  });

  it("knows geometry, not just counting: a parity-broken pen is full with squares to spare", () => {
    // 8 free squares, but 5 of one chessboard colour and 3 of the other:
    // four dominoes can never cover it even though 4 x 2 = 8.
    const p = pen(".#.", "...", "...");
    const four = herdOf("twoHeaded", "twoHeaded", "twoHeaded", "twoHeaded");
    expect(squaresNeeded(four)).toBe(p.capacity);
    expect(findPacking(p, four)).toBeNull();
    // The same pen with the rock in the middle is a ring of 8 and tiles fine.
    const ring = pen("...", ".#.", "...");
    expect(findPacking(ring, four)).not.toBeNull();
  });

  it("mixes single and two-square cows", () => {
    const p = pen("....", "....");
    const cows = herdOf("twoHeaded", "normal", "golden", "twoHeaded", "normal", "normal");
    const placements = findPacking(p, cows);
    expect(placements).not.toBeNull();
    assertValidPacking(p, cows, placements ?? []);
  });

  it("returns placements ordered by cow id", () => {
    const p = pen("...", "...");
    const placements = findPacking(p, herdOf("normal", "twoHeaded", "golden")) ?? [];
    expect(placements.map((placement) => placement.cowId)).toEqual([0, 1, 2]);
  });

  it("agrees with an independent brute force search on random small instances", () => {
    const rng = createRng(2026);
    const kinds: CowKindId[] = ["normal", "golden", "twoHeaded"];

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

/** Deliberately naive: tries every position of every cow with no pruning of any kind. */
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
