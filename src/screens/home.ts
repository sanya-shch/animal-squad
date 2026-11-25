import { COW_KIND_IDS, COW_KINDS, cowSize, terrainAt, type CowKindId, type Level } from "../core";
import { bestScore, levelBoard, levelStars, type SaveData } from "../progress";
import { assetUrl } from "../render/assets";
import { create, setVars, sprite } from "../render/dom";
import { CALF_FILE, cowSpriteFile } from "../render/spriteFiles";

const KIND_NAMES: Record<CowKindId, string> = {
  normal: "Cow",
  twoHeaded: "Two-headed",
  fat: "Fat",
};

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;

export interface DailyInfo {
  readonly level: Level;
  /** Best score today, or undefined if today's challenge has not been played yet. */
  readonly bestToday: number | undefined;
  readonly streak: number;
}

export interface HomeOptions {
  readonly levels: readonly Level[];
  readonly save: SaveData;
  readonly unlocked: ReadonlySet<string>;
  readonly daily: DailyInfo;
  /** Called after the player confirmed that all progress should be erased. */
  readonly onReset: () => void;
}

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

function stars(count: number, label: string): HTMLElement {
  const icons = [0, 1, 2].map((index) =>
    create("span", index < count ? "star is-earned" : "star", ["★"]),
  );
  const element = create("span", "level__stars", icons);
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", label);
  return element;
}

function preview(level: Level): HTMLElement {
  const { pen } = level;
  const element = create("span", "preview");
  setVars(element, { cols: pen.width });
  element.setAttribute("aria-hidden", "true");
  for (let y = 0; y < pen.height; y++) {
    for (let x = 0; x < pen.width; x++) {
      element.append(create("span", `preview__square preview__square--${terrainAt(pen, x, y)}`));
    }
  }
  return element;
}

function levelCard(level: Level, previous: Level | undefined, options: HomeOptions): HTMLElement {
  const { pen } = level;
  const size = create("span", "level__size", [
    `${pen.width}×${pen.height} · ${plural(pen.capacity, "square")}`,
  ]);

  if (!options.unlocked.has(level.id)) {
    const hint = previous ? `Earn a star on ${previous.name}` : "Locked";
    const card = create("div", "level is-locked", [
      preview(level),
      create("strong", "level__name", [level.name]),
      create("span", "level__lock", [`🔒 ${hint}`]),
      size,
    ]);
    card.setAttribute("aria-disabled", "true");
    return card;
  }

  const best = bestScore(options.save, levelBoard(level.id));
  const earned = levelStars(options.save, level);
  const [one, two, three] = level.goals;
  const label = `${earned} out of 3 stars. Stars at ${one}, ${two} and ${three} points.`;
  const card = create("a", "level", [
    preview(level),
    create("strong", "level__name", [level.name]),
    stars(earned, label),
    size,
    create("span", "level__best", [best > 0 ? `Best ${best}` : "Not played yet"]),
  ]);
  card.href = `#${encodeURIComponent(level.id)}`;
  card.title = `Stars at ${one}, ${two} and ${three} points`;
  return card;
}

function dailyCard({ level, bestToday, streak }: DailyInfo): HTMLElement {
  const facts = [
    "The same herds for everyone, today only",
    bestToday === undefined ? "Not played yet" : `Best today: ${bestToday}`,
  ];
  if (streak > 0) facts.push(`${plural(streak, "day")} in a row`);

  const card = create("a", "daily", [
    create("span", "daily__tag", ["Daily challenge"]),
    create("strong", "daily__pen", [level.name]),
    create("span", "daily__facts", [facts.join(" · ")]),
    create("span", "daily__play", ["Play"]),
  ]);
  card.href = "#daily";
  return card;
}

/** The start screen: what the cows are worth, today's challenge, and which pen to play. */
export function mountHome(root: HTMLElement, options: HomeOptions): () => void {
  const { levels, onReset } = options;

  const reset = create("button", "home__reset", ["Erase progress"]);
  reset.type = "button";
  reset.addEventListener("click", () => {
    if (window.confirm("Erase all stars and best scores? This cannot be undone.")) onReset();
  });

  const page = create("main", "home", [
    create("h1", "home__title", ["Animal Squad"]),
    create("p", "home__tagline", [
      "Hold the gate open to let the herd into the pen. Let go before the fence breaks!",
    ]),
    legend(),
    dailyCard(options.daily),
    create("h2", "home__subtitle", ["Choose a pen"]),
    create(
      "nav",
      "levels",
      levels.map((level, index) => levelCard(level, levels[index - 1], options)),
    ),
    reset,
  ]);
  root.append(page);
  document.title = "Animal Squad";
  return () => {
    page.remove();
  };
}
