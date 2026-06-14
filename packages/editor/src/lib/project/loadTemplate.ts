import {
  ClassSchema,
  ItemSchema,
  MapSchema,
  ProjectSchema,
  SCHEMA_VERSION,
  SkillSchema,
  TerrainSchema,
  UnitSchema,
  WeaponSchema,
  ChapterSchema,
  mapFileStem,
  type Project,
} from "@srpg/shared";

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

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.json() as Promise<unknown>;
}

export interface TemplateLoadOptions {
  baseUrl?: string;
  projectName?: string;
  mapId?: string;
}

/** Load sample template from HTTP (Vite publicDir). */
export async function loadSampleTemplate(options: TemplateLoadOptions = {}): Promise<Project> {
  const base = (options.baseUrl ?? "/").replace(/\/$/, "");
  const mapId = options.mapId ?? "chapter01";
  const [units, classes, weapons, items, skills, terrain, mapRaw] = await Promise.all([
    fetchJson(`${base}/database/units.json`),
    fetchJson(`${base}/database/classes.json`),
    fetchJson(`${base}/database/weapons.json`),
    fetchJson(`${base}/database/items.json`),
    fetchJson(`${base}/database/skills.json`),
    fetchJson(`${base}/database/terrain.json`),
    fetchJson(`${base}/maps/${mapId}.json`),
  ]);

  const database: Record<DbKey, Record<string, unknown>> = {
    units: parseRecordFile(units, UnitSchema),
    classes: parseRecordFile(classes, ClassSchema),
    weapons: parseRecordFile(weapons, WeaponSchema),
    items: parseRecordFile(items, ItemSchema),
    skills: parseRecordFile(skills, SkillSchema),
    terrain: parseRecordFile(terrain, TerrainSchema),
  };

  const map = MapSchema.parse(mapRaw);
  const chapterId = mapFileStem(map.id);
  const chapters = {
    [chapterId]: ChapterSchema.parse({
      id: chapterId,
      name: map.name,
      mapId: map.id,
      sortOrder: 0,
      shop: [{ itemId: "itm_vulnerary", price: 50 }],
      baseEventIds: ["ev_chapter01_intro"],
      nextChapterId: chapterId,
      maxDeploy: 2,
    }),
  };

  return ProjectSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    name: options.projectName ?? "サンプルプロジェクト",
    tileSize: 32,
    database,
    maps: { [map.id]: map },
    chapters,
    startChapterId: chapterId,
  });
}
