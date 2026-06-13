import type { WeaponType } from "../schemas/weapon.js";

export type RngMode = "single" | "average";

export interface TriangleBonus {
  might: number;
  hit: number;
}

export interface BattleConfig {
  doubleAttackThreshold: number;
  minDamage: number;
  critMultiplier: number;
  hitRateClamp: { min: number; max: number };
  critRateClamp: { min: number; max: number };
  triangleEnabled: boolean;
  triangleAdvantage: TriangleBonus;
  triangleDisadvantage: TriangleBonus;
  rngMode: RngMode;
  killExpBase: number;
  expPerLevel: number;
  fortHealAmount: number;
}

export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  doubleAttackThreshold: 4,
  minDamage: 0,
  critMultiplier: 3,
  hitRateClamp: { min: 0, max: 100 },
  critRateClamp: { min: 0, max: 100 },
  triangleEnabled: true,
  triangleAdvantage: { might: 1, hit: 15 },
  triangleDisadvantage: { might: -1, hit: -15 },
  rngMode: "single",
  killExpBase: 40,
  expPerLevel: 100,
  fortHealAmount: 10,
};

/** 剣>斧>槍>剣。弓・魔法は中立(0)。 */
export function getTriangleAdvantage(
  attacker: WeaponType,
  defender: WeaponType,
): -1 | 0 | 1 {
  if (attacker === defender) return 0;
  if (attacker === "bow" || attacker === "magic" || defender === "bow" || defender === "magic") {
    return 0;
  }
  const beats: Record<string, WeaponType> = {
    sword: "axe",
    axe: "lance",
    lance: "sword",
  };
  if (beats[attacker] === defender) return 1;
  if (beats[defender] === attacker) return -1;
  return 0;
}

export function isMagicalWeapon(weaponType: WeaponType): boolean {
  return weaponType === "magic";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
