import { COW_KINDS, type CowKindId } from "../core";

// Where each sprite lives inside src/assets. Pure strings, so this is easy to test.

/** The art for each kind of cow. Mutants have their own numbering (cow_01 .. cow_04). */
const COW_FILE: Record<CowKindId, (skin: number) => string> = {
  normal: (skin) => `cow/cow_${skin + 1}.png`,
  fat: (skin) => `cow/cow_0${skin + 1}.png`,
  twoHeaded: (skin) => `cow/cow_0${skin + 3}.png`,
};

export function cowSpriteFile(kind: CowKindId, skin: number): string {
  if (!Number.isInteger(skin) || skin < 0 || skin >= COW_KINDS[kind].skins) {
    throw new RangeError(`There is no skin ${skin} for a ${kind} cow`);
  }
  return COW_FILE[kind](skin);
}

/** The little calf icons the herd wears before it grows up. */
export const CALF_FILE = "cow.png";
export const MUTANT_CALF_FILE = "cow_color.png";

export function calfFile(kind: CowKindId): string {
  return kind === "normal" ? CALF_FILE : MUTANT_CALF_FILE;
}

export const fenceFile = (tile: number): string => `fence/fence_${tile}.png`;

export const DECOR_FILES = {
  groundCover: ["forestPack/Grass-1.png", "forestPack/Grass-2.png"],
  scenery: [
    "forestPack/Bush-3.png",
    "forestPack/Bush-4.png",
    "forestPack/Stump.png",
    "forestPack/Stone-1.png",
  ],
  rock: "forestPack/Stone-2.png",
} as const;
