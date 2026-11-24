/** Offset of one occupied square, relative to the shape's anchor (top-left) square. */
export type Offset = readonly [dx: number, dy: number];
/** The set of squares one cow occupies in a single orientation. */
export type Shape = readonly Offset[];

export interface CowKind {
  /** Score for getting this cow safely into the pen. */
  readonly points: number;
  /** Allowed orientations. All orientations of a kind must have the same number of squares. */
  readonly shapes: readonly Shape[];
  /** Number of sprite variants. The renderer maps `Cow.skin` onto its own assets. */
  readonly skins: number;
}

/**
 * Every kind of cow is plain data. Adding a new mutant means adding an entry here
 * (and a sprite), not touching the rules.
 */
export const COW_KINDS = {
  /** A regular cow: one square, one point. */
  normal: { points: 1, skins: 56, shapes: [[[0, 0]]] },
  /** Two heads, one square, double the points. Rare, and worth waiting for. */
  twoHeaded: { points: 2, skins: 2, shapes: [[[0, 0]]] },
  /** Takes two squares (either way round) for a single point. A trap for the greedy. */
  fat: {
    points: 1,
    skins: 2,
    shapes: [
      [
        [0, 0],
        [1, 0],
      ],
      [
        [0, 0],
        [0, 1],
      ],
    ],
  },
} as const satisfies Record<string, CowKind>;

export type CowKindId = keyof typeof COW_KINDS;

export const COW_KIND_IDS = Object.keys(COW_KINDS) as CowKindId[];

export interface Cow {
  readonly id: number;
  readonly kind: CowKindId;
  /** 0-based sprite variant, always below `COW_KINDS[kind].skins`. */
  readonly skin: number;
}

export function shapesOf(kind: CowKindId): readonly Shape[] {
  return COW_KINDS[kind].shapes;
}

/** Number of squares a cow of this kind occupies. */
export function cowSize(kind: CowKindId): number {
  return COW_KINDS[kind].shapes[0].length;
}

export function sumPoints(cows: readonly Cow[]): number {
  return cows.reduce((sum, cow) => sum + COW_KINDS[cow.kind].points, 0);
}
