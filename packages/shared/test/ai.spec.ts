import { describe, expect, it } from "vitest";
import { createRng } from "../src/rng.js";
import { decideAction } from "../src/ai/decide.js";
import { createInitialBattleState } from "../src/battle/setup.js";
import { equip, plainMap10, placement, sampleDatabase } from "./fixtures/battle.js";

describe("decideAction", () => {
  it("charge AI attacks when in range", () => {
    const state = createInitialBattleState({
      map: plainMap10,
      database: sampleDatabase,
      placements: [
        placement("unit_brigand", 2, 2, "enemy", { equip: equip("wpn_iron_axe"), aiType: "charge" }),
        placement("unit_alm", 3, 2, "player", { equip: equip("wpn_iron_sword") }),
      ],
    });
    const enemy = state.units.find((u) => u.faction === "enemy")!;
    const action = decideAction(state, enemy.instanceId, createRng(42));
    expect(action.type).toBe("Attack");
  });

  it("ambush AI waits when out of range", () => {
    const state = createInitialBattleState({
      map: plainMap10,
      database: sampleDatabase,
      placements: [
        placement("unit_brigand", 1, 1, "enemy", { equip: equip("wpn_iron_axe"), aiType: "ambush" }),
        placement("unit_alm", 8, 8, "player", { equip: equip("wpn_iron_sword") }),
      ],
    });
    const enemy = state.units.find((u) => u.faction === "enemy")!;
    expect(decideAction(state, enemy.instanceId, createRng(42)).type).toBe("Wait");
  });

  it("guard AI does not move from guard position", () => {
    const state = createInitialBattleState({
      map: plainMap10,
      database: sampleDatabase,
      placements: [
        placement("unit_brigand", 5, 5, "enemy", {
          equip: equip("wpn_iron_axe"),
          aiType: "guard",
          guardX: 5,
          guardY: 5,
        }),
        placement("unit_alm", 6, 5, "player", { equip: equip("wpn_iron_sword") }),
      ],
    });
    const enemy = state.units.find((u) => u.faction === "enemy")!;
    const action = decideAction(state, enemy.instanceId, createRng(42));
    expect(action.type === "Attack" || action.type === "Wait").toBe(true);
  });

  it("move_only AI moves toward target", () => {
    const state = createInitialBattleState({
      map: plainMap10,
      database: sampleDatabase,
      placements: [
        placement("unit_brigand", 1, 1, "enemy", {
          equip: equip("wpn_iron_axe"),
          aiType: "move_only",
          moveTargetX: 5,
          moveTargetY: 5,
        }),
      ],
    });
    const enemy = state.units.find((u) => u.faction === "enemy")!;
    const action = decideAction(state, enemy.instanceId, createRng(42));
    expect(action.type).toBe("Move");
  });

  it("same seed produces same AI decision", () => {
    const state = createInitialBattleState({
      map: plainMap10,
      database: sampleDatabase,
      placements: [
        placement("unit_brigand", 2, 2, "enemy", { equip: equip("wpn_iron_axe"), aiType: "charge" }),
        placement("unit_alm", 5, 5, "player", { equip: equip("wpn_iron_sword") }),
      ],
    });
    const enemy = state.units.find((u) => u.faction === "enemy")!;
    const a1 = decideAction(state, enemy.instanceId, createRng(99));
    const a2 = decideAction(state, enemy.instanceId, createRng(99));
    expect(a1).toEqual(a2);
  });
});
