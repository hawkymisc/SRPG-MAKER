import { describe, expect, it } from "vitest";
import { createRng } from "../src/rng.js";
import {
  calcAttackPower,
  calcCritRate,
  calcDamage,
  calcHitRate,
  canDoubleAttack,
  isInWeaponRange,
  previewCombat,
  resolveStrike,
} from "../src/battle/combat.js";
import {
  DEFAULT_BATTLE_CONFIG,
  getTriangleAdvantage,
  clamp,
  isMagicalWeapon,
} from "../src/battle/config.js";
import { makeUnit, sampleDatabase } from "./fixtures/battle.js";

const sword = sampleDatabase.weapons.wpn_iron_sword!;
const axe = sampleDatabase.weapons.wpn_iron_axe!;
const steel = sampleDatabase.weapons.wpn_steel_sword!;
const wind = sampleDatabase.weapons.wpn_wind!;
const plain = sampleDatabase.terrain.terrain_plain!;
const forest = sampleDatabase.terrain.terrain_forest!;

describe("weapon triangle", () => {
  it("sword beats axe", () => expect(getTriangleAdvantage("sword", "axe")).toBe(1));
  it("axe beats lance", () => expect(getTriangleAdvantage("axe", "lance")).toBe(1));
  it("lance beats sword", () => expect(getTriangleAdvantage("lance", "sword")).toBe(1));
  it("axe loses to sword", () => expect(getTriangleAdvantage("axe", "sword")).toBe(-1));
  it("bow is neutral", () => expect(getTriangleAdvantage("bow", "sword")).toBe(0));
  it("magic is neutral", () => expect(getTriangleAdvantage("magic", "axe")).toBe(0));
});

describe("calcAttackPower", () => {
  const attacker = makeUnit({ instanceId: "a", ref: "unit_alm", faction: "player" });

  it("uses str for physical weapons", () => {
    expect(calcAttackPower(attacker, sword, null, DEFAULT_BATTLE_CONFIG)).toBe(7 + 5);
  });

  it("uses mag for magic weapons", () => {
    const mage = makeUnit({
      instanceId: "m",
      ref: "mage",
      stats: { hp: 20, str: 2, mag: 10, skl: 6, spd: 7, lck: 5, def: 3, res: 8, mov: 5 },
    });
    expect(calcAttackPower(mage, wind, null, DEFAULT_BATTLE_CONFIG)).toBe(10 + 5);
  });

  it("adds triangle advantage might", () => {
    expect(calcAttackPower(attacker, sword, axe, DEFAULT_BATTLE_CONFIG)).toBe(13);
  });

  it("subtracts triangle disadvantage might", () => {
    const brig = makeUnit({
      instanceId: "b",
      ref: "unit_brigand",
      stats: { hp: 24, str: 8, mag: 0, skl: 4, spd: 5, lck: 2, def: 4, res: 0, mov: 5 },
      equip: { weaponId: "wpn_iron_axe", durability: 40 },
    });
    expect(calcAttackPower(brig, axe, sword, DEFAULT_BATTLE_CONFIG)).toBe(8 + 8 - 1);
  });

  it("ignores triangle when disabled", () => {
    const cfg = { ...DEFAULT_BATTLE_CONFIG, triangleEnabled: false };
    expect(calcAttackPower(attacker, sword, axe, cfg)).toBe(12);
  });
});

describe("calcDamage", () => {
  it("subtracts defense", () => {
    const defender = makeUnit({
      instanceId: "d",
      ref: "unit_brigand",
      stats: { hp: 20, str: 8, mag: 0, skl: 4, spd: 5, lck: 2, def: 4, res: 0, mov: 5 },
    });
    expect(calcDamage(12, defender, sword, plain, DEFAULT_BATTLE_CONFIG)).toBe(8);
  });

  it("applies terrain def bonus", () => {
    const defender = makeUnit({ instanceId: "d", ref: "unit_brigand", stats: { hp: 20, str: 8, mag: 0, skl: 4, spd: 5, lck: 2, def: 4, res: 0, mov: 5 } });
    expect(calcDamage(12, defender, sword, forest, DEFAULT_BATTLE_CONFIG)).toBe(7);
  });

  it("clamps to minDamage 0", () => {
    const tank = makeUnit({
      instanceId: "t",
      ref: "tank",
      stats: { hp: 30, str: 5, mag: 0, skl: 5, spd: 3, lck: 3, def: 20, res: 15, mov: 4 },
    });
    expect(calcDamage(5, tank, sword, forest, DEFAULT_BATTLE_CONFIG)).toBe(0);
  });

  it("uses res for magic attacks", () => {
    const defender = makeUnit({
      instanceId: "d",
      ref: "d",
      stats: { hp: 20, str: 5, mag: 0, skl: 5, spd: 5, lck: 3, def: 10, res: 3, mov: 5 },
    });
    expect(calcDamage(15, defender, wind, plain, DEFAULT_BATTLE_CONFIG)).toBe(12);
  });
});

