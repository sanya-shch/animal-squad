import { expect, type Page } from "@playwright/test";

export const SAVE_KEY = "animal-squad:progress";
export const SETTINGS_KEY = "animal-squad:settings";

export interface Save {
  v: 1;
  levels: [string, number][];
  daily: [string, number][];
}

export const emptySave: Save = { v: 1, levels: [], daily: [] };

// The date the daily-challenge tests pretend it is. The pen of the day is Meadow, the
// shortest one, so the tests that play it stay fast. The next day is a Meadow day too.
export const DAILY_DATE = "2026-11-29";
export const DAILY_TIME = `${DAILY_DATE}T12:00:00Z`;
export const NEXT_DAILY_TIME = "2026-11-30T08:00:00Z";

// Opens the app and keeps a list of everything the browser complained about.
// Tests that care about a clean console check the list at the end.
export async function openApp(page: Page, path: string): Promise<string[]> {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  await page.goto(path);
  return problems;
}

// Puts a save in place before the page's own scripts run. A save that is already there
// wins, so progress made during the test survives a reload.
export async function seedSave(page: Page, save: Save): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: JSON.stringify(save) },
  );
}

export async function readSave(page: Page): Promise<Save | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as Save);
  }, SAVE_KEY);
}

export async function expectPhase(page: Page, phase: string, outcome?: string): Promise<void> {
  await expect(page.locator(".game")).toHaveAttribute("data-phase", phase);
  if (outcome !== undefined) {
    await expect(page.locator(".game")).toHaveAttribute("data-outcome", outcome);
  }
}

// Holds the gate open for `ms` with the mouse: press in the middle of the stage, wait, let go.
export async function holdGate(page: Page, ms: number): Promise<void> {
  await page.locator(".stage").click({ delay: ms });
}

// A herd of 12 (Meadow) is inside after 3 seconds, so this always breaks the fence there.
// Bigger herds need longer: use `holdUntilItBreaks`.
export const SAFE_HOLD_MS = 800;

// Lets every cow in, however many there are: 250 ms per cow plus a margin.
export async function holdUntilItBreaks(page: Page, herdSize: number): Promise<void> {
  await holdGate(page, herdSize * 250 + 600);
}

// Plays one round that ends safely, with about three cows.
export async function playSafeRound(page: Page): Promise<void> {
  await holdGate(page, SAFE_HOLD_MS);
  await expectPhase(page, "result", "success");
}

export async function nextRound(page: Page): Promise<void> {
  await page.keyboard.press("Enter");
  await expectPhase(page, "ready");
}

export async function panelText(page: Page): Promise<string> {
  return (await page.locator(".panel").innerText()).replace(/\s+/g, " ");
}

// The queue positions of the herd on screen. They come from the seeded random numbers
// of the round, so the same round always gives the same string.
export async function queueSignature(page: Page): Promise<string> {
  return page.evaluate(() =>
    [...document.querySelectorAll(".herd:last-child .cow")]
      .map((cow) => {
        const style = (cow as HTMLElement).style;
        return `${style.getPropertyValue("--qx")},${style.getPropertyValue("--qy")}`;
      })
      .join("|"),
  );
}
