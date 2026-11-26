import { expect, test } from "@playwright/test";

import {
  DAILY_DATE,
  DAILY_TIME,
  expectPhase,
  holdUntilItBreaks,
  NEXT_DAILY_TIME,
  nextRound,
  openApp,
  playSafeRound,
  queueSignature,
  readSave,
  seedSave,
} from "./helpers";

test.describe("the daily challenge", () => {
  test("is its own board: no pen is credited and there are no stars", async ({ page }) => {
    await page.clock.setFixedTime(DAILY_TIME);
    await openApp(page, "/");

    await page.locator("a.daily").click();
    await expect(page).toHaveURL(/#daily$/);
    await expect(page.locator(".hud__round")).toContainText("Daily · Round 1 of 8");
    await expect(page.locator(".hud__level")).toHaveText("Meadow");

    await playSafeRound(page);
    const save = await readSave(page);
    expect(save?.levels).toEqual([]);
    expect(save?.daily).toHaveLength(1);
    expect(save?.daily[0]?.[0]).toBe(DAILY_DATE);
  });

  test("Play again deals exactly the same herd", async ({ page }) => {
    test.slow();
    await page.clock.setFixedTime(DAILY_TIME);
    await openApp(page, "/#daily");
    await expectPhase(page, "ready");
    const first = await queueSignature(page);

    for (let life = 0; life < 3; life++) {
      await holdUntilItBreaks(page, 12);
      await expectPhase(page, "result", "overflow");
      if (life < 2) await nextRound(page);
    }
    await expect(page.locator(".panel__title")).toHaveText("Game over");
    await expect(page.locator(".panel__lines")).not.toContainText("Next star");
    await expect(page.locator(".panel__stars")).toBeHidden();

    await page.locator(".panel__button").click();
    await expectPhase(page, "ready");
    await expect.poll(() => queueSignature(page)).toBe(first);
  });

  test("the menu shows today's best and a one-day streak", async ({ page }) => {
    await page.clock.setFixedTime(DAILY_TIME);
    await openApp(page, "/#daily");
    await playSafeRound(page);

    await page.locator(".hud__back").click();
    await expect(page.locator(".daily__facts")).toContainText("Best today:");
    await expect(page.locator(".daily__facts")).toContainText("1-day streak");
  });

  test("tomorrow brings a new challenge and keeps a streak that is still alive", async ({
    page,
  }) => {
    await page.clock.setFixedTime(NEXT_DAILY_TIME);
    await seedSave(page, { v: 1, levels: [], daily: [[DAILY_DATE, 9]] });
    await openApp(page, "/");

    await expect(page.locator(".daily__facts")).toContainText("Not played yet");
    await expect(page.locator(".daily__facts")).toContainText("1-day streak");
  });
});
