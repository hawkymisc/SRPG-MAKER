import { describe, expect, it } from "vitest";
import {
  ChapterSchema,
  MapSchema,
  chapterLoadStem,
  defaultStartChapterId,
  mapFileStem,
} from "../src/index.js";

describe("chapter resolve", () => {
  const map = MapSchema.parse({
    id: "map_chapter01",
    name: "第一章",
    width: 10,
    height: 10,
    layers: { bottom: Array.from({ length: 100 }, () => "terrain_plain") },
    winCondition: { type: "defeat_all_enemies" },
  });

  const chapters = {
    chapter01: ChapterSchema.parse({
      id: "chapter01",
      name: "第一章",
      mapId: "map_chapter01",
      sortOrder: 0,
    }),
    chapter02: ChapterSchema.parse({
      id: "chapter02",
      name: "第二章",
      mapId: "map_chapter02",
      sortOrder: 1,
    }),
  };

  it("mapFileStem strips map_ prefix", () => {
    expect(mapFileStem("map_chapter01")).toBe("chapter01");
    expect(mapFileStem("test10")).toBe("test10");
  });

  it("chapterLoadStem resolves via chapter registry", () => {
    expect(chapterLoadStem("chapter01", chapters, { [map.id]: map })).toBe("chapter01");
    expect(chapterLoadStem("chapter02", chapters, { [map.id]: map })).toBe("chapter02");
  });

  it("chapterLoadStem falls back to chapter id", () => {
    expect(chapterLoadStem("chapter99", chapters, { [map.id]: map })).toBe("chapter99");
  });

  it("defaultStartChapterId picks lowest sortOrder", () => {
    expect(defaultStartChapterId(chapters)).toBe("chapter01");
  });
});
