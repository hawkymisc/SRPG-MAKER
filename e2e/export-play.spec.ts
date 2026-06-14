import { expect, test } from "@playwright/test";

const CHAPTER_START_TEXT = "試練の平原へ向かうぞ。";
const AUTO_PLAY_STEP_LIMIT = 800;

async function skipTitle(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await canvas.waitFor({ state: "visible", timeout: 30_000 });
  await canvas.click({ position: { x: 260, y: 210 } });
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__RUNTIME_TEST__ !== undefined, undefined, {
    timeout: 30_000,
  });
}

async function dismissChapterStartMessageIfPresent(page: import("@playwright/test").Page): Promise<void> {
  const message = page.locator(".srpg-message-window");
  const visible = await message
    .waitFor({ state: "visible", timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (!visible) {
    return;
  }

  await expect(message).toContainText(CHAPTER_START_TEXT);
  await page.keyboard.press("Enter");

  await expect(message).toBeHidden({ timeout: 5_000 });
}

async function autoPlayToOutcome(
  page: import("@playwright/test").Page,
): Promise<"win" | "lose" | "ongoing"> {
  return page.evaluate(async (stepLimit) => {
    const api = window.__RUNTIME_TEST__;
    if (!api) {
      throw new Error("__RUNTIME_TEST__ is not available");
    }
    for (let i = 0; i < stepLimit; i += 1) {
      const outcome = api.getState().outcome;
      if (outcome !== "ongoing") {
        return outcome;
      }
      await api.stepAutoPlay();
    }
    return api.getState().outcome;
  }, AUTO_PLAY_STEP_LIMIT);
}

test.describe("exported HTML5 game", () => {
  test("chapterStart message then auto-play to victory", async ({ page }) => {
    await skipTitle(page);
    await dismissChapterStartMessageIfPresent(page);

    const outcome = await autoPlayToOutcome(page);
    expect(outcome).toBe("win");

    await expect(page.locator(".srpg-hud")).toContainText("★ 勝利 ★", { timeout: 10_000 });
  });
});
