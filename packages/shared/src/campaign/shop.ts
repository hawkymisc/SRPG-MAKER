import type { BattleDatabase } from "../battle/types.js";
import type { ItemId } from "../schemas/ids.js";
import type { CampaignState } from "../schemas/campaign.js";
import type { ShopEntry } from "../schemas/chapter.js";

export interface ShopPurchaseResult {
  campaign: CampaignState;
  error?: string;
}

/** Purchase a shop entry (deterministic gold/inventory update). */
export function purchaseFromShop(
  campaign: CampaignState,
  entry: ShopEntry,
  database: BattleDatabase,
): ShopPurchaseResult {
  const item = database.items[entry.itemId];
  if (!item) {
    return { campaign, error: `不明なアイテム: ${entry.itemId}` };
  }
  if (campaign.gold < entry.price) {
    return { campaign, error: "所持金が足りません" };
  }

  const targetRef = campaign.deployedRefs[0] ?? campaign.roster[0]?.ref;
  if (!targetRef) {
    return { campaign, error: "ロスターが空です" };
  }

  const roster = campaign.roster.map((member) => {
    if (member.ref !== targetRef) {
      return member;
    }
    const inventory = [...member.inventory, entry.itemId as ItemId];
    return { ...member, inventory };
  });

  return {
    campaign: {
      ...campaign,
      gold: campaign.gold - entry.price,
      roster,
    },
  };
}
