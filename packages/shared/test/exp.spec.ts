import { describe, expect, it } from "vitest";
import { createRng } from "../src/rng.js";
import { applyExpGain, calcKillExp, expToNextLevel } from "../src/battle/exp.js";
import { DEFAULT_BATTLE_CONFIG } from "../src/battle/config.js";
import { makeUnit } from "./fixtures/battle.js";

describe("experience", () => {
  it("calcKillExp scales with defeated level", () => {
    const defeated = makeUnit({ instanceId: "d", ref: "unit_brigand", level: 3 });
    expect(calcKillExp(defeated, DEFAULT_BATTLE_CONFIG)).toBe(40 + 30);
  });

  it("expToNextLevel uses level multiplier", () => {
    expect(expToNextLevel(2, DEFAULT_BATTLE_CONFIG)).toBe(200);
  });

  it("applyExpGain levels up when threshold reached", () => {
    const unit = makeUnit({ instanceId: "a", ref: "unit_alm", exp: 90, level: 1 });
    const growth = {
      hp: 100,
      str: 100,
      mag: 0,
      skl: 0,
      spd: 0,
      lck: 0,
      def: 0,
      res: 0,
    };
    const { unit: next, logs } = applyExpGain(
      unit,
      20,
      growth,
      DEFAULT_BATTLE_CONFIG,
      createRng(1),
      1,
      "player",
    );
    expect(next.level).toBeGreaterThan(1);
    expect(logs.some((l) => l.kind === "level_up")).toBe(true);
  });
});
