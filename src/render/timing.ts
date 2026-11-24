import type { GameState } from "../game";

/** Time between two cows starting to grow, so the herd unfolds as a wave. */
export const REVEAL_STAGGER_MS = 70;
/** How long the last cow needs to finish growing. */
const GROW_MS = 750;

/** How long after the gate closes the herd keeps growing, i.e. when the result may be shown. */
export function revealDurationMs(state: Extract<GameState, { phase: "result" }>): number {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || state.result.status === "empty") return 0;
  return state.result.admitted.length * REVEAL_STAGGER_MS + GROW_MS;
}
