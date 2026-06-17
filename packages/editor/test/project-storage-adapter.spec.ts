import { describe, expect, it, vi } from "vitest";
import { ProjectSchema, SCHEMA_VERSION } from "@srpg/shared";
import { CloudProjectStorageAdapter, CLOUD_UNAVAILABLE } from "../src/lib/project/cloudStorageAdapter.js";
import { LocalProjectStorageAdapter } from "../src/lib/project/localProjectStorageAdapter.js";
import { createProjectStorageAdapter } from "../src/lib/project/createFileSystem.js";
import {
  loadStorageBackendPreference,
  parseStorageBackendKind,
  saveStorageBackendPreference,
} from "../src/lib/project/projectStorageAdapter.js";
import type { ProjectFileSystem } from "../src/lib/project/fileSystem.js";

const sampleProject = ProjectSchema.parse({
  schemaVersion: SCHEMA_VERSION,
  name: "StorageTest",
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

function mockFileSystem(): ProjectFileSystem {
  return {
    nativeFolder: true,
    openProject: vi.fn(async () => ({
      name: "demo",
      project: sampleProject,
      assets: {},
      storageKind: "folder" as const,
      projectLocation: "/tmp/demo",
    })),
    saveProject: vi.fn(async () => ({
      fileName: "demo",
      storageKind: "folder" as const,
      projectLocation: "/tmp/demo",
    })),
  };
}

describe("projectStorageAdapter", () => {
  it("parses and persists backend preference", () => {
    const storage = new Map<string, string>();
    saveStorageBackendPreference("cloud", {
      setItem: (k, v) => storage.set(k, v),
    });
    expect(loadStorageBackendPreference({ getItem: (k) => storage.get(k) ?? null })).toBe("cloud");
    expect(parseStorageBackendKind(null)).toBe("local");
  });

  it("local adapter delegates to ProjectFileSystem", async () => {
    const fs = mockFileSystem();
    const adapter = new LocalProjectStorageAdapter(fs);
    const opened = await adapter.openProject();
    expect(opened?.project.name).toBe("StorageTest");
    expect(fs.openProject).toHaveBeenCalled();

    await adapter.saveProject(
      { project: sampleProject, assets: {} },
      { fileName: "demo.json", storageKind: "json", projectLocation: null },
    );
    expect(fs.saveProject).toHaveBeenCalled();
  });

  it("cloud adapter is unavailable", async () => {
    const adapter = new CloudProjectStorageAdapter();
    expect(adapter.available).toBe(false);
    await expect(adapter.openProject()).rejects.toThrow(CLOUD_UNAVAILABLE);
    await expect(
      adapter.saveProject(
        { project: sampleProject, assets: {} },
        { fileName: "x.json", storageKind: "json", projectLocation: null },
      ),
    ).rejects.toThrow(CLOUD_UNAVAILABLE);
  });

  it("factory returns cloud or local adapter", () => {
    expect(createProjectStorageAdapter("cloud").kind).toBe("cloud");
    expect(createProjectStorageAdapter("local").kind).toBe("local");
  });
});
