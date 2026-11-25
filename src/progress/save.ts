export const SAVE_VERSION = 1;
export const MAX_SCORE = 100_000;
const MAX_ENTRIES = 64;

/**
 * Everything that is remembered between visits: the best score per pen and per day.
 * Stars and unlocked pens are not stored, they are worked out from these scores and the
 * level goals. So goals can be rebalanced without migrating anybody's save.
 */
export interface SaveData {
  readonly levels: ReadonlyMap<string, number>;
  readonly daily: ReadonlyMap<string, number>;
}

export const emptySave = (): SaveData => ({ levels: new Map(), daily: new Map() });

const LEVEL_KEY = /^[a-z0-9][a-z0-9-]{0,39}$/;
export const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Pairs rather than an object, so a key like "__proto__" in a damaged save is just a string. */
export function serializeSave(save: SaveData): string {
  return JSON.stringify({ v: SAVE_VERSION, levels: [...save.levels], daily: [...save.daily] });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function readScores(value: unknown, isValidKey: (key: string) => boolean): Map<string, number> {
  const scores = new Map<string, number>();
  if (!Array.isArray(value)) return scores;

  for (const entry of value.slice(0, MAX_ENTRIES)) {
    if (!Array.isArray(entry)) continue;
    const pair: readonly unknown[] = entry;
    const [key, score] = pair;
    if (typeof key !== "string" || !isValidKey(key)) continue;
    if (typeof score !== "number" || !Number.isInteger(score)) continue;
    if (score < 0 || score > MAX_SCORE) continue;
    scores.set(key, Math.max(score, scores.get(key) ?? 0));
  }
  return scores;
}

/**
 * Reads a save defensively: anything that is missing, damaged, from another version or
 * edited by hand is dropped, entry by entry. It never throws, and a bad save never stops
 * the game from starting.
 */
export function parseSave(raw: string | null): SaveData {
  if (raw === null) return emptySave();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptySave();
  }
  if (!isRecord(data) || data["v"] !== SAVE_VERSION) return emptySave();
  return {
    levels: readScores(data["levels"], (key) => LEVEL_KEY.test(key)),
    daily: readScores(data["daily"], (key) => DATE_KEY.test(key)),
  };
}

/** The best of two saves, entry by entry. Two tabs can never wipe out each other's records. */
export function mergeSaves(a: SaveData, b: SaveData): SaveData {
  const best = (x: ReadonlyMap<string, number>, y: ReadonlyMap<string, number>) => {
    const merged = new Map(x);
    for (const [key, score] of y) merged.set(key, Math.max(score, merged.get(key) ?? 0));
    return merged;
  };
  return { levels: best(a.levels, b.levels), daily: best(a.daily, b.daily) };
}
