import { describe, expect, it } from "vitest";
import { createInitialBattleState } from "@srpg/shared";
import { sampleDatabase } from "../../shared/test/fixtures/battle.js";
import { MapSchema } from "@srpg/shared";
import { BattleSession } from "../src/game/BattleSession.js";

const adjacentMap = MapSchema.parse({
  id: "map_test",
  name: "test",
  width: 10,
  height: 10,
  layers: { bottom: Array.from({ length: 100 }, () => "terrain_plain") },
  placements: [
    { ref: "unit_alm", x: 4, y: 4, faction: "player", equip: "wpn_iron_sword" },
    { ref: "unit_brigand", x: 5, y: 4, faction: "enemy", equip: "wpn_iron_axe", aiType: "charge" },
  ],
  reinforcements: [],
  winCondition: { type: "defeat_all_enemies" },
  loseCondition: { allPlayerDefeated: true },
});

describe("debug player invincible", () => {
  it("restores player HP after attack when invincible", () => {
    const state = createInitialBattleState({
      map: adjacentMap,
      database: sampleDatabase,
    });
    const player = state.units.find((u) => u.faction === "player")!;
    const enemy = state.units.find((u) => u.faction === "enemy")!;
    const session = new BattleSession(state, 42_001);
    const hpBefore = player.hp;

    session.apply(
      { type: "Attack", actor: enemy.instanceId, target: player.instanceId },
      { playerInvincible: true },
    );

    const hpAfter = session.state.units.find((u) => u.instanceId === player.instanceId)!.hp;
    expect(hpAfter).toBe(hpBefore);
    expect(session.state.outcome).not.toBe("lose");
  });
});
