import { expect, test } from "@playwright/test";
import { uploadBgmAsset } from "./helpers/editor-export.js";
import {
  autoPlayToOutcome,
  dismissChapterStartMessageIfPresent,
  enterBattleFromTitleScreen,
  gotoTab,
  waitForEditorReady,
} from "./helpers/index.js";
import { exportHtml5ZipFromEditor, mountExportedGame } from "./helpers/export-loop.js";

test.describe("editor → HTML5 export → play loop", () => {
  test("upload asset, export zip, and play exported game to victory", async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);

    await gotoTab(page, 1);
    await page.getByTestId("btn-new-project").click();
    await expect(page.getByTestId("project-name")).toContainText("サンプルプロジェクト");

    const assetPath = await uploadBgmAsset(page);
    await gotoTab(page, 1);
    await expect(page.getByTestId("project-asset-count")).toHaveText("1 件");

    const entries = await exportHtml5ZipFromEditor(page);
    expect(Object.keys(entries)).toContain(`game/${assetPath}`);

    await mountExportedGame(page, entries);
    await enterBattleFromTitleScreen(page);
    await dismissChapterStartMessageIfPresent(page);

    const outcome = await autoPlayToOutcome(page);
    expect(outcome).toBe("win");
    await expect(page.locator(".srpg-hud")).toContainText("★ 勝利 ★", { timeout: 10_000 });
  });
});
