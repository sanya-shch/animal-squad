import type { Level, StarGoals } from "../core";
import { MAX_SCORE, type SaveData } from "./save";

/** Something that has its own best score: a pen, or one particular day's challenge. */
export type Board =
  | { readonly kind: "level"; readonly id: string }
  | { readonly kind: "daily"; readonly date: string };

export const levelBoard = (id: string): Board => ({ kind: "level", id });
export const dailyBoard = (date: string): Board => ({ kind: "daily", date });

/** Only this many days of daily scores are kept, so the save stays small forever. */
export const DAILY_HISTORY_DAYS = 60;

/** The best score on a board, or `undefined` if it has never been played. */
export function savedScore(save: SaveData, board: Board): number | undefined {
  return board.kind === "level" ? save.levels.get(board.id) : save.daily.get(board.date);
}

export const bestScore = (save: SaveData, board: Board): number => savedScore(save, board) ?? 0;

/**
 * Returns a save that remembers `score`, or the very same save when it is not an improvement,
 * so that callers can skip writing to disk with a simple `===`.
 */
export function recordScore(save: SaveData, board: Board, score: number): SaveData {
  if (!Number.isInteger(score) || score < 0) throw new RangeError(`Invalid score: ${score}`);
  const capped = Math.min(score, MAX_SCORE);
  const existing = savedScore(save, board);
  if (existing !== undefined && capped <= existing) return save;

  if (board.kind === "level") {
    return { ...save, levels: new Map(save.levels).set(board.id, capped) };
  }
  const daily = new Map(save.daily).set(board.date, capped);
  const newest = [...daily].sort(([a], [b]) => b.localeCompare(a)).slice(0, DAILY_HISTORY_DAYS);
  return { ...save, daily: new Map(newest) };
}

export function starsFor(goals: StarGoals, score: number): number {
  return goals.filter((goal) => score >= goal).length;
}

/** The score of the next star, or `undefined` once all three are earned. */
export function nextGoal(goals: StarGoals, score: number): number | undefined {
  return goals.find((goal) => score < goal);
}

export function levelStars(save: SaveData, level: Level): number {
  return starsFor(level.goals, bestScore(save, levelBoard(level.id)));
}

/** The first pen is always open. Each next one opens with a star on the pen before it. */
export function unlockedLevelIds(levels: readonly Level[], save: SaveData): Set<string> {
  const unlocked = new Set<string>();
  levels.forEach((level, index) => {
    const previous = levels[index - 1];
    if (previous === undefined || levelStars(save, previous) >= 1) unlocked.add(level.id);
  });
  return unlocked;
}
