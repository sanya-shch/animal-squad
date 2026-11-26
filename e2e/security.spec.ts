import { expect, test, type Page } from "@playwright/test";

import { openApp, playSafeRound } from "./helpers";

// Records every Content-Security-Policy violation the page runs into.
const watchViolations = `
  window.__violations = [];
  document.addEventListener("securitypolicyviolation", (event) => {
    window.__violations.push(event.violatedDirective + " " + event.blockedURI);
  });
`;

const violations = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { __violations: string[] }).__violations);

test.describe("security", () => {
  test("the production build ships a strict Content-Security-Policy", async ({ page }) => {
    await openApp(page, "/");

    const policy = page.locator('meta[http-equiv="Content-Security-Policy"]');
    await expect(policy).toHaveAttribute("content", /default-src 'self'/);
    await expect(policy).toHaveAttribute("content", /script-src 'self'/);
    await expect(policy).toHaveAttribute("content", /object-src 'none'/);
  });

  test("a whole round runs without a policy violation or a console message", async ({ page }) => {
    await page.addInitScript(watchViolations);
    const problems = await openApp(page, "/?seed=21#meadow");

    await playSafeRound(page);
    await page.locator(".panel__button").click();
    await page.locator(".hud__back").click();
    await expect(page.locator(".home")).toBeVisible();

    expect(await violations(page)).toEqual([]);
    expect(problems).toEqual([]);
  });

  test("a script injected into the page is blocked", async ({ page }) => {
    await page.addInitScript(watchViolations);
    await openApp(page, "/");

    await page.evaluate(() => {
      const script = document.createElement("script");
      script.textContent = "window.__injected = true";
      document.body.append(script);
    });

    expect(await page.evaluate(() => "__injected" in window)).toBe(false);
    expect((await violations(page)).length).toBeGreaterThan(0);
  });
});
