import { z } from "zod";
import { ItemIdSchema } from "./ids.js";

export const ItemEffectSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heal"), amount: z.number().int().positive() }),
]);

export const ItemSchema = z.object({
  id: ItemIdSchema,
  name: z.string().min(1),
  uses: z.number().int().positive(),
  effect: ItemEffectSchema,
});

export type Item = z.infer<typeof ItemSchema>;
export type ItemEffect = z.infer<typeof ItemEffectSchema>;
