// Helpers shared by the tests. Not part of the public API (see index.ts).
import { COW_KINDS, shapesOf, type Cow, type CowKindId } from "./cows";
import type { Placement } from "./packing";
import { parseLayout, terrainAt, type Pen } from "./pen";

export function pen(...rows: string[]): Pen {
  return parseLayout(rows);
}

// Builds a queue of cows with consecutive ids, e.g. herdOf("normal", "twoHeaded").
export function herdOf(...kinds: CowKindId[]): Cow[] {
  return kinds.map((kind, id) => ({ id, kind, skin: 0 }));
}

// Throws unless the placements are a legal arrangement of exactly these cows in this pen.
export function assertValidPacking(p: Pen, cows: readonly Cow[], placements: readonly Placement[]) {
  if (placements.length !== cows.length) throw new Error("Every cow needs exactly one placement");

  const used = new Set<string>();
  for (const cow of cows) {
    const placement = placements.find((candidate) => candidate.cowId === cow.id);
    if (!placement) throw new Error(`Cow ${cow.id} has no placement`);

    const matchesAnOrientation = shapesOf(cow.kind).some((shape) => {
      if (shape.length !== placement.cells.length) return false;
      const first = placement.cells[0];
      const anchorX = Math.min(...placement.cells.map((cell) => cell.x));
      const anchorY = Math.min(...placement.cells.map((cell) => cell.y));
      return (
        first !== undefined &&
        shape.every(([dx, dy]) =>
          placement.cells.some((cell) => cell.x === anchorX + dx && cell.y === anchorY + dy),
        )
      );
    });
    if (!matchesAnOrientation) throw new Error(`Cow ${cow.id} (${cow.kind}) has the wrong shape`);

    for (const { x, y } of placement.cells) {
      if (terrainAt(p, x, y) !== "pen") throw new Error(`Cow ${cow.id} stands outside the pen`);
      const key = `${x},${y}`;
      if (used.has(key)) throw new Error(`Square ${key} is used twice`);
      used.add(key);
    }
  }
}

// Total number of squares occupied by these cows.
export function squaresNeeded(cows: readonly Cow[]): number {
  return cows.reduce((sum, cow) => sum + COW_KINDS[cow.kind].shapes[0].length, 0);
}
