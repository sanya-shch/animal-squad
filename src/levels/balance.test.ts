import { describe, expect, it } from "vitest";

import { compileLevels, type Level } from "../core";
import { expectedFill, fixedCount, simulateRun, withLag, type Policy } from "../game/simulate";
import { starsFor } from "../progress";
import { LEVEL_DEFINITIONS } from "./definitions";

/**
 * Robot players stand in for humans: they see exactly what a person sees (which calves look
 * like mutants, how big the pen is) and react one cow late. The star goals are set between
 * what different kinds of players achieve. If a rule or a level changes, these tests say
 * that the goals need another look, and by how much.
 */
const SEEDS = 40;

function starsEarned(level: Level, policy: () => Policy): number[] {
  return Array.from({ length: SEEDS }, (_, seed) =>
    starsFor(level.goals, simulateRun(level, seed, policy()).score),
  );
}

const share = (values: readonly number[], atLeast: number): number =>
  values.filter((value) => value >= atLeast).length / values.length;

describe("star goals", () => {
  for (const level of compileLevels(LEVEL_DEFINITIONS)) {
    describe(level.name, () => {
      it("do not reward a player who only lets in one cow", () => {
        expect(
          share(
            starsEarned(level, () => fixedCount(1)),
            1,
          ),
        ).toBe(0);
      });

      it("give one star to a careful player, but not two", () => {
        const stars = starsEarned(level, () => withLag(expectedFill(level, 0.5), 1));
        expect(share(stars, 1)).toBeGreaterThanOrEqual(0.9);
        expect(share(stars, 2)).toBeLessThanOrEqual(0.1);
      });

      it("give two stars to a decent player most of the time, but not three", () => {
        const stars = starsEarned(level, () => withLag(expectedFill(level, 0.65), 1));
        expect(share(stars, 2)).toBeGreaterThanOrEqual(0.6);
        expect(share(stars, 3)).toBeLessThanOrEqual(0.1);
      });

      it("can be reached in full by a skilled player, but not always", () => {
        const stars = starsEarned(level, () => withLag(expectedFill(level, 0.9), 1));
        expect(share(stars, 3)).toBeGreaterThanOrEqual(0.15);
        expect(share(stars, 3)).toBeLessThan(0.9);
      });
    });
  }
});
