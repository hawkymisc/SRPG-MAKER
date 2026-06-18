import { expect, test } from "@playwright/test";
import { TINY_PNG } from "./helpers/fixtures.js";
import { gotoTab, waitForEditorReady } from "./helpers/index.js";

test.describe.configure({ mode: "serial" });

test.describe("editor tab smoke tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);
    await gotoTab(page, 1);
    await page.getByTestId("btn-new-project").click();
    await expect(page.getByTestId("project-name")).toContainText("サンプルプロジェクト");
    await expect(page.getByTestId("project-dirty")).toHaveText("保存済み");
  });

  test("database tab: edit unit name marks project dirty", async ({ page }) => {
    await gotoTab(page, 2);
    await expect(page.getByTestId("database-tab")).toBeVisible();

    await page.getByTestId("db-entry-unit_alm").click();
    await expect(page.getByTestId("db-selected-id")).toHaveText("unit_alm");

    const nameField = page.getByTestId("field-name");
    await nameField.fill("アルム（E2E）");
    await expect(nameField).toHaveValue("アルム（E2E）");

    await gotoTab(page, 1);
    await expect(page.getByTestId("project-dirty")).toHaveText("未保存");
  });

  test("events tab: add SHOW_MESSAGE command", async ({ page }) => {
    await gotoTab(page, 5);
    await expect(page.getByTestId("events-tab")).toBeVisible();

    await page.getByTestId("event-entry-ev_chapter01_intro").click();
    const rows = page.locator('[data-testid^="event-cmd-row-"]');
    const before = await rows.count();

    await page.getByTestId("event-cmd-type").selectOption("SHOW_MESSAGE");
    await page.getByTestId("event-cmd-add").click();

    await expect(rows).toHaveCount(before + 1);
    await gotoTab(page, 1);
    await expect(page.getByTestId("project-dirty")).toHaveText("未保存");
  });

  test("project tab: chapter list and rename", async ({ page }) => {
    await expect(page.getByTestId("chapter-panel")).toBeVisible();
    await expect(page.getByTestId("chapter-row-chapter01")).toBeVisible();
    await expect(page.getByTestId("project-chapter-count")).toHaveText("1");

    const nameInput = page.getByTestId("chapter-name-chapter01");
    await nameInput.fill("序章（E2E編集）");
    await expect(nameInput).toHaveValue("序章（E2E編集）");
    await expect(page.getByTestId("project-dirty")).toHaveText("未保存");
  });

  test("project tab: plugin enable toggle", async ({ page }) => {
    await expect(page.getByTestId("plugin-panel")).toBeVisible();

    const toggle = page.getByTestId("plugin-enabled-plugin_sword_bonus");
    await expect(toggle).toBeChecked();

    await toggle.uncheck();
    await expect(toggle).not.toBeChecked();
    await expect(page.getByTestId("project-dirty")).toHaveText("未保存");

    await toggle.check();
    await expect(toggle).toBeChecked();
  });

  test("project tab: support conversations listed", async ({ page }) => {
    await expect(page.getByTestId("support-panel")).toBeVisible();
    await expect(page.getByTestId("support-row-sup_alm_lukas_c")).toBeVisible();
    await expect(page.getByTestId("support-row-sup_alm_lukas_c")).toContainText("二人の誓い");
  });

  test("assets tab: upload image", async ({ page }) => {
    await gotoTab(page, 6);
    await expect(page.getByTestId("assets-tab")).toBeVisible();
    await expect(page.getByTestId("assets-empty")).toBeVisible();

    const imageInput = page.locator('[data-testid="assets-tab"] input[accept*="image"]');
    await imageInput.setInputFiles({
      name: "e2e-face.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });

    await expect(page.getByTestId("assets-table")).toBeVisible();
    await expect(page.getByTestId("asset-row-assets_images_e2e-face.png")).toBeVisible();

    await gotoTab(page, 1);
    await expect(page.getByTestId("project-asset-count")).toHaveText("1 件");
    await expect(page.getByTestId("project-dirty")).toHaveText("未保存");
  });

  test("project tab: cloud storage backend shows stub hint", async ({ page }) => {
    await page.getByTestId("storage-backend-select").selectOption("cloud");
    await expect(page.getByTestId("storage-backend-hint")).toContainText("クラウド保存は未実装です");
    await expect(page.getByTestId("storage-backend-hint")).toContainText("ADR 0009");
  });
});
