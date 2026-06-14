import { describe, expect, it } from "vitest";
import { ProjectSchema, SCHEMA_VERSION, MapSchema, ChapterSchema } from "@srpg/shared";
import { buildChapterPayload } from "../src/lib/project/testPlay.js";
import { sampleDatabase } from "../../shared/test/fixtures/battle.js";

describe("campaign testplay payload", () => {
  it("includes chapters, campaign, and events for editor bridge", () => {
    const map = MapSchema.parse({
      id: "map_chapter01",
      name: "Ch1",
      width: 10,
      height: 10,
      layers: { bottom: Array.from({ length: 100 }, () => "terrain_plain") },
      placements: [{ ref: "unit_alm", x: 1, y: 1, faction: "player", equip: "wpn_iron_sword" }],
      eventIds: ["ev_1"],
      winCondition: { type: "defeat_all_enemies" },
    });
    const project = ProjectSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      name: "Test",
      tileSize: 32,
      database: sampleDatabase,
      maps: { [map.id]: map },
      chapters: {
        chapter01: ChapterSchema.parse({
          id: "chapter01",
          name: "Ch1",
          mapId: "map_chapter01",
        }),
      },
      events: {
        ev_1: {
          id: "ev_1",
          name: "intro",
          trigger: { type: "chapterStart" },
          commands: [{ cmd: "SHOW_MESSAGE", text: "hello" }],
        },
      },
      startChapterId: "chapter01",
    });

    const payload = buildChapterPayload(project, map.id, 42_001, { invincible: false });
    expect(payload.chapters.chapter01).toBeDefined();
    expect(payload.campaign.roster.length).toBe(1);
    expect(payload.events).toHaveLength(1);
    expect(payload.eventsById.ev_1).toBeDefined();
  });
});
