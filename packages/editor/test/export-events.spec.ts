import { describe, expect, it } from "vitest";
import {
  MapSchema,
  ProjectSchema,
  SCHEMA_VERSION,
  UnitSchema,
  createDefaultStats,
} from "@srpg/shared";
import { mergeSplitProject, splitProject } from "../src/lib/export/splitProject.js";
import {
  buildExportFileEntries,
  exportHtml5,
  listExportFilePaths,
  parseRuntimeIndexHtml,
} from "../src/lib/export/exportHtml5.js";
import {
  addCommandAtPath,
  flattenCommands,
  moveCommandAtPath,
  removeCommandAtPath,
} from "../src/lib/events/eventCommandEditor.js";

const sampleProject = ProjectSchema.parse({
  schemaVersion: SCHEMA_VERSION,
  name: "ExportTest",
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
      eventIds: ["event_1"],
    }),
  },
  events: {
    event_1: {
      id: "event_1",
      name: "Intro",
      trigger: { type: "chapterStart" },
      commands: [{ cmd: "SHOW_MESSAGE", text: "hello" }],
    },
  },
});

describe("splitProject", () => {
  it("splits project into folder JSON files", () => {
    const files = splitProject(sampleProject);
    expect(files["project.json"]).toContain('"ExportTest"');
    expect(files["database/units.json"]).toContain("unit_a");
    expect(files["maps/chapter01.json"]).toContain("map_chapter01");
    expect(files["events/chapter01.json"]).toContain("event_1");
    expect(files["events/common.json"]).toContain("event_1");
    expect(files["supports/supports.json"]).toContain("{}");
  });

  it("round-trips through mergeSplitProject", () => {
    const files = splitProject(sampleProject);
    const merged = mergeSplitProject(files);
    expect(merged.name).toBe(sampleProject.name);
    expect(merged.maps.map_chapter01?.eventIds).toEqual(["event_1"]);
    expect(merged.events?.event_1?.commands[0]).toMatchObject({ cmd: "SHOW_MESSAGE" });
  });
});

describe("exportHtml5", () => {
  const runtimeFiles = {
    "index.html": new TextEncoder().encode('<html><script src="./assets/index.js"></script></html>'),
    "assets/index.js": new TextEncoder().encode("console.log('runtime');"),
  };

  it("lists expected export paths", () => {
    const paths = listExportFilePaths(sampleProject, Object.keys(runtimeFiles));
    expect(paths).toContain("game/project.json");
    expect(paths).toContain("game/events/common.json");
    expect(paths).toContain("game/supports/supports.json");
    expect(paths).toContain("game/maps/chapter01.json");
    expect(paths).toContain("game/index.html");
    expect(paths).toContain("game/assets/index.js");
  });

  it("builds zip entries without binary golden", () => {
    const entries = buildExportFileEntries(sampleProject, runtimeFiles);
    expect(Object.keys(entries).sort()).toEqual(listExportFilePaths(sampleProject, Object.keys(runtimeFiles)));
    expect(new TextDecoder().decode(entries["game/project.json"])).toContain("ExportTest");
  });

  it("returns blob metadata from exportHtml5", () => {
    const result = exportHtml5({ project: sampleProject, runtimeFiles, zipName: "test.zip" });
    expect(result.fileName).toBe("test.zip");
    expect(result.paths.length).toBeGreaterThan(5);
    expect(result.blob.type).toBe("application/zip");
    expect(result.blob.size).toBeGreaterThan(0);
  });

  it("parses relative asset paths from index.html", () => {
    const html = '<!doctype html><link rel="stylesheet" href="./assets/style.css"><script src="./assets/main.js"></script>';
    expect(parseRuntimeIndexHtml(html).sort()).toEqual(["assets/main.js", "assets/style.css", "index.html"].sort());
  });
});

describe("eventCommandEditor", () => {
  it("flattens nested BRANCH commands with indent depth", () => {
    const commands = addCommandAtPath([], "", "BRANCH");
    const withChild = addCommandAtPath(commands, "0.then", "SHOW_MESSAGE");
    const rows = flattenCommands(withChild);
    expect(rows).toHaveLength(2);
    expect(rows[1]?.depth).toBe(1);
    expect(rows[1]?.command.cmd).toBe("SHOW_MESSAGE");
  });

  it("reorders and removes commands", () => {
    let commands = addCommandAtPath([], "", "WAIT");
    commands = addCommandAtPath(commands, "", "SHOW_MESSAGE");
    commands = moveCommandAtPath(commands, "1", "up");
    expect(flattenCommands(commands).map((r) => r.command.cmd)).toEqual(["SHOW_MESSAGE", "WAIT"]);
    commands = removeCommandAtPath(commands, "0");
    expect(flattenCommands(commands)).toHaveLength(1);
  });
});
