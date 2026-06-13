import { expect, test, type Frame, type Page } from "@playwright/test";

const FIXED_SEED = 42_001;
const AUTO_PLAY_STEP_LIMIT = 800;

async function gotoTab(page: Page, tabNumber: 1 | 2 | 3 | 4): Promise<void> {
  await page.keyboard.press(`Control+${tabNumber}`);
}

async function getRuntimeFrame(page: Page): Promise<Frame> {
  await expect
    .poll(() => page.frames().find((f) => /:5174/.test(f.url()) && f !== page.mainFrame()))
    .not.toBeUndefined();
  const frame = page.frames().find((f) => /:5174/.test(f.url()) && f !== page.mainFrame());
  if (!frame) {
    throw new Error("runtime frame is not ready");
  }
  return frame;
}

async function startBattleInFrame(page: Page): Promise<Frame> {
  const frame = await getRuntimeFrame(page);
  const canvas = frame.locator("canvas");
  await canvas.waitFor({ state: "visible", timeout: 30_000 });
  await canvas.click({ position: { x: 260, y: 210 } });
  await frame.locator("body").press("Enter");
  await frame.waitForFunction(() => window.__RUNTIME_TEST__ !== undefined, undefined, {
    timeout: 30_000,
  });
  return frame;
}

async function autoPlayToOutcome(frame: Frame): Promise<"win" | "lose" | "ongoing"> {
  return frame.evaluate(async (stepLimit) => {
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

test.describe("editor end-to-end flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("editor-app")).toBeVisible();
    await expect(page.getByTestId("project-meta")).toBeVisible({ timeout: 30_000 });
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
