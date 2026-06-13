import { z } from "zod";
import { SkillIdSchema } from "./ids.js";

export const SkillSchema = z.object({
  id: SkillIdSchema,
  name: z.string().min(1),
  description: z.string().default(""),
  critBonus: z.number().int().default(0),
});

export type Skill = z.infer<typeof SkillSchema>;
