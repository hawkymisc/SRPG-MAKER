import type { MoveType } from "../schemas/class.js";
import type { Terrain } from "../schemas/terrain.js";
import type { BattleState, BattleUnit } from "./types.js";

export interface ReachableTile {
  x: number;
  y: number;
  cost: number;
}

function getMoveCost(
  terrain: Terrain,
  moveType: MoveType,
): number | null {
  if (terrain.impassable) return null;
  const cost = terrain.moveCosts[moveType];
  if (cost === undefined || cost < 0) return null;
  return cost;
}

function isOccupied(state: BattleState, x: number, y: number, excludeId?: string): boolean {
  return state.units.some(
    (u) => u.hp > 0 && u.x === x && u.y === y && u.instanceId !== excludeId,
  );
}

export function getTerrainAt(state: BattleState, x: number, y: number): Terrain | undefined {
  const { map, database } = state.context;
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return undefined;
  const idx = y * map.width + x;
  const terrainId = map.layers.bottom[idx];
  return terrainId ? database.terrain[terrainId] : undefined;
}

export function getMoveType(unit: BattleUnit, state: BattleState): MoveType {
  return state.context.database.classes[unit.classId]?.moveType ?? "infantry";
}

/** ダイクストラ法による移動範囲(ZOCなし・MVP)。 */
export function calcMovementRange(
  state: BattleState,
  unitId: string,
): ReachableTile[] {
  const unit = state.units.find((u) => u.instanceId === unitId);
  if (!unit || unit.hp <= 0) return [];

  const moveType = getMoveType(unit, state);
  const maxCost = unit.stats.mov;
  const startKey = `${unit.x},${unit.y}`;
  const costs = new Map<string, number>([[startKey, 0]]);
  const queue: Array<{ x: number; y: number; cost: number }> = [{ x: unit.x, y: unit.y, cost: 0 }];
  const { width, height } = state.context.map;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];
    for (const n of neighbors) {
      if (n.x < 0 || n.y < 0 || n.x >= width || n.y >= height) continue;
      const terrain = getTerrainAt(state, n.x, n.y);
      if (!terrain) continue;
      const stepCost = getMoveCost(terrain, moveType);
      if (stepCost === null) continue;
      const newCost = current.cost + stepCost;
      if (newCost > maxCost) continue;
      if (isOccupied(state, n.x, n.y, unit.instanceId) && !(n.x === unit.x && n.y === unit.y)) {
        continue;
      }
      const key = `${n.x},${n.y}`;
      const prev = costs.get(key);
      if (prev !== undefined && prev <= newCost) continue;
      costs.set(key, newCost);
      queue.push({ x: n.x, y: n.y, cost: newCost });
    }
  }

  const result: ReachableTile[] = [];
  for (const [key, cost] of costs) {
    const [xs, ys] = key.split(",");
    const x = Number(xs);
    const y = Number(ys);
    if (x === unit.x && y === unit.y) {
      result.push({ x, y, cost });
      continue;
    }
    if (!isOccupied(state, x, y)) {
      result.push({ x, y, cost });
    }
  }
  return result;
}

export function canMoveTo(state: BattleState, unitId: string, x: number, y: number): boolean {
  return calcMovementRange(state, unitId).some((t) => t.x === x && t.y === y);
}
