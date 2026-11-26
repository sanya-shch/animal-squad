import { expect, test } from "@playwright/test";

import {
  emptySave,
  expectPhase,
  holdUntilItBreaks,
  nextRound,
  openApp,
  playSafeRound,
  readSave,
  seedSave,
} from "./helpers";

test.describe("playing a pen", () => {
  test("holding the gate lets cows in, and letting go shows the result", async ({ page }) => {
    const problems = await openApp(page, "/?seed=21#meadow");
    await expectPhase(page, "ready");
    await expect(page.locator(".hint")).toBeVisible();

    const stage = await page.locator(".stage").boundingBox();
    if (!stage) throw new Error("The stage is not on screen");
    await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2);
    await page.mouse.down();
    await expectPhase(page, "admitting");
    await expect(page.locator('.cow[data-phase="inside"]')).not.toHaveCount(0);
    await page.mouse.up();

    await expectPhase(page, "result", "success");
    await expect(page.locator(".panel")).toBeVisible();
    await expect(page.locator(".panel__title")).toHaveText(/Safe|Perfect/);
    expect(problems).toEqual([]);
  });

  test("Space holds the gate, Enter moves on, and the page never scrolls", async ({ page }) => {
    await openApp(page, "/?seed=21#meadow");

    await page.keyboard.down("Space");
    await expectPhase(page, "admitting");
    await page.waitForTimeout(900);
    await page.keyboard.up("Space");
    await expectPhase(page, "result", "success");
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    await page.keyboard.press("Enter");
    await expectPhase(page, "ready");
    await expect(page.locator(".panel")).toBeHidden();
  });

  test("the Next button starts the next round", async ({ page }) => {
    await openApp(page, "/?seed=21#meadow");
    await expect(page.locator(".hud__round")).toContainText("Round 1 of 8");

    await playSafeRound(page);
    await page.locator(".panel__button").click();

    await expectPhase(page, "ready");
    await expect(page.locator(".hud__round")).toContainText("Round 2 of 8");
  });

  test("too many cows break the fence, and the next round puts it back", async ({ page }) => {
    await openApp(page, "/?seed=3#meadow");

    await holdUntilItBreaks(page, 12);
    await expectPhase(page, "result", "overflow");
    await expect(page.locator(".scene")).toHaveClass(/is-broken/);
    await expect(page.locator(".heart.is-lost")).toHaveCount(1);
    await expect(page.locator(".panel__title")).toHaveText("The fence broke!");

    await page.locator(".panel__button").click();
    await expectPhase(page, "ready");
    await expect(page.locator(".scene")).not.toHaveClass(/is-broken/);
  });

  test("letting go before the first cow is a free retry", async ({ page }) => {
    await openApp(page, "/?seed=21#meadow");

    await page.locator(".stage").click({ delay: 50 });
    await expectPhase(page, "result", "empty");
    await expect(page.locator(".panel__title")).toHaveText("Nobody came in");

    await page.locator(".panel__button").click();
    await expectPhase(page, "ready");
    await expect(page.locator(".hud__round")).toContainText("Round 1 of 8");
    await expect(page.locator(".heart.is-lost")).toHaveCount(0);
  });

  test("three broken fences end the run with a summary", async ({ page }) => {
    test.slow();
    await openApp(page, "/?seed=21#meadow");
    await playSafeRound(page);
    await nextRound(page);
    for (let life = 0; life < 3; life++) {
      await holdUntilItBreaks(page, 12);
      await expectPhase(page, "result", "overflow");
      if (life < 2) await nextRound(page);
    }

    await expect(page.locator(".panel__title")).toHaveText("Game over");
    await expect(page.locator(".panel__lines")).toContainText("Final score:");
    await expect(page.locator(".panel__lines")).toContainText("New best!");
    await expect(page.locator(".panel__lines")).toContainText("Next star at");
    // One safe round and three broken ones: four rounds were played.
    await expect(page.locator(".hud__round")).toContainText("Round 4 of 8");

    await page.locator(".panel__button").click();
    await expect(page.locator(".hud__round")).toContainText("Round 1 of 8");
    await expect(page.locator(".hud__score")).toHaveText("0");
  });

  test("eight rounds make a complete run, with every life left", async ({ page }) => {
    test.slow();
    await openApp(page, "/?seed=5#meadow");
    for (let round = 1; round <= 8; round++) {
      await playSafeRound(page);
      if (round < 8) await nextRound(page);
    }

    await expect(page.locator(".panel__title")).toHaveText("Run complete");
    await expect(page.locator(".hud__round")).toContainText("Round 8 of 8");
    await expect(page.locator(".heart.is-lost")).toHaveCount(0);
  });
});

test.describe("progress while playing", () => {
  test("every finished round is saved at once and survives a reload", async ({ page }) => {
    await seedSave(page, emptySave);
    await openApp(page, "/?seed=21#meadow");
    await playSafeRound(page);

    await expect(page.locator(".hud__score")).not.toHaveText("0");
    const shown = Number(await page.locator(".hud__score").textContent());
    expect((await readSave(page))?.levels).toEqual([["meadow", shown]]);

    await page.reload();
    await expect(page.locator(".hud__round")).toContainText(`Best ${shown}`);
  });

  test("leaving in the middle of a run keeps the progress", async ({ page }) => {
    await openApp(page, "/?seed=21#meadow");
    await playSafeRound(page);
    await expect(page.locator(".hud__score")).not.toHaveText("0");
    const shown = Number(await page.locator(".hud__score").textContent());

    await page.locator(".hud__back").click();
    await expect(page.locator(".home")).toBeVisible();
    await expect(page.locator(".level__best").first()).toHaveText(`Best ${shown}`);
  });

  test("the game plays on when the storage is blocked", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("blocked");
        },
      });
    });
    await openApp(page, "/?seed=21#meadow");

    await playSafeRound(page);
    await expect(page.locator(".panel")).toBeVisible();
  });
});
