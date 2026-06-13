import type { ChapterData } from "../data/loadChapter.js";
import type { BattleSession } from "./BattleSession.js";

export const REGISTRY_KEYS = {
  chapter: "chapter",
  session: "session",
  seed: "seed",
  autoPlayAll: "autoPlayAll",
  debugInvincible: "debugInvincible",
} as const;

export interface RuntimeRegistry {
  [REGISTRY_KEYS.chapter]: ChapterData;
  [REGISTRY_KEYS.session]: BattleSession;
  [REGISTRY_KEYS.seed]: number;
  [REGISTRY_KEYS.autoPlayAll]: boolean;
  [REGISTRY_KEYS.debugInvincible]?: boolean;
}
