import { z } from "zod";
import { ClassSchema } from "./class.js";
import { ItemSchema } from "./item.js";
import { MapSchema } from "./map.js";
import { SkillSchema } from "./skill.js";
import { TerrainSchema } from "./terrain.js";
import { UnitSchema } from "./unit.js";
import { WeaponSchema } from "./weapon.js";

export const SCHEMA_VERSION = 1;

export const ProjectSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  name: z.string().min(1),
  tileSize: z.number().int().positive().default(32),
  database: z.object({
    units: z.record(UnitSchema),
    classes: z.record(ClassSchema),
    weapons: z.record(WeaponSchema),
    items: z.record(ItemSchema),
    skills: z.record(SkillSchema),
    terrain: z.record(TerrainSchema),
  }),
  maps: z.record(MapSchema).default({}),
});

export type Project = z.infer<typeof ProjectSchema>;

export function createDefaultProject(name: string): Project {
  return ProjectSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    name,
    tileSize: 32,
    database: {
      units: {},
      classes: {},
      weapons: {},
      items: {},
      skills: {},
      terrain: {},
    },
    maps: {},
  });
}
