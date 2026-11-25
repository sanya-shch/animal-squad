import { describe, expect, it } from "vitest";

import { compileLevels, type Level } from "../core";
import {
  bestScore,
  dailyBoard,
  DAILY_HISTORY_DAYS,
  levelBoard,
  levelStars,
  nextGoal,
  recordScore,
  starsFor,
  unlockedLevelIds,
} from "./progress";
import { emptySave } from "./save";

const levels: Level[] = compileLevels(
  ["a", "b", "c"].map((id) => ({
    id,
    name: id.toUpperCase(),
    layout: ["..", ".."],
    herd: { size: 5, spawnWeights: { normal: 1 } },
    goals: [10, 20, 30] as const,
  })),
);

describe("recordScore", () => {
  it("remembers a first score, even a zero", () => {
    const first = recordScore(emptySave(), levelBoard("a"), 0);
    expect(first).not.toBe(emptySave());
    expect(first.levels.get("a")).toBe(0);
  });

  it("only ever raises the best score", () => {
    const one = recordScore(emptySave(), levelBoard("a"), 12);
    expect(recordScore(one, levelBoard("a"), 5)).toBe(one);
    expect(recordScore(one, levelBoard("a"), 12)).toBe(one);
    expect(bestScore(recordScore(one, levelBoard("a"), 20), levelBoard("a"))).toBe(20);
  });

  it("does not modify the save it was given", () => {
    const before = emptySave();
    recordScore(before, levelBoard("a"), 12);
    expect(before.levels.size).toBe(0);
  });

  it("keeps pens and days apart", () => {
    let save = recordScore(emptySave(), levelBoard("a"), 5);
    save = recordScore(save, dailyBoard("2026-11-25"), 9);
    expect(bestScore(save, levelBoard("a"))).toBe(5);
    expect(bestScore(save, dailyBoard("2026-11-25"))).toBe(9);
    expect(bestScore(save, levelBoard("b"))).toBe(0);
  });

  it("rejects scores that make no sense", () => {
    for (const score of [-1, 1.5, Number.NaN]) {
      expect(() => recordScore(emptySave(), levelBoard("a"), score)).toThrow(RangeError);
    }
  });

  it("keeps only the newest days of the daily history", () => {
    let save = emptySave();
    for (let day = 1; day <= DAILY_HISTORY_DAYS + 10; day++) {
      const date = new Date(Date.UTC(2026, 0, day)).toISOString().slice(0, 10);
      save = recordScore(save, dailyBoard(date), day);
    }
    expect(save.daily.size).toBe(DAILY_HISTORY_DAYS);
    expect(save.daily.has("2026-01-10")).toBe(false); // the oldest ten were dropped
    expect(save.daily.has("2026-01-11")).toBe(true);
    expect(save.daily.has("2026-03-11")).toBe(true); // day 70, the newest
  });
});

describe("stars and goals", () => {
  const goals = [10, 20, 30] as const;

  it("counts the goals a score has reached", () => {
    expect([0, 9, 10, 19, 20, 29, 30, 99].map((score) => starsFor(goals, score))).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3,
    ]);
  });

  it("names the next goal until all three stars are earned", () => {
    expect(nextGoal(goals, 0)).toBe(10);
    expect(nextGoal(goals, 10)).toBe(20);
    expect(nextGoal(goals, 29)).toBe(30);
    expect(nextGoal(goals, 30)).toBeUndefined();
  });
});

describe("unlockedLevelIds", () => {
  it("opens only the first pen at the start", () => {
    expect([...unlockedLevelIds(levels, emptySave())]).toEqual(["a"]);
  });

  it("opens the next pen with a star on the one before it", () => {
    let save = recordScore(emptySave(), levelBoard("a"), 9);
    expect([...unlockedLevelIds(levels, save)]).toEqual(["a"]);
    save = recordScore(save, levelBoard("a"), 10);
    expect([...unlockedLevelIds(levels, save)]).toEqual(["a", "b"]);
    expect(levelStars(save, levels[0] as Level)).toBe(1);
  });

  it("does not skip ahead: a star on the third pen alone opens nothing", () => {
    const save = recordScore(emptySave(), levelBoard("c"), 30);
    expect([...unlockedLevelIds(levels, save)]).toEqual(["a"]);
  });
});
