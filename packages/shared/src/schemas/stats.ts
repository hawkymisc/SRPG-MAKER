import { z } from "zod";

export const StatsSchema = z.object({
  hp: z.number().int().nonnegative(),
  str: z.number().int().nonnegative(),
  mag: z.number().int().nonnegative(),
  skl: z.number().int().nonnegative(),
  spd: z.number().int().nonnegative(),
  lck: z.number().int().nonnegative(),
  def: z.number().int().nonnegative(),
  res: z.number().int().nonnegative(),
  mov: z.number().int().positive(),
});

export const GrowthSchema = z.object({
  hp: z.number().int().min(0).max(100),
  str: z.number().int().min(0).max(100),
  mag: z.number().int().min(0).max(100),
  skl: z.number().int().min(0).max(100),
  spd: z.number().int().min(0).max(100),
  lck: z.number().int().min(0).max(100),
  def: z.number().int().min(0).max(100),
  res: z.number().int().min(0).max(100),
});

export type Stats = z.infer<typeof StatsSchema>;
export type Growth = z.infer<typeof GrowthSchema>;

export function createDefaultStats(overrides: Partial<Stats> = {}): Stats {
  return StatsSchema.parse({
    hp: 20,
    str: 5,
    mag: 0,
    skl: 5,
    spd: 5,
    lck: 5,
    def: 5,
    res: 2,
    mov: 5,
    ...overrides,
  });
}
