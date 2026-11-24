import { describe, expect, it } from "vitest";

import { resolveRound } from "../core";
import { herdOf, pen } from "../core/testing";
import { startRun, STARTING_LIVES } from "./run";
import { scoreRound } from "./scoring";

// A 2x2 pen and five single cows: par is 4 cows for 4 points.
const square = pen("..", "..");
const herd = herdOf("normal", "normal", "normal", "normal", "normal");
const outcome = (admitted: number) => resolveRound(square, herd, admitted);

describe("scoreRound", () => {
  it("starts a run with full lives and no score", () => {
    expect(startRun(7)).toEqual({
      seed: 7,
      round: 1,
      score: 0,
      lives: STARTING_LIVES,
      perfectStreak: 0,
    });
  });

  it("adds the points of a safe round and moves on", () => {
    const { run, gained } = scoreRound(startRun(1), outcome(3));
    expect(gained).toBe(3);
    expect(run).toEqual({ seed: 1, round: 2, score: 3, lives: STARTING_LIVES, perfectStreak: 0 });
  });

  it("costs a life and breaks the streak on overflow", () => {
    const streaking = { ...startRun(1), perfectStreak: 4, score: 10 };
    const { run, gained } = scoreRound(streaking, outcome(5));
    expect(gained).toBe(0);
    expect(run).toEqual({
      seed: 1,
      round: 2,
      score: 10,
      lives: STARTING_LIVES - 1,
      perfectStreak: 0,
    });
  });

  it("rewards chains of perfect rounds", () => {
    let run = startRun(1);
    const gains: number[] = [];
    for (let i = 0; i < 3; i++) {
      const scored = scoreRound(run, outcome(4));
      run = scored.run;
      gains.push(scored.gained);
    }
    expect(gains).toEqual([4, 5, 6]);
    expect(run.perfectStreak).toBe(3);
    expect(run.score).toBe(15);
  });

  it("ends the streak on a safe but imperfect round", () => {
    const streaking = { ...startRun(1), perfectStreak: 2 };
    const { run, gained } = scoreRound(streaking, outcome(3));
    expect(gained).toBe(3);
    expect(run.perfectStreak).toBe(0);
  });

  it("changes nothing when nobody came in", () => {
    const before = { ...startRun(1), score: 5, perfectStreak: 2 };
    const { run, gained } = scoreRound(before, outcome(0));
    expect(gained).toBe(0);
    expect(run).toBe(before);
  });
});
