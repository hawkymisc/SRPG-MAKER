import type { PlacementInput } from "../../src/battle/setup.js";
import type { BattleDatabase, BattleState, BattleUnit } from "../../src/battle/types.js";
import { DEFAULT_BATTLE_CONFIG } from "../../src/battle/config.js";
import {
  ClassSchema,
  ItemSchema,
  MapSchema,
  TerrainSchema,
  UnitSchema,
  WeaponSchema,
} from "../../src/schemas/index.js";
import { I, U, W } from "../helpers/ids.js";

export const sampleDatabase: BattleDatabase = {
  units: {
    unit_alm: UnitSchema.parse({
      id: "unit_alm",
      name: "アルム",
      classId: "class_lord",
      level: 1,
      stats: { hp: 20, str: 7, mag: 0, skl: 6, spd: 7, lck: 5, def: 5, res: 2, mov: 5 },
      growth: { hp: 60, str: 45, mag: 5, skl: 50, spd: 50, lck: 40, def: 35, res: 20 },
      items: ["wpn_iron_sword", "itm_vulnerary"],
      skills: [],
    }),
    unit_brigand: UnitSchema.parse({
      id: "unit_brigand",
      name: "山賊",
      classId: "class_brigand",
      level: 1,
      stats: { hp: 24, str: 8, mag: 0, skl: 4, spd: 5, lck: 2, def: 4, res: 0, mov: 5 },
      growth: { hp: 80, str: 55, mag: 0, skl: 25, spd: 30, lck: 15, def: 30, res: 5 },
      items: ["wpn_iron_axe"],
      skills: [],
    }),
  },
  classes: {
    class_lord: ClassSchema.parse({
      id: "class_lord",
      name: "ロード",
      moveType: "infantry",
      baseStats: { hp: 20, str: 7, mag: 0, skl: 6, spd: 7, lck: 5, def: 5, res: 2, mov: 5 },
      weaponAffinity: ["sword"],
    }),
    class_brigand: ClassSchema.parse({
      id: "class_brigand",
      name: "山賊",
      moveType: "infantry",
      baseStats: { hp: 24, str: 9, mag: 0, skl: 4, spd: 6, lck: 2, def: 4, res: 0, mov: 5 },
      weaponAffinity: ["axe"],
    }),
  },
  weapons: {
    wpn_iron_sword: WeaponSchema.parse({
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
    }),
    wpn_iron_axe: WeaponSchema.parse({
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
    }),
    wpn_steel_sword: WeaponSchema.parse({
      id: "wpn_steel_sword",
      name: "鋼の剣",
      weaponType: "sword",
      might: 8,
      hit: 85,
      crit: 50,
      rangeMin: 1,
      rangeMax: 1,
      weight: 6,
      durability: 50,
      effectiveTags: [],
    }),
    wpn_wind: WeaponSchema.parse({
      id: "wpn_wind",
      name: "ウインド",
      weaponType: "magic",
      might: 5,
      hit: 90,
      crit: 0,
      rangeMin: 1,
      rangeMax: 2,
      weight: 0,
      durability: 30,
      effectiveTags: [],
    }),
  },
  items: {
    itm_vulnerary: ItemSchema.parse({
      id: "itm_vulnerary",
      name: "傷薬",
      uses: 3,
      effect: { type: "heal", amount: 10 },
    }),
  },
  skills: {},
  terrain: {
    terrain_plain: TerrainSchema.parse({
      id: "terrain_plain",
      name: "平地",
      moveCosts: { infantry: 1, cavalry: 1, flying: 1, armored: 1 },
    }),
    terrain_forest: TerrainSchema.parse({
      id: "terrain_forest",
      name: "森",
      moveCosts: { infantry: 2, cavalry: 3, flying: 1, armored: 3 },
      avoidBonus: 20,
      defBonus: 1,
    }),
    terrain_fort: TerrainSchema.parse({
      id: "terrain_fort",
      name: "砦",
      moveCosts: { infantry: 1, cavalry: 1, flying: 1, armored: 1 },
      avoidBonus: 10,
      defBonus: 3,
      healPerTurn: 10,
    }),
    terrain_wall: TerrainSchema.parse({
      id: "terrain_wall",
      name: "壁",
      moveCosts: { infantry: 99, cavalry: 99, flying: 1, armored: 99 },
      impassable: true,
    }),
  },
};

export const plainMap10 = MapSchema.parse({
  id: "map_test10",
  name: "test",
  width: 10,
  height: 10,
  layers: { bottom: Array.from({ length: 100 }, () => "terrain_plain") },
  winCondition: { type: "defeat_all_enemies" },
});

export function makeUnit(overrides: Partial<BattleUnit> & Pick<BattleUnit, "instanceId" | "ref">): BattleUnit {
  return {
    name: overrides.ref,
    classId: "class_lord",
    level: 1,
    exp: 0,
    stats: { hp: 20, str: 7, mag: 0, skl: 6, spd: 7, lck: 5, def: 5, res: 2, mov: 5 },
    maxHp: 20,
    hp: 20,
    x: 0,
    y: 0,
    faction: "player",
    equip: { weaponId: "wpn_iron_sword", durability: 40 },
    inventory: [],
    skills: [],
    isBoss: false,
    hasActed: false,
    hasMoved: false,
    ...overrides,
  };
}

export function placement(
  ref: string,
  x: number,
  y: number,
  faction: "player" | "enemy" | "third",
  extra: Record<string, unknown> = {},
): PlacementInput {
  return { ref: U(ref), x, y, faction, isBoss: false, ...extra } as PlacementInput;
}

export function equip(id: string) {
  return W(id);
}

export function item(id: string) {
  return I(id);
}

export function makeState(units: BattleUnit[], map = plainMap10): BattleState {
  return {
    turn: 1,
    phase: "player",
    units,
    variables: {},
    switches: {},
    outcome: "ongoing",
    log: [],
    context: {
      config: DEFAULT_BATTLE_CONFIG,
      map,
      database: sampleDatabase,
    },
  };
}
