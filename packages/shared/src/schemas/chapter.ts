import { z } from "zod";
import {
  ChapterIdSchema,
  EventIdSchema,
  ItemIdSchema,
  MapIdSchema,
} from "./ids.js";

export const ShopEntrySchema = z.object({
  itemId: ItemIdSchema,
  price: z.number().int().positive(),
  stock: z.number().int().positive().optional(),
});

export const ChapterSchema = z.object({
  id: ChapterIdSchema,
  name: z.string().min(1),
  mapId: MapIdSchema,
  sortOrder: z.number().int().nonnegative().default(0),
  nextChapterId: ChapterIdSchema.optional(),
  maxDeploy: z.number().int().positive().optional(),
  shop: z.array(ShopEntrySchema).default([]),
  baseEventIds: z.array(EventIdSchema).default([]),
});

export type Chapter = z.infer<typeof ChapterSchema>;
export type ShopEntry = z.infer<typeof ShopEntrySchema>;
