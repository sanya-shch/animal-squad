import type { Terrain } from "./types";

export const MAX_PEN_SIDE = 12;
// The packing search is exact, so keep pens small enough for it to stay instant.
export const MAX_PEN_CAPACITY = 36;

export interface Pen {
  readonly width: number;
  readonly height: number;
  // Row-major: the terrain of square (x, y) is `terrain[y * width + x]`.
  readonly terrain: readonly Terrain[];
  // Number of squares that can hold cows.
  readonly capacity: number;
}

export class LayoutError extends Error {
  override name = "LayoutError";
}

const TERRAIN_BY_CHAR: Readonly<Record<string, Terrain>> = {
  ".": "pen",
  "#": "rock",
  "-": "outside",
};

/**
 * Builds a pen from ASCII art, so levels stay readable in the source:
 *
 *   `.` free pen square    `#` rock inside the pen    `-` outside of the pen
 */
export function parseLayout(rows: readonly string[]): Pen {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (height === 0 || width === 0) {
    throw new LayoutError("Layout needs at least one non-empty row");
  }
  if (height > MAX_PEN_SIDE || width > MAX_PEN_SIDE) {
    throw new LayoutError(`Layout is ${width}x${height}, the maximum side is ${MAX_PEN_SIDE}`);
  }

  const terrain: Terrain[] = [];
  rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new LayoutError(`Row ${y} is ${row.length} wide, expected ${width}`);
    }
    for (let x = 0; x < width; x++) {
      const char = row.charAt(x);
      const square = TERRAIN_BY_CHAR[char];
      if (square === undefined) {
        throw new LayoutError(`Unknown character "${char}" at row ${y}, column ${x}`);
      }
      terrain.push(square);
    }
  });

  const capacity = terrain.filter((square) => square === "pen").length;
  if (capacity === 0) throw new LayoutError("Pen has no free squares");
  if (capacity > MAX_PEN_CAPACITY) {
    throw new LayoutError(`Pen holds ${capacity} squares, the maximum is ${MAX_PEN_CAPACITY}`);
  }

  return { width, height, terrain, capacity };
}

// Terrain at (x, y); everything beyond the grid counts as "outside".
export function terrainAt(pen: Pen, x: number, y: number): Terrain {
  if (x < 0 || y < 0 || x >= pen.width || y >= pen.height) return "outside";
  return pen.terrain[y * pen.width + x] ?? "outside";
}
