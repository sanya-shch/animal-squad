import { describe, expect, it } from "vitest";

import { COW_KIND_IDS, COW_KINDS } from "../core";
import {
  calfFile,
  CALF_FILE,
  cowSpriteFile,
  DECOR_FILES,
  fenceFile,
  MUTANT_CALF_FILE,
} from "./spriteFiles";

// Vite lists the sprites that really exist, so a typo in a path fails here, not in the browser.
const existing = new Set(
  Object.keys(import.meta.glob("../assets/**/*.png")).map((path) => path.replace("../assets/", "")),
);

describe("sprite files", () => {
  it("has a sprite for every skin of every kind of cow", () => {
    for (const kind of COW_KIND_IDS) {
      for (let skin = 0; skin < COW_KINDS[kind].skins; skin++) {
        const file = cowSpriteFile(kind, skin);
        expect(existing.has(file)).toBe(true);
      }
    }
  });

  it("never uses one sprite for two different cows", () => {
    const files = COW_KIND_IDS.flatMap((kind) =>
      Array.from({ length: COW_KINDS[kind].skins }, (_, skin) => cowSpriteFile(kind, skin)),
    );
    expect(new Set(files).size).toBe(files.length);
  });

  it("rejects a skin that does not exist", () => {
    expect(() => cowSpriteFile("fat", -1)).toThrow(RangeError);
    expect(() => cowSpriteFile("fat", 2)).toThrow(RangeError);
    expect(() => cowSpriteFile("normal", 56)).toThrow(RangeError);
    expect(() => cowSpriteFile("normal", 1.5)).toThrow(RangeError);
  });

  it("has all the fence pieces, calves and scenery", () => {
    for (let tile = 1; tile <= 11; tile++) expect(existing.has(fenceFile(tile))).toBe(true);
    for (const file of [CALF_FILE, MUTANT_CALF_FILE, DECOR_FILES.rock]) {
      expect(existing.has(file)).toBe(true);
    }
    for (const file of [...DECOR_FILES.groundCover, ...DECOR_FILES.scenery]) {
      expect(existing.has(file)).toBe(true);
    }
  });

  it("dresses mutants differently from regular calves", () => {
    expect(calfFile("normal")).toBe(CALF_FILE);
    expect(calfFile("fat")).toBe(MUTANT_CALF_FILE);
    expect(calfFile("twoHeaded")).toBe(MUTANT_CALF_FILE);
  });
});
