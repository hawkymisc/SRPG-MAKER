import { describe, expect, it } from "vitest";
import {
  ClassSchema,
  ItemSchema,
  MapSchema,
  ProjectSchema,
  SCHEMA_VERSION,
  TerrainSchema,
  UnitSchema,
  createDefaultProject,
  createDefaultStats,
  createDefaultWeapon,
} from "../src/schemas/index.js";
import { W } from "./helpers/ids.js";

describe("schemas", () => {
  it("parses sample unit", () => {
    const unit = UnitSchema.parse({
      id: "unit_alm",
      name: "アルム",
      classId: "class_lord",
      level: 1,
      stats: createDefaultStats(),
      growth: { hp: 60, str: 45, mag: 5, skl: 50, spd: 50, lck: 40, def: 35, res: 20 },
      items: ["wpn_iron_sword"],
      skills: [],
    });
    expect(unit.id).toBe("unit_alm");
  });

  it("rejects invalid unit stats", () => {
    expect(() =>
      UnitSchema.parse({
        id: "bad",
        name: "x",
        classId: "class_lord",
        level: 1,
        stats: { hp: -1, str: 0, mag: 0, skl: 0, spd: 0, lck: 0, def: 0, res: 0, mov: 0 },
        growth: { hp: 0, str: 0, mag: 0, skl: 0, spd: 0, lck: 0, def: 0, res: 0 },
      }),
    ).toThrow();
  });

  it("parses weapon with defaults", () => {
    const w = createDefaultWeapon({ id: W("wpn_test"), name: "test" });
    expect(w.durability).toBe(40);
  });

  it("parses terrain move costs", () => {
    const t = TerrainSchema.parse({
      id: "terrain_plain",
      name: "平地",
      moveCosts: { infantry: 1, cavalry: 1, flying: 1, armored: 1 },
    });
    expect(t.avoidBonus).toBe(0);
  });

  it("parses 10x10 map", () => {
    const map = MapSchema.parse({
      id: "map_test",
      name: "test",
      width: 10,
      height: 10,
      layers: { bottom: Array.from({ length: 100 }, () => "terrain_plain") },
      winCondition: { type: "defeat_all_enemies" },
    });
    expect(map.layers.bottom).toHaveLength(100);
  });

  it("rejects map smaller than 10x10", () => {
    expect(() =>
      MapSchema.parse({
        id: "map_small",
        name: "small",
        width: 5,
        height: 5,
        layers: { bottom: Array.from({ length: 25 }, () => "terrain_plain") },
        winCondition: { type: "defeat_all_enemies" },
      }),
    ).toThrow();
  });

  it("parses item heal effect", () => {
    const item = ItemSchema.parse({
      id: "itm_vulnerary",
      name: "傷薬",
      uses: 3,
      effect: { type: "heal", amount: 10 },
    });
    expect(item.effect.type).toBe("heal");
  });

  it("parses class definition", () => {
    const cls = ClassSchema.parse({
      id: "class_lord",
      name: "ロード",
      moveType: "infantry",
      baseStats: createDefaultStats(),
    });
    expect(cls.moveType).toBe("infantry");
  });

  it("creates default project with schemaVersion 1", () => {
    const p = createDefaultProject("Test");
    expect(p.schemaVersion).toBe(SCHEMA_VERSION);
    expect(ProjectSchema.parse(p).name).toBe("Test");
  });
});
