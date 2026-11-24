import { terrainAt, type Cell, type CowKindId, type Pen, type Rng } from "../core";

// Everything here is measured in squares of the pen grid, with (0, 0) at the scene's top-left.

/** Squares between the scene edge and the pen: one for the fence, one to breathe. */
export const SCENE_MARGIN = 2;
/** Rows below the fence where the herd waits for its turn. */
export const YARD_ROWS = 3;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface FenceTile {
  readonly x: number;
  readonly y: number;
  /** Which of the 11 fence sprites to draw (1 to 11). */
  readonly tile: number;
}

export interface Yard {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface SceneLayout {
  readonly cols: number;
  readonly rows: number;
  /** Scene position of the pen's top-left square. */
  readonly origin: Point;
  readonly fence: readonly FenceTile[];
  /** Middle of the opening in the fence, where cows walk through. */
  readonly gate: Point;
  /** Where cows wait: the area below the fence. */
  readonly yard: Yard;
}

/**
 * Picks the fence sprite for a post from the neighbours it is joined to.
 * The art only draws rails to the east, west and south of a post (a rail to the north is the
 * south rail of the post above), so those are the only connections that matter.
 * A T-junction has no sprite of its own and keeps its long rail.
 */
export function fenceTileFor(
  east: boolean,
  west: boolean,
  south: boolean,
  variant: number,
): number {
  const alt = variant % 2 === 0;
  if (east && west) return alt ? 1 : 2;
  if (east && south) return 7;
  if (west && south) return 8;
  if (east) return alt ? 3 : 10;
  if (west) return alt ? 4 : 9;
  if (south) return alt ? 5 : 11;
  return 6;
}

const keyOf = (x: number, y: number): string => `${x},${y}`;

/**
 * Builds the scene around a pen: a fence that follows the pen's outline (whatever its shape),
 * a gate in the middle of the lowest straight stretch of fence, and the yard below it.
 */
export function layoutScene(pen: Pen): SceneLayout {
  const { width, height } = pen;
  const isInside = (x: number, y: number): boolean => terrainAt(pen, x, y) !== "outside";

  // A post stands on every outside square that touches the pen, diagonals included,
  // so that corners are closed.
  const posts = new Map<string, Point>();
  for (let y = -1; y <= height; y++) {
    for (let x = -1; x <= width; x++) {
      if (isInside(x, y)) continue;
      let touchesPen = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) touchesPen ||= isInside(x + dx, y + dy);
      }
      if (touchesPen) posts.set(keyOf(x, y), { x, y });
    }
  }

  const gate = openGate(pen, posts);

  const origin: Point = { x: SCENE_MARGIN, y: SCENE_MARGIN };
  const fence = [...posts.values()].map(({ x, y }) => ({
    x: x + origin.x,
    y: y + origin.y,
    tile: fenceTileFor(
      posts.has(keyOf(x + 1, y)),
      posts.has(keyOf(x - 1, y)),
      posts.has(keyOf(x, y + 1)),
      x + y,
    ),
  }));

  const cols = width + 2 * SCENE_MARGIN;
  const rows = SCENE_MARGIN + height + 1 + YARD_ROWS;
  return {
    cols,
    rows,
    origin,
    fence,
    gate: { x: gate.x + origin.x, y: gate.y + origin.y },
    yard: { left: 1, right: cols - 1, top: SCENE_MARGIN + height + 1, bottom: rows },
  };
}

/**
 * Removes the gate's posts from `posts` and returns the middle of the opening.
 * The gate goes into the lowest wall that has open pen floor right behind it.
 */
function openGate(pen: Pen, posts: Map<string, Point>): Point {
  const candidates = [...posts.values()].filter(({ x, y }) => terrainAt(pen, x, y - 1) === "pen");
  if (candidates.length === 0) {
    throw new Error("The pen has no wall with open floor behind it: nowhere to put a gate");
  }
  const lowest = Math.max(...candidates.map(({ y }) => y));
  const row = candidates.filter(({ y }) => y === lowest).sort((a, b) => a.x - b.x);

  // Split the row into runs of neighbouring squares, take the longest (the most central
  // one on a tie), and open the gate in its middle.
  const runs: Point[][] = [];
  for (const post of row) {
    const run = runs[runs.length - 1];
    if (run && post.x === (run[run.length - 1] as Point).x + 1) run.push(post);
    else runs.push([post]);
  }
  const middle = (pen.width - 1) / 2;
  const offCentre = (run: readonly Point[]): number =>
    Math.abs(run.reduce((sum, post) => sum + post.x, 0) / run.length - middle);
  const best = runs.reduce((a, b) => {
    if (b.length !== a.length) return b.length > a.length ? b : a;
    return offCentre(b) < offCentre(a) ? b : a;
  });

  const gateWidth = gateWidthFor(best.length);
  const start = (best.length - gateWidth) / 2;
  const opening = best.slice(start, start + gateWidth);
  for (const { x, y } of opening) posts.delete(keyOf(x, y));

  const first = opening[0] as Point;
  return { x: first.x + gateWidth / 2, y: first.y + 0.5 };
}

