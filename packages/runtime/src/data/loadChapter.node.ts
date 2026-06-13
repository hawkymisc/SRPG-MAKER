import { MapSchema } from "@srpg/shared";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDatabase, type ChapterData } from "./loadChapter.js";

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

/** Load chapter from filesystem (Vitest / Node). */
export function loadChapterFromDir(rootDir: string, mapId = "chapter01"): ChapterData {
  const mapRaw = readJsonFile(join(rootDir, "maps", `${mapId}.json`));
  const database = buildDatabase({
    units: readJsonFile(join(rootDir, "database", "units.json")),
    classes: readJsonFile(join(rootDir, "database", "classes.json")),
    weapons: readJsonFile(join(rootDir, "database", "weapons.json")),
    items: readJsonFile(join(rootDir, "database", "items.json")),
    skills: readJsonFile(join(rootDir, "database", "skills.json")),
    terrain: readJsonFile(join(rootDir, "database", "terrain.json")),
  });
  return { map: MapSchema.parse(mapRaw), database };
}

export type { ChapterData } from "./loadChapter.js";
