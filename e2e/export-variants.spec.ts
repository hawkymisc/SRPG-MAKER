import { expect, test } from "@playwright/test";
import {
  autoPlayToOutcome,
  dismissChapterStartMessageIfPresent,
  enterBattleFromTitleScreen,
  waitForRuntimeTestApi,
} from "./helpers/index.js";
import { loadExportVariant, mountExportedGame } from "./helpers/export-loop.js";
import { TITLE_CANVAS_CLICK } from "./helpers/constants.js";

async function playMountedVariant(
  page: import("@playwright/test").Page,
  variantName: string,
): Promise<import("./helpers/runtime.js").BattleOutcome> {
  const entries = loadExportVariant(variantName);
  await mountExportedGame(page, entries);
  await enterBattleFromTitleScreen(page);
  await dismissChapterStartMessageIfPresent(page);
  return autoPlayToOutcome(page);
}

async function continueBattleFromTitle(page: import("@playwright/test").Page): Promise<void> {
  const canvas = page.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await canvas.click({ position: TITLE_CANVAS_CLICK });
  await page.keyboard.press("l");
  await waitForRuntimeTestApi(page);
}

test.describe("exported game variants", () => {
  test.describe.configure({ timeout: 60_000 });
  test("defeat_boss win condition is embedded in exported battle", async ({ page }) => {
    const entries = loadExportVariant("defeat-boss");
    expect(
      JSON.parse(
        Buffer.from(entries["game/maps/chapter01.json"]!).toString("utf8"),
      ).winCondition,
    ).toEqual({ type: "defeat_boss", bossRef: "unit_boss" });

    await mountExportedGame(page, entries);
    await enterBattleFromTitleScreen(page);

    const winCondition = await page.evaluate(
      () => window.__RUNTIME_TEST__?.getState?.().context.map.winCondition,
    );
    expect(winCondition).toEqual({ type: "defeat_boss", bossRef: "unit_boss" });
  });

  test("survive_turns win condition reaches victory", async ({ page }) => {
    const outcome = await playMountedVariant(page, "survive-turns");
    expect(outcome).toBe("win");
  });

  test("overwhelming enemies produce defeat", async ({ page }) => {
    const outcome = await playMountedVariant(page, "lose-battle");
    expect(outcome).toBe("lose");
  });

  test("battle save survives reload and continues from title", async ({ page }) => {
    const entries = loadExportVariant("battle-only-save");
    await mountExportedGame(page, entries);
    await enterBattleFromTitleScreen(page);

    await page.evaluate(async () => {
      const api = window.__RUNTIME_TEST__;
      if (!api?.stepAutoPlay || !api.getState || !api.save) {
        throw new Error("runtime test API unavailable");
      }
      for (let i = 0; i < 6; i += 1) {
        if (api.getState().turn >= 2) {
          break;
        }
        await api.stepAutoPlay();
      }
      api.save();
    });

    const savedTurn = await page.evaluate(() => window.__RUNTIME_TEST__?.getState?.().turn);
    expect(savedTurn).toBeGreaterThanOrEqual(1);

    await page.reload();
    await continueBattleFromTitle(page);

    const resumedTurn = await page.evaluate(() => window.__RUNTIME_TEST__?.getState?.().turn);
    expect(resumedTurn).toBe(savedTurn);
  });
});
