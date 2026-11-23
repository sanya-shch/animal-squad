import { describe, expect, it } from "vitest";

import {
  COW_KINDS,
  compileLevels,
  computePar,
  createRng,
  findPacking,
  generateHerd,
  resolveRound,
} from "../core";
import { LEVEL_DEFINITIONS } from "./definitions";

const levels = compileLevels(LEVEL_DEFINITIONS);

describe("shipped levels", () => {
  it("are all valid and have different pen sizes", () => {
    expect(levels.length).toBeGreaterThanOrEqual(4);
    const capacities = new Set(levels.map((level) => level.pen.capacity));
    expect(capacities.size).toBe(levels.length);
  });

  for (const level of levels) {
    describe(level.name, () => {
      it("generates the same herd for the same seed", () => {
        expect(generateHerd(level, createRng(5))).toEqual(generateHerd(level, createRng(5)));
      });

      it("generates valid cows", () => {
        const herd = generateHerd(level, createRng(1));
        expect(herd).toHaveLength(level.herd.size);
        herd.forEach((cow, index) => {
          expect(cow.id).toBe(index);
          expect(cow.skin >= 0 && cow.skin < COW_KINDS[cow.kind].skins).toBe(true);
        });
      });

      it("is always playable: par exists, fits, and one more cow overflows", () => {
        for (let seed = 0; seed < 150; seed++) {
          const herd = generateHerd(level, createRng(seed));
          const par = computePar(level.pen, herd);

          expect(par.cows).toBeGreaterThan(0);
          expect(par.cows).toBeLessThan(herd.length);
          expect(findPacking(level.pen, herd.slice(0, par.cows))).not.toBeNull();
          expect(resolveRound(level.pen, herd, par.cows + 1).status).toBe("overflow");
        }
      });
    });
  }
});
