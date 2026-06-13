import { describe, expect, it } from "vitest";
import {
  checkLoseCondition,
  checkWinCondition,
  evaluateOutcome,
} from "../src/battle/win-lose.js";
import { makeState, makeUnit, plainMap10 } from "./fixtures/battle.js";
import { MapSchema } from "../src/schemas/map.js";

describe("win/lose conditions", () => {
  it("defeat_all_enemies wins when no enemies remain", () => {
    const state = makeState([
      makeUnit({ instanceId: "p1", ref: "unit_alm", faction: "player" }),
    ]);
    expect(checkWinCondition(state)).toBe("win");
  });

  it("defeat_boss wins when boss is defeated", () => {
    const map = MapSchema.parse({
      ...plainMap10,
      winCondition: { type: "defeat_boss", bossRef: "unit_boss" },
    });
    const state = makeState(
      [
        makeUnit({ instanceId: "p1", ref: "unit_alm", faction: "player", hp: 10 }),
        makeUnit({ instanceId: "b1", ref: "unit_boss", faction: "enemy", hp: 0 }),
      ],
      map,
    );
    expect(checkWinCondition(state)).toBe("win");
  });

  it("survive_turns wins at target turn", () => {
    const map = MapSchema.parse({
      ...plainMap10,
      winCondition: { type: "survive_turns", turns: 5 },
    });
    const state = { ...makeState([makeUnit({ instanceId: "p1", ref: "unit_alm" })]), turn: 5, map };
    state.context = { ...state.context, map };
    expect(checkWinCondition(state)).toBe("win");
  });

  it("all player defeated is lose", () => {
    const state = makeState([
      makeUnit({ instanceId: "e1", ref: "unit_brigand", faction: "enemy" }),
    ]);
    expect(checkLoseCondition(state)).toBe("lose");
  });

  it("evaluateOutcome returns win logs", () => {
    const state = makeState([makeUnit({ instanceId: "p1", ref: "unit_alm" })]);
    const { outcome, logs } = evaluateOutcome(state);
    expect(outcome).toBe("win");
    expect(logs[0]?.kind).toBe("win");
  });
});
