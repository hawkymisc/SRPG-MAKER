import { expect, type Page } from "@playwright/test";
import { gotoTab } from "./editor.js";

/** Minimal Ogg header bytes for BGM upload smoke tests. */
export const E2E_BGM_BYTES = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x99]);

export async function uploadBgmAsset(
  page: Page,
  fileName = "e2e_phase3.ogg",
): Promise<string> {
  await gotoTab(page, 6);
  await expect(page.getByTestId("assets-tab")).toBeVisible();

  const assetPath = `assets/audio/bgm/${fileName}`;
  const bgmInput = page.locator('[data-testid="assets-tab"] input[accept*="audio/ogg"]').first();
  await bgmInput.setInputFiles({
    name: fileName,
    mimeType: "audio/ogg",
    buffer: Buffer.from(E2E_BGM_BYTES),
  });

  await expect(page.getByTestId("assets-table")).toBeVisible();
  await expect(page.getByTestId(`asset-row-${assetPath.replace(/\//g, "_")}`)).toBeVisible();
  return assetPath;
}
