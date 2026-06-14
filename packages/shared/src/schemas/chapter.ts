import { z } from "zod";
import { ChapterIdSchema, MapIdSchema } from "./ids.js";

export const ChapterSchema = z.object({
  id: ChapterIdSchema,
  name: z.string().min(1),
  mapId: MapIdSchema,
  sortOrder: z.number().int().nonnegative().default(0),
});

export type Chapter = z.infer<typeof ChapterSchema>;
