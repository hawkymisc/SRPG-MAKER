import { describe, expect, it, vi } from "vitest";
import { ProjectSchema, SCHEMA_VERSION } from "@srpg/shared";
import { createElectronFileSystem } from "../src/lib/project/electronFileSystem.js";
import { folderDisplayName, loadProjectFromSplitFiles } from "../src/lib/project/folderProject.js";
import { splitProject } from "../src/lib/export/splitProject.js";
import { assetsToBase64 } from "../src/lib/project/projectAssets.js";
import type { SrpgElectronBridge } from "../src/lib/project/electronBridge.js";

const sampleProject = ProjectSchema.parse({
  schemaVersion: SCHEMA_VERSION,
  name: "FolderTest",
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

const sampleAssets = {
  "assets/audio/se/se_select.ogg": new Uint8Array([9, 8, 7]),
};

function mockBridge(overrides: Partial<SrpgElectronBridge> = {}): SrpgElectronBridge {
  return {
    isElectron: true,
    pickOpenFolder: vi.fn(async () => null),
    pickOpenFile: vi.fn(async () => null),
    pickSaveFolder: vi.fn(async () => null),
    pickSaveFile: vi.fn(async () => null),
    readFolderFiles: vi.fn(async () => ({ json: {}, assetsBase64: {} })),
    writeFolderFiles: vi.fn(async () => undefined),
    readTextFile: vi.fn(async () => "{}"),
    writeTextFile: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("folderProject", () => {
  it("loads split folder files", () => {
    const files = splitProject(sampleProject);
    const loaded = loadProjectFromSplitFiles(files);
    expect(loaded.name).toBe("FolderTest");
  });

  it("rejects missing project.json", () => {
    expect(() => loadProjectFromSplitFiles({})).toThrow(/project\.json/);
  });

  it("derives display name from path", () => {
    expect(folderDisplayName("C:/Games/MyGame")).toBe("MyGame");
  });
});

describe("createElectronFileSystem", () => {
  it("opens folder projects via native bridge", async () => {
    const files = splitProject(sampleProject);
    const bridge = mockBridge({
      pickOpenFolder: vi.fn(async () => "C:/Projects/MyGame"),
      readFolderFiles: vi.fn(async () => ({
        json: files,
        assetsBase64: assetsToBase64(sampleAssets),
      })),
    });
    const fs = createElectronFileSystem(bridge);
    const opened = await fs.openProject();
    expect(opened?.storageKind).toBe("folder");
    expect(opened?.project.name).toBe("FolderTest");
    expect(opened?.projectLocation).toBe("C:/Projects/MyGame");
    expect(opened?.assets["assets/audio/se/se_select.ogg"]).toEqual(sampleAssets["assets/audio/se/se_select.ogg"]);
  });

  it("saves new projects as folder layout with assets", async () => {
    const bridge = mockBridge({
      pickSaveFolder: vi.fn(async () => "C:/Projects/Export"),
      writeFolderFiles: vi.fn(async () => undefined),
    });
    const fs = createElectronFileSystem(bridge);
    const next = await fs.saveProject(
      sampleProject,
      {
        fileName: "demo.json",
        storageKind: "json",
        projectLocation: null,
      },
      sampleAssets,
    );
    expect(next.storageKind).toBe("folder");
    expect(bridge.writeFolderFiles).toHaveBeenCalledWith("C:/Projects/Export", {
      json: expect.objectContaining({
        "project.json": expect.stringContaining("FolderTest"),
      }),
      assetsBase64: assetsToBase64(sampleAssets),
    });
  });
});
