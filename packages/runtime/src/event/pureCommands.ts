import {
  createBattleUnitFromPlacement,
  type BattleState,
  type BattleUnit,
  type EventCondition,
} from "@srpg/shared";
import type { EventCommand } from "@srpg/shared";

function getVariable(state: BattleState, varId: string): number {
  return (state.variables as Record<string, number>)[varId] ?? 0;
}

function getSwitch(state: BattleState, switchId: string): boolean {
  return (state.switches as Record<string, boolean>)[switchId] ?? false;
}

function findUnitByEventId(state: BattleState, unitId: string): BattleUnit | undefined {
  return state.units.find(
    (u) => u.instanceId === unitId || u.ref === unitId,
  );
}

function isUnitAlive(state: BattleState, unitId: string, alive: boolean): boolean {
  const unit = findUnitByEventId(state, unitId);
  const isAlive = unit !== undefined && unit.hp > 0;
  return isAlive === alive;
}

/** 条件評価(M4-T2 で shared へ移行予定)。 */
export function evaluateEventCondition(state: BattleState, condition: EventCondition): boolean {
  switch (condition.type) {
    case "variable": {
      const left = getVariable(state, condition.varId);
      const right = condition.value;
      switch (condition.op) {
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
    case "switch":
      return getSwitch(state, condition.switchId) === condition.value;
    case "unit_alive":
      return isUnitAlive(state, condition.unitId, condition.alive);
    default:
      return false;
  }
}

export function applySetVariable(
  state: BattleState,
  varId: string,
  op: Extract<EventCommand, { cmd: "SET_VARIABLE" }>["op"],
  operand: Extract<EventCommand, { cmd: "SET_VARIABLE" }>["operand"],
): BattleState {
  const variables = { ...(state.variables as Record<string, number>) };
  const current = variables[varId] ?? 0;
  const rhs = "value" in operand ? operand.value : getVariable(state, operand.varRef);
  let next = current;
  switch (op) {
    case "=":
      next = rhs;
      break;
    case "+":
      next = current + rhs;
      break;
    case "-":
      next = current - rhs;
      break;
    case "*":
      next = current * rhs;
      break;
  }
  variables[varId] = next;
  return { ...state, variables: variables as BattleState["variables"] };
}

export function applySetSwitch(
  state: BattleState,
  switchId: string,
  value: Extract<EventCommand, { cmd: "SET_SWITCH" }>["value"],
): BattleState {
  const switches = { ...(state.switches as Record<string, boolean>) };
  const current = switches[switchId] ?? false;
  let next = current;
  if (value === "on") {
    next = true;
  } else if (value === "off") {
    next = false;
  } else {
    next = !current;
  }
  switches[switchId] = next;
  return { ...state, switches: switches as BattleState["switches"] };
}

export function applyChangeObjective(
  state: BattleState,
  command: Extract<EventCommand, { cmd: "CHANGE_OBJECTIVE" }>,
): BattleState {
  const map = state.context.map;
  return {
    ...state,
    context: {
      ...state.context,
      map: {
        ...map,
        ...(command.win !== undefined ? { winCondition: command.win } : {}),
        ...(command.lose !== undefined ? { loseCondition: command.lose } : {}),
      },
    },
  };
}

export function applySpawnUnit(
  state: BattleState,
  command: Extract<EventCommand, { cmd: "SPAWN_UNIT" }>,
): { state: BattleState; instanceId: string } {
  const unit = createBattleUnitFromPlacement(
    {
      turn: 1,
      ref: command.unitId,
      x: command.x,
      y: command.y,
      faction: command.faction,
      ...(command.aiType !== undefined ? { aiType: command.aiType } : {}),
    },
    state.context.database,
  );
  return {
    state: { ...state, units: [...state.units, unit] },
    instanceId: unit.instanceId,
  };
}

export function applyRemoveUnit(state: BattleState, unitId: string): BattleState {
  const unit = findUnitByEventId(state, unitId);
  if (!unit) {
    return state;
  }
  return {
    ...state,
    units: state.units.map((u) =>
      u.instanceId === unit.instanceId ? { ...u, hp: 0 } : u,
    ),
  };
}

export function applyMoveUnit(
  state: BattleState,
  unitId: string,
  x: number,
  y: number,
): BattleState {
  const unit = findUnitByEventId(state, unitId);
  if (!unit) {
    return state;
  }
  return {
    ...state,
    units: state.units.map((u) =>
      u.instanceId === unit.instanceId ? { ...u, x, y } : u,
    ),
  };
}

export function resolveCameraTarget(
  state: BattleState,
  target: Extract<EventCommand, { cmd: "CAMERA_FOCUS" }>["target"],
): { x: number; y: number } | null {
  if ("x" in target) {
    return { x: target.x, y: target.y };
  }
  const unit = findUnitByEventId(state, target.unitId);
  return unit ? { x: unit.x, y: unit.y } : null;
}
