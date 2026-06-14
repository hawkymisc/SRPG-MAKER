import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { CampaignSession } from "../src/game/CampaignSession.js";
import { bootstrapCampaignFromChapter, applyVictoryToCampaign } from "../src/game/campaignBridge.js";
import { ChapterSchema, createInitialBattleState } from "@srpg/shared";
import { loadChapterFromDir } from "../src/data/loadChapter.node.js";

const SAMPLE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../templates/sample");

beforeEach(() => {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) delete store[key];
    },
    key: () => null,
    length: 0,
  } as Storage;
});

describe("campaign flow helpers", () => {
  it("bootstraps campaign session from chapter", () => {
    const chapter = loadChapterFromDir(SAMPLE_ROOT, "chapter01");
    const chapters = {
      chapter01: ChapterSchema.parse({
        id: "chapter01",
        name: "序章",
        mapId: "map_chapter01",
        nextChapterId: "chapter01",
      }),
    };
    const session = bootstrapCampaignFromChapter(chapter, chapters, "chapter01", 42_001);
    expect(session.state.roster.length).toBeGreaterThan(0);
    expect(session.state.gold).toBeGreaterThan(0);
  });

  it("applies victory merge and chapter advance", () => {
    const chapter = loadChapterFromDir(SAMPLE_ROOT, "chapter01");
    const chapters = {
      chapter01: ChapterSchema.parse({
        id: "chapter01",
        name: "序章",
        mapId: "map_chapter01",
        nextChapterId: "chapter01",
      }),
    };
    const campaignSession = bootstrapCampaignFromChapter(chapter, chapters, "chapter01", 42_001);
    const battle = createInitialBattleState({
      map: chapter.map,
      database: chapter.database,
    });
    applyVictoryToCampaign(campaignSession, chapters, battle, "chapter01");
    expect(campaignSession.state.clearedChapterIds).toContain("chapter01");
    expect(campaignSession.state.gold).toBeGreaterThan(500);
  });

  it("serializes campaign session", () => {
    const session = new CampaignSession(
      {
        currentChapterId: ChapterSchema.parse({
          id: "chapter01",
          name: "x",
          mapId: "map_chapter01",
        }).id,
        gold: 100,
        roster: [],
        deployedRefs: [],
        clearedChapterIds: [],
        variables: {},
        switches: {},
      },
      42,
    );
    const roundTrip = CampaignSession.deserialize(session.serialize());
    expect(roundTrip.state.gold).toBe(100);
    expect(roundTrip.seed).toBe(42);
  });
});
