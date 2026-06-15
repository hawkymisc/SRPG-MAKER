import { describe, expect, it } from "vitest";
import {
  addSupportPoints,
  awardSupportBattlePoints,
  canViewSupport,
  createInitialCampaign,
  getSupportPoints,
  listViewableSupports,
  markSupportViewed,
  mergeBattleToCampaign,
  SupportConversationSchema,
  supportPairKey,
  UnitSchema,
} from "../src/index.js";
import { createInitialBattleState } from "../src/battle/setup.js";
import { plainMap10, placement, sampleDatabase } from "./fixtures/battle.js";
import { CH, U } from "./helpers/ids.js";

const twoPlayerMap = {
  ...plainMap10,
  placements: [
    placement("unit_alm", 2, 2, "player", { equip: "wpn_iron_sword" }),
    placement("unit_lukas", 3, 2, "player", { equip: "wpn_iron_sword" }),
    placement("unit_brigand", 7, 7, "enemy", { equip: "wpn_iron_axe", aiType: "charge" }),
  ],
} as typeof plainMap10;

const databaseWithLukas = {
  ...sampleDatabase,
  units: {
    ...sampleDatabase.units,
    unit_lukas: UnitSchema.parse({
      id: "unit_lukas",
      name: "ルーカス",
      classId: "class_lord",
      level: 1,
      stats: { hp: 22, str: 8, mag: 0, skl: 7, spd: 6, lck: 4, def: 6, res: 2, mov: 5 },
      growth: { hp: 70, str: 50, mag: 0, skl: 45, spd: 40, lck: 30, def: 40, res: 15 },
      items: ["wpn_iron_sword"],
      skills: [],
    }),
  },
};

const supportC = SupportConversationSchema.parse({
  id: "sup_alm_lukas_c",
  name: "二人の誓い",
  unitA: "unit_alm",
  unitB: "unit_lukas",
  rank: "C",
  requiredPoints: 1,
  eventId: "ev_support_alm_lukas_c",
});

describe("support conversations", () => {
  it("builds canonical pair keys", () => {
    expect(supportPairKey(U("unit_alm"), U("unit_lukas"))).toBe("unit_alm|unit_lukas");
    expect(supportPairKey(U("unit_lukas"), U("unit_alm"))).toBe("unit_alm|unit_lukas");
  });

  it("accumulates points and lists viewable supports", () => {
    let campaign = createInitialCampaign({
      chapterId: CH("chapter01"),
      map: twoPlayerMap,
      database: databaseWithLukas,
    });
    expect(getSupportPoints(campaign, U("unit_alm"), U("unit_lukas"))).toBe(0);

    campaign = addSupportPoints(campaign, U("unit_alm"), U("unit_lukas"), 1);
    expect(getSupportPoints(campaign, U("unit_alm"), U("unit_lukas"))).toBe(1);
    expect(canViewSupport(supportC, campaign)).toBe(true);

    const viewable = listViewableSupports(campaign, { [supportC.id]: supportC });
    expect(viewable).toHaveLength(1);

    campaign = markSupportViewed(campaign, supportC.id);
    expect(canViewSupport(supportC, campaign)).toBe(false);
    expect(listViewableSupports(campaign, { [supportC.id]: supportC })).toHaveLength(0);
  });

  it("awards battle points for surviving deployed pairs", () => {
    const campaign = createInitialCampaign({
      chapterId: CH("chapter01"),
      map: twoPlayerMap,
      database: databaseWithLukas,
    });
    const battle = createInitialBattleState({ map: twoPlayerMap, database: databaseWithLukas });
    const merged = mergeBattleToCampaign(campaign, battle);
    expect(getSupportPoints(merged, U("unit_alm"), U("unit_lukas"))).toBe(1);
  });

  it("awards points only among deployed survivors", () => {
    let campaign = createInitialCampaign({
      chapterId: CH("chapter01"),
      map: twoPlayerMap,
      database: databaseWithLukas,
    });
    campaign = {
      ...campaign,
      deployedRefs: [U("unit_alm")],
    };
    const merged = awardSupportBattlePoints(campaign, [U("unit_alm"), U("unit_lukas")]);
    expect(getSupportPoints(merged, U("unit_alm"), U("unit_lukas"))).toBe(0);
  });
});
