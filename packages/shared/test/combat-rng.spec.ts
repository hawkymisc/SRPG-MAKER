import { describe, expect, it } from "vitest";
import { createRng } from "../src/rng.js";
import { resolveStrike } from "../src/battle/combat.js";
import { DEFAULT_BATTLE_CONFIG } from "../src/battle/config.js";
import { makeUnit, sampleDatabase } from "./fixtures/battle.js";

describe("resolveStrike rngMode", () => {
  it("average mode consumes two rolls per check", () => {
    const attacker = makeUnit({ instanceId: "a", ref: "unit_alm" });
    const defender = makeUnit({
      instanceId: "d",
      ref: "unit_brigand",
      faction: "enemy",
      equip: { weaponId: "wpn_iron_axe", durability: 40 },
      stats: { hp: 24, str: 8, mag: 0, skl: 4, spd: 5, lck: 2, def: 4, res: 0, mov: 5 },
    });
    const rng = createRng(42);
    const cfg = { ...DEFAULT_BATTLE_CONFIG, rngMode: "average" as const };
    resolveStrike(
      attacker,
      defender,
      sampleDatabase.weapons.wpn_iron_sword!,
      sampleDatabase.weapons.wpn_iron_axe!,
      sampleDatabase.terrain.terrain_plain!,
      cfg,
      rng,
    );
    expect(rng.consumed()).toBeGreaterThanOrEqual(2);
  });
});
