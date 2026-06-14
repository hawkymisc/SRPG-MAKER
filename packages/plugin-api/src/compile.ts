import type { CombatHookContext, CombatHooks } from "@srpg/shared";
import type { CombatRule, CombatRuleWhen, PluginManifest } from "@srpg/shared";

function matchesWhen(ctx: CombatHookContext, when: CombatRuleWhen): boolean {
  if (when.attackerWeaponType && ctx.attackerWeapon.weaponType !== when.attackerWeaponType) {
    return false;
  }
  if (when.defenderWeaponType) {
    if (!ctx.defenderWeapon || ctx.defenderWeapon.weaponType !== when.defenderWeaponType) {
      return false;
    }
  }
  if (when.attackerFaction && ctx.attacker.faction !== when.attackerFaction) {
    return false;
  }
  return true;
}

function compileRule(rule: CombatRule): NonNullable<CombatHooks[keyof CombatHooks]> {
  return (ctx, value) => {
    if (!matchesWhen(ctx, rule.when)) {
      return value;
    }
    let next = value;
    if (rule.add !== undefined) {
      next += rule.add;
    }
    if (rule.multiply !== undefined) {
      next = Math.floor(next * rule.multiply);
    }
    return next;
  };
}

/** Compile declarative manifest rules into shared CombatHooks. */
export function compilePluginManifest(manifest: PluginManifest): CombatHooks {
  const hooks: CombatHooks = {};
  for (const rule of manifest.rules) {
    const fn = compileRule(rule);
    const existing = hooks[rule.hook];
    hooks[rule.hook] = existing ? (ctx, value) => fn(ctx, existing(ctx, value)) : fn;
  }
  return hooks;
}
