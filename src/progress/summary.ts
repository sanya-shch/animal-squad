import type { StarGoals } from "../core";
import { nextGoal, starsFor } from "./progress";

export interface RunSummaryInput {
  readonly score: number;
  /** The best score on this board before the run started. */
  readonly bestBefore: number;
  /** Undefined for boards without stars, like the daily challenge. */
  readonly goals: StarGoals | undefined;
  readonly unlockedBefore: ReadonlySet<string>;
  readonly unlockedAfter: ReadonlySet<string>;
}

export interface RunSummary {
  readonly isNewBest: boolean;
  readonly best: number;
  /** Stars on this board once the run is counted. */
  readonly stars: number | undefined;
  readonly nextGoal: number | undefined;
  /** Pens that this run opened. */
  readonly unlocked: readonly string[];
}

/** What the end-of-run screen says about a run, worked out in one place and easy to test. */
export function summarizeRun(input: RunSummaryInput): RunSummary {
  const { score, bestBefore, goals, unlockedBefore, unlockedAfter } = input;
  const best = Math.max(score, bestBefore);
  return {
    isNewBest: score > bestBefore,
    best,
    stars: goals && starsFor(goals, best),
    nextGoal: goals && nextGoal(goals, best),
    unlocked: [...unlockedAfter].filter((id) => !unlockedBefore.has(id)),
  };
}