describe("calcHitRate", () => {
  const attacker = makeUnit({ instanceId: "a", ref: "unit_alm" });
  const defender = makeUnit({
    instanceId: "d",
    ref: "unit_brigand",
    faction: "enemy",
    equip: { weaponId: "wpn_iron_axe", durability: 40 },
    stats: { hp: 24, str: 8, mag: 0, skl: 4, spd: 5, lck: 2, def: 4, res: 0, mov: 5 },
  });

  it("computes hit from skill and speed", () => {
    const rate = calcHitRate(attacker, defender, sword, axe, plain, DEFAULT_BATTLE_CONFIG);
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThanOrEqual(100);
  });

  it("reduces hit in forest", () => {
    const open = calcHitRate(attacker, defender, sword, axe, plain, DEFAULT_BATTLE_CONFIG);
    const woods = calcHitRate(attacker, defender, sword, axe, forest, DEFAULT_BATTLE_CONFIG);
    expect(woods).toBeLessThan(open);
  });

  it("clamps hit to 0 minimum", () => {
    const fast = makeUnit({
      instanceId: "f",
      ref: "fast",
      stats: { hp: 20, str: 5, mag: 0, skl: 20, spd: 30, lck: 30, def: 5, res: 5, mov: 8 },
    });
    const weak = makeUnit({
      instanceId: "w",
      ref: "weak",
      stats: { hp: 20, str: 1, mag: 0, skl: 1, spd: 1, lck: 1, def: 1, res: 1, mov: 5 },
      equip: { weaponId: "wpn_iron_sword", durability: 1 },
    });
    expect(calcHitRate(weak, fast, sword, sword, forest, DEFAULT_BATTLE_CONFIG)).toBe(0);
  });

  it("clamps hit to 100 maximum", () => {
    const sniper = makeUnit({
      instanceId: "s",
      ref: "sniper",
      stats: { hp: 20, str: 10, mag: 0, skl: 30, spd: 20, lck: 30, def: 5, res: 5, mov: 5 },
    });
    const slow = makeUnit({
      instanceId: "sl",
      ref: "slow",
      stats: { hp: 20, str: 5, mag: 0, skl: 1, spd: 1, lck: 1, def: 1, res: 1, mov: 3 },
      equip: null,
    });
    expect(calcHitRate(sniper, slow, steel, null, plain, DEFAULT_BATTLE_CONFIG)).toBe(100);
  });
});

describe("calcCritRate", () => {
  it("uses skill and weapon crit minus luck", () => {
    const attacker = makeUnit({ instanceId: "a", ref: "unit_alm" });
    const defender = makeUnit({
      instanceId: "d",
      ref: "unit_brigand",
      stats: { hp: 24, str: 8, mag: 0, skl: 4, spd: 5, lck: 2, def: 4, res: 0, mov: 5 },
    });
    expect(calcCritRate(attacker, defender, sword, DEFAULT_BATTLE_CONFIG)).toBe(1);
  });

  it("clamps crit to 0", () => {
    const attacker = makeUnit({ instanceId: "a", ref: "a", stats: { hp: 20, str: 5, mag: 0, skl: 2, spd: 5, lck: 1, def: 5, res: 2, mov: 5 } });
    const lucky = makeUnit({ instanceId: "l", ref: "l", stats: { hp: 20, str: 5, mag: 0, skl: 10, spd: 10, lck: 30, def: 5, res: 5, mov: 5 } });
    expect(calcCritRate(attacker, lucky, sword, DEFAULT_BATTLE_CONFIG)).toBe(0);
  });
});

