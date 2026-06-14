import type { BattleDatabase } from "@srpg/shared";
import type { CampaignState, EventDefinition, MapData, Project, Chapter } from "@srpg/shared";
import { createInitialCampaign } from "@srpg/shared";

export interface ChapterPayload {
  map: MapData;
  database: BattleDatabase;
  seed: number;
  debug: {
    invincible: boolean;
  };
  chapterId: string;
  events: EventDefinition[];
  eventsById: Record<string, EventDefinition>;
  chapters: Record<string, Chapter>;
  startChapterId: string;
  campaign: CampaignState;
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
  const chapters = project.chapters ?? {};
  const startChapterId = project.startChapterId ?? Object.keys(chapters)[0] ?? mapFileStem(mapId);
  const chapterId =
    Object.entries(chapters).find(([, ch]) => ch.mapId === mapId)?.[0] ?? startChapterId;

  const eventIds = map.eventIds ?? [];
  const eventsById = project.events ?? {};
  const events = eventIds
    .map((id) => eventsById[id])
    .filter((ev): ev is EventDefinition => ev !== undefined);

  const campaign = createInitialCampaign({
    chapterId: chapterId as never,
    map,
    database: project.database,
  });

  return {
    map,
    database: project.database,
    seed,
    debug,
    chapterId,
    events,
    eventsById,
    chapters,
    startChapterId: startChapterId as never,
    campaign,
  };
}

function mapFileStem(mapId: string): string {
  return mapId.startsWith("map_") ? mapId.slice(4) : mapId;
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
