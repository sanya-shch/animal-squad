import { COW_KIND_IDS, COW_KINDS, cowSize, terrainAt, type CowKindId, type Level } from "../core";
import { assetUrl } from "../render/assets";
import { create, setVars, sprite } from "../render/dom";
import { CALF_FILE, cowSpriteFile } from "../render/spriteFiles";

const KIND_NAMES: Record<CowKindId, string> = {
  normal: "Cow",
  twoHeaded: "Two-headed",
  fat: "Fat",
};

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;

function legend(): HTMLElement {
  const items = COW_KIND_IDS.map((kind) => {
    const squares = plural(cowSize(kind), "square");
    const points = plural(COW_KINDS[kind].points, "point");
    return create("li", "legend__item", [
      // Regular cows grow into a different picture every time, so the legend shows the calf.
      sprite(
        assetUrl(kind === "normal" ? CALF_FILE : cowSpriteFile(kind, 0)),
        `legend__cow legend__cow--${kind}`,
      ),
      create("strong", "", [KIND_NAMES[kind]]),
      create("span", "", [`${squares}, ${points}`]),
    ]);
  });
  return create("ul", "legend", items);
}

function levelCard(level: Level): HTMLElement {
  const { pen } = level;
  const preview = create("span", "preview");
  setVars(preview, { cols: pen.width });
  preview.setAttribute("aria-hidden", "true");
  for (let y = 0; y < pen.height; y++) {
    for (let x = 0; x < pen.width; x++) {
      preview.append(create("span", `preview__square preview__square--${terrainAt(pen, x, y)}`));
    }
  }

  const card = create("a", "level", [
    preview,
    create("strong", "level__name", [level.name]),
    create("span", "level__size", [
      `${pen.width}×${pen.height} · ${plural(pen.capacity, "square")}`,
    ]),
  ]);
  card.href = `#${encodeURIComponent(level.id)}`;
  return card;
}

/** The start screen: what the cows are worth, and which pen to play. */
export function mountHome(root: HTMLElement, levels: readonly Level[]): () => void {
  const page = create("main", "home", [
    create("h1", "home__title", ["Animal Squad"]),
    create("p", "home__tagline", [
      "Hold the gate open to let the herd into the pen. Let go before the fence breaks!",
    ]),
    legend(),
    create("h2", "home__subtitle", ["Choose a pen"]),
    create("nav", "levels", levels.map(levelCard)),
  ]);
  root.append(page);
  document.title = "Animal Squad";
  return () => {
    page.remove();
  };
}