describe("double attack", () => {
  it("triggers at threshold exactly", () => {
    const fast = makeUnit({ instanceId: "f", ref: "f", stats: { hp: 20, str: 7, mag: 0, skl: 6, spd: 10, lck: 5, def: 5, res: 2, mov: 5 } });
    const slow = makeUnit({ instanceId: "s", ref: "s", stats: { hp: 20, str: 7, mag: 0, skl: 6, spd: 6, lck: 5, def: 5, res: 2, mov: 5 } });
    expect(canDoubleAttack(fast, slow, DEFAULT_BATTLE_CONFIG)).toBe(true);
  });

  it("does not trigger below threshold", () => {
    const a = makeUnit({ instanceId: "a", ref: "a", stats: { hp: 20, str: 7, mag: 0, skl: 6, spd: 9, lck: 5, def: 5, res: 2, mov: 5 } });
    const b = makeUnit({ instanceId: "b", ref: "b", stats: { hp: 20, str: 7, mag: 0, skl: 6, spd: 6, lck: 5, def: 5, res: 2, mov: 5 } });
    expect(canDoubleAttack(a, b, DEFAULT_BATTLE_CONFIG)).toBe(false);
  });
});

describe("weapon range", () => {
  it("melee range 1 only adjacent", () => {
    expect(isInWeaponRange(0, 0, 1, 0, sword)).toBe(true);
    expect(isInWeaponRange(0, 0, 2, 0, sword)).toBe(false);
  });

  it("javelin range 1-2", () => {
    const javelin = { ...sword, rangeMin: 1, rangeMax: 2 };
    expect(isInWeaponRange(0, 0, 2, 0, javelin)).toBe(true);
    expect(isInWeaponRange(0, 0, 3, 0, javelin)).toBe(false);
  });
});

describe("resolveStrike determinism", () => {
  it("same seed produces same result", () => {
    const attacker = makeUnit({ instanceId: "a", ref: "unit_alm" });
    const defender = makeUnit({
      instanceId: "d",
      ref: "unit_brigand",
      faction: "enemy",
      equip: { weaponId: "wpn_iron_axe", durability: 40 },
      stats: { hp: 24, str: 8, mag: 0, skl: 4, spd: 5, lck: 2, def: 4, res: 0, mov: 5 },
    });
    const r1 = resolveStrike(attacker, defender, sword, axe, plain, DEFAULT_BATTLE_CONFIG, createRng(42));
    const r2 = resolveStrike(attacker, defender, sword, axe, plain, DEFAULT_BATTLE_CONFIG, createRng(42));
    expect(r1).toEqual(r2);
  });

  it("crit multiplies damage with seed 7 and steel sword", () => {
    const attacker = makeUnit({ instanceId: "a", ref: "unit_alm" });
    const defender = makeUnit({
      instanceId: "d",
      ref: "unit_brigand",
      faction: "enemy",
      equip: { weaponId: "wpn_iron_axe", durability: 40 },
      stats: { hp: 24, str: 8, mag: 0, skl: 4, spd: 5, lck: 2, def: 4, res: 0, mov: 5 },
    });
    const strike = resolveStrike(attacker, defender, steel, axe, plain, DEFAULT_BATTLE_CONFIG, createRng(7));
    expect(strike.crit).toBe(true);
    expect(strike.damage).toBeGreaterThan(0);
  });
});

describe("utilities", () => {
  it("clamp works", () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it("isMagicalWeapon identifies magic", () => {
    expect(isMagicalWeapon("magic")).toBe(true);
    expect(isMagicalWeapon("sword")).toBe(false);
  });

  it("previewCombat returns all fields", () => {
    const a = makeUnit({ instanceId: "a", ref: "unit_alm" });
    const d = makeUnit({ instanceId: "d", ref: "unit_brigand", faction: "enemy", equip: { weaponId: "wpn_iron_axe", durability: 40 } });
    const p = previewCombat(a, d, sword, axe, plain, DEFAULT_BATTLE_CONFIG);
    expect(p.damage).toBeGreaterThanOrEqual(0);
    expect(p.hitRate).toBeDefined();
    expect(p.critRate).toBeDefined();
  });
});
