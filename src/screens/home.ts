import { COW_KIND_IDS, COW_KINDS, cowSize, terrainAt, type CowKindId, type Level } from "../core";
import { bestScore, levelBoard, levelStars, type SaveData } from "../progress";
import { assetUrl } from "../render/assets";
import { create, setText, setVars, sprite } from "../render/dom";
import { icon } from "../render/icons";
import { CALF_FILE, cowSpriteFile } from "../render/spriteFiles";
import { clockTime, plural } from "../render/text";

const KIND_NAMES: Record<CowKindId, string> = {
  normal: "Cow",
  twoHeaded: "Two-headed",
  fat: "Fat",
};

export interface DailyInfo {
  readonly level: Level;
  // Best score today, or undefined if today's challenge has not been played yet.
  readonly bestToday: number | undefined;
  readonly streak: number;
  // When today's challenge ends and the next one starts (epoch milliseconds).
  readonly endsAt: number;
}

export interface HomeOptions {
  readonly levels: readonly Level[];
  readonly save: SaveData;
  readonly unlocked: ReadonlySet<string>;
  readonly daily: DailyInfo;
  // The current time. Injectable so that tests can pretend it is another day.
  readonly now?: () => Date;
  // Called after the player confirmed that all progress should be erased.
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
      create("strong", "legend__name", [KIND_NAMES[kind]]),
      create("span", "legend__score", [
        create("span", "legend__squares", [squares]),
        create("span", "legend__points", [points]),
      ]),
    ]);
  });
  return create("ul", "legend", items);
}

function herdCard(): HTMLElement {
  return create("section", "card herd-card", [
    create("div", "card__head", [
      create("div", "", [
        create("h2", "card__title", ["Meet the herd"]),
        create("p", "card__hint", ["Each animal scores differently"]),
      ]),
      create("span", "pill pill--green", ["Score guide"]),
    ]),
    legend(),
  ]);
}

function stars(count: number, label: string): HTMLElement {
  const icons = [0, 1, 2].map((index) =>
    icon("star", index < count ? "level__star is-earned" : "level__star"),
  );
  const element = create("span", "level__stars", icons);
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", label);
  return element;
}

// A top-down sketch of the pen: one dot per square, grey for a rock.
function preview(level: Level): HTMLElement {
  const { pen } = level;
  const element = create("span", "preview");
  element.setAttribute("aria-hidden", "true");
  const grid = create("span", "preview__grid");
  // `span` is the longer side: the dots shrink with it so that every pen fits the same tile.
  setVars(grid, { cols: pen.width, span: Math.max(pen.width, pen.height) });
  for (let y = 0; y < pen.height; y++) {
    for (let x = 0; x < pen.width; x++) {
      grid.append(create("span", `preview__square preview__square--${terrainAt(pen, x, y)}`));
    }
  }
  element.append(grid);
  return element;
}

