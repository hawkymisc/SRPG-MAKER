import type { Chapter, ChapterId, MapData } from "../schemas/index.js";

/** Runtime loads `maps/{stem}.json` (e.g. map_chapter01 → chapter01). */
export function mapFileStem(mapId: string): string {
  return mapId.startsWith("map_") ? mapId.slice(4) : mapId;
}

/** Resolve HTTP load stem for a chapter id using project chapter registry. */
export function chapterLoadStem(
  chapterId: string,
  chapters: Record<string, Chapter>,
  maps: Record<string, MapData>,
): string {
  const chapter = chapters[chapterId];
  if (chapter) {
    const map = maps[chapter.mapId];
    if (map) {
      return mapFileStem(map.id);
    }
  }
  return mapFileStem(chapterId);
}

/** Pick the first chapter by sortOrder, then id. */
export function defaultStartChapterId(chapters: Record<string, Chapter>): ChapterId | undefined {
  const sorted = Object.values(chapters).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
  return sorted[0]?.id;
}
