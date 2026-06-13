import { z } from "zod";

export const UnitIdSchema = z.string().min(1).brand<"UnitId">();
export const ClassIdSchema = z.string().min(1).brand<"ClassId">();
export const WeaponIdSchema = z.string().min(1).brand<"WeaponId">();
export const ItemIdSchema = z.string().min(1).brand<"ItemId">();
export const SkillIdSchema = z.string().min(1).brand<"SkillId">();
export const TerrainIdSchema = z.string().min(1).brand<"TerrainId">();
export const MapIdSchema = z.string().min(1).brand<"MapId">();

export type UnitId = z.infer<typeof UnitIdSchema>;
export type ClassId = z.infer<typeof ClassIdSchema>;
export type WeaponId = z.infer<typeof WeaponIdSchema>;
export type ItemId = z.infer<typeof ItemIdSchema>;
export type SkillId = z.infer<typeof SkillIdSchema>;
export type TerrainId = z.infer<typeof TerrainIdSchema>;
export type MapId = z.infer<typeof MapIdSchema>;
