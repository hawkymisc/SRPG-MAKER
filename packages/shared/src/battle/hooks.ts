import type { BattleConfig } from "./config.js";
import type { BattleUnit } from "./types.js";
import type { Terrain } from "../schemas/terrain.js";
import type { Weapon } from "../schemas/weapon.js";

export interface CombatHookContext {
  attacker: BattleUnit;
  defender: BattleUnit;
  attackerWeapon: Weapon;
  defenderWeapon: Weapon | null;
  terrain: Terrain | undefined;
  config: BattleConfig;
}

export type CombatHookFn = (ctx: CombatHookContext, value: number) => number;

export interface CombatHooks {
  attackPower?: CombatHookFn;
  hitRate?: CombatHookFn;
  critRate?: CombatHookFn;
  damage?: CombatHookFn;
}

const HOOK_KEYS: Array<keyof CombatHooks> = ["attackPower", "hitRate", "critRate", "damage"];

export function mergeCombatHooks(...sources: (CombatHooks | undefined)[]): CombatHooks {
  const merged: CombatHooks = {};
  for (const key of HOOK_KEYS) {
    const fns = sources.map((source) => source?.[key]).filter((fn): fn is CombatHookFn => fn !== undefined);
    if (fns.length === 0) {
      continue;
    }
    merged[key] = (ctx, value) => fns.reduce((current, fn) => fn(ctx, current), value);
  }
  return merged;
}

export function applyCombatHook(
  hooks: CombatHooks | undefined,
  key: keyof CombatHooks,
  ctx: CombatHookContext,
  value: number,
): number {
  return hooks?.[key]?.(ctx, value) ?? value;
}
