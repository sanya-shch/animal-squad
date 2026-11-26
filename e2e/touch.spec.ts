import { expect, test } from "@playwright/test";

import { expectPhase, openApp, readSave, seedSave } from "./helpers";

// A phone: a narrow screen, and real touch events instead of the mouse.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test.describe("on a phone", () => {
  test("a finger holds the gate and the whole scene fits the screen", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Touch is driven through the Chrome DevTools protocol.");
    await seedSave(page, { v: 1, levels: [["meadow", 40]], daily: [] });
    const problems = await openApp(page, "/?seed=5#paddock");
    await expectPhase(page, "ready");

    const fitsWidth = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fitsWidth).toBe(true);
    const scene = await page.locator(".scene").boundingBox();
    expect(scene?.width).toBeLessThanOrEqual(390);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 195, y: 400 }],
    });
    await expectPhase(page, "admitting");
    await page.waitForTimeout(900);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    await expectPhase(page, "result", "success");
    await expect(page.locator(".panel")).toBeVisible();
    expect((await readSave(page))?.levels.map(([id]) => id)).toContain("paddock");
    expect(problems).toEqual([]);
  });

  test("the result sheet does not cover the pen", async ({ page }) => {
    await openApp(page, "/?seed=5#meadow");
    await page.locator(".stage").click({ delay: 900 });
    await expectPhase(page, "result", "success");
    await expect(page.locator(".panel")).toBeVisible();

    const pen = await page.locator(".floor").last().boundingBox();
    const panel = await page.locator(".panel").boundingBox();
    expect(pen && panel && pen.y + pen.height < panel.y).toBe(true);
  });
});
