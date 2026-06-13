import { z } from "zod";
import { WeaponIdSchema } from "./ids.js";

export const WeaponTypeSchema = z.enum(["sword", "lance", "axe", "bow", "magic"]);

export const WeaponSchema = z.object({
  id: WeaponIdSchema,
  name: z.string().min(1),
  weaponType: WeaponTypeSchema,
  might: z.number().int().nonnegative(),
  hit: z.number().int(),
  crit: z.number().int().nonnegative(),
  rangeMin: z.number().int().positive(),
  rangeMax: z.number().int().positive(),
  weight: z.number().int().nonnegative(),
  durability: z.number().int().positive(),
  effectiveTags: z.array(z.string()).default([]),
});

export type WeaponType = z.infer<typeof WeaponTypeSchema>;
export type Weapon = z.infer<typeof WeaponSchema>;

export function createDefaultWeapon(overrides: Partial<Weapon> & Pick<Weapon, "id" | "name">): Weapon {
  return WeaponSchema.parse({
    weaponType: "sword",
    might: 5,
    hit: 90,
    crit: 0,
    rangeMin: 1,
    rangeMax: 1,
    weight: 5,
    durability: 40,
    effectiveTags: [],
    ...overrides,
  });
}
