import { describe, expect, it } from "vitest";
import {
  DEFAULT_BATTLE_CONFIG,
  PluginManifestSchema,
  TerrainSchema,
  WeaponSchema,
  mergeCombatHooks,
  previewCombat,
} from "@srpg/shared";
import type { BattleUnit } from "@srpg/shared";
import { compilePluginManifest } from "../src/compile.js";
import { createPluginRegistryFromProject } from "../src/registry.js";

const sword = WeaponSchema.parse({
  id: "wpn_iron_sword",
  name: "鉄の剣",
  weaponType: "sword",
  might: 5,
  hit: 90,
  crit: 0,
  rangeMin: 1,
  rangeMax: 1,
  weight: 5,
  durability: 40,
  effectiveTags: [],
});

const axe = WeaponSchema.parse({
  id: "wpn_iron_axe",
  name: "鉄の斧",
  weaponType: "axe",
  might: 8,
  hit: 75,
  crit: 0,
  rangeMin: 1,
  rangeMax: 1,
  weight: 10,
  durability: 40,
  effectiveTags: [],
});

const plain = TerrainSchema.parse({
  id: "terrain_plain",
  name: "平地",
  moveCosts: { infantry: 1, cavalry: 1, flying: 1, armored: 1 },
});

function makeUnit(partial: Partial<BattleUnit> & Pick<BattleUnit, "instanceId" | "ref">): BattleUnit {
  return {
    name: partial.ref,
    classId: "class_lord",
    level: 1,
    exp: 0,
    stats: { hp: 20, str: 7, mag: 0, skl: 6, spd: 7, lck: 5, def: 5, res: 2, mov: 5 },
    maxHp: 20,
    hp: 20,
    x: 0,
    y: 0,
    faction: "player",
    equip: { weaponId: sword.id, durability: 40 },
    inventory: [],
    skills: [],
    isBoss: false,
    hasActed: false,
    hasMoved: false,
    ...partial,
  };
}

describe("plugin-api", () => {
  it("compilePluginManifest adds sword damage bonus", () => {
    const manifest = PluginManifestSchema.parse({
      id: "plugin_sword_bonus",
      name: "剣ボーナス",
      version: "1.0.0",
      rules: [{ hook: "damage", when: { attackerWeaponType: "sword" }, add: 2 }],
    });
    const hooks = compilePluginManifest(manifest);
    const attacker = makeUnit({ instanceId: "a", ref: "unit_alm" });
    const defender = makeUnit({ instanceId: "d", ref: "unit_brigand", x: 1, y: 0 });

    const withHook = previewCombat(
      attacker,
      defender,
      sword,
      axe,
      plain,
      DEFAULT_BATTLE_CONFIG,
      hooks,
    );
    const base = previewCombat(attacker, defender, sword, axe, plain, DEFAULT_BATTLE_CONFIG);
    expect(withHook.damage).toBe(base.damage + 2);
  });

  it("createPluginRegistryFromProject respects enabledPlugins", () => {
    const manifest = PluginManifestSchema.parse({
      id: "plugin_sword_bonus",
      name: "剣ボーナス",
      version: "1.0.0",
      rules: [{ hook: "damage", when: { attackerWeaponType: "sword" }, add: 1 }],
    });
    const enabled = createPluginRegistryFromProject({
      plugins: { [manifest.id]: manifest },
      enabledPlugins: [manifest.id],
    });
    const disabled = createPluginRegistryFromProject({
      plugins: { [manifest.id]: manifest },
      enabledPlugins: [],
    });
    expect(Object.keys(enabled.combatHooks)).not.toHaveLength(0);
    expect(Object.keys(disabled.combatHooks)).toHaveLength(0);
  });

  it("mergeCombatHooks chains multiple plugins deterministically", () => {
    const hooks = mergeCombatHooks(
      compilePluginManifest(
        PluginManifestSchema.parse({
          id: "p1",
          name: "p1",
          version: "1.0.0",
          rules: [{ hook: "damage", when: {}, add: 1 }],
        }),
      ),
      compilePluginManifest(
        PluginManifestSchema.parse({
          id: "p2",
          name: "p2",
          version: "1.0.0",
          rules: [{ hook: "damage", when: {}, add: 2 }],
        }),
      ),
    );
    const attacker = makeUnit({ instanceId: "a", ref: "unit_alm" });
    const defender = makeUnit({ instanceId: "d", ref: "unit_brigand", x: 1, y: 0 });
    const base = previewCombat(attacker, defender, sword, axe, plain, DEFAULT_BATTLE_CONFIG);
    const modified = previewCombat(
      attacker,
      defender,
      sword,
      axe,
      plain,
      DEFAULT_BATTLE_CONFIG,
      hooks,
    );
    expect(modified.damage).toBe(base.damage + 3);
  });
});
