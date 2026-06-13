import type { Rng } from "../rng.js";
import type { Terrain } from "../schemas/terrain.js";
import type { Weapon } from "../schemas/weapon.js";
import {
  clamp,
  getTriangleAdvantage,
  isMagicalWeapon,
  type BattleConfig,
} from "./config.js";
import type { BattleUnit, StrikeResult } from "./types.js";

export interface CombatPreview {
  attackPower: number;
  hitRate: number;
  critRate: number;
  damage: number;
}

export function calcHitRate(
  attacker: BattleUnit,
  defender: BattleUnit,
  attackerWeapon: Weapon,
  defenderWeapon: Weapon | null,
  terrain: Terrain | undefined,
  config: BattleConfig,
): number {
  let triangleHit = 0;
  if (config.triangleEnabled && defenderWeapon) {
    const adv = getTriangleAdvantage(attackerWeapon.weaponType, defenderWeapon.weaponType);
    if (adv > 0) triangleHit = config.triangleAdvantage.hit;
    else if (adv < 0) triangleHit = config.triangleDisadvantage.hit;
  }
  const hit =
    attacker.stats.skl * 2 + attacker.stats.lck / 2 + attackerWeapon.hit + triangleHit;
  const avoid = defender.stats.spd * 2 + defender.stats.lck + (terrain?.avoidBonus ?? 0);
  return clamp(hit - avoid, config.hitRateClamp.min, config.hitRateClamp.max);
}

export function calcCritRate(
  attacker: BattleUnit,
  defender: BattleUnit,
  attackerWeapon: Weapon,
  config: BattleConfig,
): number {
  const crit = attacker.stats.skl / 2 + attackerWeapon.crit - defender.stats.lck;
  return clamp(crit, config.critRateClamp.min, config.critRateClamp.max);
}

export function calcAttackPower(
  attacker: BattleUnit,
  attackerWeapon: Weapon,
  defenderWeapon: Weapon | null,
  config: BattleConfig,
): number {
  const baseStat = isMagicalWeapon(attackerWeapon.weaponType)
    ? attacker.stats.mag
    : attacker.stats.str;
  let triangleMight = 0;
  if (config.triangleEnabled && defenderWeapon) {
    const adv = getTriangleAdvantage(attackerWeapon.weaponType, defenderWeapon.weaponType);
    if (adv > 0) triangleMight = config.triangleAdvantage.might;
    else if (adv < 0) triangleMight = config.triangleDisadvantage.might;
  }
  return baseStat + attackerWeapon.might + triangleMight;
}

export function calcDamage(
  attackPower: number,
  defender: BattleUnit,
  attackerWeapon: Weapon,
  terrain: Terrain | undefined,
  config: BattleConfig,
): number {
  const defense = isMagicalWeapon(attackerWeapon.weaponType)
    ? defender.stats.res
    : defender.stats.def;
  const terrainDef = terrain?.defBonus ?? 0;
  return Math.max(config.minDamage, attackPower - defense - terrainDef);
}

export function previewCombat(
  attacker: BattleUnit,
  defender: BattleUnit,
  attackerWeapon: Weapon,
  defenderWeapon: Weapon | null,
  terrain: Terrain | undefined,
  config: BattleConfig,
): CombatPreview {
  const attackPower = calcAttackPower(attacker, attackerWeapon, defenderWeapon, config);
  const hitRate = calcHitRate(attacker, defender, attackerWeapon, defenderWeapon, terrain, config);
  const critRate = calcCritRate(attacker, defender, attackerWeapon, config);
  const damage = calcDamage(attackPower, defender, attackerWeapon, terrain, config);
  return { attackPower, hitRate, critRate, damage };
}

function rollChance(rng: Rng, rate: number, config: BattleConfig): { success: boolean; roll: number } {
  if (config.rngMode === "average") {
    const r1 = rng.next();
    const r2 = rng.next();
    const roll = (r1 + r2) / 2;
    return { success: roll * 100 < rate, roll };
  }
  const roll = rng.next();
  return { success: roll * 100 < rate, roll };
}

export function resolveStrike(
  attacker: BattleUnit,
  defender: BattleUnit,
  attackerWeapon: Weapon,
  defenderWeapon: Weapon | null,
  terrain: Terrain | undefined,
  config: BattleConfig,
  rng: Rng,
): StrikeResult {
  const attackPower = calcAttackPower(attacker, attackerWeapon, defenderWeapon, config);
  const hitRate = calcHitRate(attacker, defender, attackerWeapon, defenderWeapon, terrain, config);
  const critRate = calcCritRate(attacker, defender, attackerWeapon, config);
  const baseDamage = calcDamage(attackPower, defender, attackerWeapon, terrain, config);

  const hitCheck = rollChance(rng, hitRate, config);
  if (!hitCheck.success) {
    return {
      hit: false,
      crit: false,
      damage: 0,
      hitRoll: hitCheck.roll,
      hitRate,
      critRate,
      attackPower,
    };
  }

  const critCheck = rollChance(rng, critRate, config);
  const damage = critCheck.success ? baseDamage * config.critMultiplier : baseDamage;
  return {
    hit: true,
    crit: critCheck.success,
    damage,
    hitRoll: hitCheck.roll,
    critRoll: critCheck.roll,
    hitRate,
    critRate,
    attackPower,
  };
}

export function canDoubleAttack(attacker: BattleUnit, defender: BattleUnit, config: BattleConfig): boolean {
  return attacker.stats.spd - defender.stats.spd >= config.doubleAttackThreshold;
}

export function manhattanDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function isInWeaponRange(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  weapon: Weapon,
): boolean {
  const dist = manhattanDistance(ax, ay, bx, by);
  return dist >= weapon.rangeMin && dist <= weapon.rangeMax;
}
