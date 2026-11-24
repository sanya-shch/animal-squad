import type { Level } from "../core";
import { createGame, type GameState } from "../game";
import { bindHoldGesture } from "../input/holdGesture";
import { create, setAttr } from "./dom";
import { createHerdView } from "./herdView";
import { createHud } from "./hud";
import { createPanel } from "./panel";
import { createScene } from "./scene";

/**
 * Mounts one playable level into `root` and returns a function that tears it down again.
 * The game is the single source of truth; every part of the view just reacts to its state.
 */
export function mountGame(root: HTMLElement, level: Level, seed: number): () => void {
  const game = createGame({ level, seed });

  const hud = createHud(level.name);
  const scene = createScene(level);
  const herd = createHerdView(scene, level);
  const panel = createPanel(game.next);

  const hint = create("p", "hint", ["Press and hold to let the cows in"]);
  // Only the stage listens for the hold, so the buttons around it are never captured by it.
  const stage = create("main", "stage", [scene.element, hint]);
  const page = create("div", "game", [hud.element, stage, panel.element, panel.status]);
  root.append(page);
  document.title = `${level.name} · Animal Squad`;

  const render = (state: GameState): void => {
    herd.update(state);
    hud.update(state);
    panel.update(state);
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
