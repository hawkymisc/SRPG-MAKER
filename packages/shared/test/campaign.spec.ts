import { describe, expect, it } from "vitest";
import {
  ChapterSchema,
  createInitialCampaign,
  createBattlePlacementsFromCampaign,
  mergeBattleToCampaign,
  advanceAfterVictory,
  purchaseFromShop,
  toggleDeployedRef,
  validateFormation,
} from "../src/index.js";
import { createInitialBattleState } from "../src/battle/setup.js";
import { plainMap10, placement, sampleDatabase } from "./fixtures/battle.js";
import { I, U } from "./helpers/ids.js";

const campaignMap = {
  ...plainMap10,
  placements: [
    placement("unit_alm", 2, 2, "player", { equip: "wpn_iron_sword" }),
    placement("unit_brigand", 7, 7, "enemy", { equip: "wpn_iron_axe", aiType: "charge" }),
  ],
} as typeof plainMap10;

describe("campaign", () => {
  const chapter = ChapterSchema.parse({
    id: "chapter01",
    name: "第一章",
    mapId: "map_chapter01",
    shop: [{ itemId: I("itm_vulnerary"), price: 50 }],
    nextChapterId: "chapter02",
    maxDeploy: 2,
  });

  it("creates roster from player placements", () => {
    const campaign = createInitialCampaign({
      chapterId: chapter.id,
      map: campaignMap,
      database: sampleDatabase,
      startingGold: 300,
    });
    expect(campaign.roster).toHaveLength(1);
    expect(campaign.gold).toBe(300);
    expect(campaign.deployedRefs).toContain("unit_alm");
  });

  it("builds battle placements from formation", () => {
    const campaign = createInitialCampaign({
      chapterId: chapter.id,
      map: campaignMap,
      database: sampleDatabase,
    });
    const placements = createBattlePlacementsFromCampaign(campaign, campaignMap, sampleDatabase, chapter);
    expect(placements.filter((p) => p.faction === "player")).toHaveLength(1);
    expect(placements.some((p) => p.faction === "enemy")).toBe(true);
  });

  it("validates and toggles formation", () => {
    let campaign = createInitialCampaign({
      chapterId: chapter.id,
      map: campaignMap,
      database: sampleDatabase,
    });
    campaign = toggleDeployedRef(campaign, U("unit_alm"), false, 2);
    expect(validateFormation(campaign, 2)).toMatch(/1体以上/);
    campaign = toggleDeployedRef(campaign, U("unit_alm"), true, 2);
    expect(validateFormation(campaign, 2)).toBeNull();
  });

  it("purchases shop items when affordable", () => {
    const campaign = createInitialCampaign({
      chapterId: chapter.id,
      map: campaignMap,
      database: sampleDatabase,
      startingGold: 100,
    });
    const result = purchaseFromShop(campaign, { itemId: I("itm_vulnerary"), price: 50 }, sampleDatabase);
    expect(result.error).toBeUndefined();
    expect(result.campaign.gold).toBe(50);
    expect(result.campaign.roster[0]?.inventory).toContain("itm_vulnerary");
  });

  it("merges battle survivors and advances chapter", () => {
    const campaign = createInitialCampaign({
      chapterId: chapter.id,
      map: campaignMap,
      database: sampleDatabase,
    });
    const battle = createInitialBattleState({ map: campaignMap, database: sampleDatabase });
    const merged = mergeBattleToCampaign(campaign, battle);
    expect(merged.gold).toBe(campaign.gold + 100);
    const advanced = advanceAfterVictory(merged, chapter);
    expect(advanced.currentChapterId).toBe("chapter02");
    expect(advanced.clearedChapterIds).toContain("chapter01");
  });
});