function levelCard(level: Level, previous: Level | undefined, options: HomeOptions): HTMLElement {
  const { pen } = level;
  const size = create("span", "level__size", [
    `${pen.width} × ${pen.height} · ${plural(pen.capacity, "square")}`,
  ]);

  if (!options.unlocked.has(level.id)) {
    const hint = previous ? `Earn a star on ${previous.name}` : "Locked";
    const card = create("div", "level is-locked", [
      preview(level),
      create("strong", "level__name", [level.name]),
      size,
      create("span", "level__lock", [icon("lock"), hint]),
      create("span", "level__state", ["Locked"]),
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
    size,
    stars(earned, label),
    create("span", "level__best", [best > 0 ? `Best ${best}` : "Not played yet"]),
    create("span", "level__go", ["Start herding", icon("arrow")]),
  ]);
  card.href = `#${encodeURIComponent(level.id)}`;
  card.title = `Stars at ${one}, ${two} and ${three} points`;
  return card;
}

function pensCard(options: HomeOptions): HTMLElement {
  const { levels, unlocked } = options;
  const open = levels.filter((level) => unlocked.has(level.id)).length;
  const pill = create("span", "pill pill--green", [`${open} of ${levels.length} open`]);
  return create("section", "card pens", [
    create("div", "card__head", [
      create("div", "", [
        create("p", "card__eyebrow", ["Pick your next pasture"]),
        create("h2", "card__title card__title--big", ["Choose a pen"]),
      ]),
      pill,
    ]),
    create(
      "nav",
      "levels",
      levels.map((level, index) => levelCard(level, levels[index - 1], options)),
    ),
  ]);
}

// "08h 42m left". On a narrow screen the minutes are dropped by CSS.
function fillTimeLeft(element: HTMLElement, endsAt: number, now: Date): void {
  const { hours, minutes } = clockTime(endsAt - now.getTime());
  const [h, m] = [element.querySelector(".daily__hours"), element.querySelector(".daily__minutes")];
  if (h && m) {
    setText(h, `${hours}h`);
    setText(m, `${minutes}m`);
  }
}

function dailyCard({ level, bestToday, streak, endsAt }: DailyInfo, now: Date): HTMLElement {
  const time = create("span", "daily__time", [
    icon("clock"),
    create("span", "daily__hours"),
    create("span", "daily__minutes"),
    create("span", "", ["left"]),
  ]);
  fillTimeLeft(time, endsAt, now);

  const play = create("a", "daily__play", ["Play today", icon("arrow")]);
  play.href = "#daily";
  play.setAttribute("aria-label", `Play today's daily challenge on ${level.name}`);

  return create("section", "daily", [
    create("div", "daily__intro", [
      create("p", "daily__tag", [icon("calendar"), "Daily challenge"]),
      create("h2", "daily__pen", [level.name]),
      create("p", "daily__text", [
        "The same herd for everyone, today only. Can you keep the fence intact?",
      ]),
    ]),
    create("div", "daily__actions", [play, time]),
    create("div", "daily__badge", [
      create("div", "daily__medal", [
        icon("medal", "icon daily__medal-icon"),
        create("strong", "daily__status", [
          bestToday === undefined ? "Not played" : `Best ${bestToday}`,
        ]),
      ]),
      create("p", "daily__streak", [icon("zap"), `Daily streak: ${streak}`]),
    ]),
  ]);
}

// The start screen: what the cows are worth, today's challenge, and which pen to play.
export function mountHome(root: HTMLElement, options: HomeOptions): () => void {
  const { onReset } = options;
  const now = options.now ?? (() => new Date());

  const reset = create("button", "home__reset", [icon("trash"), "Clear saved progress"]);
  reset.type = "button";
  reset.addEventListener("click", () => {
    if (window.confirm("Erase all stars and best scores? This cannot be undone.")) onReset();
  });

  const daily = dailyCard(options.daily, now());
  const time = daily.querySelector<HTMLElement>(".daily__time");
  // The countdown is the only thing on this screen that changes by itself.
  const timer = window.setInterval(() => {
    if (time) fillTimeLeft(time, options.daily.endsAt, now());
  }, 30_000);

  const page = create("main", "home", [
    create("header", "home__brand", [
      create("span", "home__logo", [icon("tractor")]),
      create("div", "", [
        create("h1", "home__title", ["Animal Squad"]),
        create("p", "home__tagline", [
          "Hold the gate open to let the herd into the pen. Let go before the fence breaks!",
        ]),
      ]),
    ]),
    create("p", "home__saved", [icon("monitor"), "Saved in this browser"]),
    daily,
    herdCard(),
    pensCard(options),
    create("p", "home__status", [icon("shield"), "Fence integrity: ready"]),
    create("div", "home__erase", [
      create("p", "home__note", ["Only clears this browser's saved progress."]),
      reset,
    ]),
  ]);
  root.append(page);
  document.title = "Animal Squad";
  return () => {
    window.clearInterval(timer);
    page.remove();
  };
}
