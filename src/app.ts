import { hashSeed, randomSeed, type Level } from "./core";
import {
  createBrowserStorage,
  createProgressStore,
  dailyBoard,
  dailyKey,
  dailyLevel,
  dailySeed,
  dailyStreak,
  levelBoard,
  savedScore,
  unlockedLevelIds,
  type ProgressStore,
} from "./progress";
import { mountGame } from "./render/gameView";
import { mountHome } from "./screens/home";
import type { PlaySession } from "./session";

// ?seed=123 (a number) or ?seed=any-text replays exactly the same game of a pen.
function readSeed(params: URLSearchParams): number {
  const raw = params.get("seed");
  if (raw === null) return randomSeed();
  return /^\d+$/.test(raw) ? Number(raw) : hashSeed(raw);
}

export interface AppOptions {
  readonly progress?: ProgressStore;
  /** The current time. Injectable so that tests can pretend it is another day. */
  readonly now?: () => Date;
}

/**
 * Two screens, picked by the URL hash: "#meadow" plays that pen, "#daily" plays today's
 * challenge, anything else is the menu. Pens that are still locked go back to the menu.
 */
export function startApp(
  root: HTMLElement,
  levels: readonly Level[],
  options: AppOptions = {},
): () => void {
  const progress = options.progress ?? createProgressStore(createBrowserStorage());
  const now = options.now ?? (() => new Date());
  let unmount: (() => void) | undefined;

  const showMenu = (): void => {
    const today = dailyKey(now());
    const save = progress.getSave();
    const unlocked = allUnlocked()
      ? new Set(levels.map((level) => level.id))
      : unlockedLevelIds(levels, save);
    unmount = mountHome(root, {
      levels,
      save,
      unlocked,
      daily: {
        level: dailyLevel(levels, today),
        bestToday: savedScore(save, dailyBoard(today)),
        streak: dailyStreak(save, today),
      },
      onReset: () => {
        progress.reset();
        show();
      },
    });
  };

  const sessionFor = (id: string): PlaySession | undefined => {
    if (id === "daily") {
      const today = dailyKey(now());
      return {
        level: dailyLevel(levels, today),
        seed: dailySeed(today),
        board: dailyBoard(today),
        replaysSameSeed: true,
        label: "Daily",
      };
    }
    const level = levels.find((candidate) => candidate.id === id);
    const open = allUnlocked() || unlockedLevelIds(levels, progress.getSave()).has(id);
    if (!level || !open) return undefined;
    return {
      level,
      seed: readSeed(new URLSearchParams(location.search)),
      board: levelBoard(level.id),
      replaysSameSeed: false,
      label: "",
    };
  };

  const show = (): void => {
    unmount?.();
    root.replaceChildren();
    const session = sessionFor(decodeURIComponent(location.hash.slice(1)));
    if (session) {
      unmount = mountGame(root, { session, progress, levels });
    } else {
      if (location.hash !== "" && location.hash !== "#") {
        // A locked or unknown pen: tidy the address bar instead of leaving a dead link in it.
        history.replaceState(null, "", location.pathname + location.search);
      }
      showMenu();
    }
  };

  window.addEventListener("hashchange", show);
  show();

  return () => {
    window.removeEventListener("hashchange", show);
    unmount?.();
  };
}

/** `?unlock=all` opens every pen, but only on the dev server: it is a testing aid, not a cheat. */
function allUnlocked(): boolean {
  return import.meta.env.DEV && new URLSearchParams(location.search).get("unlock") === "all";
}
