import {
  advanceAfterVictory,
  createInitialCampaign,
  mergeBattleToCampaign,
  type Chapter,
} from "@srpg/shared";
import type { BattleState } from "@srpg/shared";
import type { ChapterData } from "../data/loadChapter.js";
import { CampaignSession } from "./CampaignSession.js";
import { CampaignSaveManager } from "../save/CampaignSaveManager.js";

export function bootstrapCampaignFromChapter(
  chapter: ChapterData,
  _chapters: Record<string, Chapter>,
  startChapterId: string,
  seed: number,
  existing?: CampaignSession,
): CampaignSession {
  if (existing) {
    return existing;
  }
  const state = createInitialCampaign({
    chapterId: startChapterId as never,
    map: chapter.map,
    database: chapter.database,
  });
  return new CampaignSession(state, seed);
}

export function applyVictoryToCampaign(
  campaignSession: CampaignSession,
  chapters: Record<string, Chapter>,
  battleState: BattleState,
  chapterId: string,
): CampaignSession {
  const chapterDef = chapters[chapterId];
  let state = mergeBattleToCampaign(campaignSession.state, battleState);
  if (chapterDef) {
    state = advanceAfterVictory(state, chapterDef);
  }
  campaignSession.state = state;
  CampaignSaveManager.save(campaignSession);
  return campaignSession;
}
