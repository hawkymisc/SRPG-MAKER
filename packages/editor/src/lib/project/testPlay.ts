import type { BattleDatabase } from "@srpg/shared";
import type { MapData, Project } from "@srpg/shared";

export interface ChapterPayload {
  map: MapData;
  database: BattleDatabase;
  seed: number;
  debug: {
    invincible: boolean;
  };
}

export const TESTPLAY_STORAGE_KEY = "srpg-editor-testplay";

export function buildChapterPayload(
  project: Project,
  mapId: string,
  seed: number,
  debug: ChapterPayload["debug"],
): ChapterPayload {
  const map = project.maps[mapId];
  if (!map) {
    throw new Error(`Map not found: ${mapId}`);
  }
  return {
    map,
    database: project.database,
    seed,
    debug,
  };
}

export function storeChapterPayload(payload: ChapterPayload): void {
  sessionStorage.setItem(TESTPLAY_STORAGE_KEY, JSON.stringify(payload));
}

export function serializeChapterPayload(payload: ChapterPayload): string {
  return JSON.stringify(payload);
}

export function clearChapterPayload(): void {
  sessionStorage.removeItem(TESTPLAY_STORAGE_KEY);
}
