import type { ItemId, SkillId, WeaponId, UnitId } from "../schemas/ids.js";
import type { BattleState } from "../battle/types.js";
import type { ChapterId } from "../schemas/ids.js";
import { RosterMemberSchema, type CampaignState } from "../schemas/campaign.js";
import type { Chapter } from "../schemas/chapter.js";
import { awardSupportBattlePoints } from "./support.js";

const VICTORY_GOLD_BONUS = 100;

/** Apply surviving player units back into roster. */
export function mergeBattleToCampaign(
  campaign: CampaignState,
  battleState: BattleState,
): CampaignState {
  const survivors = battleState.units.filter((u) => u.faction === "player" && u.hp > 0);
  const survivorRefs = new Set(survivors.map((u) => u.ref));
  const withSupport = awardSupportBattlePoints(
    campaign,
    survivors.map((u) => u.ref as UnitId),
  );

  const roster = withSupport.roster.map((member) => {
    const live = survivors.find((u) => u.ref === member.ref);
    if (!live) {
      return { ...member, hp: 0 };
    }
    return RosterMemberSchema.parse({
      ...member,
      hp: live.hp,
      maxHp: live.maxHp,
      level: live.level,
      exp: live.exp,
      classId: live.classId,
      stats: live.stats,
      equip: live.equip?.weaponId as WeaponId | undefined,
      inventory: live.inventory as ItemId[],
      skills: live.skills as SkillId[],
    });
  });

  const deployedRefs = withSupport.deployedRefs.filter((ref) => survivorRefs.has(ref));

  return {
    ...withSupport,
    roster,
    deployedRefs,
    gold: withSupport.gold + VICTORY_GOLD_BONUS,
    variables: { ...withSupport.variables, ...battleState.variables },
    switches: { ...withSupport.switches, ...battleState.switches },
  };
}

/** Mark chapter cleared and advance currentChapterId. */
export function advanceAfterVictory(campaign: CampaignState, chapter: Chapter): CampaignState {
  const cleared = campaign.clearedChapterIds.includes(chapter.id)
    ? campaign.clearedChapterIds
    : [...campaign.clearedChapterIds, chapter.id];
  const nextId = (chapter.nextChapterId ?? chapter.id) as ChapterId;
  return {
    ...campaign,
    clearedChapterIds: cleared,
    currentChapterId: nextId,
  };
}
