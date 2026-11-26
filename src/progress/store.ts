import { recordScore, type Board } from "./progress";
import { emptySave, mergeSaves, parseSave, serializeSave, type SaveData } from "./save";

export const STORAGE_KEY = "animal-squad:progress";

// The part of `localStorage` that is used.
export interface KeyValueStore {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export function createMemoryStorage(): KeyValueStore {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

// `localStorage` can be missing, blocked (private mode, cookies off) or full. Whatever goes
// wrong, the game still plays and just remembers nothing after the tab is closed.
export function createBrowserStorage(): KeyValueStore {
  try {
    const storage = window.localStorage;
    const probe = `${STORAGE_KEY}:probe`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return createMemoryStorage();
  }
}

export interface ProgressStore {
  getSave: () => SaveData;
  // Remembers a score if it beats the best one. Returns whether it did.
  recordScore: (board: Board, score: number) => boolean;
  reset: () => void;
}

export function createProgressStore(storage: KeyValueStore, key = STORAGE_KEY): ProgressStore {
  const read = (): SaveData => {
    try {
      return parseSave(storage.getItem(key));
    } catch {
      return emptySave();
    }
  };

  let save = read();

  return {
    getSave: () => save,
    recordScore: (board, score) => {
      // Another tab may have saved something since: keep the best of both, never overwrite it.
      const current = mergeSaves(read(), save);
      const next = recordScore(current, board, score);
      const changed = next !== current;
      save = next;
      if (changed) {
        try {
          storage.setItem(key, serializeSave(save));
        } catch {
          // Storage is full or blocked. The record still counts until the tab is closed.
        }
      }
      return changed;
    },
    reset: () => {
      save = emptySave();
      try {
        storage.removeItem(key);
      } catch {
        // Nothing stored that could be removed.
      }
    },
  };
}
