import type { UnitId } from "../schemas/ids.js";
import type { CampaignState } from "../schemas/campaign.js";
import type { SupportConversation, SupportId } from "../schemas/support.js";

/** Canonical key for an unordered unit pair (sorted lexicographically). */
export function supportPairKey(unitA: UnitId, unitB: UnitId): string {
  return unitA <= unitB ? `${unitA}|${unitB}` : `${unitB}|${unitA}`;
}

export function getSupportPoints(campaign: CampaignState, unitA: UnitId, unitB: UnitId): number {
  return campaign.supportPoints?.[supportPairKey(unitA, unitB)] ?? 0;
}

export function addSupportPoints(
  campaign: CampaignState,
  unitA: UnitId,
  unitB: UnitId,
  delta: number,
): CampaignState {
  if (delta <= 0) {
    return campaign;
  }
  const key = supportPairKey(unitA, unitB);
  const current = campaign.supportPoints?.[key] ?? 0;
  return {
    ...campaign,
    supportPoints: {
      ...(campaign.supportPoints ?? {}),
      [key]: current + delta,
    },
  };
}

/** +1 support point for each surviving deployed pair after battle. */
export function awardSupportBattlePoints(
  campaign: CampaignState,
  survivorRefs: readonly UnitId[],
): CampaignState {
  const survivorSet = new Set(survivorRefs);
  const deployedSurvivors = campaign.deployedRefs.filter((ref) => survivorSet.has(ref));
  let next = campaign;
  for (let i = 0; i < deployedSurvivors.length; i++) {
    for (let j = i + 1; j < deployedSurvivors.length; j++) {
      next = addSupportPoints(next, deployedSurvivors[i]!, deployedSurvivors[j]!, 1);
    }
  }
  return next;
}

function bothInRoster(campaign: CampaignState, unitA: UnitId, unitB: UnitId): boolean {
  const refs = new Set(campaign.roster.filter((m) => m.hp > 0).map((m) => m.ref));
  return refs.has(unitA) && refs.has(unitB);
}

export function canViewSupport(
  support: SupportConversation,
  campaign: CampaignState,
): boolean {
  if ((campaign.viewedSupportIds ?? []).includes(support.id)) {
    return false;
  }
  if (!bothInRoster(campaign, support.unitA, support.unitB)) {
    return false;
  }
  return getSupportPoints(campaign, support.unitA, support.unitB) >= support.requiredPoints;
}

export function listViewableSupports(
  campaign: CampaignState,
  supports: Record<string, SupportConversation>,
): SupportConversation[] {
  return Object.values(supports)
    .filter((support) => canViewSupport(support, campaign))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

export function markSupportViewed(campaign: CampaignState, supportId: SupportId): CampaignState {
  const viewed = campaign.viewedSupportIds ?? [];
  if (viewed.includes(supportId)) {
    return campaign;
  }
  return {
    ...campaign,
    viewedSupportIds: [...viewed, supportId],
  };
}
