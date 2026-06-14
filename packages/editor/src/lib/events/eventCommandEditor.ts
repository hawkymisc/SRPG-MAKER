import type { EventCommand } from "@srpg/shared";
import { EventCommandSchema } from "@srpg/shared";

export type CommandPath = string;

export interface CommandRow {
  path: CommandPath;
  depth: number;
  section?: "then" | "else";
  command: EventCommand;
}

export const COMMAND_TYPES = [
  "SHOW_MESSAGE",
  "SHOW_CHOICES",
  "SET_VARIABLE",
  "SET_SWITCH",
  "SPAWN_UNIT",
  "REMOVE_UNIT",
  "MOVE_UNIT",
  "CAMERA_FOCUS",
  "PLAY_BGM",
  "PLAY_SE",
  "SCREEN_EFFECT",
  "CHANGE_OBJECTIVE",
  "WAIT",
  "GOTO_CHAPTER",
  "BRANCH",
] as const;

export type CommandType = (typeof COMMAND_TYPES)[number];

export function defaultCommand(cmd: CommandType): EventCommand {
  switch (cmd) {
    case "SHOW_MESSAGE":
      return EventCommandSchema.parse({ cmd, text: "メッセージ" });
    case "SHOW_CHOICES":
      return EventCommandSchema.parse({ cmd, choices: ["はい", "いいえ"], resultVar: "var_choice" });
    case "SET_VARIABLE":
      return EventCommandSchema.parse({ cmd, varId: "var_a", op: "=", operand: { value: 0 } });
    case "SET_SWITCH":
      return EventCommandSchema.parse({ cmd, switchId: "sw_a", value: "on" });
    case "SPAWN_UNIT":
      return EventCommandSchema.parse({ cmd, unitId: "unit_brigand", x: 0, y: 0, faction: "enemy" });
    case "REMOVE_UNIT":
      return EventCommandSchema.parse({ cmd, unitId: "unit_brigand" });
    case "MOVE_UNIT":
      return EventCommandSchema.parse({ cmd, unitId: "unit_brigand", x: 0, y: 0 });
    case "CAMERA_FOCUS":
      return EventCommandSchema.parse({ cmd, target: { x: 0, y: 0 } });
    case "PLAY_BGM":
      return EventCommandSchema.parse({ cmd, bgmId: "bgm_battle" });
    case "PLAY_SE":
      return EventCommandSchema.parse({ cmd, seId: "se_select" });
    case "SCREEN_EFFECT":
      return EventCommandSchema.parse({ cmd, effect: { type: "fadeIn" } });
    case "CHANGE_OBJECTIVE":
      return EventCommandSchema.parse({ cmd, win: { type: "defeat_all_enemies" } });
    case "WAIT":
      return EventCommandSchema.parse({ cmd, ms: 500 });
    case "GOTO_CHAPTER":
      return EventCommandSchema.parse({ cmd, chapterId: "chapter01" });
    case "BRANCH":
      return EventCommandSchema.parse({
        cmd,
        condition: { type: "switch", switchId: "sw_a", value: true },
        then: [],
        else: [],
      });
  }
}

function pathParts(path: CommandPath): string[] {
  return path ? path.split(".") : [];
}

function getArrayAtPath(commands: EventCommand[], path: CommandPath): EventCommand[] {
  const parts = pathParts(path);
  if (parts.length === 0) return commands;
  let current: EventCommand[] = commands;
  for (let i = 0; i < parts.length; i += 2) {
    const index = Number(parts[i]);
    const branch = parts[i + 1] as "then" | "else" | undefined;
    const cmd = current[index];
    if (!cmd || cmd.cmd !== "BRANCH") {
      throw new Error(`Invalid command path: ${path}`);
    }
    if (branch === "then") {
      current = cmd.then;
    } else if (branch === "else") {
      current = cmd.else ?? [];
    } else {
      throw new Error(`Invalid command path: ${path}`);
    }
  }
  return current;
}

function cloneCommands(commands: EventCommand[]): EventCommand[] {
  return structuredClone(commands);
}

