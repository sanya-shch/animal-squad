import { describe, expect, it } from "vitest";

import { dailyBoard, levelBoard } from "./progress";
import { createMemoryStorage, createProgressStore, STORAGE_KEY, type KeyValueStore } from "./store";

// Counts writes, so tests can prove that nothing is written when nothing changed.
function countingStorage() {
  const inner = createMemoryStorage();
  const stats = { writes: 0 };
  const storage: KeyValueStore = {
    getItem: (key) => inner.getItem(key),
    setItem: (key, value) => {
      stats.writes++;
      inner.setItem(key, value);
    },
    removeItem: (key) => {
      inner.removeItem(key);
    },
  };
  return { storage, stats };
}

describe("createProgressStore", () => {
  it("remembers records across store instances", () => {
    const { storage } = countingStorage();
    createProgressStore(storage).recordScore(levelBoard("meadow"), 42);
    expect(createProgressStore(storage).getSave().levels.get("meadow")).toBe(42);
  });

  it("writes only when a record was really broken", () => {
    const { storage, stats } = countingStorage();
    const store = createProgressStore(storage);
    expect(store.recordScore(levelBoard("meadow"), 10)).toBe(true);
    expect(store.recordScore(levelBoard("meadow"), 10)).toBe(false);
    expect(store.recordScore(levelBoard("meadow"), 3)).toBe(false);
    expect(stats.writes).toBe(1);
  });

  it("does not lose another tab's records", () => {
    const { storage } = countingStorage();
    const tabA = createProgressStore(storage);
    const tabB = createProgressStore(storage);
    tabA.recordScore(levelBoard("meadow"), 30);
    tabB.recordScore(levelBoard("lane"), 20);
    const fresh = createProgressStore(storage).getSave();
    expect(fresh.levels.get("meadow")).toBe(30);
    expect(fresh.levels.get("lane")).toBe(20);
  });

  it("starts fresh from a damaged save, and repairs it on the next record", () => {
    const { storage } = countingStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    const store = createProgressStore(storage);
    expect(store.getSave().levels.size).toBe(0);
    store.recordScore(dailyBoard("2026-11-25"), 5);
    expect(createProgressStore(storage).getSave().daily.get("2026-11-25")).toBe(5);
  });

  it("keeps working when the storage throws", () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const store = createProgressStore(broken);
    expect(store.recordScore(levelBoard("meadow"), 8)).toBe(true);
    expect(store.getSave().levels.get("meadow")).toBe(8);
    expect(() => {
      store.reset();
    }).not.toThrow();
  });

  it("reset() forgets everything, in memory and on disk", () => {
    const { storage } = countingStorage();
    const store = createProgressStore(storage);
    store.recordScore(levelBoard("meadow"), 8);
    store.reset();
    expect(store.getSave().levels.size).toBe(0);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(createProgressStore(storage).getSave().levels.size).toBe(0);
  });
});
