import { hashSeed, type Level } from "../core";
import { DATE_KEY, type SaveData } from "./save";

const DAY_MS = 24 * 60 * 60 * 1000;

// The date everybody agrees on: UTC, so the whole world plays the same day's challenge.
export function dailyKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Milliseconds until the next UTC midnight, when a new daily challenge starts.
export function msUntilNextDay(date: Date): number {
  return Date.parse(`${dailyKey(date)}T00:00:00Z`) + DAY_MS - date.getTime();
}

function parseDay(key: string): number {
  const time = DATE_KEY.test(key) ? Date.parse(`${key}T00:00:00Z`) : Number.NaN;
  if (Number.isNaN(time) || dailyKey(new Date(time)) !== key) {
    throw new RangeError(`Not a valid date: ${key}`);
  }
  return time;
}

export function previousDay(key: string): string {
  return dailyKey(new Date(parseDay(key) - DAY_MS));
}

// The same date always gives the same seed, so every player gets exactly the same herds.
export function dailySeed(key: string): number {
  parseDay(key);
  return hashSeed(`daily:${key}`);
}

// The pen of the day. Any pen can come up, whether or not you have unlocked it yet.
export function dailyLevel(levels: readonly Level[], key: string): Level {
  parseDay(key);
  const level = levels[hashSeed(`daily-level:${key}`) % levels.length];
  if (level === undefined) throw new RangeError("There are no levels to choose from");
  return level;
}

// Days in a row with a daily score, counting back from today. A streak that is still alive
// (yesterday was played, today not yet) keeps counting until the day is over.
export function dailyStreak(save: SaveData, today: string): number {
  let day = save.daily.has(today) ? today : previousDay(today);
  let streak = 0;
  while (save.daily.has(day)) {
    streak++;
    day = previousDay(day);
  }
  return streak;
}
