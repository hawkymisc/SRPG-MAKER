import { describe, expect, it } from "vitest";
import {
  applyChangeObjective,
  applyRemoveUnit,
  applySetSwitch,
  applySetVariable,
  applySpawnUnit,
  evaluateCondition,
  matchTrigger,
  runPureCommand,
  toConditionContext,
} from "../src/event/index.js";
import { checkWinCondition } from "../src/battle/win-lose.js";
import { resetInstanceCounter } from "../src/battle/setup.js";
import { makeState, makeUnit, plainMap10 } from "./fixtures/battle.js";
import { S, U, V } from "./helpers/ids.js";
import type { EventDefinition } from "../src/schemas/event.js";
import { EventIdSchema } from "../src/schemas/ids.js";
import { MapSchema } from "../src/schemas/map.js";

function eventDef(trigger: EventDefinition["trigger"], id = "ev_test"): EventDefinition {
  return { id: EventIdSchema.parse(id), trigger, commands: [] };
}

describe("evaluateCondition", () => {
  const baseCtx = {
    variables: { [V("var_gold")]: 100 },
    switches: { [S("sw_door")]: true },
    units: [
      makeUnit({ instanceId: "p1", ref: "unit_alm", hp: 10 }),
      makeUnit({ instanceId: "e1", ref: "unit_brigand", faction: "enemy", hp: 0 }),
    ],
  };

  it("evaluates variable ==", () => {
    expect(
      evaluateCondition({ type: "variable", varId: V("var_gold"), op: "==", value: 100 }, baseCtx),
    ).toBe(true);
    expect(
      evaluateCondition({ type: "variable", varId: V("var_gold"), op: "==", value: 99 }, baseCtx),
    ).toBe(false);
  });

  it("evaluates variable comparison ops", () => {
    expect(
      evaluateCondition({ type: "variable", varId: V("var_gold"), op: ">=", value: 100 }, baseCtx),
    ).toBe(true);
    expect(
      evaluateCondition({ type: "variable", varId: V("var_gold"), op: "<", value: 50 }, baseCtx),
    ).toBe(false);
    expect(
      evaluateCondition({ type: "variable", varId: V("var_gold"), op: "!=", value: 0 }, baseCtx),
    ).toBe(true);
  });

  it("treats missing variables as 0", () => {
    expect(
      evaluateCondition({ type: "variable", varId: V("var_missing"), op: "==", value: 0 }, baseCtx),
    ).toBe(true);
  });

  it("evaluates switch on/off", () => {
    expect(
      evaluateCondition({ type: "switch", switchId: S("sw_door"), value: true }, baseCtx),
    ).toBe(true);
    expect(
      evaluateCondition({ type: "switch", switchId: S("sw_door"), value: false }, baseCtx),
    ).toBe(false);
    expect(
      evaluateCondition({ type: "switch", switchId: S("sw_missing"), value: false }, baseCtx),
    ).toBe(true);
  });

  it("evaluates unit_alive by ref and instanceId", () => {
    expect(
      evaluateCondition({ type: "unit_alive", unitId: U("unit_alm"), alive: true }, baseCtx),
    ).toBe(true);
    expect(
      evaluateCondition({ type: "unit_alive", unitId: U("unit_brigand"), alive: true }, baseCtx),
    ).toBe(false);
    expect(
      evaluateCondition({ type: "unit_alive", unitId: U("p1"), alive: true }, baseCtx),
    ).toBe(true);
    expect(
      evaluateCondition({ type: "unit_alive", unitId: U("unit_missing"), alive: true }, baseCtx),
    ).toBe(false);
    expect(
      evaluateCondition({ type: "unit_alive", unitId: U("unit_missing"), alive: false }, baseCtx),
    ).toBe(true);
  });
});

describe("applySetVariable", () => {
  const state = makeState([]);

  it("assigns with =", () => {
    const next = applySetVariable(
      { cmd: "SET_VARIABLE", varId: V("var_a"), op: "=", operand: { value: 42 } },
      state,
    );
    expect(next.variables[V("var_a")]).toBe(42);
  });

  it("adds with + using literal", () => {
    const withVar = applySetVariable(
      { cmd: "SET_VARIABLE", varId: V("var_a"), op: "=", operand: { value: 10 } },
      state,
    );
    const next = applySetVariable(
      { cmd: "SET_VARIABLE", varId: V("var_a"), op: "+", operand: { value: 5 } },
      withVar,
    );
    expect(next.variables[V("var_a")]).toBe(15);
  });

  it("subtracts and multiplies", () => {
    let s = applySetVariable(
      { cmd: "SET_VARIABLE", varId: V("var_a"), op: "=", operand: { value: 20 } },
      state,
    );
    s = applySetVariable(
      { cmd: "SET_VARIABLE", varId: V("var_a"), op: "-", operand: { value: 3 } },
      s,
    );
    expect(s.variables[V("var_a")]).toBe(17);
    s = applySetVariable(
      { cmd: "SET_VARIABLE", varId: V("var_a"), op: "*", operand: { value: 2 } },
      s,
    );
    expect(s.variables[V("var_a")]).toBe(34);
  });

  it("reads operand from another variable", () => {
    let s = applySetVariable(
      { cmd: "SET_VARIABLE", varId: V("var_b"), op: "=", operand: { value: 7 } },
      state,
    );
    s = applySetVariable(
      { cmd: "SET_VARIABLE", varId: V("var_a"), op: "=", operand: { varRef: V("var_b") } },
      s,
    );
    expect(s.variables[V("var_a")]).toBe(7);
  });
});

