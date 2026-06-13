import { describe, expect, it } from "vitest";
import { createRng } from "../src/rng.js";
import { resolveAction } from "../src/battle/resolve.js";
import { createInitialBattleState } from "../src/battle/setup.js";
import { equip, item, plainMap10, placement, sampleDatabase } from "./fixtures/battle.js";

describe("resolveAction", () => {
  it("moves unit within range", () => {
    const state = createInitialBattleState({
      map: plainMap10,
      database: sampleDatabase,
      placements: [placement("unit_alm", 1, 1, "player", { equip: equip("wpn_iron_sword") })],
    });
    const id = state.units[0]!.instanceId;
    const result = resolveAction(state, { type: "Move", actor: id, x: 2, y: 1 }, createRng(1));
    expect(result.state.units[0]!.x).toBe(2);
    expect(result.state.units[0]!.hasMoved).toBe(true);
  });

  it("attack reduces target hp deterministically", () => {
    const state = createInitialBattleState({
      map: plainMap10,
      database: sampleDatabase,
      placements: [
        placement("unit_alm", 2, 2, "player", { equip: equip("wpn_iron_sword") }),
        placement("unit_brigand", 3, 2, "enemy", { equip: equip("wpn_iron_axe") }),
      ],
    });
    const actor = state.units.find((u) => u.ref === "unit_alm")!.instanceId;
    const target = state.units.find((u) => u.ref === "unit_brigand")!.instanceId;
    const before = state.units.find((u) => u.instanceId === target)!.hp;
    const result = resolveAction(state, { type: "Attack", actor, target }, createRng(42));
    const after = result.state.units.find((u) => u.instanceId === target)!.hp;
    expect(after).toBeLessThanOrEqual(before);
  });

  it("weapon breaks at durability 0", () => {
    const state = createInitialBattleState({
      map: plainMap10,
      database: sampleDatabase,
      placements: [
        placement("unit_alm", 2, 2, "player", {
          equip: equip("wpn_iron_sword"),
          equipDurability: 1,
        }),
        placement("unit_brigand", 3, 2, "enemy", { equip: equip("wpn_iron_axe") }),
      ],
    });
    const actor = state.units.find((u) => u.ref === "unit_alm")!.instanceId;
    const target = state.units.find((u) => u.ref === "unit_brigand")!.instanceId;
    const result = resolveAction(state, { type: "Attack", actor, target }, createRng(42));
    const attacker = result.state.units.find((u) => u.instanceId === actor)!;
    expect(attacker.equip).toBeNull();
    expect(result.log.some((l) => l.kind === "weapon_break")).toBe(true);
  });

  it("end phase advances turn after third faction", () => {
    const state = createInitialBattleState({
      map: plainMap10,
      database: sampleDatabase,
      placements: [placement("unit_alm", 1, 1, "player", { equip: equip("wpn_iron_sword") })],
    });
    const rng = createRng(1);
    let s = state;
    s = resolveAction(s, { type: "EndPhase" }, rng).state;
    expect(s.phase).toBe("enemy");
    s = resolveAction(s, { type: "EndPhase" }, rng).state;
    expect(s.phase).toBe("third");
    s = resolveAction(s, { type: "EndPhase" }, rng).state;
    expect(s.turn).toBe(2);
    expect(s.phase).toBe("player");
  });

  it("use item heals target", () => {
    const state = createInitialBattleState({
      map: plainMap10,
      database: sampleDatabase,
      placements: [
        placement("unit_alm", 1, 1, "player", { equip: equip("wpn_iron_sword"), hp: 5 }),
      ],
    });
    const actor = state.units[0]!.instanceId;
    const result = resolveAction(
      state,
      { type: "UseItem", actor, itemId: item("itm_vulnerary") },
      createRng(1),
    );
    expect(result.state.units[0]!.hp).toBe(15);
  });
});
