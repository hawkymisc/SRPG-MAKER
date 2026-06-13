import { z } from "zod";
import { TerrainIdSchema } from "./ids.js";
import { MoveTypeSchema } from "./class.js";

export const TerrainSchema = z.object({
  id: TerrainIdSchema,
  name: z.string().min(1),
  moveCosts: z.record(MoveTypeSchema, z.number().int().nonnegative()),
  avoidBonus: z.number().int().default(0),
  defBonus: z.number().int().default(0),
  healPerTurn: z.number().int().nonnegative().default(0),
  impassable: z.boolean().default(false),
});

export type Terrain = z.infer<typeof TerrainSchema>;
