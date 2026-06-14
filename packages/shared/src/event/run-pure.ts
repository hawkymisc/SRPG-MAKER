import type { EventCommand } from "../schemas/event.js";
import type { BattleState } from "../battle/types.js";
import { evaluateCondition } from "./condition.js";
import { applySetSwitch, applySetVariable } from "./variable.js";
import {
  applyChangeObjective,
  applyRemoveUnit,
  applySpawnUnit,
  findBattleUnitsById,
} from "./battle-commands.js";
import type { EventCommandContext, EventConditionContext, PureCommandResult } from "./types.js";

export function toConditionContext(state: BattleState): EventConditionContext {
  return {
    variables: state.variables,
    switches: state.switches,
    units: state.units,
  };
}

export function runPureCommand(cmd: EventCommand, ctx: EventCommandContext): PureCommandResult {
  const { battleState } = ctx;

  switch (cmd.cmd) {
    case "SET_VARIABLE":
      return {
        state: applySetVariable(cmd, battleState),
        effects: [],
      };
    case "SET_SWITCH":
      return {
        state: applySetSwitch(cmd, battleState),
        effects: [],
      };
    case "BRANCH":
      return {
        state: battleState,
        effects: [
          {
            kind: "branch",
            result: evaluateCondition(cmd.condition, toConditionContext(battleState)),
          },
        ],
      };
    case "SPAWN_UNIT": {
      const beforeIds = new Set(battleState.units.map((u) => u.instanceId));
      const next = applySpawnUnit(cmd, battleState);
      const spawned = next.units.find((u) => !beforeIds.has(u.instanceId));
      return {
        state: next,
        effects: spawned
          ? [{ kind: "spawn", instanceId: spawned.instanceId, effect: "none" }]
          : [],
      };
    }
    case "REMOVE_UNIT": {
      const targets = findBattleUnitsById(battleState.units, cmd.unitId);
      const next = applyRemoveUnit(cmd, battleState);
      return {
        state: next,
        effects: targets.map((u) => ({
          kind: "remove" as const,
          instanceId: u.instanceId,
          effect: cmd.effect,
        })),
      };
    }
    case "CHANGE_OBJECTIVE":
      return {
        state: applyChangeObjective(cmd, battleState),
        effects: [],
      };
    default:
      return {
        state: battleState,
        effects: [{ kind: "defer", cmd }],
      };
  }
}
