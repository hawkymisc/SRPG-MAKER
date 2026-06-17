import { expect, test } from "@playwright/test";
import {
  autoPlayToOutcome,
  dismissChapterStartMessageIfPresent,
  skipTitle,
} from "./helpers/index.js";

test.describe("exported HTML5 game", () => {
  test("chapterStart message then auto-play to victory", async ({ page }) => {
    await skipTitle(page);
    await dismissChapterStartMessageIfPresent(page);

    const outcome = await autoPlayToOutcome(page);
    expect(outcome).toBe("win");

    await expect(page.locator(".srpg-hud")).toContainText("★ 勝利 ★", { timeout: 10_000 });
  });

  test("serves bundled sample assets", async ({ request }) => {
    const bgm = await request.get("/assets/audio/bgm/bgm_intro.ogg");
    expect(bgm.ok()).toBe(true);
    expect(bgm.headers()["content-type"]).toMatch(/audio|octet-stream/i);

    const se = await request.get("/assets/audio/se/se_select.ogg");
    expect(se.ok()).toBe(true);
  });
});
