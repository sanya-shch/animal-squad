import { describe, expect, it } from "vitest";

import { compileLevel, compileLevels, LevelError, type LevelDefinition } from "./level";

const valid: LevelDefinition = {
  id: "test",
  name: "Test",
  layout: ["..", ".."],
  herd: { size: 5, spawnWeights: { normal: 1 } },
};

describe("compileLevel", () => {
  it("accepts a valid definition", () => {
    const level = compileLevel(valid);
    expect(level.pen.capacity).toBe(4);
    expect(level.herd.size).toBe(5);
  });

  it("requires the herd to be bigger than the pen", () => {
    const tooSmall = { ...valid, herd: { size: 4, spawnWeights: { normal: 1 } } };
    expect(() => compileLevel(tooSmall)).toThrow(LevelError);
  });

  it("rejects a bad layout, with the level id in the message", () => {
    expect(() => compileLevel({ ...valid, layout: ["..", "?."] })).toThrow(/test/);
  });

  it("rejects unknown kinds, negative and all-zero weights", () => {
    const withWeights = (spawnWeights: object): LevelDefinition => ({
      ...valid,
      herd: { size: 5, spawnWeights },
    });
    expect(() => compileLevel(withWeights({ unicorn: 1 }))).toThrow(LevelError);
    expect(() => compileLevel(withWeights({ normal: -1 }))).toThrow(LevelError);
    expect(() => compileLevel(withWeights({ normal: 0 }))).toThrow(LevelError);
    expect(() => compileLevel(withWeights({}))).toThrow(LevelError);
  });

  it("rejects an empty id and non-integer herd size", () => {
    expect(() => compileLevel({ ...valid, id: " " })).toThrow(LevelError);
    const fractional = { ...valid, herd: { size: 5.5, spawnWeights: { normal: 1 } } };
    expect(() => compileLevel(fractional)).toThrow(LevelError);
  });
});

describe("compileLevels", () => {
  it("rejects duplicate ids", () => {
    expect(() => compileLevels([valid, valid])).toThrow(LevelError);
  });
});