describe("applySetSwitch", () => {
  const state = makeState([]);

  it("sets on and off", () => {
    const on = applySetSwitch({ cmd: "SET_SWITCH", switchId: S("sw_a"), value: "on" }, state);
    expect(on.switches[S("sw_a")]).toBe(true);
    const off = applySetSwitch({ cmd: "SET_SWITCH", switchId: S("sw_a"), value: "off" }, on);
    expect(off.switches[S("sw_a")]).toBe(false);
  });

  it("toggles switch", () => {
    const on = applySetSwitch({ cmd: "SET_SWITCH", switchId: S("sw_a"), value: "on" }, state);
    const toggled = applySetSwitch({ cmd: "SET_SWITCH", switchId: S("sw_a"), value: "toggle" }, on);
    expect(toggled.switches[S("sw_a")]).toBe(false);
  });
});

describe("applySpawnUnit / applyRemoveUnit", () => {
  it("spawns a unit from database template", () => {
    resetInstanceCounter();
    const state = makeState([]);
    const next = applySpawnUnit(
      {
        cmd: "SPAWN_UNIT",
        unitId: U("unit_brigand"),
        x: 3,
        y: 4,
        faction: "enemy",
        aiType: "charge",
      },
      state,
    );
    expect(next.units).toHaveLength(1);
    expect(next.units[0]).toMatchObject({
      ref: "unit_brigand",
      x: 3,
      y: 4,
      faction: "enemy",
      aiType: "charge",
    });
  });

  it("removes units by ref or instance id", () => {
    const state = makeState([
      makeUnit({ instanceId: "p1", ref: "unit_alm" }),
      makeUnit({ instanceId: "e1", ref: "unit_brigand", faction: "enemy" }),
    ]);
    const byRef = applyRemoveUnit({ cmd: "REMOVE_UNIT", unitId: U("unit_brigand"), effect: "none" }, state);
    expect(byRef.units.map((u) => u.instanceId)).toEqual(["p1"]);
    const byInstance = applyRemoveUnit({ cmd: "REMOVE_UNIT", unitId: U("p1"), effect: "none" }, state);
    expect(byInstance.units).toHaveLength(1);
  });
});

describe("applyChangeObjective", () => {
  it("replaces win and lose conditions on map context", () => {
    const state = makeState([makeUnit({ instanceId: "p1", ref: "unit_alm" })]);
    const next = applyChangeObjective(
      {
        cmd: "CHANGE_OBJECTIVE",
        win: { type: "survive_turns", turns: 10 },
        lose: { allPlayerDefeated: false, turnLimit: 20 },
      },
      state,
    );
    expect(next.context.map.winCondition).toEqual({ type: "survive_turns", turns: 10 });
    expect(next.context.map.loseCondition).toEqual({ allPlayerDefeated: false, turnLimit: 20 });
  });

  it("preserves existing conditions when partial update", () => {
    const map = MapSchema.parse({
      ...plainMap10,
      winCondition: { type: "defeat_boss", bossRef: "unit_boss" },
    });
    const state = makeState([makeUnit({ instanceId: "p1", ref: "unit_alm" })], map);
    const next = applyChangeObjective(
      { cmd: "CHANGE_OBJECTIVE", lose: { allPlayerDefeated: true, turnLimit: 30 } },
      state,
    );
    expect(next.context.map.winCondition).toEqual({ type: "defeat_boss", bossRef: "unit_boss" });
    expect(next.context.map.loseCondition.turnLimit).toBe(30);
  });

  it("affects win evaluation after objective change", () => {
    const state = makeState([
      makeUnit({ instanceId: "e1", ref: "unit_brigand", faction: "enemy", hp: 5 }),
    ]);
    const next = applyChangeObjective(
      { cmd: "CHANGE_OBJECTIVE", win: { type: "defeat_all_enemies" } },
      state,
    );
    expect(checkWinCondition(next)).toBe("ongoing");
  });
});

