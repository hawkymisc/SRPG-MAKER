import { z } from "zod";
import { ClassIdSchema, ItemIdSchema, SkillIdSchema, UnitIdSchema, WeaponIdSchema } from "./ids.js";
import { GrowthSchema, StatsSchema } from "./stats.js";

export const UnitSchema = z.object({
  id: UnitIdSchema,
  name: z.string().min(1),
  classId: ClassIdSchema,
  level: z.number().int().positive().default(1),
  stats: StatsSchema,
  growth: GrowthSchema,
  items: z.array(z.union([WeaponIdSchema, ItemIdSchema])).default([]),
  skills: z.array(SkillIdSchema).default([]),
});

export type Unit = z.infer<typeof UnitSchema>;
