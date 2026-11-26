import { describe, expect, it } from "vitest";

import { compileLevels } from "../core";
import { LEVEL_DEFINITIONS } from "../levels/definitions";
import { dailyKey, dailyLevel, dailySeed, dailyStreak, msUntilNextDay, previousDay } from "./daily";
import { dailyBoard, recordScore } from "./progress";
import { emptySave, type SaveData } from "./save";

const levels = compileLevels(LEVEL_DEFINITIONS);

const played = (...days: string[]): SaveData =>
  days.reduce((save, day) => recordScore(save, dailyBoard(day), 1), emptySave());

describe("dailyKey", () => {
  it("uses the UTC date, whatever the local time zone is", () => {
    expect(dailyKey(new Date("2026-11-25T23:59:59Z"))).toBe("2026-11-25");
    expect(dailyKey(new Date("2026-11-26T00:00:00Z"))).toBe("2026-11-26");
  });
});

describe("previousDay", () => {
  it("steps back over month, year and leap day boundaries", () => {
    expect(previousDay("2026-11-25")).toBe("2026-11-24");
    expect(previousDay("2026-03-01")).toBe("2026-02-28");
    expect(previousDay("2028-03-01")).toBe("2028-02-29");
    expect(previousDay("2027-01-01")).toBe("2026-12-31");
  });

  it("rejects things that are not dates", () => {
    for (const bad of ["", "today", "2026-13-01", "2026-02-30", "26-11-25"]) {
      expect(() => previousDay(bad)).toThrow(RangeError);
    }
  });
});

describe("the challenge of the day", () => {
  it("is the same for everybody on the same day", () => {
    expect(dailySeed("2026-11-25")).toBe(dailySeed("2026-11-25"));
    expect(dailyLevel(levels, "2026-11-25")).toBe(dailyLevel(levels, "2026-11-25"));
  });

  it("changes from day to day", () => {
    expect(dailySeed("2026-11-25")).not.toBe(dailySeed("2026-11-26"));
  });

  it("eventually plays every pen", () => {
    const seen = new Set<string>();
    for (let day = 1; day <= 60; day++) {
      const key = dailyKey(new Date(Date.UTC(2026, 0, day)));
      seen.add(dailyLevel(levels, key).id);
    }
    expect(seen.size).toBe(levels.length);
  });
});

describe("dailyStreak", () => {
  const today = "2026-11-25";

  it("is zero when nothing was played lately", () => {
    expect(dailyStreak(emptySave(), today)).toBe(0);
    expect(dailyStreak(played("2026-11-20"), today)).toBe(0);
  });

  it("counts consecutive days including today", () => {
    expect(dailyStreak(played("2026-11-23", "2026-11-24", "2026-11-25"), today)).toBe(3);
  });

  it("keeps a streak alive until the day is over", () => {
    expect(dailyStreak(played("2026-11-23", "2026-11-24"), today)).toBe(2);
  });

  it("stops at the first gap", () => {
    const save = played("2026-11-20", "2026-11-22", "2026-11-23", "2026-11-25");
    expect(dailyStreak(save, today)).toBe(1);
  });
});

describe("msUntilNextDay", () => {
  it("counts down to the next UTC midnight", () => {
    expect(msUntilNextDay(new Date("2026-11-25T12:00:00Z"))).toBe(12 * 60 * 60 * 1000);
    expect(msUntilNextDay(new Date("2026-11-25T23:59:59Z"))).toBe(1000);
  });

  it("is a whole day at midnight itself", () => {
    expect(msUntilNextDay(new Date("2026-11-26T00:00:00Z"))).toBe(24 * 60 * 60 * 1000);
  });
});
