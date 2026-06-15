import { z } from "zod";
import { EventIdSchema, UnitIdSchema } from "./ids.js";

export const SupportIdSchema = z.string().min(1).brand<"SupportId">();

export const SupportRankSchema = z.enum(["C", "B", "A", "S"]);

export const SupportConversationSchema = z.object({
  id: SupportIdSchema,
  name: z.string().min(1),
  unitA: UnitIdSchema,
  unitB: UnitIdSchema,
  rank: SupportRankSchema.default("C"),
  /** Support points required on the pair before this conversation unlocks. */
  requiredPoints: z.number().int().positive().default(1),
  eventId: EventIdSchema,
});

export type SupportId = z.infer<typeof SupportIdSchema>;
export type SupportRank = z.infer<typeof SupportRankSchema>;
export type SupportConversation = z.infer<typeof SupportConversationSchema>;

export function parseSupportsRecord(raw: unknown): Record<string, SupportConversation> {
  if (raw === undefined || raw === null || typeof raw !== "object") {
    return {};
  }
  const out: Record<string, SupportConversation> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const parsed = SupportConversationSchema.parse(value);
    if (parsed.id !== key) {
      throw new Error(`Support key mismatch: ${key} vs ${parsed.id}`);
    }
    out[key] = parsed;
  }
  return out;
}
