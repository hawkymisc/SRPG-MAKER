import { describe, expect, it } from "vitest";
import {
  assetsFromBase64,
  assetsToBase64,
  assetPathForUpload,
  base64ToUint8Array,
  categorizeAssetPath,
  formatAssetSize,
  isProjectAssetPath,
  listProjectAssetPaths,
  uint8ArrayToBase64,
} from "../src/lib/project/projectAssets.js";

describe("projectAssets", () => {
  it("detects asset paths under assets/", () => {
    expect(isProjectAssetPath("assets/audio/bgm/bgm_intro.ogg")).toBe(true);
    expect(isProjectAssetPath("assets/images/faces/alm.png")).toBe(true);
    expect(isProjectAssetPath("database/units.json")).toBe(false);
    expect(isProjectAssetPath("assets/data.json")).toBe(false);
  });

  it("round-trips base64 encoding", () => {
    const original = new Uint8Array([0, 127, 255, 42]);
    const b64 = uint8ArrayToBase64(original);
    expect(base64ToUint8Array(b64)).toEqual(original);
  });

  it("converts asset maps to base64 records", () => {
    const assets = {
      "assets/audio/se/se_hit.ogg": new Uint8Array([1, 2, 3]),
    };
    const encoded = assetsToBase64(assets);
    const restored = assetsFromBase64(encoded);
    expect(listProjectAssetPaths(restored)).toEqual(["assets/audio/se/se_hit.ogg"]);
    expect(restored["assets/audio/se/se_hit.ogg"]).toEqual(assets["assets/audio/se/se_hit.ogg"]);
  });

  it("builds upload paths per category", () => {
    expect(assetPathForUpload("images", "face.png")).toBe("assets/images/face.png");
    expect(assetPathForUpload("bgm", "bgm_intro.ogg")).toBe("assets/audio/bgm/bgm_intro.ogg");
    expect(assetPathForUpload("se", "se_hit.mp3")).toBe("assets/audio/se/se_hit.mp3");
  });

  it("categorizes and formats asset metadata", () => {
    expect(categorizeAssetPath("assets/images/a.png")).toBe("images");
    expect(categorizeAssetPath("assets/audio/bgm/x.ogg")).toBe("bgm");
    expect(formatAssetSize(1536)).toBe("1.5 KB");
  });
});
