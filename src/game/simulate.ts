import type { Cow, Level } from "../core";
import { createGameMachine } from "./machine";

// What a player can see at the gate: whether each calf looks like a mutant, not which kind.
export interface PlayerView {
  readonly level: Level;
  // Cows already inside.
  readonly admitted: number;
  readonly silhouettes: readonly ("calf" | "mutant")[];
}

// Decides, before each cow, whether to keep the gate open.
export type Policy = (view: PlayerView) => boolean;

const silhouettesOf = (herd: readonly Cow[]): ("calf" | "mutant")[] =>
  herd.map((cow) => (cow.kind === "normal" ? "calf" : "mutant"));

/**
 * Plays a whole run with a robot player, using nothing but the public state machine.
 * Used to calibrate the star goals and to prove that the levels are neither impossible
 * nor trivial. `maxRounds` is a safety net for a player who never lets anybody in: such
 * rounds are replayed and do not count towards the run.
 */
export function simulateRun(
  level: Level,
  seed: number,
  policy: Policy,
  maxRounds = 200,
): { score: number; rounds: number } {
  const machine = createGameMachine(level);
  let state = machine.initialState(seed);

  for (let round = 0; round < maxRounds; round++) {
    state = machine.transition(state, { type: "hold" });
    while (state.phase === "admitting") {
      const view: PlayerView = {
        level,
        admitted: state.admitted,
        silhouettes: silhouettesOf(state.herd),
      };
      state = machine.transition(state, { type: policy(view) ? "tick" : "release" });
    }
    if (state.phase !== "result") break;
    if (state.final) return { score: state.run.score, rounds: state.run.round - 1 };
    state = machine.transition(state, { type: "next" });
  }
  return { score: state.run.score, rounds: state.run.round - 1 };
}

// Always lets in exactly `count` cows. The most timid player there is, for `count` = 1.
export const fixedCount =
  (count: number): Policy =>
  ({ admitted }) =>
    admitted < count;

// A sensible human: estimates how many squares are taken (a mutant counts as the average
// mutant of this level) and stops once `fill` of the pen is full. Lower means more careful.
export function expectedFill(level: Level, fill: number): Policy {
  const { fat = 0, twoHeaded = 0 } = level.herd.spawnWeights;
  const mutants = fat + twoHeaded;
  const mutantSize = mutants > 0 ? (fat * 2 + twoHeaded) / mutants : 1;
  return ({ admitted, silhouettes }) => {
    let squares = 0;
    for (let i = 0; i < admitted; i++) squares += silhouettes[i] === "mutant" ? mutantSize : 1;
    const next = silhouettes[admitted] === "mutant" ? mutantSize : 1;
    return squares + next <= level.pen.capacity * fill;
  };
}

// Humans are not instant: by the time the finger lifts, `lag` more cows have walked in.
// Wraps a policy so that its "stop" only takes effect `lag` cows later.
export function withLag(policy: Policy, lag: number): Policy {
  let stoppedAt: number | undefined;
  let lastSeen = Number.POSITIVE_INFINITY;
  return (view) => {
    // A fresh round starts when the count of cows inside goes back down.
    if (view.admitted < lastSeen) stoppedAt = undefined;
    lastSeen = view.admitted;
    if (stoppedAt === undefined && !policy(view)) stoppedAt = view.admitted;
    return stoppedAt === undefined || view.admitted < stoppedAt + lag;
  };
}
