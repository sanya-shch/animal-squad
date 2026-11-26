import { describe, expect, it } from "vitest";

import { clockTime, plural } from "./text";

describe("plural", () => {
  it("uses the singular for exactly one", () => {
    expect(plural(1, "cow")).toBe("1 cow");
  });

  it("uses the plural for everything else, zero included", () => {
    expect(plural(0, "cow")).toBe("0 cows");
    expect(plural(2, "point")).toBe("2 points");
    expect(plural(11, "day")).toBe("11 days");
  });
});

describe("clockTime", () => {
  it("splits a duration into padded hours and minutes", () => {
    expect(clockTime(8 * 3_600_000 + 42 * 60_000)).toEqual({ hours: "08", minutes: "42" });
    expect(clockTime(23 * 3_600_000 + 59 * 60_000 + 59_999)).toEqual({
      hours: "23",
      minutes: "59",
    });
  });

  it("never goes below zero", () => {
    expect(clockTime(0)).toEqual({ hours: "00", minutes: "00" });
    expect(clockTime(-5_000)).toEqual({ hours: "00", minutes: "00" });
  });
});