/**
 * A gate has the same parity as the wall it sits in, so that it can be exactly centred:
 * one square in a short odd wall, three in a long one, two in an even wall.
 */
function gateWidthFor(wallLength: number): number {
  if (wallLength % 2 === 0) return Math.min(2, wallLength);
  return wallLength >= 5 ? 3 : 1;
}

/** Pen squares that can hold cows, as scene coordinates of their top-left corner. */
export function penSquares(pen: Pen, origin: Point): Point[] {
  const squares: Point[] = [];
  for (let y = 0; y < pen.height; y++) {
    for (let x = 0; x < pen.width; x++) {
      if (terrainAt(pen, x, y) === "pen") squares.push({ x: origin.x + x, y: origin.y + y });
    }
  }
  return squares;
}

/**
 * Spots for the waiting calves, nearest to the gate first: the first cow in the queue
 * stands closest to the gate, because it is the first one through.
 */
export function queueSpots(layout: SceneLayout, count: number, rng: Rng): Point[] {
  const { left, right, top, bottom } = layout.yard;
  const stepX = 0.85;
  const perRow = Math.max(1, Math.floor((right - left - 0.8) / stepX) + 1);
  const rowCount = Math.max(YARD_ROWS, Math.ceil(count / perRow));
  const stepY = Math.min((bottom - top - 0.9) / Math.max(rowCount - 1, 1), 0.9);
  // Every row is centred, so the crowd looks natural instead of hugging the left edge.
  const rowStart = (right + left - (perRow - 1) * stepX) / 2;

  const spots: Point[] = [];
  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < perRow; col++) {
      spots.push({
        x: rowStart + col * stepX + (rng.next() - 0.5) * 0.25,
        y: top + 0.65 + row * stepY + (rng.next() - 0.5) * 0.2,
      });
    }
  }

  const gate = layout.gate;
  const distance = (p: Point): number => Math.hypot(p.x - gate.x, (p.y - gate.y) * 1.4);
  return spots.sort((a, b) => distance(a) - distance(b)).slice(0, count);
}

/** Where an admitted calf stands inside the pen until the gate closes. */
export function crowdSpot(squares: readonly Point[], rng: Rng): Point {
  const square = rng.pick(squares);
  return {
    x: square.x + 0.5 + (rng.next() - 0.5) * 0.5,
    y: square.y + 0.6 + (rng.next() - 0.5) * 0.4,
  };
}

/**
 * Where a cow ends up when the fence gives way: pushed away from the middle of the pen,
 * but kept inside the scene.
 */
export function burstSpot(layout: SceneLayout, from: Point, rng: Rng): Point {
  const middle: Point = { x: layout.cols / 2, y: (layout.origin.y + layout.yard.top) / 2 };
  const push = 1.25 + rng.next() * 0.5;
  const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), max);
  return {
    x: clamp(middle.x + (from.x - middle.x) * push, 1, layout.cols - 1),
    y: clamp(middle.y + (from.y - middle.y) * push, 1.5, layout.rows - 0.6),
  };
}

/** How big the full-grown sprite of each kind is drawn, in squares (the art is square). */
export const SPRITE_SIZE = {
  normal: 1.1,
  twoHeaded: 1.15,
  fat: 2.1,
} as const satisfies Record<CowKindId, number>;

export interface SpriteGeometry {
  /** Middle of the squares the cow stands on. */
  readonly centre: Point;
  /** Side of the square sprite, in squares. */
  readonly size: number;
  /** Shift of the sprite's middle relative to `centre`: cows stand on the bottom edge. */
  readonly offsetY: number;
  /** The art faces sideways, so a cow standing lengthways along the pen is turned a quarter. */
  readonly rotation: 0 | 90;
}

export interface Footprint {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** The smallest rectangle of squares that contains all of `cells`. */
export function footprintOf(cells: readonly Cell[]): Footprint {
  const xs = cells.map((cell) => cell.x);
  const ys = cells.map((cell) => cell.y);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs) + 1,
    top: Math.min(...ys),
    bottom: Math.max(...ys) + 1,
  };
}

/** Where and how to draw a full-grown cow standing on `cells` (pen coordinates). */
export function spriteGeometry(
  kind: CowKindId,
  cells: readonly Cell[],
  origin: Point,
): SpriteGeometry {
  const { left, right, top, bottom } = footprintOf(cells);
  const size = SPRITE_SIZE[kind];
  const upright = bottom - top <= right - left;

  return {
    centre: { x: origin.x + (left + right) / 2, y: origin.y + (top + bottom) / 2 },
    size,
    offsetY: upright ? (bottom - top) / 2 - size / 2 + 0.1 : 0,
    rotation: upright ? 0 : 90,
  };
}
