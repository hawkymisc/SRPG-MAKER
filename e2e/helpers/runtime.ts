import { type Frame, type Page, expect } from "@playwright/test";
import {
  AUTO_PLAY_STEP_LIMIT,
  RUNTIME_TEST_TIMEOUT_MS,
  TITLE_CANVAS_CLICK,
} from "./constants.js";

export type RuntimeHost = Page | Frame;

async function pressEnter(host: RuntimeHost): Promise<void> {
  await host.locator("body").press("Enter");
}

async function pressDigit(host: RuntimeHost, digit: string): Promise<void> {
  await host.locator("body").press(digit);
}

async function battleMapTestApiReady(host: RuntimeHost): Promise<boolean> {
  return host.evaluate(() => window.__RUNTIME_TEST__?.getState !== undefined).catch(() => false);
}

export async function waitForRuntimeTestApi(host: RuntimeHost): Promise<void> {
  await host.waitForFunction(
    () => window.__RUNTIME_TEST__?.getState !== undefined,
    undefined,
    { timeout: RUNTIME_TEST_TIMEOUT_MS },
  );
}

/**
 * Leave the title screen and reach BattleMap (test hooks installed).
 * Handles campaign flow: Title → Base → BattleMap.
 */
export async function enterBattleFromTitleScreen(host: RuntimeHost): Promise<void> {
  const canvas = host.locator("canvas");
  await canvas.waitFor({ state: "visible", timeout: RUNTIME_TEST_TIMEOUT_MS });
  await canvas.click({ position: TITLE_CANVAS_CLICK });

  const deadline = Date.now() + RUNTIME_TEST_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await battleMapTestApiReady(host)) {
      return;
    }

    await pressEnter(host);

    const readyAfterEnter = await host
      .waitForFunction(() => window.__RUNTIME_TEST__?.getState !== undefined, undefined, {
        timeout: 3_000,
      })
      .then(() => true)
      .catch(() => false);
    if (readyAfterEnter) {
      return;
    }

    await pressDigit(host, "4");

    const readyAfterDeploy = await host
      .waitForFunction(() => window.__RUNTIME_TEST__?.getState !== undefined, undefined, {
        timeout: 3_000,
      })
      .then(() => true)
      .catch(() => false);
    if (readyAfterDeploy) {
      return;
    }
  }

  throw new Error("BattleMap test API did not become available");
}

/** Skip title screen and wait until battle test hooks are available. */
export async function skipTitle(page: Page): Promise<void> {
  await page.goto("/");
  await enterBattleFromTitleScreen(page);
}

/** Alias used by screenshot specs. */
export const startBattle = skipTitle;

export type BattleOutcome = "win" | "lose" | "ongoing";

export async function autoPlayToOutcome(
  host: RuntimeHost,
  stepLimit = AUTO_PLAY_STEP_LIMIT,
): Promise<BattleOutcome> {
  return host.evaluate(async (limit) => {
    const api = window.__RUNTIME_TEST__;
    if (!api?.getState || !api.stepAutoPlay) {
      throw new Error("__RUNTIME_TEST__ is not available");
    }
    for (let i = 0; i < limit; i += 1) {
      const outcome = api.getState().outcome;
      if (outcome !== "ongoing") {
        return outcome;
      }
      await api.stepAutoPlay();
    }
    return api.getState().outcome;
  }, stepLimit);
}

/** Dismiss any open message windows (e.g. chapterStart). */
export async function dismissOpenMessages(host: RuntimeHost): Promise<void> {
  await host.evaluate(async () => {
    const api = window.__RUNTIME_TEST__;
    if (!api?.isMessageOpen || !api.advanceMessage) {
      return;
    }
    for (let i = 0; i < 20 && api.isMessageOpen(); i += 1) {
      api.advanceMessage();
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });
}

/** Title → 拠点 (campaign sample). Does not enter battle. */
export async function enterBaseFromTitle(host: RuntimeHost): Promise<void> {
  if ("goto" in host) {
    await host.goto("/");
  }
  const canvas = host.locator("canvas");
  await canvas.waitFor({ state: "visible", timeout: RUNTIME_TEST_TIMEOUT_MS });
  await canvas.click({ position: TITLE_CANVAS_CLICK });
  await pressEnter(host);
  await expect
    .poll(() => host.evaluate(() => window.__RUNTIME_TEST__?.getSceneKey?.() === "Base"), {
      timeout: RUNTIME_TEST_TIMEOUT_MS,
    })
    .toBe(true);
}
