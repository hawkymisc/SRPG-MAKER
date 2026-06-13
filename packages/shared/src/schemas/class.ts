import { z } from "zod";
import { ClassIdSchema } from "./ids.js";
import { StatsSchema } from "./stats.js";

export const MoveTypeSchema = z.enum(["infantry", "cavalry", "flying", "armored"]);

export const ClassSchema = z.object({
  id: ClassIdSchema,
  name: z.string().min(1),
  moveType: MoveTypeSchema,
  baseStats: StatsSchema,
  weaponAffinity: z.array(z.string()).default([]),
  statCaps: StatsSchema.optional(),
  promotionClassId: ClassIdSchema.optional(),
});

export type MoveType = z.infer<typeof MoveTypeSchema>;
export type ClassDef = z.infer<typeof ClassSchema>;
