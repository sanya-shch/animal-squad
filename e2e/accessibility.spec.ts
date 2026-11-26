import { expect, test } from "@playwright/test";

import { expectPhase, holdGate, openApp, playSafeRound } from "./helpers";

test.describe("accessibility", () => {
  test("the game can be played with the keyboard alone", async ({ page }) => {
    await openApp(page, "/");

    await page.keyboard.press("Tab"); // the daily challenge
    await page.keyboard.press("Tab"); // the first pen
    await expect(page.locator("a.level")).toBeFocused();
    await page.keyboard.press("Enter");
    await expectPhase(page, "ready");

    await page.keyboard.down("Space");
    await page.waitForTimeout(900);
    await page.keyboard.up("Space");
    await expectPhase(page, "result", "success");
    await page.keyboard.press("Enter");
    await expectPhase(page, "ready");
  });

  test("controls and results are announced to assistive technology", async ({ page }) => {
    await openApp(page, "/?seed=21#meadow");

    await expect(page.locator(".hud__back")).toHaveAttribute("aria-label", "Back to the menu");
    await expect(page.locator(".hud__sound")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".hud__lives")).toHaveAttribute("aria-label", "3 of 3 lives left");
    await expect(page.locator(".progress")).toHaveAttribute("aria-valuenow", "0");

    await playSafeRound(page);
    await expect(page.locator('[role="status"]')).toContainText(/Safe|Perfect/);
    await expect(page.locator(".panel__stars")).toHaveAttribute("aria-label", /out of 3 stars/);
  });

  test("a locked pen is marked as unavailable", async ({ page }) => {
    await openApp(page, "/");
    await expect(page.locator(".level.is-locked").first()).toHaveAttribute("aria-disabled", "true");
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the result appears at once and animations are cut short", async ({ page }) => {
    await openApp(page, "/?seed=21#meadow");

    await holdGate(page, 900);
    await expectPhase(page, "result", "success");
    // Normally the sheet waits for the herd to finish growing, well over a second.
    await expect(page.locator(".panel")).toBeVisible({ timeout: 700 });

    const duration = await page
      .locator('.cow[data-phase="grown"]')
      .first()
      .evaluate((cow) => getComputedStyle(cow).animationDuration);
    expect(duration).toBe("0.001s");
  });
});
