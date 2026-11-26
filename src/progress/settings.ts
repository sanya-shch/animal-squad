import type { KeyValueStore } from "./store";

export const SETTINGS_KEY = "animal-squad:settings";

export interface Settings {
  readonly muted: boolean;
}

export const DEFAULT_SETTINGS: Settings = { muted: false };

// Defensive like the save: anything unexpected falls back to the defaults.
export function parseSettings(raw: string | null): Settings {
  if (raw === null) return DEFAULT_SETTINGS;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data === "object" && data !== null && "muted" in data) {
      return { muted: data.muted === true };
    }
  } catch {
    // Damaged settings are not worth stopping for.
  }
  return DEFAULT_SETTINGS;
}

export interface SettingsStore {
  isMuted: () => boolean;
  setMuted: (muted: boolean) => void;
}

export function createSettingsStore(storage: KeyValueStore, key = SETTINGS_KEY): SettingsStore {
  let settings = DEFAULT_SETTINGS;
  try {
    settings = parseSettings(storage.getItem(key));
  } catch {
    // Storage is blocked: the defaults hold for this visit.
  }

  return {
    isMuted: () => settings.muted,
    setMuted: (muted) => {
      if (muted === settings.muted) return;
      settings = { ...settings, muted };
      try {
        storage.setItem(key, JSON.stringify(settings));
      } catch {
        // The choice still holds until the tab is closed.
      }
    },
  };
}
