import { previewCombat } from "../battle/combat.js";
import { getTerrainAt } from "../battle/movement.js";
import { calcMovementRange } from "../battle/movement.js";
import { getEnemiesInRange } from "../battle/range.js";
import type { BattleState, BattleUnit } from "../battle/types.js";
import type { Weapon } from "../schemas/weapon.js";

export function evaluateAttack(
  state: BattleState,
  attacker: BattleUnit,
  defender: BattleUnit,
  weapon: Weapon,
): number {
  const defenderWeapon = defender.equip
    ? state.context.database.weapons[defender.equip.weaponId] ?? null
    : null;
  const terrain = getTerrainAt(state, defender.x, defender.y);
  const preview = previewCombat(
    attacker,
    defender,
    weapon,
    defenderWeapon,
    terrain,
    state.context.config,
  );
  const killBonus = preview.damage >= defender.hp ? 50 : 0;
  const counter = estimateCounterDamage(state, defender, attacker);
  return (preview.damage * preview.hitRate) / 100 + killBonus - counter;
}

function estimateCounterDamage(
  state: BattleState,
  defender: BattleUnit,
  attacker: BattleUnit,
): number {
  if (!defender.equip || defender.equip.durability <= 0) return 0;
  const weapon = state.context.database.weapons[defender.equip.weaponId];
  if (!weapon) return 0;
  const attackerWeapon = attacker.equip
    ? state.context.database.weapons[attacker.equip.weaponId] ?? null
    : null;
  const terrain = getTerrainAt(state, attacker.x, attacker.y);
  const preview = previewCombat(
    defender,
    attacker,
    weapon,
    attackerWeapon,
    terrain,
    state.context.config,
  );
  return (preview.damage * preview.hitRate) / 100;
}

export function findBestAttackTarget(
  state: BattleState,
  actor: BattleUnit,
  weapon: Weapon,
  candidates: BattleUnit[],
): BattleUnit | null {
  let best: BattleUnit | null = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const score = evaluateAttack(state, actor, c, weapon);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

export function findBestMoveToward(
  state: BattleState,
  unitId: string,
  targetX: number,
  targetY: number,
): { x: number; y: number } | null {
  const unit = state.units.find((u) => u.instanceId === unitId);
  if (!unit) return null;
  const reachable = calcMovementRange(state, unitId);
  let best: { x: number; y: number } | null = null;
  let bestDist = Infinity;
  for (const tile of reachable) {
    if (tile.x === unit.x && tile.y === unit.y) continue;
    const dist = Math.abs(tile.x - targetX) + Math.abs(tile.y - targetY);
    if (dist < bestDist) {
      bestDist = dist;
      best = { x: tile.x, y: tile.y };
    }
  }
  return best;
}

export function getWeaponForUnit(state: BattleState, unit: BattleUnit): Weapon | null {
  if (!unit.equip || unit.equip.durability <= 0) return null;
  return state.context.database.weapons[unit.equip.weaponId] ?? null;
}

export function getEnemies(state: BattleState, faction: BattleUnit["faction"]): BattleUnit[] {
  return state.units.filter((u) => u.hp > 0 && u.faction !== faction);
}

export function enemiesInAttackRange(state: BattleState, actor: BattleUnit): BattleUnit[] {
  const weapon = getWeaponForUnit(state, actor);
  if (!weapon) return [];
  return getEnemiesInRange(state, actor, weapon);
}
