import {
  ClassSchema,
  ItemSchema,
  MapSchema,
  ProjectSchema,
  SkillSchema,
  TerrainSchema,
  UnitSchema,
  WeaponSchema,
  ChapterSchema,
  mapFileStem,
  type Project,
} from "@srpg/shared";

/** Path to JSON text (Git-friendly folder layout per docs/spec.md section 7). */
export type SplitProjectFiles = Record<string, string>;

const DB_TABLES = ["units", "classes", "weapons", "items", "skills", "terrain"] as const;

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

function jsonFile(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** Runtime loads `maps/{stem}.json` (e.g. map_chapter01 → chapter01). */
export { mapFileStem } from "@srpg/shared";

function chapterEventsFile(
  map: Project["maps"][string],
  events: Project["events"],
): string {
  const ids = map.eventIds ?? [];
  const chapterEvents = ids
    .map((id) => events?.[id])
    .filter((ev): ev is NonNullable<typeof ev> => ev !== undefined);
  return jsonFile(chapterEvents);
}

/** Split a monolithic Project into on-disk JSON files. */
export function splitProject(project: Project): SplitProjectFiles {
  const validated = ProjectSchema.parse(project);
  const files: SplitProjectFiles = {};

  files["project.json"] = jsonFile({
    schemaVersion: validated.schemaVersion,
    name: validated.name,
    tileSize: validated.tileSize,
    ...(validated.startChapterId !== undefined
      ? { startChapterId: validated.startChapterId }
      : {}),
  });

  files["chapters/chapters.json"] = jsonFile(validated.chapters ?? {});

  for (const table of DB_TABLES) {
    files[`database/${table}.json`] = jsonFile(validated.database[table]);
  }

  for (const map of Object.values(validated.maps)) {
    const stem = mapFileStem(map.id);
    files[`maps/${stem}.json`] = jsonFile(map);
    files[`events/${stem}.json`] = chapterEventsFile(map, validated.events ?? {});
  }

  files["events/common.json"] = jsonFile(validated.events ?? {});

  return files;
}

/** Reassemble a Project from split JSON files (inverse of splitProject). */
export function mergeSplitProject(files: SplitProjectFiles): Project {
  const metaRaw: unknown = JSON.parse(files["project.json"] ?? "{}");

  const parseDb = (table: (typeof DB_TABLES)[number], text: string) => {
    const raw: unknown = JSON.parse(text);
    switch (table) {
      case "units":
        return parseRecordFile(raw, UnitSchema);
      case "classes":
        return parseRecordFile(raw, ClassSchema);
      case "weapons":
        return parseRecordFile(raw, WeaponSchema);
      case "items":
        return parseRecordFile(raw, ItemSchema);
      case "skills":
        return parseRecordFile(raw, SkillSchema);
      case "terrain":
        return parseRecordFile(raw, TerrainSchema);
    }
  };

  const database = {
    units: parseDb("units", files["database/units.json"] ?? "{}"),
    classes: parseDb("classes", files["database/classes.json"] ?? "{}"),
    weapons: parseDb("weapons", files["database/weapons.json"] ?? "{}"),
    items: parseDb("items", files["database/items.json"] ?? "{}"),
    skills: parseDb("skills", files["database/skills.json"] ?? "{}"),
    terrain: parseDb("terrain", files["database/terrain.json"] ?? "{}"),
  };

  const maps: Project["maps"] = {};
  const events: Project["events"] = {};
  let chapters: Project["chapters"] = {};
  for (const [path, text] of Object.entries(files)) {
    if (path.startsWith("maps/") && path.endsWith(".json")) {
      const map = MapSchema.parse(JSON.parse(text));
      maps[map.id] = map;
      continue;
    }
    if (path === "events/common.json") {
      const raw: unknown = JSON.parse(text);
      if (typeof raw === "object" && raw !== null) {
        Object.assign(events, raw);
      }
      continue;
    }
    if (path === "chapters/chapters.json") {
      const raw: unknown = JSON.parse(text);
      if (typeof raw === "object" && raw !== null) {
        chapters = Object.fromEntries(
          Object.entries(raw as Record<string, unknown>).map(([key, value]) => [
            key,
            ChapterSchema.parse(value),
          ]),
        );
      }
    }
  }

  if (typeof metaRaw !== "object" || metaRaw === null) {
    throw new Error("Invalid project.json");
  }

  return ProjectSchema.parse({
    ...metaRaw,
    database,
    maps,
    events,
    chapters,
  });
}
