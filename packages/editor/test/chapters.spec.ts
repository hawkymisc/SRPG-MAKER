import { describe, expect, it } from "vitest";
import {
  ChapterSchema,
  MapSchema,
  ProjectSchema,
  createDefaultProject,
} from "@srpg/shared";
import { mergeSplitProject, splitProject } from "../src/lib/export/splitProject.js";

describe("chapters in split export", () => {
  const map = MapSchema.parse({
    id: "map_chapter01",
    name: "第一章",
    width: 10,
    height: 10,
    layers: { bottom: Array.from({ length: 100 }, () => "terrain_plain") },
    winCondition: { type: "defeat_all_enemies" },
  });

  const project = ProjectSchema.parse({
    ...createDefaultProject("ChapterTest"),
    maps: { [map.id]: map },
    chapters: {
      chapter01: ChapterSchema.parse({
        id: "chapter01",
        name: "第一章",
        mapId: "map_chapter01",
        sortOrder: 0,
      }),
    },
    startChapterId: "chapter01",
  });

  it("writes chapters/chapters.json and startChapterId in project.json", () => {
    const files = splitProject(project);
    expect(files["chapters/chapters.json"]).toContain("chapter01");
    expect(files["project.json"]).toContain("startChapterId");
  });

  it("round-trips through mergeSplitProject", () => {
    const files = splitProject(project);
    const merged = mergeSplitProject(files);
    expect(merged.chapters?.chapter01?.mapId).toBe("map_chapter01");
    expect(merged.startChapterId).toBe("chapter01");
  });
});
