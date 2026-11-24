import { COW_KINDS, cowSize, shapesOf, type Cow, type Shape } from "./cows";
import type { Pen } from "./pen";
import type { Cell } from "./types";

export interface Placement {
  readonly cowId: number;
  readonly cells: readonly Cell[];
}

/** Upper bound for the number of orientations of any kind; used to order search positions. */
const SHAPE_STRIDE = Math.max(...Object.values(COW_KINDS).map((kind) => kind.shapes.length));

/**
 * Exact solver: finds a way to fit every cow into the pen, or proves there is none.
 *
 * Why not just compare cow count with free squares? Fat cows are dominoes, so
 * geometry matters: rocks, odd shapes and parity can make a pen "full" long before
 * the squares run out. Backtracking over the multi-square cows is cheap because
 *  - single-square cows never need searching: they fill whatever is left;
 *  - identical kinds are placed in increasing position order, which removes symmetric duplicates;
 *  - a branch is dropped as soon as the remaining squares cannot cover the remaining cows.
 *
 * Returns placements ordered by cow id, or `null` when the cows do not fit.
 */
export function findPacking(pen: Pen, cows: readonly Cow[]): Placement[] | null {
  const { width, height } = pen;
  const squareCount = width * height;

  const fillers: Cow[] = [];
  const bulky: Cow[] = [];
  for (const cow of cows) {
    (cowSize(cow.kind) === 1 ? fillers : bulky).push(cow);
  }
  // Biggest first, identical kinds side by side (required by the symmetry breaking below).
  bulky.sort(
    (a, b) =>
      cowSize(b.kind) - cowSize(a.kind) ||
      (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0) ||
      a.id - b.id,
  );

  const sizes = bulky.map((cow) => cowSize(cow.kind));
  // needFrom[i]: squares required by bulky[i..] plus all single-square cows.
  const needFrom = new Array<number>(bulky.length + 1).fill(fillers.length);
  for (let i = sizes.length - 1; i >= 0; i--) {
    needFrom[i] = (needFrom[i + 1] ?? 0) + (sizes[i] ?? 0);
  }
  if ((needFrom[0] ?? 0) > pen.capacity) return null;

  const occupied = Uint8Array.from(pen.terrain, (square) => (square === "pen" ? 0 : 1));
  const chosen: { shape: Shape; x: number; y: number }[] = [];

  const fits = (shape: Shape, ax: number, ay: number): boolean => {
    for (const [dx, dy] of shape) {
      const x = ax + dx;
      const y = ay + dy;
      if (x < 0 || y < 0 || x >= width || y >= height || occupied[y * width + x] !== 0) {
        return false;
      }
    }
    return true;
  };

  const paint = (shape: Shape, ax: number, ay: number, value: 0 | 1): void => {
    for (const [dx, dy] of shape) occupied[(ay + dy) * width + ax + dx] = value;
  };

  const search = (i: number, previousPosition: number, freeLeft: number): boolean => {
    if (freeLeft < (needFrom[i] ?? 0)) return false;
    const cow = bulky[i];
    if (cow === undefined) return true;

    const shapes = shapesOf(cow.kind);
    const size = sizes[i] ?? 0;
    const sameKindAsPrevious = i > 0 && bulky[i - 1]?.kind === cow.kind;
    const minPosition = sameKindAsPrevious ? previousPosition : -1;

    for (let anchor = 0; anchor < squareCount; anchor++) {
      const ax = anchor % width;
      const ay = Math.floor(anchor / width);
      for (let s = 0; s < shapes.length; s++) {
        const position = anchor * SHAPE_STRIDE + s;
        const shape = shapes[s];
        if (position <= minPosition || shape === undefined || !fits(shape, ax, ay)) continue;

        paint(shape, ax, ay, 1);
        chosen[i] = { shape, x: ax, y: ay };
        if (search(i + 1, position, freeLeft - size)) return true;
        paint(shape, ax, ay, 0);
      }
    }
    return false;
  };

  if (!search(0, -1, pen.capacity)) return null;

  const placements: Placement[] = bulky.map((cow, i) => {
    const { shape, x, y } = chosen[i] as (typeof chosen)[number];
    return { cowId: cow.id, cells: shape.map(([dx, dy]) => ({ x: x + dx, y: y + dy })) };
  });

  // Single-square cows take the first free squares in reading order.
  let cursor = 0;
  for (const cow of fillers) {
    while (cursor < squareCount && occupied[cursor] !== 0) cursor++;
    if (cursor >= squareCount) throw new Error("Invariant broken: no free square for a filler cow");
    occupied[cursor] = 1;
    const cell = { x: cursor % width, y: Math.floor(cursor / width) };
    placements.push({ cowId: cow.id, cells: [cell] });
  }

  return placements.sort((a, b) => a.cowId - b.cowId);
}
