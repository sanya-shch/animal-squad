import { hashSeed, randomSeed, type Level } from "./core";
import { mountGame } from "./render/gameView";
import { mountHome } from "./screens/home";

// ?seed=123 (a number) or ?seed=any-text replays exactly the same game.
function readSeed(): number {
  const raw = new URLSearchParams(location.search).get("seed");
  if (raw === null) return randomSeed();
  return /^\d+$/.test(raw) ? Number(raw) : hashSeed(raw);
}

/** Two screens, picked by the URL hash: "#meadow" plays that level, anything else is the menu. */
export function startApp(root: HTMLElement, levels: readonly Level[]): () => void {
  let unmount: (() => void) | undefined;

  const show = (): void => {
    unmount?.();
    const id = decodeURIComponent(location.hash.slice(1));
    const level = levels.find((candidate) => candidate.id === id);
    unmount = level ? mountGame(root, level, readSeed()) : mountHome(root, levels);
  };

  window.addEventListener("hashchange", show);
  show();

  return () => {
    window.removeEventListener("hashchange", show);
    unmount?.();
  };
}
