import { STARTING_LIVES, type Game, type GameState } from "../game";
import { bindHoldGesture } from "../input/holdGesture";

// Throwaway text view that proves the state machine and the input work in a real browser.
// The real renderer replaces it in the next patch.

const hearts = (lives: number): string =>
  "♥".repeat(Math.max(lives, 0)) + "♡".repeat(Math.max(STARTING_LIVES - lives, 0));

const stars = (count: number): string => "★".repeat(count) + "☆".repeat(3 - count);

function describe(game: Game, state: GameState): string[] {
  const { run } = state;
  const lines = [
    `ANIMAL SQUAD · dev view · ${game.level.name} (${game.level.pen.capacity} squares)`,
    `seed ${run.seed}  (reload with ?seed=${run.seed}&level=${game.level.id} to replay it)`,
    "",
    `Round ${run.round} · Lives ${hearts(run.lives)} · Score ${run.score} · ` +
      `Perfect streak ${run.perfectStreak}`,
    "",
  ];

  // Mutants are visible in the queue (M), but which kind they are stays a surprise.
  const queue = (admitted: number): string =>
    state.herd
      .map((cow, i) => (i < admitted ? "■" : cow.kind === "normal" ? "·" : "M"))
      .join(" ");

  switch (state.phase) {
    case "ready":
      lines.push("Hold the pad (mouse, touch or Space) to let cows in. Let go to close the gate.");
      lines.push(`Queue: ${queue(0)}`);
      break;
    case "admitting":
      lines.push(`Cows in: ${state.admitted} / ${state.herd.length}`);
      lines.push(`Queue: ${queue(state.admitted)}`);
      break;
    case "result": {
      const { result } = state;
      lines.push(`Queue: ${queue(0)}`);
      if (result.status === "empty") {
        lines.push("Nobody came in. Same herd, try again.");
      } else {
        const kinds = result.admitted.map((cow) => cow.kind).join(", ");
        lines.push(`Let in: ${kinds}`);
        lines.push(
          result.status === "success"
            ? `Safe! +${state.gained} points ${stars(result.stars)}`
            : "The fence broke! You lost a life.",
        );
        lines.push(`Best possible: ${result.par.points} points with ${result.par.cows} cows.`);
      }
      if (state.final) lines.push("", `GAME OVER · final score ${run.score}`);
      break;
    }
  }
  return lines;
}

/** Mounts the dev view and returns a function that tears everything down again. */
export function mountDevView(root: HTMLElement, game: Game): () => void {
  const output = document.createElement("pre");
  output.className = "dev-output";

  const pad = document.createElement("div");
  pad.className = "hold-zone";
  pad.tabIndex = 0;
  pad.setAttribute("role", "button");
  pad.setAttribute("aria-label", "Hold to let cows in");
  pad.textContent = "HOLD";

  const next = document.createElement("button");
  next.className = "dev-next";
  next.addEventListener("click", game.next);

  root.append(output, pad, next);

  // Runs only when the state changes, never on a timer of its own.
  const render = (state: GameState): void => {
    output.textContent = describe(game, state).join("\n");
    pad.classList.toggle("active", state.phase === "admitting");
    next.hidden = state.phase !== "result";
    next.textContent = state.phase === "result" && state.final ? "New run" : "Next round";
  };

  const unsubscribe = game.subscribe(render);
  const unbind = bindHoldGesture({ target: pad, onHold: game.hold, onRelease: game.release });
  render(game.getState());

  return () => {
    unbind();
    unsubscribe();
    root.replaceChildren();
  };
}
