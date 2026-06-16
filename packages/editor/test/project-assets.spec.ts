import { describe, expect, it } from "vitest";
import {
  assetsFromBase64,
  assetsToBase64,
  base64ToUint8Array,
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
});
