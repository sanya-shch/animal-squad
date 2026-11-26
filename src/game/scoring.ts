import type { RoundResult } from "../core";
import type { Run } from "./run";

export interface ScoredRound {
  readonly run: Run;
  // Points added to the score by this round.
  readonly gained: number;
}

/**
 * The rules of a run, in one place:
 *  - success: the cows' points, plus a bonus for chains of perfect rounds
 *             (the bonus equals the number of perfect rounds in a row before this one);
 *  - overflow: the fence breaks. A life is lost and the streak ends;
 *  - empty: nobody came in. Nothing is lost and nothing is learned, so the round is replayed.
 */
export function scoreRound(run: Run, result: RoundResult): ScoredRound {
  switch (result.status) {
    case "empty":
      return { run, gained: 0 };

    case "overflow":
      return {
        run: { ...run, round: run.round + 1, lives: run.lives - 1, perfectStreak: 0 },
        gained: 0,
      };

    case "success": {
      const perfect = result.stars === 3;
      const gained = result.points + (perfect ? run.perfectStreak : 0);
      return {
        run: {
          ...run,
          round: run.round + 1,
          score: run.score + gained,
          perfectStreak: perfect ? run.perfectStreak + 1 : 0,
        },
        gained,
      };
    }
  }
}
