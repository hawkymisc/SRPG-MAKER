import type { Rng } from "../rng.js";
import type { BattleAction, BattleState, BattleUnit } from "../battle/types.js";
import { getAttackableTargets } from "../battle/range.js";
import {
  enemiesInAttackRange,
  evaluateAttack,
  findBestAttackTarget,
  findBestMoveToward,
  getEnemies,
  getWeaponForUnit,
} from "./evaluate.js";

export function decideAction(
  state: BattleState,
  unitId: string,
  rng: Rng,
): BattleAction {
  void rng;
  const unit = state.units.find((u) => u.instanceId === unitId);
  if (!unit || unit.hp <= 0 || unit.hasActed) {
    return { type: "Wait", actor: unitId };
  }

  const weapon = getWeaponForUnit(state, unit);
  const aiType = unit.aiType ?? "charge";

  switch (aiType) {
    case "ambush":
      return decideAmbush(state, unit, weapon);
    case "guard":
      return decideGuard(state, unit, weapon);
    case "move_only":
      return decideMoveOnly(state, unit);
    case "charge":
    default:
      return decideCharge(state, unit, weapon);
  }
}

function decideAmbush(
  state: BattleState,
  unit: BattleUnit,
  weapon: ReturnType<typeof getWeaponForUnit>,
): BattleAction {
  if (!weapon) return { type: "Wait", actor: unit.instanceId };
  const inRange = enemiesInAttackRange(state, unit);
  const target = findBestAttackTarget(state, unit, weapon, inRange);
  if (target) {
    return { type: "Attack", actor: unit.instanceId, target: target.instanceId };
  }
  return { type: "Wait", actor: unit.instanceId };
}

function decideGuard(
  state: BattleState,
  unit: BattleUnit,
  weapon: ReturnType<typeof getWeaponForUnit>,
): BattleAction {
  if (!weapon) return { type: "Wait", actor: unit.instanceId };
  const gx = unit.guardX ?? unit.x;
  const gy = unit.guardY ?? unit.y;
  if (unit.x !== gx || unit.y !== gy) {
    return { type: "Wait", actor: unit.instanceId };
  }
  const inRange = enemiesInAttackRange(state, unit);
  const target = findBestAttackTarget(state, unit, weapon, inRange);
  if (target) {
    return { type: "Attack", actor: unit.instanceId, target: target.instanceId };
  }
  return { type: "Wait", actor: unit.instanceId };
}

function decideMoveOnly(state: BattleState, unit: BattleUnit): BattleAction {
  const tx = unit.moveTargetX ?? unit.x;
  const ty = unit.moveTargetY ?? unit.y;
  if (unit.x === tx && unit.y === ty) {
    return { type: "Wait", actor: unit.instanceId };
  }
  const dest = findBestMoveToward(state, unit.instanceId, tx, ty);
  if (dest) {
    return { type: "Move", actor: unit.instanceId, x: dest.x, y: dest.y };
  }
  return { type: "Wait", actor: unit.instanceId };
}

function decideCharge(
  state: BattleState,
  unit: BattleUnit,
  weapon: ReturnType<typeof getWeaponForUnit>,
): BattleAction {
  if (!weapon) return { type: "Wait", actor: unit.instanceId };

  const targets = getAttackableTargets(state, unit.instanceId);
  if (targets.length > 0) {
    const enemies = state.units.filter((u) => targets.some((t) => t.unitId === u.instanceId));
    const target = findBestAttackTarget(state, unit, weapon, enemies);
    if (target) {
      return { type: "Attack", actor: unit.instanceId, target: target.instanceId };
    }
  }

  const enemies = getEnemies(state, unit.faction);
  if (enemies.length === 0) return { type: "Wait", actor: unit.instanceId };

  let bestEnemy = enemies[0]!;
  let bestScore = -Infinity;
  for (const e of enemies) {
    const score = evaluateAttack(state, unit, e, weapon);
    if (score > bestScore) {
      bestScore = score;
      bestEnemy = e;
    }
  }

  const dest = findBestMoveToward(state, unit.instanceId, bestEnemy.x, bestEnemy.y);
  if (dest && !unit.hasMoved) {
    return { type: "Move", actor: unit.instanceId, x: dest.x, y: dest.y };
  }

  return { type: "Wait", actor: unit.instanceId };
}
