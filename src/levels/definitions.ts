import type { LevelDefinition } from "../core";

/**
 * Layout alphabet: `.` pen square, `#` rock inside the pen, `-` outside the pen.
 * Herds are always bigger than the pen, so overflow is always possible.
 */
export const LEVEL_DEFINITIONS = [
  {
    id: "meadow",
    name: "Meadow",
    layout: ["...", "...", "..."],
    herd: { size: 12, spawnWeights: { normal: 8, twoHeaded: 2, golden: 2 } },
  },
  {
    id: "paddock",
    name: "Paddock",
    layout: ["....", "....", "...."],
    herd: { size: 15, spawnWeights: { normal: 7, twoHeaded: 3, golden: 2 } },
  },
  {
    // A narrow strip: two-headed cows have to be stacked or paired up just right.
    id: "lane",
    name: "Lane",
    layout: ["..", "..", "..", "..", ".."],
    herd: { size: 13, spawnWeights: { normal: 6, twoHeaded: 4, golden: 2 } },
  },
  {
    id: "rocky-yard",
    name: "Rocky Yard",
    layout: ["....-", ".#...", "...#.", "-...."],
    herd: { size: 18, spawnWeights: { normal: 6, twoHeaded: 4, golden: 3 } },
  },
] as const satisfies readonly LevelDefinition[];
