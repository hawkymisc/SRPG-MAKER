import {
  ClassSchema,
  ItemSchema,
  MapSchema,
  SkillSchema,
  TerrainSchema,
  UnitSchema,
  WeaponSchema,
  type MapData,
} from "@srpg/shared";
import type { BattleDatabase } from "@srpg/shared";

export interface ChapterData {
  map: MapData;
  database: BattleDatabase;
}

type DbKey = "units" | "classes" | "weapons" | "items" | "skills" | "terrain";

function parseRecordFile<T extends { id: string }>(
  raw: unknown,
  schema: { parse: (v: unknown) => T },
): Record<string, T> {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid database JSON");
  }
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(raw)) {
    const parsed = schema.parse(value);
    if (parsed.id !== key) {
      throw new Error(`Database key mismatch: ${key} vs ${parsed.id}`);
    }
    out[key] = parsed;
  }
  return out;
}

export function buildDatabase(rawParts: Record<DbKey, unknown>): BattleDatabase {
  return {
    units: parseRecordFile(rawParts.units, UnitSchema),
    classes: parseRecordFile(rawParts.classes, ClassSchema),
    weapons: parseRecordFile(rawParts.weapons, WeaponSchema),
    items: parseRecordFile(rawParts.items, ItemSchema),
    skills: parseRecordFile(rawParts.skills, SkillSchema),
    terrain: parseRecordFile(rawParts.terrain, TerrainSchema),
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.json() as Promise<unknown>;
}

/** Load chapter map + database from HTTP (browser / Vite dev server). */
export async function loadChapter(baseUrl: string, mapId = "chapter01"): Promise<ChapterData> {
  const base = baseUrl.replace(/\/$/, "");
  const [mapRaw, units, classes, weapons, items, skills, terrain] = await Promise.all([
    fetchJson(`${base}/maps/${mapId}.json`),
    fetchJson(`${base}/database/units.json`),
    fetchJson(`${base}/database/classes.json`),
    fetchJson(`${base}/database/weapons.json`),
    fetchJson(`${base}/database/items.json`),
    fetchJson(`${base}/database/skills.json`),
    fetchJson(`${base}/database/terrain.json`),
  ]);

  return {
    map: MapSchema.parse(mapRaw),
    database: buildDatabase({ units, classes, weapons, items, skills, terrain }),
  };
}
