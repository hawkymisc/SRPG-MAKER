import { describe, expect, it } from "vitest";
import {
  MapSchema,
  ProjectSchema,
  SCHEMA_VERSION,
  UnitSchema,
  createDefaultStats,
} from "@srpg/shared";
import {
  buildElectronShellFiles,
  sanitizePackageSlug,
} from "../src/lib/export/electronShell.js";
import { exportElectron, listElectronExportPaths } from "../src/lib/export/exportElectron.js";

const sampleProject = ProjectSchema.parse({
  schemaVersion: SCHEMA_VERSION,
  name: "My SRPG Game",
  tileSize: 32,
  database: {
    units: {
      unit_a: UnitSchema.parse({
        id: "unit_a",
        name: "A",
        classId: "class_soldier",
        stats: createDefaultStats(),
        growth: { hp: 50, str: 40, mag: 0, skl: 40, spd: 40, lck: 30, def: 30, res: 10 },
      }),
    },
    classes: {},
    weapons: {},
    items: {},
    skills: {},
    terrain: {},
  },
  maps: {
    map_chapter01: MapSchema.parse({
      id: "map_chapter01",
      name: "Ch1",
      width: 10,
      height: 10,
      layers: { bottom: Array.from({ length: 100 }, () => "terrain_plain") },
      placements: [],
      reinforcements: [],
      winCondition: { type: "defeat_all_enemies" },
      loseCondition: { allPlayerDefeated: true },
    }),
  },
});

const runtimeFiles = {
  "index.html": new TextEncoder().encode("<html></html>"),
};

describe("electronShell", () => {
  it("sanitizes package slug", () => {
    expect(sanitizePackageSlug("My SRPG Game")).toBe("my-srpg-game");
    expect(sanitizePackageSlug("!!!")).toBe("srpg-game");
  });

  it("builds main/preload/package.json", () => {
    const shell = buildElectronShellFiles("My SRPG Game");
    expect(shell["main.mjs"]).toContain("loadFile");
    expect(shell["main.mjs"]).toContain("contextIsolation: true");
    expect(shell["package.json"]).toContain('"start": "electron ."');
    expect(shell["package.json"]).toContain("electron-builder");
    expect(shell["README.txt"]).toContain("npm install");
  });
});

describe("exportElectron", () => {
  it("lists shell paths in addition to game/", () => {
    const paths = listElectronExportPaths(sampleProject, Object.keys(runtimeFiles));
    expect(paths).toContain("game/index.html");
    expect(paths).toContain("main.mjs");
    expect(paths).toContain("package.json");
  });

  it("returns desktop zip metadata", () => {
    const result = exportElectron({
      project: sampleProject,
      runtimeFiles,
      zipName: "desktop.zip",
    });
    expect(result.fileName).toBe("desktop.zip");
    expect(result.paths).toContain("README.txt");
    expect(result.blob.size).toBeGreaterThan(0);
  });
});