describe("matchTrigger", () => {
  it("matches chapterStart and chapterEnd", () => {
    expect(matchTrigger({ type: "chapterStart" }, eventDef({ type: "chapterStart" }))).toBe(true);
    expect(matchTrigger({ type: "chapterEnd" }, eventDef({ type: "chapterEnd" }))).toBe(true);
    expect(matchTrigger({ type: "chapterStart" }, eventDef({ type: "chapterEnd" }))).toBe(false);
  });

  it("matches turnStart with exact turn", () => {
    expect(
      matchTrigger({ type: "turnStart", turn: 3 }, eventDef({ type: "turnStart", turn: 3 })),
    ).toBe(true);
    expect(
      matchTrigger({ type: "turnStart", turn: 2 }, eventDef({ type: "turnStart", turn: 3 })),
    ).toBe(false);
  });

  it("matches unitDefeated", () => {
    expect(
      matchTrigger(
        { type: "unitDefeated", unitId: U("unit_boss") },
        eventDef({ type: "unitDefeated", unitId: U("unit_boss") }),
      ),
    ).toBe(true);
    expect(
      matchTrigger(
        { type: "unitDefeated", unitId: U("unit_alm") },
        eventDef({ type: "unitDefeated", unitId: U("unit_boss") }),
      ),
    ).toBe(false);
  });

  it("matches tileReached with optional unit filter", () => {
    const pattern = eventDef({ type: "tileReached", unitId: U("unit_alm"), x: 2, y: 3 });
    expect(
      matchTrigger({ type: "tileReached", unitId: U("unit_alm"), x: 2, y: 3 }, pattern),
    ).toBe(true);
    expect(
      matchTrigger({ type: "tileReached", unitId: U("unit_brigand"), x: 2, y: 3 }, pattern),
    ).toBe(false);
    const anyUnit = eventDef({ type: "tileReached", x: 2, y: 3 });
    expect(matchTrigger({ type: "tileReached", x: 2, y: 3 }, anyUnit)).toBe(true);
  });

  it("matches talk and chestOpened", () => {
    expect(
      matchTrigger(
        { type: "talk", unitA: U("unit_alm"), unitB: U("unit_brigand") },
        eventDef({ type: "talk", unitA: U("unit_alm"), unitB: U("unit_brigand") }),
      ),
    ).toBe(true);
    expect(
      matchTrigger({ type: "chestOpened", x: 1, y: 2 }, eventDef({ type: "chestOpened", x: 1, y: 2 })),
    ).toBe(true);
  });
});

describe("runPureCommand", () => {
  it("runs SET_VARIABLE and SET_SWITCH", () => {
    const state = makeState([]);
    const ctx = { battleState: state };
    const varResult = runPureCommand(
      { cmd: "SET_VARIABLE", varId: V("var_x"), op: "=", operand: { value: 9 } },
      ctx,
    );
    expect(varResult.state.variables[V("var_x")]).toBe(9);
    const swResult = runPureCommand(
      { cmd: "SET_SWITCH", switchId: S("sw_x"), value: "on" },
      { battleState: varResult.state },
    );
    expect(swResult.state.switches[S("sw_x")]).toBe(true);
  });

  it("evaluates BRANCH without mutating state", () => {
    const state = makeState([], plainMap10);
    state.variables[V("var_flag")] = 1;
    const result = runPureCommand(
      {
        cmd: "BRANCH",
        condition: { type: "variable", varId: V("var_flag"), op: "==", value: 1 },
        then: [{ cmd: "WAIT", ms: 1 }],
      },
      { battleState: state },
    );
    expect(result.state).toBe(state);
    expect(result.effects).toEqual([{ kind: "branch", result: true }]);
  });

  it("spawns and removes with effects", () => {
    resetInstanceCounter();
    const spawn = runPureCommand(
      {
        cmd: "SPAWN_UNIT",
        unitId: U("unit_alm"),
        x: 1,
        y: 1,
        faction: "player",
      },
      { battleState: makeState([]) },
    );
    expect(spawn.effects[0]?.kind).toBe("spawn");
    const remove = runPureCommand(
      { cmd: "REMOVE_UNIT", unitId: U("unit_alm"), effect: "fade" },
      { battleState: spawn.state },
    );
    expect(remove.effects[0]).toMatchObject({ kind: "remove", effect: "fade" });
    expect(remove.state.units).toHaveLength(0);
  });

  it("defers runtime commands", () => {
    const state = makeState([]);
    const result = runPureCommand({ cmd: "SHOW_MESSAGE", text: "hello" }, { battleState: state });
    expect(result.effects).toEqual([{ kind: "defer", cmd: { cmd: "SHOW_MESSAGE", text: "hello" } }]);
    expect(result.state).toBe(state);
  });

  it("toConditionContext maps battle state", () => {
    const state = makeState([makeUnit({ instanceId: "p1", ref: "unit_alm" })]);
    state.variables[V("var_a")] = 3;
    state.switches[S("sw_a")] = true;
    const ctx = toConditionContext(state);
    expect(ctx.variables[V("var_a")]).toBe(3);
    expect(ctx.switches[S("sw_a")]).toBe(true);
    expect(ctx.units).toHaveLength(1);
  });
});
