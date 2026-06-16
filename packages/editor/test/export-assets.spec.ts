import { describe, expect, it } from "vitest";
import { ProjectSchema, SCHEMA_VERSION } from "@srpg/shared";
import { buildExportFileEntries, exportHtml5 } from "../src/lib/export/exportHtml5.js";

const sampleProject = ProjectSchema.parse({
  schemaVersion: SCHEMA_VERSION,
  name: "AssetTest",
  tileSize: 32,
  database: {
    units: {},
    classes: {},
    weapons: {},
    items: {},
    skills: {},
    terrain: {},
  },
  maps: {},
});

const runtimeFiles = {
  "index.html": new TextEncoder().encode("<html></html>"),
};

const projectAssets = {
  "assets/audio/bgm/bgm_intro.ogg": new Uint8Array([1, 2, 3]),
  "assets/images/faces/alm.png": new Uint8Array([4, 5]),
};

describe("export with project assets", () => {
  it("includes assets under game/ in zip entries", () => {
    const entries = buildExportFileEntries(sampleProject, runtimeFiles, "game/", projectAssets);
    expect(entries["game/assets/audio/bgm/bgm_intro.ogg"]).toEqual(projectAssets["assets/audio/bgm/bgm_intro.ogg"]);
    expect(entries["game/assets/images/faces/alm.png"]).toEqual(projectAssets["assets/images/faces/alm.png"]);
  });

  it("exports html5 zip metadata with asset paths", () => {
    const result = exportHtml5({
      project: sampleProject,
      runtimeFiles,
      projectAssets,
      zipName: "with-assets.zip",
    });
    expect(result.fileName).toBe("with-assets.zip");
    expect(result.paths).toContain("game/assets/audio/bgm/bgm_intro.ogg");
    expect(result.blob.size).toBeGreaterThan(0);
  });
});
