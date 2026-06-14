import type { MapData } from "@srpg/shared";
import type { TerrainId } from "@srpg/shared";

export type MapLayerName = "bottom" | "top";

export function getLayerTiles(map: MapData, layer: MapLayerName): TerrainId[] {
  if (layer === "bottom") {
    return [...map.layers.bottom];
  }
  const top = map.layers.top ?? map.layers.bottom.map(() => "terrain_plain" as TerrainId);
  return [...top];
}

export function setLayerTiles(map: MapData, layer: MapLayerName, tiles: TerrainId[]): MapData {
  if (layer === "bottom") {
    return { ...map, layers: { ...map.layers, bottom: tiles } };
  }
  return { ...map, layers: { ...map.layers, top: tiles } };
}

export function paintIndices(
  tiles: TerrainId[],
  width: number,
  indices: number[],
  terrainId: TerrainId,
): TerrainId[] {
  const next = [...tiles];
  for (const idx of indices) {
    if (idx >= 0 && idx < next.length) {
      next[idx] = terrainId;
    }
  }
  return next;
}

export function rectIndices(
  width: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number[] {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const out: number[] = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      out.push(y * width + x);
    }
  }
  return out;
}

/** Flood fill cells matching the start terrain (4-directional). */
export function fillIndices(
  tiles: TerrainId[],
  width: number,
  height: number,
  startX: number,
  startY: number,
  terrainId: TerrainId,
): number[] {
  const startIdx = startY * width + startX;
  if (startIdx < 0 || startIdx >= tiles.length) {
    return [];
  }
  const target = tiles[startIdx];
  if (target === terrainId) {
    return [];
  }
  const visited = new Set<number>();
  const queue = [startIdx];
  const out: number[] = [];
  while (queue.length > 0) {
    const idx = queue.pop();
    if (idx === undefined || visited.has(idx)) {
      continue;
    }
    visited.add(idx);
    if (tiles[idx] !== target) {
      continue;
    }
    out.push(idx);
    const x = idx % width;
    const y = Math.floor(idx / width);
    if (x > 0) queue.push(idx - 1);
    if (x < width - 1) queue.push(idx + 1);
    if (y > 0) queue.push(idx - width);
    if (y < height - 1) queue.push(idx + width);
  }
  return out;
}
