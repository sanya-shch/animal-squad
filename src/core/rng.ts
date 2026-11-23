/**
 * Deterministic random source. Every random decision in the game goes through this,
 * so the same seed always produces the same game: reproducible bugs, stable tests
 * and a "daily challenge" mode for free.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** Picks a key with probability proportional to its weight. Zero weights are never picked. */
  weighted<K extends string>(weights: Readonly<Partial<Record<K, number>>>): K;
  /** Unbiased Fisher–Yates shuffle. Returns a new array. */
  shuffle<T>(items: readonly T[]): T[];
}

/** mulberry32: tiny, fast, good enough statistical quality for a game. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
      throw new RangeError(`Invalid integer range [${min}, ${max}]`);
    }
    return min + Math.floor(next() * (max - min + 1));
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new RangeError("Cannot pick from an empty list");
    return items[int(0, items.length - 1)] as T;
  };

  const weighted = <K extends string>(weights: Readonly<Partial<Record<K, number>>>): K => {
    const entries = (Object.entries(weights) as [K, number | undefined][]).filter(
      (entry): entry is [K, number] => (entry[1] ?? 0) > 0,
    );
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    if (total <= 0) throw new RangeError("Weights must contain at least one positive value");

    let roll = next() * total;
    for (const [key, weight] of entries) {
      roll -= weight;
      if (roll < 0) return key;
    }
    // Only reachable through floating point rounding: fall back to the last key.
    return (entries[entries.length - 1] as [K, number])[0];
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = int(0, i);
      const a = result[i] as T;
      result[i] = result[j] as T;
      result[j] = a;
    }
    return result;
  };

  return { next, int, pick, weighted, shuffle };
}

/** Turns any string ("2026-11-23" for a daily challenge) into a 32-bit seed. */
export function hashSeed(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function randomSeed(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] ?? 0;
}
