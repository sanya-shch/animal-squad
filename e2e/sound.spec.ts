import { expect, test, type Page } from "@playwright/test";

import { expectPhase, holdGate, openApp, playSafeRound, SETTINGS_KEY } from "./helpers";

// Counts what the game asks the Web Audio API for, without needing a speaker.
const countAudio = `
  window.__audio = { contexts: 0, oscillators: 0 };
  const RealContext = window.AudioContext;
  window.AudioContext = class extends RealContext {
    constructor(...args) {
      super(...args);
      window.__audio.contexts++;
    }
    createOscillator() {
      window.__audio.oscillators++;
      return super.createOscillator();
    }
  };
`;

async function audio(page: Page): Promise<{ contexts: number; oscillators: number }> {
  return page.evaluate(
    () => (window as unknown as { __audio: { contexts: number; oscillators: number } }).__audio,
  );
}

test.describe("sound", () => {
  test("stays locked until the player acts, then a single context plays", async ({ page }) => {
    await page.addInitScript(countAudio);
    await openApp(page, "/?seed=21#meadow");
    expect((await audio(page)).contexts).toBe(0);

    await holdGate(page, 1100);
    await expectPhase(page, "result");

    await expect.poll(async () => (await audio(page)).contexts).toBe(1);
    // The gate opening, a step for every cow, a pop for every grown cow, and the stars.
    await expect.poll(async () => (await audio(page)).oscillators).toBeGreaterThan(6);
  });

  test("the speaker button and the M key mute, and the choice is remembered", async ({ page }) => {
    await page.addInitScript(countAudio);
    await openApp(page, "/?seed=21#meadow");
    const button = page.locator(".hud__sound");
    await expect(button).toHaveAttribute("aria-pressed", "true");

    await page.keyboard.press("m");
    await expect(button).toHaveAttribute("aria-pressed", "false");
    expect(await page.evaluate((key) => localStorage.getItem(key), SETTINGS_KEY)).toBe(
      '{"muted":true}',
    );

    await page.reload();
    await expect(page.locator(".hud__sound")).toHaveAttribute("aria-pressed", "false");

    await page.locator(".hud__sound").click();
    await expect(page.locator(".hud__sound")).toHaveAttribute("aria-pressed", "true");
  });

  test("a muted game makes no sound at all", async ({ page }) => {
    await page.addInitScript(countAudio);
    await page.addInitScript((key) => localStorage.setItem(key, '{"muted":true}'), SETTINGS_KEY);
    await openApp(page, "/?seed=21#meadow");

    await playSafeRound(page);

    expect((await audio(page)).oscillators).toBe(0);
  });
});
