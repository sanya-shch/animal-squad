import { STARTING_LIVES, type GameState } from "../game";
import { assetUrl } from "./assets";
import { create, setAttr, setText, setVars, sprite } from "./dom";
import { CALF_FILE } from "./spriteFiles";
import { revealDurationMs } from "./timing";

export interface Hud {
  readonly element: HTMLElement;
  update: (state: GameState) => void;
  destroy: () => void;
}

/** Level name, round, score, lives and the progress of the herd through the gate. */
export function createHud(levelName: string): Hud {
  const back = create("a", "hud__back", ["←"]);
  back.href = "#";
  back.setAttribute("aria-label", "Back to the levels");

  const level = create("span", "hud__level", [levelName]);
  const round = create("span", "hud__round");
  const score = create("span", "hud__score");
  const streak = create("span", "hud__streak");
  const hearts = Array.from({ length: STARTING_LIVES }, () => create("span", "heart", ["♥"]));
  const lives = create("span", "hud__lives", hearts);
  lives.setAttribute("role", "img");

  const fill = create("span", "progress__fill");
  const marker = sprite(assetUrl(CALF_FILE), "progress__cow");
  const progress = create("div", "progress", [fill, marker]);
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-label", "Cows let in");
  progress.setAttribute("aria-valuemin", "0");

  const element = create("header", "hud", [
    back,
    create("div", "hud__title", [level, round]),
    create("div", "hud__stats", [score, streak, lives]),
    progress,
  ]);

  let lastProgress = -1;
  let lastLives = -1;
  let pending: ReturnType<typeof setTimeout> | undefined;

  const showProgress = (state: GameState): void => {
    let value = 0;
    if (state.phase === "admitting") value = state.admitted;
    if (state.phase === "result") {
      value = state.result.status === "empty" ? 0 : state.result.admitted.length;
    }
    if (value === lastProgress) return;
    lastProgress = value;
    setVars(progress, { progress: value / state.herd.length });
    setAttr(progress, "aria-valuemax", String(state.herd.length));
    setAttr(progress, "aria-valuenow", String(value));
  };

  const showStats = (state: GameState): void => {
    const { run } = state;
    setText(round, `Round ${run.round}`);
    setText(score, String(run.score));
    setText(streak, run.perfectStreak > 0 ? `Streak ${run.perfectStreak}` : "");

    if (run.lives === lastLives) return;
    lastLives = run.lives;
    hearts.forEach((heart, index) => heart.classList.toggle("is-lost", index >= run.lives));
    setAttr(lives, "aria-label", `${run.lives} of ${STARTING_LIVES} lives left`);
  };

  return {
    element,
    update: (state) => {
      clearTimeout(pending);
      pending = undefined;
      showProgress(state);
      if (state.phase === "result") {
        // The score and the hearts wait until the herd has grown, so they do not give the
        // result away before the cows do.
        const wait = revealDurationMs(state);
        if (wait > 0) {
          pending = setTimeout(() => {
            showStats(state);
          }, wait);
          return;
        }
      }
      showStats(state);
    },
    destroy: () => {
      clearTimeout(pending);
    },
  };
}
