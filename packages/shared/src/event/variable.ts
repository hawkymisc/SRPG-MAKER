import type { VariableId } from "../schemas/ids.js";
import type { SetSwitchCommandSchema, SetVariableCommandSchema } from "../schemas/event.js";
import type { z } from "zod";
import type { EventVariableState } from "./types.js";

type SetVariableCommand = z.infer<typeof SetVariableCommandSchema>;
type SetSwitchCommand = z.infer<typeof SetSwitchCommandSchema>;

function resolveOperand(
  variables: Record<VariableId, number>,
  operand: SetVariableCommand["operand"],
): number {
  if ("value" in operand) return operand.value;
  return variables[operand.varRef] ?? 0;
}

function applyVariableOp(current: number, op: SetVariableCommand["op"], operand: number): number {
  switch (op) {
    case "=":
      return operand;
    case "+":
      return current + operand;
    case "-":
      return current - operand;
    case "*":
      return current * operand;
    default:
      return current;
  }
}

export function applySetVariable<T extends EventVariableState>(cmd: SetVariableCommand, state: T): T {
  const current = state.variables[cmd.varId] ?? 0;
  const operand = resolveOperand(state.variables, cmd.operand);
  const next = applyVariableOp(current, cmd.op, operand);
  return {
    ...state,
    variables: { ...state.variables, [cmd.varId]: next },
  };
}

export function applySetSwitch<T extends EventVariableState>(cmd: SetSwitchCommand, state: T): T {
  const current = state.switches[cmd.switchId] ?? false;
  let next: boolean;
  switch (cmd.value) {
    case "on":
      next = true;
      break;
    case "off":
      next = false;
      break;
    case "toggle":
      next = !current;
      break;
    default:
      next = current;
  }
  return {
    ...state,
    switches: { ...state.switches, [cmd.switchId]: next },
  };
}
