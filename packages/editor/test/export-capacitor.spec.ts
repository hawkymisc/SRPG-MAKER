import { describe, expect, it } from "vitest";
import {
  MapSchema,
  ProjectSchema,
  SCHEMA_VERSION,
  UnitSchema,
  createDefaultStats,
} from "@srpg/shared";
import { buildCapacitorShellFiles } from "../src/lib/export/capacitorShell.js";
import { exportCapacitor, listCapacitorExportPaths } from "../src/lib/export/exportCapacitor.js";

const sampleProject = ProjectSchema.parse({
  schemaVersion: SCHEMA_VERSION,
  name: "Mobile Quest",
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

describe("capacitorShell", () => {
  it("builds capacitor.config.json and package.json", () => {
    const shell = buildCapacitorShellFiles("Mobile Quest");
    expect(shell["capacitor.config.json"]).toContain('"webDir": "www"');
    expect(shell["capacitor.config.json"]).toContain("com.srpgmaker.mobilequest");
    expect(shell["package.json"]).toContain("@capacitor/cli");
    expect(shell["package.json"]).toContain("cap:sync");
    expect(shell["README.txt"]).toContain("Android Studio");
  });
});

describe("exportCapacitor", () => {
  it("lists www/ paths and shell files", () => {
    const paths = listCapacitorExportPaths(sampleProject, Object.keys(runtimeFiles));
    expect(paths).toContain("www/index.html");
    expect(paths).toContain("capacitor.config.json");
    expect(paths).not.toContain("game/index.html");
  });

  it("returns mobile zip metadata", () => {
    const result = exportCapacitor({
      project: sampleProject,
      runtimeFiles,
      zipName: "mobile.zip",
    });
    expect(result.fileName).toBe("mobile.zip");
    expect(result.paths).toContain("README.txt");
    expect(result.blob.size).toBeGreaterThan(0);
  });
});
