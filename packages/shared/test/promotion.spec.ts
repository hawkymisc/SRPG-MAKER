import { describe, expect, it } from "vitest";
import {
  applyPromotionStats,
  canPromote,
  createBattlePlacementsFromCampaign,
  effectiveClassId,
  effectiveStats,
  listPromotableMembers,
  promoteMember,
  RosterMemberSchema,
} from "../src/index.js";
import { createBattleUnitFromPlacement, resetInstanceCounter } from "../src/battle/setup.js";
import { ChapterSchema } from "../src/schemas/chapter.js";
import { ClassSchema } from "../src/schemas/class.js";
import { plainMap10, placement, sampleDatabase } from "./fixtures/battle.js";
import { U } from "./helpers/ids.js";

const campaignMap = {
  ...plainMap10,
  placements: [
    placement("unit_alm", 2, 2, "player", { equip: "wpn_iron_sword" }),
    placement("unit_brigand", 7, 7, "enemy", { equip: "wpn_iron_axe", aiType: "charge" }),
  ],
} as typeof plainMap10;

const classesWithPromotion = {
  ...sampleDatabase.classes,
  class_lord: ClassSchema.parse({
    ...sampleDatabase.classes.class_lord,
    promotionClassId: "class_general",
  }),
  class_general: ClassSchema.parse({
    id: "class_general",
    name: "ジェネラル",
    moveType: "infantry",
    baseStats: { hp: 24, str: 10, mag: 0, skl: 8, spd: 9, lck: 6, def: 7, res: 3, mov: 6 },
    weaponAffinity: ["sword"],
  }),
};

const database = { ...sampleDatabase, classes: classesWithPromotion };

describe("promotion", () => {
  const unit = database.units.unit_alm!;

  it("effectiveClassId and effectiveStats fall back to template", () => {
    const member = RosterMemberSchema.parse({
      ref: U("unit_alm"),
      level: 5,
      exp: 20,
      hp: 18,
      maxHp: 22,
    });
    expect(effectiveClassId(member, unit)).toBe("class_lord");
    expect(effectiveStats(member, unit).str).toBe(unit.stats.str);
  });

  it("canPromote requires level 10 and promotionClassId", () => {
    const low = RosterMemberSchema.parse({
      ref: U("unit_alm"),
      level: 9,
      hp: 20,
      maxHp: 20,
    });
    expect(canPromote(low, unit, database.classes).ok).toBe(false);

    const ready = RosterMemberSchema.parse({
      ref: U("unit_alm"),
      level: 10,
      hp: 20,
      maxHp: 20,
    });
    const check = canPromote(ready, unit, database.classes);
    expect(check.ok).toBe(true);
    if (check.ok) {
      expect(check.targetClassId).toBe("class_general");
    }
  });

  it("promoteMember applies class stat delta and stores overrides", () => {
    const member = RosterMemberSchema.parse({
      ref: U("unit_alm"),
      level: 12,
      exp: 5,
      hp: 22,
      maxHp: 22,
      stats: { hp: 22, str: 9, mag: 0, skl: 7, spd: 8, lck: 6, def: 6, res: 2, mov: 5 },
    });
    const { member: promoted, error } = promoteMember(member, unit, database.classes);
    expect(error).toBeUndefined();
    expect(promoted.classId).toBe("class_general");
    expect(promoted.stats?.str).toBeGreaterThan(member.stats!.str);
    expect(promoted.maxHp).toBeGreaterThanOrEqual(member.maxHp);
  });

  it("applyPromotionStats updates mov from promoted class", () => {
    const from = database.classes.class_lord!;
    const to = database.classes.class_general!;
    const next = applyPromotionStats(unit.stats, from, to);
    expect(next.mov).toBe(to.baseStats.mov);
  });

  it("battle placements carry roster level, classId, and stats", () => {
    const chapter = ChapterSchema.parse({
      id: "chapter01",
      name: "第一章",
      mapId: "map_chapter01",
    });
    const campaign = {
      currentChapterId: chapter.id,
      gold: 100,
      roster: [
        RosterMemberSchema.parse({
          ref: U("unit_alm"),
          level: 11,
          exp: 30,
          hp: 25,
          maxHp: 28,
          classId: "class_general",
          stats: { hp: 28, str: 11, mag: 0, skl: 8, spd: 9, lck: 6, def: 7, res: 3, mov: 6 },
        }),
      ],
      deployedRefs: [U("unit_alm")],
      clearedChapterIds: [],
      variables: {},
      switches: {},
    };
    const placements = createBattlePlacementsFromCampaign(campaign, campaignMap, database, chapter);
    const player = placements.find((p) => p.faction === "player");
    expect(player?.level).toBe(11);
    expect(player?.exp).toBe(30);
    expect(player?.classId).toBe("class_general");

    resetInstanceCounter();
    const battleUnit = createBattleUnitFromPlacement(player!, database);
    expect(battleUnit.level).toBe(11);
    expect(battleUnit.exp).toBe(30);
    expect(battleUnit.classId).toBe("class_general");
    expect(battleUnit.stats.str).toBe(11);
    expect(battleUnit.maxHp).toBe(28);
  });

  it("listPromotableMembers finds eligible roster entries", () => {
    const campaign = {
      currentChapterId: "chapter01",
      gold: 0,
      roster: [
        RosterMemberSchema.parse({
          ref: U("unit_alm"),
          level: 10,
          hp: 20,
          maxHp: 20,
        }),
        RosterMemberSchema.parse({
          ref: U("unit_brigand"),
          level: 10,
          hp: 20,
          maxHp: 20,
        }),
      ],
      deployedRefs: [],
      clearedChapterIds: [],
      variables: {},
      switches: {},
    };
    const entries = listPromotableMembers(campaign, database);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.member.ref).toBe("unit_alm");
  });
});
