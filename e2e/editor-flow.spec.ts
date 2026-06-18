import { expect, test } from "@playwright/test";
import {
  FIXED_SEED,
  autoPlayToOutcome,
  gotoTab,
  startBattleInFrame,
  waitForEditorReady,
} from "./helpers/index.js";

test.describe("editor end-to-end flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);
  });

  test("new project → edit map → place enemy → test play → victory", async ({ page }) => {
    await gotoTab(page, 1);
    await page.getByTestId("btn-new-project").click();
    await expect(page.getByTestId("project-name")).toContainText("サンプルプロジェクト");

    await gotoTab(page, 3);
    await expect(page.getByTestId("map-tab")).toBeVisible();
    await expect(page.getByTestId("map-grid")).toBeVisible();

    await page.getByTestId("map-tool-pen").click();
    await page.getByTestId("terrain-terrain_forest").click();
    await page.getByTestId("map-cell-5-5").click();

    await page.getByTestId("map-tool-unit").click();
    await page.getByTestId("map-faction-select").selectOption("enemy");
    await page.getByTestId("map-cell-7-4").click({ modifiers: ["Shift"] });
    await page.getByTestId("map-cell-7-5").click({ modifiers: ["Shift"] });
    await page.getByTestId("map-cell-8-4").click();

    await gotoTab(page, 4);
    await expect(page.getByTestId("testplay-tab")).toBeVisible();
    await page.getByTestId("debug-seed").fill(String(FIXED_SEED));

    const frameLocator = page.frameLocator('[data-testid="runtime-iframe"]');
    await page.getByTestId("btn-testplay-iframe").click();

    const frame = await startBattleInFrame(page);

    const outcome = await autoPlayToOutcome(frame);
    expect(outcome).toBe("win");

    await expect(frameLocator.locator(".srpg-hud")).toContainText("★ 勝利 ★", { timeout: 5_000 });
  });
});
