import { z } from "zod";
import { FactionSchema } from "./map.js";
import { WeaponTypeSchema } from "./weapon.js";

export const CombatRuleWhenSchema = z.object({
  attackerWeaponType: WeaponTypeSchema.optional(),
  defenderWeaponType: WeaponTypeSchema.optional(),
  attackerFaction: FactionSchema.optional(),
});

export const CombatRuleSchema = z
  .object({
    hook: z.enum(["attackPower", "hitRate", "critRate", "damage"]),
    when: CombatRuleWhenSchema.default({}),
    add: z.number().optional(),
    multiply: z.number().positive().optional(),
  })
  .refine((rule) => rule.add !== undefined || rule.multiply !== undefined, {
    message: "Combat rule requires add or multiply",
  });

export const PluginManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  rules: z.array(CombatRuleSchema).default([]),
});

export type CombatRuleWhen = z.infer<typeof CombatRuleWhenSchema>;
export type CombatRule = z.infer<typeof CombatRuleSchema>;
export type PluginManifest = z.infer<typeof PluginManifestSchema>;
