import { expect, test } from "@playwright/test";

import { DAILY_TIME, openApp, SAVE_KEY, seedSave } from "./helpers";

test.describe("the menu", () => {
  test("a fresh profile can only play the first pen", async ({ page }) => {
    const problems = await openApp(page, "/");

    await expect(page.locator(".level")).toHaveCount(4);
    await expect(page.locator(".level.is-locked")).toHaveCount(3);
    await expect(page.locator("a.level")).toHaveAttribute("href", "#meadow");
    await expect(page.locator(".level__lock").first()).toHaveText("Earn a star on Meadow");
    await expect(page.locator(".daily__tag")).toHaveText("Daily challenge");
    await expect(page.locator(".pens .pill")).toHaveText("1 of 4 open");
    expect(problems).toEqual([]);
  });

  test("a locked pen cannot be opened by typing its address", async ({ page }) => {
    await openApp(page, "/#rocky-yard");

    await expect(page.locator(".game")).toHaveCount(0);
    await expect(page.locator(".home")).toBeVisible();
    expect(new URL(page.url()).hash).toBe("");
  });

  test("saved progress shows stars, best scores and what is unlocked", async ({ page }) => {
    await page.clock.setFixedTime(DAILY_TIME);
    await seedSave(page, {
      v: 1,
      levels: [
        ["meadow", 35],
        ["paddock", 65],
      ],
      daily: [
        ["2026-11-28", 5],
        ["2026-11-27", 7],
      ],
    });
    await openApp(page, "/");

    // Meadow has one star (35 of 30/50/65), Paddock two. A star on Paddock opens Lane.
    await expect(page.locator(".level.is-locked")).toHaveCount(1);
    await expect(page.locator(".level__best")).toHaveText(["Best 35", "Best 65", "Not played yet"]);
    const earned = page.locator(".level__stars");
    await expect(earned.nth(0).locator(".is-earned")).toHaveCount(1);
    await expect(earned.nth(1).locator(".is-earned")).toHaveCount(2);
    await expect(earned.nth(2).locator(".is-earned")).toHaveCount(0);
    await expect(page.locator(".daily__streak")).toHaveText("Daily streak: 2");
    await expect(page.locator(".pens .pill")).toHaveText("3 of 4 open");
  });

  test("erasing progress goes back to the beginning", async ({ page }) => {
    await seedSave(page, { v: 1, levels: [["meadow", 40]], daily: [] });
    await openApp(page, "/");
    await expect(page.locator(".level.is-locked")).toHaveCount(2);

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator(".home__reset").click();

    await expect(page.locator(".level.is-locked")).toHaveCount(3);
    expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  });

  test("keeps the progress when the confirmation is declined", async ({ page }) => {
    await seedSave(page, { v: 1, levels: [["meadow", 40]], daily: [] });
    await openApp(page, "/");

    page.once("dialog", (dialog) => dialog.dismiss());
    await page.locator(".home__reset").click();

    await expect(page.locator(".level.is-locked")).toHaveCount(2);
    await expect(page.locator(".level__best").first()).toHaveText("Best 40");
  });

  test("a damaged save does not stop the menu from loading", async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, "{{{ not json"), SAVE_KEY);
    const problems = await openApp(page, "/");

    await expect(page.locator(".level")).toHaveCount(4);
    await expect(page.locator(".level.is-locked")).toHaveCount(3);
    expect(problems).toEqual([]);
  });

  test("a save from a future version is ignored, not trusted", async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, JSON.stringify({ v: 99, levels: [["meadow", 9999]] }));
    }, SAVE_KEY);
    await openApp(page, "/");

    await expect(page.locator(".level__best").first()).toHaveText("Not played yet");
  });
});
