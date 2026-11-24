import type { GameState } from "../game";
import { create, setAttr, setText, setVars } from "./dom";
import { revealDurationMs } from "./timing";

export interface Panel {
  readonly element: HTMLElement;
  /** A line for screen readers: what just happened. */
  readonly status: HTMLElement;
  update: (state: GameState) => void;
}

interface Summary {
  readonly title: string;
  readonly lines: readonly string[];
  readonly stars: number | undefined;
  readonly button: string;
}

type ResultState = Extract<GameState, { phase: "result" }>;

function summarize(state: ResultState): Summary {
  const { result, run, gained, final } = state;
  const button = final ? "New run" : "Next round";
  const par = `Best possible: ${result.par.points} points with ${result.par.cows} cows.`;

  if (final) {
    return {
      title: "Game over",
      lines: [`Final score: ${run.score}`, par],
      stars: undefined,
      button,
    };
  }
  switch (result.status) {
    case "empty":
      return {
        title: "Nobody came in",
        lines: ["Keep the gate open a little longer."],
        stars: undefined,
        button: "Try again",
      };
    case "overflow":
      return {
        title: "The fence broke!",
        lines: [`You let in ${result.admitted.length} cows and lost a life.`, par],
        stars: undefined,
        button,
      };
    case "success": {
      const bonus = gained - result.points;
      return {
        title: result.stars === 3 ? "Perfect!" : "Safe!",
        lines: [
          bonus > 0 ? `+${gained} points (streak bonus +${bonus})` : `+${gained} points`,
          result.stars === 3 ? "You could not have fit more." : par,
        ],
        stars: result.stars,
        button,
      };
    }
  }
}

/** The bottom sheet that appears once the herd has grown up. */
export function createPanel(onNext: () => void): Panel {
  const title = create("h2", "panel__title");
  const stars = create("div", "panel__stars");
  stars.setAttribute("role", "img");
  const starIcons = [0, 1, 2].map(() => create("span", "star", ["★"]));
  stars.append(...starIcons);
  const lines = create("div", "panel__lines");
  const button = create("button", "panel__button");
  button.type = "button";
  button.addEventListener("click", onNext);

  const element = create("section", "panel", [title, stars, lines, button]);
  element.hidden = true;
  const status = create("p", "visually-hidden");
  status.setAttribute("role", "status");

  let shown: unknown;

  return {
    element,
    status,
    update: (state) => {
      if (state.phase !== "result") {
        if (shown !== undefined) {
          shown = undefined;
          element.hidden = true;
        }
        if (state.phase === "admitting") {
          setText(status, `${state.admitted} of ${state.herd.length} cows let in`);
        }
        return;
      }
      if (shown === state) return;
      shown = state;

      const summary = summarize(state);
      setText(title, summary.title);
      lines.replaceChildren(...summary.lines.map((line) => create("p", "", [line])));
      setText(button, summary.button);
      stars.hidden = summary.stars === undefined;
      starIcons.forEach((icon, index) =>
        icon.classList.toggle("is-earned", index < (summary.stars ?? 0)),
      );
      setAttr(stars, "aria-label", `${summary.stars ?? 0} out of 3 stars`);

      // The sheet waits for the herd to finish growing before it slides in.
      setVars(element, { wait: `${revealDurationMs(state)}ms` });
      element.hidden = false;
      setText(status, `${summary.title} ${summary.lines.join(" ")}`);
    },
  };
}
