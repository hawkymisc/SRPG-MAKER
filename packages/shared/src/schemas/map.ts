import { z } from "zod";
import { EventIdSchema, MapIdSchema, UnitIdSchema, WeaponIdSchema } from "./ids.js";
import { TerrainIdSchema } from "./ids.js";

export const FactionSchema = z.enum(["player", "enemy", "third"]);
export const AiTypeSchema = z.enum(["charge", "ambush", "guard", "move_only"]);

export const WinConditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("defeat_all_enemies") }),
  z.object({ type: z.literal("defeat_boss"), bossRef: z.string().min(1) }),
  z.object({ type: z.literal("survive_turns"), turns: z.number().int().positive() }),
  z.object({
    type: z.literal("defend_point"),
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    turns: z.number().int().positive(),
  }),
]);

export const LoseConditionSchema = z.object({
  allPlayerDefeated: z.boolean().default(true),
  turnLimit: z.number().int().positive().optional(),
});

export const MapPlacementSchema = z.object({
  ref: UnitIdSchema,
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  faction: FactionSchema,
  equip: WeaponIdSchema.optional(),
  aiType: AiTypeSchema.optional(),
  isBoss: z.boolean().default(false),
  guardX: z.number().int().nonnegative().optional(),
  guardY: z.number().int().nonnegative().optional(),
  moveTargetX: z.number().int().nonnegative().optional(),
  moveTargetY: z.number().int().nonnegative().optional(),
});

export const ReinforcementSchema = z.object({
  turn: z.number().int().positive(),
  ref: UnitIdSchema,
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  faction: FactionSchema,
  equip: WeaponIdSchema.optional(),
  aiType: AiTypeSchema.optional(),
});

export const MapSchema = z.object({
  id: MapIdSchema,
  name: z.string().min(1),
  width: z.number().int().min(10).max(100),
  height: z.number().int().min(10).max(100),
  layers: z.object({
    bottom: z.array(TerrainIdSchema),
    top: z.array(TerrainIdSchema).optional(),
    object: z.array(TerrainIdSchema).optional(),
  }),
  placements: z.array(MapPlacementSchema).default([]),
  reinforcements: z.array(ReinforcementSchema).default([]),
  winCondition: WinConditionSchema,
  loseCondition: LoseConditionSchema.default({ allPlayerDefeated: true }),
  // このマップで有効化する project.events のイベント id 参照(後方互換のため既定 []）。
  eventIds: z.array(EventIdSchema).default([]),
});

export type Faction = z.infer<typeof FactionSchema>;
export type AiType = z.infer<typeof AiTypeSchema>;
export type WinCondition = z.infer<typeof WinConditionSchema>;
export type LoseCondition = z.infer<typeof LoseConditionSchema>;
export type MapPlacement = z.infer<typeof MapPlacementSchema>;
export type Reinforcement = z.infer<typeof ReinforcementSchema>;
export type MapData = z.infer<typeof MapSchema>;
