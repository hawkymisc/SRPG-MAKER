import { describe, expect, it } from "vitest";
import { ProjectSchema, SCHEMA_VERSION } from "@srpg/shared";
import { rotateBackups, loadBackupList, BACKUP_GENERATIONS } from "../src/lib/project/backup.js";
import { MemoryBackupStore, saveProjectAtomic } from "../src/lib/project/saveProject.js";
import { MemoryWriteTarget } from "../src/lib/project/atomicWrite.js";
import { serializeProject, parseProjectJson } from "../src/lib/project/serialize.js";
import { validateProject } from "../src/lib/project/validate.js";

const sampleProject = ProjectSchema.parse({
  schemaVersion: SCHEMA_VERSION,
  name: "テスト",
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

describe("project validate", () => {
  it("accepts valid project", () => {
    const result = validateProject(sampleProject);
    expect(result.ok).toBe(true);
    expect(result.project?.name).toBe("テスト");
  });

  it("rejects invalid project", () => {
    const result = validateProject({ bad: true });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("project serialize", () => {
  it("round-trips through JSON", () => {
    const text = serializeProject(sampleProject);
    const parsed = parseProjectJson(text);
    expect(parsed.name).toBe("テスト");
  });
});

describe("project backup", () => {
  it("keeps at most five generations", () => {
    const list = rotateBackups([], "a");
    expect(list).toHaveLength(1);
    const full = rotateBackups(["b", "c", "d", "e"], "a");
    expect(full).toHaveLength(BACKUP_GENERATIONS);
    expect(full[0]).toBe("a");
  });

  it("persists backups in memory store", () => {
    const store = new MemoryBackupStore();
    saveProjectAtomic({
      project: sampleProject,
      target: new MemoryWriteTarget(),
      backupStore: store,
      projectKey: "demo.json",
    });
    const list = loadBackupList(store, "demo.json");
    expect(list).toHaveLength(1);
    expect(list[0]).toContain('"テスト"');
  });
});

describe("atomic save", () => {
  it("writes validated JSON atomically", async () => {
    const target = new MemoryWriteTarget();
    const store = new MemoryBackupStore();
    const result = await saveProjectAtomic({
      project: sampleProject,
      target,
      backupStore: store,
      projectKey: "test.json",
    });
    expect(target.content).toBe(result.content);
    expect(() => parseProjectJson(target.content)).not.toThrow();
  });
});
