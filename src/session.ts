import type { Level } from "./core";
import type { Board } from "./progress";

// One thing the player can start: a pen, or the daily challenge.
export interface PlaySession {
  readonly level: Level;
  readonly seed: number;
  // Where its best score is kept.
  readonly board: Board;
  // Fixed for the daily challenge: "play again" must give the same herds as the first time.
  readonly replaysSameSeed: boolean;
  // Shown before the round counter, e.g. "Daily".
  readonly label: string;
}
