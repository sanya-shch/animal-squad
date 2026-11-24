import { randomSeed, type Level } from "../core";
import { createGameMachine, type GameEvent, type GameState } from "./machine";

export const DEFAULT_COW_INTERVAL_MS = 250;

/** The only source of time in the game. Swap it out in tests to control the clock. */
export interface Scheduler {
  /** Calls `callback` every `ms` milliseconds. Returns a function that stops it. */
  every: (callback: () => void, ms: number) => () => void;
}

export const browserScheduler: Scheduler = {
  every: (callback, ms) => {
    const id = setInterval(callback, ms);
    return () => {
      clearInterval(id);
    };
  },
};

export interface GameOptions {
  readonly level: Level;
  readonly seed: number;
  /** Time between two cows walking through the gate. */
  readonly cowIntervalMs?: number;
  readonly scheduler?: Scheduler;
  /** Where the seed of a fresh run comes from after "play again". */
  readonly createSeed?: () => number;
}

export interface Game {
  readonly level: Level;
  getState: () => GameState;
  /** Listeners run only when the state really changed. Returns an unsubscribe function. */
  subscribe: (listener: (state: GameState) => void) => () => void;
  hold: () => void;
  release: () => void;
  /** Next round, or a brand new run when the last life is gone. */
  next: () => void;
  restart: () => void;
  /** Stops the timer and drops all listeners. */
  dispose: () => void;
}

/**
 * Glue between the pure state machine and the outside world. This is the one place that owns
 * a timer: it runs exactly while the gate is open, so an idle game costs nothing.
 */
export function createGame(options: GameOptions): Game {
  const { level } = options;
  const machine = createGameMachine(level);
  const scheduler = options.scheduler ?? browserScheduler;
  const cowIntervalMs = options.cowIntervalMs ?? DEFAULT_COW_INTERVAL_MS;
  const createSeed = options.createSeed ?? randomSeed;

  let state = machine.initialState(options.seed);
  let stopTimer: (() => void) | undefined;
  let disposed = false;
  const listeners = new Set<(state: GameState) => void>();

  const syncTimer = (): void => {
    if (state.phase === "admitting") {
      stopTimer ??= scheduler.every(() => {
        dispatch({ type: "tick" });
      }, cowIntervalMs);
    } else {
      stopTimer?.();
      stopTimer = undefined;
    }
  };

  const dispatch = (event: GameEvent): void => {
    if (disposed) return;
    const next = machine.transition(state, event);
    if (next === state) return;

    state = next;
    syncTimer();
    for (const listener of [...listeners]) listener(state);
  };

  return {
    level,
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hold: () => {
      dispatch({ type: "hold" });
    },
    release: () => {
      dispatch({ type: "release" });
    },
    next: () => {
      dispatch(
        state.phase === "result" && state.final
          ? { type: "restart", seed: createSeed() }
          : { type: "next" },
      );
    },
    restart: () => {
      dispatch({ type: "restart", seed: createSeed() });
    },
    dispose: () => {
      disposed = true;
      stopTimer?.();
      stopTimer = undefined;
      listeners.clear();
    },
  };
}
