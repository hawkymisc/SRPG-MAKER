import { expect, test } from "@playwright/test";
import {
  dismissOpenMessages,
  enterBaseFromTitle,
  skipTitle,
} from "./helpers/index.js";

test.describe("runtime phase2 — battle presentation & events", () => {
  test("dedicated battle screen plays on test attack", async ({ page }) => {
    await skipTitle(page);
    await dismissOpenMessages(page);

    const result = await page.evaluate(async () => {
      const api = window.__RUNTIME_TEST__;
      if (!api?.performTestAttack) {
        throw new Error("performTestAttack unavailable");
      }
      return api.performTestAttack();
    });

    expect(result.battleScenePlayed).toBe(true);
  });

  test("battle scene screenshot", async ({ page }) => {
    await skipTitle(page);
    await dismissOpenMessages(page);

    await page.evaluate(() => {
      window.__RUNTIME_TEST__?.showBattleSceneSample?.();
    });
    await expect
      .poll(() => page.evaluate(() => window.__RUNTIME_TEST__?.isSceneActive?.("Battle")))
      .toBe(true);

    await expect(page.locator("#game-shell")).toHaveScreenshot("battle-scene.png");

    await page.evaluate(() => {
      window.__RUNTIME_TEST__?.dismissHeldBattleScene?.();
    });
  });

  test("BGM and SE ids are recorded in audio log", async ({ page }) => {
    await skipTitle(page);
    await dismissOpenMessages(page);

    const log = await page.evaluate(async () => {
      const api = window.__RUNTIME_TEST__;
      if (!api?.playTestAudio || !api.getAudioLog) {
        throw new Error("audio test API unavailable");
      }
      await api.playTestAudio({ bgm: "bgm_intro", se: "se_select" });
      return api.getAudioLog();
    });

    expect(log.bgm).toContain("bgm_intro");
    expect(log.se).toContain("se_select");
  });

  test("screen shake effect completes without error", async ({ page }) => {
    await skipTitle(page);
    await dismissOpenMessages(page);

    await page.evaluate(async () => {
      const api = window.__RUNTIME_TEST__;
      if (!api?.testScreenShake) {
        throw new Error("testScreenShake unavailable");
      }
      await api.testScreenShake();
    });

    expect(await page.evaluate(() => window.__RUNTIME_TEST__?.getState?.().outcome)).toBe("ongoing");
  });

  test("base scene shows six menu entries", async ({ page }) => {
    await enterBaseFromTitle(page);

    const bodyText = await page.evaluate(() => window.__RUNTIME_TEST__?.getBaseBodyText?.() ?? "");
    expect(bodyText).toContain("1: 編成");
    expect(bodyText).toContain("4: 出撃（戦闘開始）");
    expect(bodyText).toContain("6: 支援会話");
    await expect(page.evaluate(() => window.__RUNTIME_TEST__?.getSceneKey?.())).resolves.toBe("Base");
  });
});
