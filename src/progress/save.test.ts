import { describe, expect, it } from "vitest";

import { emptySave, MAX_SCORE, mergeSaves, parseSave, serializeSave, type SaveData } from "./save";

const save = (levels: [string, number][] = [], daily: [string, number][] = []): SaveData => ({
  levels: new Map(levels),
  daily: new Map(daily),
});

describe("serializeSave / parseSave", () => {
  it("round-trips a save", () => {
    const original = save(
      [
        ["meadow", 42],
        ["lane", 7],
      ],
      [["2026-11-25", 19]],
    );
    expect(parseSave(serializeSave(original))).toEqual(original);
  });

  it("starts empty when there is nothing saved", () => {
    expect(parseSave(null)).toEqual(emptySave());
  });

  it("survives garbage of every kind", () => {
    for (const raw of ["", "{", "null", "42", '"text"', "[]", "{}", '{"v":2}', '{"v":1}']) {
      expect(parseSave(raw)).toEqual(emptySave());
    }
  });

  it("ignores a save from another version, even a well-formed one", () => {
    const future = JSON.stringify({ v: 2, levels: [["meadow", 50]], daily: [] });
    expect(parseSave(future)).toEqual(emptySave());
  });

  it("drops invalid entries one by one and keeps the good ones", () => {
    const raw = JSON.stringify({
      v: 1,
      levels: [
        ["meadow", 30],
        ["Bad Key!", 5],
        ["lane", -1],
        ["paddock", 1.5],
        ["rocky-yard", "9"],
        ["x", MAX_SCORE + 1],
        "nonsense",
        ["only-one"],
        ["lane", 12],
      ],
      daily: [
        ["2026-11-25", 8],
        ["yesterday", 3],
      ],
    });
    expect(parseSave(raw)).toEqual(
      save(
        [
          ["meadow", 30],
          ["lane", 12],
        ],
        [["2026-11-25", 8]],
      ),
    );
  });

  it("keeps the higher score when a key appears twice", () => {
    const raw = JSON.stringify({
      v: 1,
      levels: [
        ["meadow", 5],
        ["meadow", 9],
        ["meadow", 7],
      ],
    });
    expect(parseSave(raw).levels.get("meadow")).toBe(9);
  });

  it("treats keys like __proto__ and constructor as plain strings", () => {
    const raw = '{"v":1,"levels":[["__proto__",5],["constructor",6]],"daily":[]}';
    const parsed = parseSave(raw);
    expect(parsed.levels.has("__proto__")).toBe(false); // not a valid pen id
    expect(parsed.levels.get("constructor")).toBe(6); // harmless as a key of a Map
    expect(Object.getPrototypeOf({})).toBe(Object.prototype);
  });

  it("reads at most a bounded number of entries", () => {
    const levels = Array.from({ length: 500 }, (_, i) => [`pen-${i}`, i]);
    expect(parseSave(JSON.stringify({ v: 1, levels })).levels.size).toBe(64);
  });
});

describe("mergeSaves", () => {
  it("keeps the best score of each entry from both sides", () => {
    const merged = mergeSaves(
      save(
        [
          ["meadow", 10],
          ["lane", 5],
        ],
        [["2026-11-24", 3]],
      ),
      save(
        [
          ["meadow", 8],
          ["paddock", 9],
        ],
        [["2026-11-24", 6]],
      ),
    );
    expect(merged).toEqual(
      save(
        [
          ["meadow", 10],
          ["lane", 5],
          ["paddock", 9],
        ],
        [["2026-11-24", 6]],
      ),
    );
  });
});