function replaceArrayAtPath(
  commands: EventCommand[],
  path: CommandPath,
  nextArray: EventCommand[],
): EventCommand[] {
  const parts = pathParts(path);
  if (parts.length === 0) return nextArray;
  const root = cloneCommands(commands);
  let current: EventCommand[] = root;
  for (let i = 0; i < parts.length - 2; i += 2) {
    const index = Number(parts[i]);
    const branch = parts[i + 1] as "then" | "else";
    const cmd = current[index]!;
    if (cmd.cmd !== "BRANCH") throw new Error(`Invalid path: ${path}`);
    if (branch === "then") {
      cmd.then = [...cmd.then];
      current = cmd.then;
    } else {
      cmd.else = [...(cmd.else ?? [])];
      current = cmd.else!;
    }
  }
  const lastIndex = Number(parts[parts.length - 2]);
  const lastBranch = parts[parts.length - 1] as "then" | "else";
  const branchCmd = current[lastIndex]!;
  if (branchCmd.cmd !== "BRANCH") throw new Error(`Invalid path: ${path}`);
  if (lastBranch === "then") {
    branchCmd.then = nextArray;
  } else {
    branchCmd.else = nextArray;
  }
  return root;
}

export function flattenCommands(
  commands: EventCommand[],
  parentPath: CommandPath = "",
  depth = 0,
): CommandRow[] {
  const rows: CommandRow[] = [];
  commands.forEach((command, index) => {
    const path = parentPath ? `${parentPath}.${index}` : String(index);
    rows.push({ path, depth, command });
    if (command.cmd === "BRANCH") {
      if (command.then.length > 0) {
        rows.push(
          ...flattenCommands(command.then, `${path}.then`, depth + 1).map((row) => ({
            ...row,
            section: row.section ?? ("then" as const),
          })),
        );
      }
      if (command.else && command.else.length > 0) {
        rows.push(
          ...flattenCommands(command.else, `${path}.else`, depth + 1).map((row) => ({
            ...row,
            section: row.section ?? ("else" as const),
          })),
        );
      }
    }
  });
  return rows;
}

export function getCommandAtPath(commands: EventCommand[], path: CommandPath): EventCommand | null {
  const parts = pathParts(path);
  if (parts.length === 0) return null;
  const parentPath = parts.length > 1 ? parts.slice(0, -1).join(".") : "";
  const index = Number(parts[parts.length - 1]);
  const array = getArrayAtPath(commands, parentPath);
  return array[index] ?? null;
}

export function setCommandAtPath(
  commands: EventCommand[],
  path: CommandPath,
  command: EventCommand,
): EventCommand[] {
  const parts = pathParts(path);
  const parentPath = parts.length > 1 ? parts.slice(0, -1).join(".") : "";
  const index = Number(parts[parts.length - 1]);
  const array = [...getArrayAtPath(commands, parentPath)];
  array[index] = command;
  return replaceArrayAtPath(commands, parentPath, array);
}

export function removeCommandAtPath(commands: EventCommand[], path: CommandPath): EventCommand[] {
  const parts = pathParts(path);
  const parentPath = parts.length > 1 ? parts.slice(0, -1).join(".") : "";
  const index = Number(parts[parts.length - 1]);
  const array = getArrayAtPath(commands, parentPath).filter((_, i) => i !== index);
  return replaceArrayAtPath(commands, parentPath, array);
}

export function moveCommandAtPath(
  commands: EventCommand[],
  path: CommandPath,
  direction: "up" | "down",
): EventCommand[] {
  const parts = pathParts(path);
  const parentPath = parts.length > 1 ? parts.slice(0, -1).join(".") : "";
  const index = Number(parts[parts.length - 1]);
  const array = [...getArrayAtPath(commands, parentPath)];
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= array.length) return commands;
  [array[index], array[target]] = [array[target]!, array[index]!];
  return replaceArrayAtPath(commands, parentPath, array);
}

export function addCommandAtPath(
  commands: EventCommand[],
  parentPath: CommandPath,
  cmd: CommandType,
): EventCommand[] {
  const array = [...getArrayAtPath(commands, parentPath), defaultCommand(cmd)];
  return replaceArrayAtPath(commands, parentPath, array);
}

export function addBranchSectionCommand(
  commands: EventCommand[],
  branchPath: CommandPath,
  section: "then" | "else",
  cmd: CommandType,
): EventCommand[] {
  return addCommandAtPath(commands, `${branchPath}.${section}`, cmd);
}
