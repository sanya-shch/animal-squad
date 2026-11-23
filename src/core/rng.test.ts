import { describe, expect, it } from "vitest";

import { createRng, hashSeed } from "./rng";

describe("createRng", () => {
  it("produces the same sequence for the same seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const sequenceA = Array.from({ length: 20 }, () => a.next());
    const sequenceB = Array.from({ length: 20 }, () => b.next());
    expect(sequenceA).toEqual(sequenceB);
  });

  it("produces different sequences for different seeds", () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it("keeps next() inside [0, 1)", () => {
    const rng = createRng(7);
    for (let i = 0; i < 5000; i++) {
      const value = rng.next();
      expect(value >= 0 && value < 1).toBe(true);
    }
  });

  it("int() is inclusive on both ends and rejects bad ranges", () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rng.int(1, 4));
    expect([...seen].sort()).toEqual([1, 2, 3, 4]);
    expect(() => rng.int(5, 1)).toThrow(RangeError);
    expect(() => rng.int(0.5, 2)).toThrow(RangeError);
  });

  it("weighted() never picks zero-weight keys and follows the proportions", () => {
    const rng = createRng(11);
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 10_000; i++) counts[rng.weighted({ a: 3, b: 1, c: 0 })]++;
    expect(counts.c).toBe(0);
    const ratio = counts.a / counts.b;
    expect(ratio > 2.6 && ratio < 3.4).toBe(true);
  });

  it("weighted() throws when nothing can be picked", () => {
    expect(() => createRng(1).weighted({ a: 0 })).toThrow(RangeError);
    expect(() => createRng(1).weighted({})).toThrow(RangeError);
  });

  it("shuffle() returns a permutation and does not touch the input", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...input];
    const result = createRng(5).shuffle(input);
    expect(input).toEqual(copy);
    expect([...result].sort((x, y) => x - y)).toEqual(copy);
  });

  it("shuffle() is uniform enough: every element reaches the first slot", () => {
    const rng = createRng(9);
    const firsts = new Set<number>();
    for (let i = 0; i < 300; i++) firsts.add(rng.shuffle([0, 1, 2, 3])[0] as number);
    expect(firsts.size).toBe(4);
  });
});

describe("hashSeed", () => {
  it("is stable and sensitive to its input", () => {
    expect(hashSeed("2026-11-23")).toBe(hashSeed("2026-11-23"));
    expect(hashSeed("2026-11-23")).not.toBe(hashSeed("2026-11-24"));
  });
});
