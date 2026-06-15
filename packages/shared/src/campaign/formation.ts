import type { PlacementInput } from "../battle/setup.js";
import type { BattleDatabase } from "../battle/types.js";
import type { ChapterId, UnitId } from "../schemas/ids.js";
import type { MapData } from "../schemas/map.js";
import { RosterMemberSchema, type CampaignState } from "../schemas/campaign.js";
import type { Chapter } from "../schemas/chapter.js";
import { effectiveClassId, effectiveStats } from "./promotion.js";

export interface CreateInitialCampaignInput {
  chapterId: ChapterId;
  map: MapData;
  database: BattleDatabase;
  startingGold?: number;
}

/** Build campaign roster from map player placements and DB templates. */
export function createInitialCampaign(input: CreateInitialCampaignInput): CampaignState {
  const playerRefs = [
    ...new Set(input.map.placements.filter((p) => p.faction === "player").map((p) => p.ref)),
  ] as UnitId[];

  const roster = playerRefs.map((ref) => {
    const template = input.database.units[ref];
    if (!template) {
      throw new Error(`Unknown unit ref: ${ref}`);
    }
    const equip = template.items.find((id) => input.database.weapons[id]);
    return RosterMemberSchema.parse({
      ref,
      level: template.level,
      exp: 0,
      hp: template.stats.hp,
      maxHp: template.stats.hp,
      equip,
      inventory: template.items.filter((id) => input.database.items[id]),
      skills: template.skills,
    });
  });

  return {
    currentChapterId: input.chapterId,
    gold: input.startingGold ?? 500,
    roster,
    deployedRefs: [...playerRefs],
    clearedChapterIds: [],
    variables: {},
    switches: {},
    supportPoints: {},
    viewedSupportIds: [],
  };
}

export function maxDeployCount(chapter: Chapter | undefined, map: MapData): number {
  return chapter?.maxDeploy ?? map.placements.filter((p) => p.faction === "player").length;
}

export function toggleDeployedRef(
  campaign: CampaignState,
  ref: UnitId,
  deployed: boolean,
  maxDeploy: number,
): CampaignState {
  const inRoster = campaign.roster.some((m) => m.ref === ref);
  if (!inRoster) {
    return campaign;
  }
  const has = campaign.deployedRefs.includes(ref);
  if (deployed && !has) {
    if (campaign.deployedRefs.length >= maxDeploy) {
      return campaign;
    }
    return { ...campaign, deployedRefs: [...campaign.deployedRefs, ref] };
  }
  if (!deployed && has) {
    return {
      ...campaign,
      deployedRefs: campaign.deployedRefs.filter((id) => id !== ref),
    };
  }
  return campaign;
}

export function validateFormation(campaign: CampaignState, maxDeploy: number): string | null {
  if (campaign.deployedRefs.length === 0) {
    return "出撃ユニットを1体以上選んでください";
  }
  if (campaign.deployedRefs.length > maxDeploy) {
    return `出撃上限は${maxDeploy}体です`;
  }
  for (const ref of campaign.deployedRefs) {
    const member = campaign.roster.find((m) => m.ref === ref);
    if (!member || member.hp <= 0) {
      return `出撃できないユニット: ${ref}`;
    }
  }
  return null;
}

/** Merge roster stats with map slots to produce battle placements. */
export function createBattlePlacementsFromCampaign(
  campaign: CampaignState,
  map: MapData,
  database: BattleDatabase,
  chapter?: Chapter,
): PlacementInput[] {
  const limit = maxDeployCount(chapter, map);
  const deployRefs = campaign.deployedRefs.slice(0, limit);
  const playerSlots = map.placements.filter((p) => p.faction === "player");
  if (playerSlots.length === 0) {
    throw new Error("Map has no player deployment slots");
  }

  const playerPlacements: PlacementInput[] = deployRefs.map((ref, index) => {
    const member = campaign.roster.find((m) => m.ref === ref);
    if (!member) {
      throw new Error(`Roster member not found: ${ref}`);
    }
    const template = database.units[member.ref];
    if (!template) {
      throw new Error(`Unknown unit ref: ${member.ref}`);
    }
    const slot = playerSlots[index] ?? playerSlots[0]!;
    const stats = effectiveStats(member, template);
    return {
      ref: member.ref,
      x: slot.x,
      y: slot.y,
      faction: "player",
      isBoss: false,
      level: member.level,
      exp: member.exp,
      classId: effectiveClassId(member, template),
      statsOverride: stats,
      maxHp: member.maxHp,
      ...(member.equip !== undefined ? { equip: member.equip } : {}),
      hp: member.hp,
    };
  });

  const enemies = map.placements.filter((p) => p.faction !== "player");
  return [...playerPlacements, ...enemies];
}
