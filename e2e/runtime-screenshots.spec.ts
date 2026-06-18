import { expect, test } from "@playwright/test";
import { startBattle } from "./helpers/index.js";

test.describe("runtime screenshot regression", () => {
  test("title screen", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas");
    await page.waitForTimeout(500);
    await expect(page.locator("#game-shell")).toHaveScreenshot("title.png");
  });

  test("battle map", async ({ page }) => {
    await startBattle(page);
    await expect(page.locator("#game-shell")).toHaveScreenshot("battle-map.png");
  });

  test("action menu", async ({ page }) => {
    await startBattle(page);
    await page.evaluate(() => {
      window.__RUNTIME_TEST__?.prepareScreenshot("action_menu");
    });
    await expect(page.locator(".srpg-action-menu")).toBeVisible();
    await expect(page.locator("#game-shell")).toHaveScreenshot("action-menu.png");
  });

  test("combat preview", async ({ page }) => {
    await startBattle(page);
    await page.evaluate(() => {
      window.__RUNTIME_TEST__?.prepareScreenshot("combat_preview");
    });
    await expect(page.locator(".srpg-combat-preview")).toBeVisible();
    await expect(page.locator("#game-shell")).toHaveScreenshot("combat-preview.png");
  });
});
