import { describe, expect, it } from "vitest";

import { createSettingsStore, DEFAULT_SETTINGS, parseSettings, SETTINGS_KEY } from "./settings";
import { createMemoryStorage, type KeyValueStore } from "./store";

describe("parseSettings", () => {
  it("falls back to the defaults for anything unexpected", () => {
    for (const raw of [null, "", "{", "null", "42", "[]", "{}", '{"muted":"yes"}']) {
      expect(parseSettings(raw)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it("reads a valid choice", () => {
    expect(parseSettings('{"muted":true}')).toEqual({ muted: true });
    expect(parseSettings('{"muted":false}')).toEqual({ muted: false });
  });
});

describe("createSettingsStore", () => {
  it("remembers the choice across visits", () => {
    const storage = createMemoryStorage();
    createSettingsStore(storage).setMuted(true);
    expect(createSettingsStore(storage).isMuted()).toBe(true);
  });

  it("writes only when the choice changed", () => {
    const storage = createMemoryStorage();
    let writes = 0;
    const counting: KeyValueStore = {
      ...storage,
      setItem: (key, value) => {
        writes++;
        storage.setItem(key, value);
      },
    };
    const store = createSettingsStore(counting);
    store.setMuted(false); // already the default
    store.setMuted(true);
    store.setMuted(true);
    expect(writes).toBe(1);
    expect(storage.getItem(SETTINGS_KEY)).toBe('{"muted":true}');
  });

  it("keeps working when the storage throws", () => {
    const blocked: KeyValueStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => undefined,
    };
    const store = createSettingsStore(blocked);
    expect(store.isMuted()).toBe(false);
    store.setMuted(true);
    expect(store.isMuted()).toBe(true);
  });
});
