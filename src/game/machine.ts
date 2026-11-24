import {
  createRng,
  generateHerd,
  resolveRound,
  type Cow,
  type Level,
  type RoundResult,
} from "../core";
import { roundSeed, startRun, type Run } from "./run";
import { scoreRound } from "./scoring";

export type GameState =
  /** A herd is waiting at the gate. */
  | { readonly phase: "ready"; readonly run: Run; readonly herd: readonly Cow[] }
  /** The player is holding the gate open and cows are walking in, one per tick. */
  | {
      readonly phase: "admitting";
      readonly run: Run;
      readonly herd: readonly Cow[];
      readonly admitted: number;
    }
  /** The round is over. `run` already includes its outcome. */
  | {
      readonly phase: "result";
      readonly run: Run;
      readonly herd: readonly Cow[];
      readonly result: RoundResult;
      readonly gained: number;
      /** True when this round used up the last life. */
      readonly final: boolean;
    };

type AdmittingState = Extract<GameState, { phase: "admitting" }>;

export type GameEvent =
  /** Pointer down / key down: open the gate. */
  | { readonly type: "hold" }
  /** Time passes: the next cow walks in. */
  | { readonly type: "tick" }
  /** Pointer up / key up: close the gate. */
  | { readonly type: "release" }
  /** Leave the result screen for the next round. */
  | { readonly type: "next" }
  /** Abandon everything and start a new run. */
  | { readonly type: "restart"; readonly seed: number };

export interface GameMachine {
  initialState: (seed: number) => GameState;
  /**
   * Pure: no timers, no randomness, no DOM. Events that make no sense in the current phase
   * return the very same state object, so callers can detect "nothing happened" with `===`.
   */
  transition: (state: GameState, event: GameEvent) => GameState;
}

export function createGameMachine(level: Level): GameMachine {
  const readyState = (run: Run): GameState => ({
    phase: "ready",
    run,
    herd: generateHerd(level, createRng(roundSeed(run))),
  });

  const finish = (state: AdmittingState, admitted: number): GameState => {
    const result = resolveRound(level.pen, state.herd, admitted);
    const { run, gained } = scoreRound(state.run, result);
    return { phase: "result", run, herd: state.herd, result, gained, final: run.lives <= 0 };
  };

  const initialState = (seed: number): GameState => readyState(startRun(seed));

  const transition = (state: GameState, event: GameEvent): GameState => {
    if (event.type === "restart") return initialState(event.seed);

    switch (state.phase) {
      case "ready":
        return event.type === "hold"
          ? { phase: "admitting", run: state.run, herd: state.herd, admitted: 0 }
          : state;

      case "admitting": {
        if (event.type === "release") return finish(state, state.admitted);
        if (event.type !== "tick") return state;
        const admitted = state.admitted + 1;
        // The whole herd is inside: nobody is left to wait for.
        return admitted >= state.herd.length ? finish(state, admitted) : { ...state, admitted };
      }

      case "result":
        // After the last life there is no next round, only a restart.
        return event.type === "next" && !state.final ? readyState(state.run) : state;
    }
  };

  return { initialState, transition };
}
