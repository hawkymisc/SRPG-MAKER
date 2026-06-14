import type { UnitId } from "../schemas/ids.js";
import type { EventCondition, VariableConditionOpSchema } from "../schemas/event.js";
import type { BattleUnit } from "../battle/types.js";
import type { EventConditionContext } from "./types.js";
import type { z } from "zod";

type VariableConditionOp = z.infer<typeof VariableConditionOpSchema>;

function findUnitsById(units: BattleUnit[] | undefined, unitId: UnitId): BattleUnit[] {
  if (!units) return [];
  return units.filter((u) => u.instanceId === unitId || u.ref === unitId);
}

function compareVariable(left: number, op: VariableConditionOp, right: number): boolean {
  switch (op) {
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "<":
      return left < right;
    case "<=":
      return left <= right;
    default:
      return false;
  }
}

export function evaluateCondition(condition: EventCondition, ctx: EventConditionContext): boolean {
  switch (condition.type) {
    case "variable": {
      const current = ctx.variables[condition.varId] ?? 0;
      return compareVariable(current, condition.op, condition.value);
    }
    case "switch": {
      const current = ctx.switches[condition.switchId] ?? false;
      return current === condition.value;
    }
    case "unit_alive": {
      const matches = findUnitsById(ctx.units, condition.unitId);
      if (matches.length === 0) return !condition.alive;
      const anyAlive = matches.some((u) => u.hp > 0);
      return condition.alive ? anyAlive : !anyAlive;
    }
    default:
      return false;
  }
}
