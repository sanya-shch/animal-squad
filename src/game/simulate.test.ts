import { describe, expect, it } from "vitest";

import { compileLevel } from "../core";
import { ROUNDS_PER_RUN } from "./run";
import { expectedFill, fixedCount, simulateRun, withLag } from "./simulate";

const level = compileLevel({
  id: "test",
  name: "Test",
  layout: ["...", "...", "..."],
  herd: { size: 12, spawnWeights: { normal: 8, fat: 2, twoHeaded: 2 } },
  goals: [10, 20, 30],
});

describe("simulateRun", () => {
  it("is deterministic", () => {
    expect(simulateRun(level, 7, fixedCount(3))).toEqual(simulateRun(level, 7, fixedCount(3)));
  });

  it("always ends: a run has a fixed number of rounds", () => {
    const result = simulateRun(level, 1, fixedCount(1));
    expect(result.rounds).toBe(ROUNDS_PER_RUN);
  });

  it("scores a cautious player roughly one point per round", () => {
    const { score } = simulateRun(level, 1, fixedCount(1));
    expect(score >= ROUNDS_PER_RUN && score <= ROUNDS_PER_RUN * 2).toBe(true);
  });

  it("ends early when a reckless player breaks the fence three times", () => {
    const result = simulateRun(level, 1, () => true);
    expect(result.score).toBe(0);
    expect(result.rounds).toBe(3);
  });

  it("gives up after maxRounds on a player who never lets anybody in", () => {
    const result = simulateRun(level, 1, () => false, 5);
    expect(result.score).toBe(0);
  });
});

describe("robot players", () => {
  it("expectedFill stops sooner when it is told to be more careful", () => {
    const view = (admitted: number) => ({
      level,
      admitted,
      silhouettes: Array.from({ length: 12 }, () => "calf" as const),
    });
    // 9 squares at 50% is 4.5: a fourth calf still fits (4 <= 4.5), a fifth does not.
    expect(expectedFill(level, 0.5)(view(3))).toBe(true);
    expect(expectedFill(level, 0.5)(view(4))).toBe(false);
    expect(expectedFill(level, 1)(view(8))).toBe(true);
    expect(expectedFill(level, 1)(view(9))).toBe(false);
  });

  it("assumes that a mutant takes the average mutant's size", () => {
    // Half of the mutants are fat (2 squares), half two-headed (1 square): 1.5 on average.
    const view = {
      level,
      admitted: 4,
      silhouettes: ["mutant", "mutant", "mutant", "mutant", "mutant"] as const,
    };
    expect(expectedFill(level, 1)(view)).toBe(true); // 4 x 1.5 + 1.5 = 7.5 <= 9
    expect(expectedFill(level, 0.8)(view)).toBe(false); // 7.5 > 7.2
  });

  it("withLag lets in extra cows after the stop decision, and starts fresh every round", () => {
    const policy = withLag(fixedCount(2), 1);
    const decisions = [0, 1, 2, 3].map((admitted) =>
      policy({ level, admitted, silhouettes: [] }),
    );
    expect(decisions).toEqual([true, true, true, false]);
    // A new round: the count falls back to 0 and the old decision is forgotten.
    expect(policy({ level, admitted: 0, silhouettes: [] })).toBe(true);
  });
});
