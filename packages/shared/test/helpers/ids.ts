import {
  ChapterIdSchema,
  ClassIdSchema,
  ItemIdSchema,
  SwitchIdSchema,
  TerrainIdSchema,
  UnitIdSchema,
  VariableIdSchema,
  WeaponIdSchema,
} from "../../src/schemas/ids.js";

export const U = (id: string) => UnitIdSchema.parse(id);
export const CH = (id: string) => ChapterIdSchema.parse(id);
export const W = (id: string) => WeaponIdSchema.parse(id);
export const C = (id: string) => ClassIdSchema.parse(id);
export const I = (id: string) => ItemIdSchema.parse(id);
export const T = (id: string) => TerrainIdSchema.parse(id);
export const V = (id: string) => VariableIdSchema.parse(id);
export const S = (id: string) => SwitchIdSchema.parse(id);
