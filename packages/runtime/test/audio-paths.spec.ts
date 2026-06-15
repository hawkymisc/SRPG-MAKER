import { describe, expect, it } from "vitest";
import { audioAssetSources, bgmAssetSources, seAssetSources } from "../src/audio/audioPaths.js";

describe("audioPaths", () => {
  it("resolves ogg and mp3 under assets/audio", () => {
    expect(bgmAssetSources("https://game.test/", "bgm_battle")).toEqual([
      "https://game.test/assets/audio/bgm/bgm_battle.ogg",
      "https://game.test/assets/audio/bgm/bgm_battle.mp3",
    ]);
    expect(seAssetSources("/base", "se_hit")).toEqual([
      "/base/assets/audio/se/se_hit.ogg",
      "/base/assets/audio/se/se_hit.mp3",
    ]);
  });

  it("strips trailing slash from base URL", () => {
    expect(audioAssetSources("http://localhost:5174/", "se", "se_select")[0]).toBe(
      "http://localhost:5174/assets/audio/se/se_select.ogg",
    );
  });
});
