import { expect, type Page } from "@playwright/test";
import { CHAPTER_START_TEXT } from "./constants.js";

export async function dismissChapterStartMessageIfPresent(page: Page): Promise<void> {
  const message = page.locator(".srpg-message-window");
  const visible = await message
    .waitFor({ state: "visible", timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (!visible) {
    return;
  }

  await expect(message).toContainText(CHAPTER_START_TEXT);
  await page.keyboard.press("Enter");
  await expect(message).toBeHidden({ timeout: 5_000 });
}
