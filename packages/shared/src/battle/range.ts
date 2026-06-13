import type { Weapon } from "../schemas/weapon.js";
import { isInWeaponRange, manhattanDistance } from "./combat.js";
import type { BattleState, BattleUnit } from "./types.js";

export interface AttackTarget {
  unitId: string;
  x: number;
  y: number;
  distance: number;
}

export function calcAttackRange(
  ax: number,
  ay: number,
  weapon: Weapon,
  mapWidth: number,
  mapHeight: number,
): Array<{ x: number; y: number }> {
  const tiles: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      if (isInWeaponRange(ax, ay, x, y, weapon)) {
        tiles.push({ x, y });
      }
    }
  }
  return tiles;
}

export function getAttackableTargets(
  state: BattleState,
  actorId: string,
): AttackTarget[] {
  const actor = state.units.find((u) => u.instanceId === actorId);
  if (!actor || actor.hp <= 0 || !actor.equip) return [];
  const weapon = state.context.database.weapons[actor.equip.weaponId];
  if (!weapon || actor.equip.durability <= 0) return [];

  const targets: AttackTarget[] = [];
  for (const unit of state.units) {
    if (unit.hp <= 0 || unit.instanceId === actorId) continue;
    if (unit.faction === actor.faction) continue;
    const dist = manhattanDistance(actor.x, actor.y, unit.x, unit.y);
    if (isInWeaponRange(actor.x, actor.y, unit.x, unit.y, weapon)) {
      targets.push({ unitId: unit.instanceId, x: unit.x, y: unit.y, distance: dist });
    }
  }
  return targets;
}

export function getEnemiesInRange(
  state: BattleState,
  actor: BattleUnit,
  weapon: Weapon,
): BattleUnit[] {
  return state.units.filter(
    (u) =>
      u.hp > 0 &&
      u.faction !== actor.faction &&
      isInWeaponRange(actor.x, actor.y, u.x, u.y, weapon),
  );
}
