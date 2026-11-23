import { COW_KINDS, type Cow } from "./cows";
import type { Level } from "./level";
import type { Rng } from "./rng";

/**
 * The queue of cows waiting at the gate. The order is fixed up front, which is what makes
 * a perfect score ("par") well defined, and the player only decides how many to let in.
 */
export function generateHerd(level: Level, rng: Rng): Cow[] {
  return Array.from({ length: level.herd.size }, (_, id) => {
    const kind = rng.weighted(level.herd.spawnWeights);
    return { id, kind, skin: rng.int(0, COW_KINDS[kind].skins - 1) };
  });
}
