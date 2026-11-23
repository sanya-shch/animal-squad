export interface Cell {
  readonly x: number;
  readonly y: number;
}

/** What a single grid square is made of. Only "pen" squares can hold cows. */
export type Terrain = "pen" | "rock" | "outside";
