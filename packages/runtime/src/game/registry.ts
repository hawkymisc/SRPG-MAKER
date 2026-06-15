import type { CombatHooks } from "@srpg/shared";
import type { ChapterData } from "../data/loadChapter.js";
import type { BattleSession } from "./BattleSession.js";
import type { CampaignSession } from "./CampaignSession.js";
import type { Chapter, EventDefinition, SupportConversation } from "@srpg/shared";

export const REGISTRY_KEYS = {
  chapter: "chapter",
  session: "session",
  seed: "seed",
  autoPlayAll: "autoPlayAll",
  debugInvincible: "debugInvincible",
  chapterId: "chapterId",
  useCampaign: "useCampaign",
  campaignSession: "campaignSession",
  chapters: "chapters",
  events: "events",
  supports: "supports",
  combatHooks: "combatHooks",
} as const;

export interface RuntimeRegistry {
  [REGISTRY_KEYS.chapter]: ChapterData;
  [REGISTRY_KEYS.session]: BattleSession;
  [REGISTRY_KEYS.seed]: number;
  [REGISTRY_KEYS.autoPlayAll]: boolean;
  [REGISTRY_KEYS.chapterId]: string;
  [REGISTRY_KEYS.debugInvincible]?: boolean;
  [REGISTRY_KEYS.useCampaign]?: boolean;
  [REGISTRY_KEYS.campaignSession]?: CampaignSession;
  [REGISTRY_KEYS.chapters]?: Record<string, Chapter>;
  [REGISTRY_KEYS.events]?: Record<string, EventDefinition>;
  [REGISTRY_KEYS.supports]?: Record<string, SupportConversation>;
  [REGISTRY_KEYS.combatHooks]?: CombatHooks;
}
