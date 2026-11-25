import { createGame, STARTING_LIVES, type GameState } from "../game";
import { bindHoldGesture } from "../input/holdGesture";
import type { Level } from "../core";
import {
  bestScore,
  summarizeRun,
  unlockedLevelIds,
  type ProgressStore,
} from "../progress";
import type { PlaySession } from "../session";
import { create, setAttr } from "./dom";
import { createHerdView } from "./herdView";
import { createHud } from "./hud";
import { createPanel, type FinalExtras } from "./panel";
import { createScene } from "./scene";

export interface GameViewOptions {
  readonly session: PlaySession;
  readonly progress: ProgressStore;
  /** All pens, in order. Needed to tell the player which pens a run has opened. */
  readonly levels: readonly Level[];
}

/**
 * Mounts one playable session into `root` and returns a function that tears it down again.
 * The game is the single source of truth; every part of the view just reacts to its state.
 */
export function mountGame(root: HTMLElement, options: GameViewOptions): () => void {
  const { session, progress, levels } = options;
  const { level, board } = session;

  const game = createGame({
    level,
    seed: session.seed,
    ...(session.replaysSameSeed ? { createSeed: () => session.seed } : {}),
  });

  const hud = createHud({
    title: level.name,
    prefix: session.label === "" ? "" : `${session.label} · `,
  });
  const scene = createScene(level);
  const herd = createHerdView(scene, level);
  const panel = createPanel(game.next);

  const hint = create("p", "hint", ["Press and hold to let the cows in"]);
  // Only the stage listens for the hold, so the buttons around it are never captured by it.
  const stage = create("main", "stage", [scene.element, hint]);
  const page = create("div", "game", [hud.element, stage, panel.element, panel.status]);
  root.append(page);
  document.title = `${level.name} · Animal Squad`;

  // How things stood when the current run began, to tell what this run achieved.
  let bestBefore = 0;
  let unlockedBefore: ReadonlySet<string> = new Set();
  let recordedFor: GameState | undefined;

  const startOfRun = (state: GameState): boolean =>
    state.phase === "ready" &&
    state.run.round === 1 &&
    state.run.score === 0 &&
    state.run.lives === STARTING_LIVES;

  const finalExtras = (state: GameState): FinalExtras | undefined => {
    if (state.phase !== "result" || !state.final) return undefined;
    const summary = summarizeRun({
      score: state.run.score,
      bestBefore,
      goals: board.kind === "level" ? level.goals : undefined,
      unlockedBefore,
      unlockedAfter: unlockedLevelIds(levels, progress.getSave()),
    });
    const names = summary.unlocked.map((id) => levels.find((l) => l.id === id)?.name ?? id);
    return { ...summary, unlocked: names };
  };

  const render = (state: GameState): void => {
    if (startOfRun(state)) {
      bestBefore = bestScore(progress.getSave(), board);
      unlockedBefore = unlockedLevelIds(levels, progress.getSave());
    }
    // Every finished round counts at once, so leaving mid-run never throws progress away.
    if (state.phase === "result" && state.result.status !== "empty" && recordedFor !== state) {
      recordedFor = state;
      progress.recordScore(board, state.run.score);
    }
    const best = Math.max(bestScore(progress.getSave(), board), state.run.score);

    herd.update(state);
    hud.update(state, best);
    panel.update(state, finalExtras(state));
    setAttr(page, "data-phase", state.phase);
    setAttr(page, "data-outcome", state.phase === "result" ? state.result.status : "");
  };

  const unsubscribe = game.subscribe(render);
  const unbind = bindHoldGesture({ target: stage, onHold: game.hold, onRelease: game.release });

  // Keyboard players hold with Space and move on with Enter.
  const controller = new AbortController();
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter" && !event.repeat && game.getState().phase === "result") {
        game.next();
      }
    },
    { signal: controller.signal },
  );

  render(game.getState());

  return () => {
    controller.abort();
    unbind();
    unsubscribe();
    game.dispose();
    herd.destroy();
    hud.destroy();
    page.remove();
  };
}
