import { describe, expect, it } from "vitest";
import { mergeCombatHooks } from "../src/battle/hooks.js";
import { PluginManifestSchema } from "../src/schemas/plugin.js";

describe("combat hooks", () => {
  it("mergeCombatHooks chains functions in order", () => {
    const hooks = mergeCombatHooks(
      { damage: (_ctx, value) => value + 1 },
      { damage: (_ctx, value) => value + 2 },
    );
    expect(hooks.damage?.({} as never, 5)).toBe(8);
  });
});

describe("plugin manifest schema", () => {
  it("parses declarative combat rules", () => {
    const manifest = PluginManifestSchema.parse({
      id: "plugin_sword_bonus",
      name: "剣ボーナス",
      version: "1.0.0",
      rules: [{ hook: "damage", when: { attackerWeaponType: "sword" }, add: 1 }],
    });
    expect(manifest.rules[0]?.hook).toBe("damage");
  });
});
