import { expect, type Frame, type Page } from "@playwright/test";
import { RUNTIME_PREVIEW_PORT, RUNTIME_TEST_TIMEOUT_MS } from "./constants.js";
import { enterBattleFromTitleScreen } from "./runtime.js";

export type EditorTabNumber = 1 | 2 | 3 | 4 | 5 | 6;

export async function gotoTab(page: Page, tabNumber: EditorTabNumber): Promise<void> {
  await page.keyboard.press(`Control+${tabNumber}`);
}

export async function waitForEditorReady(page: Page): Promise<void> {
  await expect(page.getByTestId("editor-app")).toBeVisible();
  await expect(page.getByTestId("project-meta")).toBeVisible({ timeout: RUNTIME_TEST_TIMEOUT_MS });
}

export async function getRuntimeFrame(page: Page, port = RUNTIME_PREVIEW_PORT): Promise<Frame> {
  let frame: Frame | undefined;
  await expect
    .poll(() => {
      frame = page.frames().find((f) => f.url().includes(`:${port}`) && f !== page.mainFrame());
      return frame;
    })
    .not.toBeUndefined();
  if (!frame) {
    throw new Error(`runtime frame on port ${port} is not ready`);
  }
  return frame;
}

/** Start battle inside the editor test-play iframe. */
export async function startBattleInFrame(page: Page): Promise<Frame> {
  const frame = await getRuntimeFrame(page);
  await enterBattleFromTitleScreen(frame);
  return frame;
}
