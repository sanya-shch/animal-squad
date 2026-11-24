import { describe, expect, it } from "vitest";

import { computePar, rateRound, resolveRound } from "./round";
import { herdOf, pen } from "./testing";

// 4 squares. The first two cows take 3 of them, so the third (a fat one) no longer fits.
const square = pen("..", "..");
const herd = herdOf("normal", "fat", "fat", "normal", "normal");

describe("computePar", () => {
  it("finds the longest prefix of the queue that fits", () => {
    expect(computePar(square, herd)).toEqual({ cows: 2, points: 2 });
  });

  it("values two-headed cows double", () => {
    const herd = herdOf("twoHeaded", "twoHeaded", "twoHeaded", "twoHeaded", "normal");
    expect(computePar(square, herd)).toEqual({ cows: 4, points: 8 });
  });

  it("is zero when not even the first cow fits", () => {
    const cramped = pen(".", "#");
    expect(computePar(cramped, herdOf("fat", "normal"))).toEqual({ cows: 0, points: 0 });
  });
});

describe("resolveRound", () => {
  it("is empty when nobody was let in", () => {
    expect(resolveRound(square, herd, 0).status).toBe("empty");
  });

  it("succeeds with 3 stars on a perfect round", () => {
    const result = resolveRound(square, herd, 2);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.points).toBe(2);
      expect(result.stars).toBe(3);
      expect(result.placements).toHaveLength(2);
    }
  });

  it("gives fewer stars when the player stopped too early", () => {
    const result = resolveRound(square, herd, 1);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.points).toBe(1);
      expect(result.stars).toBe(1);
    }
  });

  it("overflows when the admitted cows do not fit", () => {
    const result = resolveRound(square, herd, 3);
    expect(result.status).toBe("overflow");
    if (result.status === "overflow") expect(result.admitted).toHaveLength(3);
  });

  it("always reports par, whatever the outcome", () => {
    for (const count of [0, 1, 2, 3, 5]) {
      expect(resolveRound(square, herd, count).par).toEqual({ cows: 2, points: 2 });
    }
  });

  it("rejects impossible counts", () => {
    expect(() => resolveRound(square, herd, -1)).toThrow(RangeError);
    expect(() => resolveRound(square, herd, 6)).toThrow(RangeError);
    expect(() => resolveRound(square, herd, 1.5)).toThrow(RangeError);
  });
});

describe("rateRound", () => {
  it("rates by share of par", () => {
    expect(rateRound(4, 4)).toBe(3);
    expect(rateRound(3, 4)).toBe(2);
    expect(rateRound(2, 4)).toBe(1);
    expect(rateRound(1, 0)).toBe(1);
  });
});
