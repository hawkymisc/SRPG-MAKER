import { z } from "zod";
import {
  ChapterIdSchema,
  ClassIdSchema,
  ItemIdSchema,
  SkillIdSchema,
  SwitchIdSchema,
  UnitIdSchema,
  VariableIdSchema,
  WeaponIdSchema,
} from "./ids.js";
import { StatsSchema } from "./stats.js";

export const RosterMemberSchema = z.object({
  ref: UnitIdSchema,
  level: z.number().int().positive(),
  exp: z.number().int().nonnegative().default(0),
  hp: z.number().int().nonnegative(),
  maxHp: z.number().int().positive(),
  /** Promoted class override; defaults to unit template classId when absent. */
  classId: ClassIdSchema.optional(),
  /** Current stats after level-ups; defaults to unit template stats when absent. */
  stats: StatsSchema.optional(),
  equip: WeaponIdSchema.optional(),
  inventory: z.array(ItemIdSchema).default([]),
  skills: z.array(SkillIdSchema).default([]),
});

export const CampaignStateSchema = z.object({
  currentChapterId: ChapterIdSchema,
  gold: z.number().int().nonnegative().default(0),
  roster: z.array(RosterMemberSchema),
  deployedRefs: z.array(UnitIdSchema).default([]),
  clearedChapterIds: z.array(ChapterIdSchema).default([]),
  variables: z.record(VariableIdSchema, z.number()).default({}),
  switches: z.record(SwitchIdSchema, z.boolean()).default({}),
});

export type RosterMember = z.infer<typeof RosterMemberSchema>;
export type CampaignState = z.infer<typeof CampaignStateSchema>;

export const CAMPAIGN_SAVE_VERSION = 1;

export const CampaignSaveDataSchema = z.object({
  version: z.literal(CAMPAIGN_SAVE_VERSION),
  seed: z.number().int().nonnegative(),
  campaign: CampaignStateSchema,
});

export type CampaignSaveData = z.infer<typeof CampaignSaveDataSchema>;
