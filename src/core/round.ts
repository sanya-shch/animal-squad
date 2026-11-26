import { sumPoints, type Cow } from "./cows";
import { findPacking, type Placement } from "./packing";
import type { Pen } from "./pen";

export type Stars = 1 | 2 | 3;

// The best possible result for a given pen and herd.
export interface Par {
  // Largest number of cows from the front of the queue that still fit.
  readonly cows: number;
  readonly points: number;
}

export type RoundResult =
  | { readonly status: "empty"; readonly par: Par }
  | { readonly status: "overflow"; readonly admitted: readonly Cow[]; readonly par: Par }
  | {
      readonly status: "success";
      readonly admitted: readonly Cow[];
      readonly placements: readonly Placement[];
      readonly points: number;
      readonly stars: Stars;
      readonly par: Par;
    };

// If a group of cows does not fit, adding more cows cannot make it fit, and every cow
// is worth at least a point. So the best round is simply the longest queue prefix that fits.
export function computePar(pen: Pen, herd: readonly Cow[]): Par {
  let cows = 0;
  for (let count = 1; count <= herd.length; count++) {
    if (findPacking(pen, herd.slice(0, count)) === null) break;
    cows = count;
  }
  return { cows, points: sumPoints(herd.slice(0, cows)) };
}

export function rateRound(points: number, parPoints: number): Stars {
  const ratio = parPoints > 0 ? points / parPoints : 0;
  if (ratio >= 1) return 3;
  if (ratio >= 0.75) return 2;
  return 1;
}

// Outcome of letting the first `admittedCount` cows of the herd into the pen.
export function resolveRound(pen: Pen, herd: readonly Cow[], admittedCount: number): RoundResult {
  if (!Number.isInteger(admittedCount) || admittedCount < 0 || admittedCount > herd.length) {
    throw new RangeError(`Cannot admit ${admittedCount} cows from a herd of ${herd.length}`);
  }

  const par = computePar(pen, herd);
  if (admittedCount === 0) return { status: "empty", par };

  const admitted = herd.slice(0, admittedCount);
  const placements = findPacking(pen, admitted);
  if (placements === null) return { status: "overflow", admitted, par };

  const points = sumPoints(admitted);
  const stars = rateRound(points, par.points);
  return { status: "success", admitted, placements, points, stars, par };
}
