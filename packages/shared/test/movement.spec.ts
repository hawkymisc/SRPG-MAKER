import { describe, expect, it } from "vitest";
import { calcMovementRange, canMoveTo } from "../src/battle/movement.js";
import { calcAttackRange } from "../src/battle/range.js";
import { makeState, makeUnit, plainMap10, sampleDatabase } from "./fixtures/battle.js";
import { MapSchema } from "../src/schemas/map.js";
import { T } from "./helpers/ids.js";

function forestMap() {
  const bottom = Array.from({ length: 100 }, () => T("terrain_plain"));
  bottom[11] = T("terrain_forest");
  bottom[12] = T("terrain_forest");
  return MapSchema.parse({ ...plainMap10, layers: { bottom } });
}

describe("calcMovementRange", () => {
  it("includes start tile", () => {
    const unit = makeUnit({ instanceId: "u1", ref: "unit_alm", x: 1, y: 1 });
    const state = makeState([unit]);
    const range = calcMovementRange(state, "u1");
    expect(range.some((t) => t.x === 1 && t.y === 1)).toBe(true);
  });

  it("respects mov limit", () => {
    const unit = makeUnit({
      instanceId: "u1",
      ref: "unit_alm",
      x: 5,
      y: 5,
      stats: { hp: 20, str: 7, mag: 0, skl: 6, spd: 7, lck: 5, def: 5, res: 2, mov: 2 },
    });
    const state = makeState([unit]);
    const range = calcMovementRange(state, "u1");
    expect(range.every((t) => t.cost <= 2)).toBe(true);
    expect(range.some((t) => t.x === 8 && t.y === 5)).toBe(false);
  });

  it("blocks occupied tiles", () => {
    const u1 = makeUnit({ instanceId: "u1", ref: "unit_alm", x: 1, y: 1 });
    const u2 = makeUnit({ instanceId: "u2", ref: "unit_brigand", x: 2, y: 1, faction: "enemy" });
    const state = makeState([u1, u2]);
    const range = calcMovementRange(state, "u1");
    expect(range.some((t) => t.x === 2 && t.y === 1)).toBe(false);
  });

  it("applies forest movement cost", () => {
    const unit = makeUnit({
      instanceId: "u1",
      ref: "unit_alm",
      x: 1,
      y: 1,
      stats: { hp: 20, str: 7, mag: 0, skl: 6, spd: 7, lck: 5, def: 5, res: 2, mov: 3 },
    });
    const state = makeState([unit], forestMap());
    const range = calcMovementRange(state, "u1");
    const forestTile = range.find((t) => t.x === 2 && t.y === 1);
    expect(forestTile?.cost).toBe(2);
  });

  it("canMoveTo delegates to range", () => {
    const unit = makeUnit({ instanceId: "u1", ref: "unit_alm", x: 0, y: 0 });
    const state = makeState([unit]);
    expect(canMoveTo(state, "u1", 1, 0)).toBe(true);
    expect(canMoveTo(state, "u1", 9, 9)).toBe(false);
  });

  it("100x100 map completes within 50ms", () => {
    const bigMap = MapSchema.parse({
      ...plainMap10,
      width: 100,
      height: 100,
      layers: { bottom: Array.from({ length: 10000 }, () => T("terrain_plain")) },
    });
    const unit = makeUnit({ instanceId: "u1", ref: "unit_alm", x: 50, y: 50 });
    const state = makeState([unit], bigMap);
    const start = performance.now();
    calcMovementRange(state, "u1");
    expect(performance.now() - start).toBeLessThan(50);
  });
});

describe("calcAttackRange", () => {
  it("returns tiles within weapon range", () => {
    const weapon = sampleDatabase.weapons.wpn_iron_sword!;
    const tiles = calcAttackRange(5, 5, weapon, 10, 10);
    expect(tiles).toContainEqual({ x: 6, y: 5 });
    expect(tiles).not.toContainEqual({ x: 7, y: 5 });
  });
});
