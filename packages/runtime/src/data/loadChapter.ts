import {
  ClassSchema,
  EventDefinitionSchema,
  ItemSchema,
  MapSchema,
  SkillSchema,
  TerrainSchema,
  UnitSchema,
  WeaponSchema,
  type EventDefinition,
  type MapData,
} from "@srpg/shared";
import type { BattleDatabase } from "@srpg/shared";

export interface ChapterData {
  map: MapData;
  database: BattleDatabase;
  events: EventDefinition[];
  chapterId: string;
}

export const EDITOR_TESTPLAY_KEY = "srpg-editor-testplay";

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

export interface EditorTestPlayPayload {
  map: MapData;
  database: BattleDatabase;
  events?: EventDefinition[];
  chapterId?: string;
  seed?: number;
  debug?: { invincible?: boolean };
}

export function parseEvents(raw: unknown): EventDefinition[] {
  if (raw === undefined || raw === null) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map((entry) => EventDefinitionSchema.parse(entry));
  }
  if (typeof raw === "object") {
    return Object.values(raw as Record<string, unknown>).map((entry) =>
      EventDefinitionSchema.parse(entry),
    );
  }
  throw new Error("Invalid events JSON");
}

export function loadChapterFromEditorStorage(): EditorTestPlayPayload | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(EDITOR_TESTPLAY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EditorTestPlayPayload;
    return {
      map: MapSchema.parse(parsed.map),
      database: buildDatabase({
        units: parsed.database.units,
        classes: parsed.database.classes,
        weapons: parsed.database.weapons,
        items: parsed.database.items,
        skills: parsed.database.skills,
        terrain: parsed.database.terrain,
      }),
      events: parseEvents(parsed.events),
      chapterId: parsed.chapterId ?? "chapter01",
      ...(parsed.seed !== undefined ? { seed: parsed.seed } : {}),
      ...(parsed.debug ? { debug: parsed.debug } : {}),
    };
  } catch {
    return null;
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.json() as Promise<unknown>;
}

async function fetchEvents(base: string, mapId: string): Promise<EventDefinition[]> {
  try {
    const raw = await fetchJson(`${base}/events/${mapId}.json`);
    return parseEvents(raw);
  } catch {
    return [];
  }
}

/** Load chapter map + database from HTTP (browser / Vite dev server). */
export async function loadChapter(baseUrl: string, mapId = "chapter01"): Promise<ChapterData> {
  const base = baseUrl.replace(/\/$/, "");
  const [mapRaw, units, classes, weapons, items, skills, terrain, events] = await Promise.all([
    fetchJson(`${base}/maps/${mapId}.json`),
    fetchJson(`${base}/database/units.json`),
    fetchJson(`${base}/database/classes.json`),
    fetchJson(`${base}/database/weapons.json`),
    fetchJson(`${base}/database/items.json`),
    fetchJson(`${base}/database/skills.json`),
    fetchJson(`${base}/database/terrain.json`),
    fetchEvents(base, mapId),
  ]);

  return {
    map: MapSchema.parse(mapRaw),
    database: buildDatabase({ units, classes, weapons, items, skills, terrain }),
    events,
    chapterId: mapId,
  };
}
