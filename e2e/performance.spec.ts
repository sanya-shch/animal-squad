import { expect, test, type Page } from "@playwright/test";

import { expectPhase, nextRound, openApp, playSafeRound, seedSave } from "./helpers";

// The addresses of the full-grown sprites on screen. Tiny sprites are inlined by the bundler
// as data URLs and need no request, so only real files are listed.
const sprites = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLImageElement>(".herd:last-child .cow__sprite")]
      .map((image) => image.src)
      .filter((src) => src.startsWith("http"))
      .map((src) => new URL(src).pathname),
  );

test.describe("loading and rendering", () => {
  test("the sprites of the next round are fetched while the result is on screen", async ({
    page,
  }) => {
    await seedSave(page, { v: 1, levels: [["meadow", 40]], daily: [] });
    const requested = new Set<string>();
    page.on("request", (request) => requested.add(new URL(request.url()).pathname));
    await openApp(page, "/?seed=33#paddock");
    await expectPhase(page, "ready");
    const firstRound = new Set(await sprites(page));

    await playSafeRound(page);
    await page.waitForTimeout(1500); // the player reads the result
    const requestedBeforeNext = new Set(requested);
    await nextRound(page);

    const newSprites = (await sprites(page)).filter((path) => !firstRound.has(path));
    // If this list were empty the check below would prove nothing.
    expect(newSprites.length).toBeGreaterThan(0);
    for (const path of newSprites) expect(requestedBeforeNext.has(path)).toBe(true);
  });

  test("a cow walking in touches only a few nodes of the page", async ({ page }) => {
    await openApp(page, "/?seed=4#meadow");
    await page.evaluate(() => {
      const counter = { mutations: 0 };
      (window as unknown as { __counter: typeof counter }).__counter = counter;
      new MutationObserver((records) => {
        counter.mutations += records.length;
      }).observe(document.querySelector(".game") as Element, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
    });

    const stage = await page.locator(".stage").boundingBox();
    if (!stage) throw new Error("The stage is not on screen");
    await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2);
    await page.mouse.down();
    // Cows walk in faster than the assertion polls, so "exactly four" can be skipped over for
    // good on a slow machine. Wait for at least four, then count cows and changes in one go.
    const inside = page.locator('.cow[data-phase="inside"]');
    await expect
      .poll(() => inside.count(), { intervals: [50], timeout: 5000 })
      .toBeGreaterThanOrEqual(4);
    const { cows, mutations } = await page.evaluate(() => ({
      cows: document.querySelectorAll('.cow[data-phase="inside"]').length,
      mutations: (window as unknown as { __counter: { mutations: number } }).__counter.mutations,
    }));
    await page.mouse.up();

    // Each cow that came in changes its own phase, the progress bar and a status line.
    expect(cows).toBeGreaterThanOrEqual(4);
    expect(mutations / cows).toBeLessThan(6);
  });

  test("the page stays small over a long session", async ({ page }) => {
    test.slow();
    await openApp(page, "/?seed=2#meadow");
    for (let round = 0; round < 6; round++) {
      await playSafeRound(page);
      await nextRound(page);
    }

    // The herd that is leaving fades out and is removed shortly afterwards.
    await expect(page.locator(".herd")).toHaveCount(1);
    expect(await page.evaluate(() => document.querySelectorAll("*").length)).toBeLessThan(250);
  });
});
