import { describe, expect, it } from "vitest";

import { summarizeRun, type RunSummaryInput } from "./summary";

const input: RunSummaryInput = {
  score: 25,
  bestBefore: 20,
  goals: [10, 30, 50],
  unlockedBefore: new Set(["a"]),
  unlockedAfter: new Set(["a"]),
};

describe("summarizeRun", () => {
  it("calls a run a new best only when it beats the old one", () => {
    expect(summarizeRun(input).isNewBest).toBe(true);
    expect(summarizeRun({ ...input, score: 20 }).isNewBest).toBe(false);
    expect(summarizeRun({ ...input, score: 5 }).isNewBest).toBe(false);
  });

  it("reports the best score and stars after the run is counted", () => {
    expect(summarizeRun(input)).toMatchObject({ best: 25, stars: 1, nextGoal: 30 });
    const worse = summarizeRun({ ...input, score: 5 });
    expect(worse).toMatchObject({ best: 20, stars: 1, nextGoal: 30 });
    expect(summarizeRun({ ...input, score: 60 })).toMatchObject({ best: 60, stars: 3 });
    expect(summarizeRun({ ...input, score: 60 }).nextGoal).toBeUndefined();
  });

  it("has no stars on a board without goals", () => {
    const summary = summarizeRun({ ...input, goals: undefined });
    expect(summary.stars).toBeUndefined();
    expect(summary.nextGoal).toBeUndefined();
    expect(summary.best).toBe(25);
  });

  it("lists the pens that this run opened", () => {
    const summary = summarizeRun({ ...input, unlockedAfter: new Set(["a", "b", "c"]) });
    expect(summary.unlocked).toEqual(["b", "c"]);
    expect(summarizeRun(input).unlocked).toEqual([]);
  });
});
