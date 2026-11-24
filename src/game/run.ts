import { hashSeed } from "../core";

export const STARTING_LIVES = 3;

/** One attempt at the game: a chain of rounds that ends when the fence has broken too often. */
export interface Run {
  readonly seed: number;
  /** 1-based number of the round being played. */
  readonly round: number;
  readonly score: number;
  readonly lives: number;
  /** Consecutive perfect (3 star) rounds. Feeds the bonus for the next perfect round. */
  readonly perfectStreak: number;
}

export function startRun(seed: number): Run {
  return { seed: seed >>> 0, round: 1, score: 0, lives: STARTING_LIVES, perfectStreak: 0 };
}

/**
 * Every round gets its own seed derived from the run seed and the round number, so a round
 * can be rebuilt on its own: the same run seed always replays the same sequence of herds.
 */
export function roundSeed(run: Run): number {
  return hashSeed(`${run.seed}:${run.round}`);
}
