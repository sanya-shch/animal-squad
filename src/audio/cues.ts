import type { GameState } from "../game";
import { REVEAL_STAGGER_MS } from "../render/timing";

export type SoundName = "open" | "step" | "pop" | "snap" | "star" | "win" | "lose" | "nope";

/** One sound to play, `delayMs` after the moment the game changed. */
export interface Cue {
  readonly sound: SoundName;
  readonly delayMs: number;
  /** 0 to 1: how far along it is (how full the pen is, which cow of the herd, which star). */
  readonly level: number;
}

/** The pop of the first cow starts this long after the gate closes, like its animation. */
const FIRST_POP_MS = 150;
/** The fence gives way this long after the gate closes, in time with the shake. */
const SNAP_MS = 450;
const STAR_GAP_MS = 160;

const cue = (sound: SoundName, delayMs: number, level = 0): Cue => ({ sound, delayMs, level });

/**
 * Which sounds a change of game state calls for. Pure, so the whole soundtrack is testable
 * without a speaker: the sounds are timed to the animations, which start from the same
 * moment, so a pop is heard just as its cow grows.
 *
 * `revealMs` is how long the herd takes to grow, i.e. when the result may be announced.
 */
export function cuesFor(previous: GameState | undefined, next: GameState, revealMs: number): Cue[] {
  if (previous === next) return [];

  if (next.phase === "admitting") {
    if (previous?.phase !== "admitting") return [cue("open", 0)];
    return next.admitted > previous.admitted
      ? [cue("step", 0, next.admitted / next.herd.length)]
      : [];
  }

  if (next.phase !== "result" || previous?.phase === "result") return [];

  const { result } = next;
  if (result.status === "empty") return [cue("nope", 0)];

  const count = result.admitted.length;
  const cues = result.admitted.map((_, index) =>
    cue("pop", FIRST_POP_MS + index * REVEAL_STAGGER_MS, count > 1 ? index / (count - 1) : 0),
  );

  let announcedAt = revealMs + 250;
  if (result.status === "overflow") {
    cues.push(cue("snap", SNAP_MS));
  } else {
    for (let star = 0; star < result.stars; star++) {
      cues.push(cue("star", announcedAt + star * STAR_GAP_MS, star / 2));
    }
    announcedAt += result.stars * STAR_GAP_MS;
  }

  if (next.final) cues.push(cue(next.run.lives > 0 ? "win" : "lose", announcedAt + 150));
  return cues;
}
