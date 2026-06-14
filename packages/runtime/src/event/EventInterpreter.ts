import type { EventCommand } from "@srpg/shared";
import {
  applyChangeObjective,
  applyMoveUnit,
  applyRemoveUnit,
  applySetSwitch,
  applySetVariable,
  applySpawnUnit,
  evaluateEventCondition,
  resolveCameraTarget,
} from "./pureCommands.js";
import type { EventInterpreterContext, EventResult, EventResume, EventYield } from "./types.js";

async function* executeCommands(
  commands: EventCommand[],
  ctx: EventInterpreterContext,
): AsyncGenerator<EventYield, EventResult, EventResume> {
  for (const command of commands) {
    const branchResult = yield* executeCommand(command, ctx);
    if (branchResult.status === "goto_chapter") {
      return branchResult;
    }
  }
  return { status: "completed" };
}

async function* executeCommand(
  command: EventCommand,
  ctx: EventInterpreterContext,
): AsyncGenerator<EventYield, EventResult, EventResume> {
  switch (command.cmd) {
    case "SHOW_MESSAGE":
      yield {
        type: "SHOW_MESSAGE",
        ...(command.speakerId !== undefined ? { speakerId: command.speakerId } : {}),
        ...(command.faceId !== undefined ? { faceId: command.faceId } : {}),
        text: command.text,
      };
      return { status: "completed" };

    case "SHOW_CHOICES": {
      const choiceIndex = yield {
        type: "SHOW_CHOICES",
        choices: command.choices,
        resultVar: command.resultVar,
      };
      const index = typeof choiceIndex === "number" ? choiceIndex : 0;
      ctx.state = applySetVariable(ctx.state, command.resultVar, "=", {
        value: index,
      });
      return { status: "completed" };
    }

    case "SET_VARIABLE":
      ctx.state = applySetVariable(ctx.state, command.varId, command.op, command.operand);
      return { status: "completed" };

    case "SET_SWITCH":
      ctx.state = applySetSwitch(ctx.state, command.switchId, command.value);
      return { status: "completed" };

    case "BRANCH": {
      const pass = evaluateEventCondition(ctx.state, command.condition);
      const branch = pass ? command.then : (command.else ?? []);
      return yield* executeCommands(branch, ctx);
    }

    case "SPAWN_UNIT": {
      const spawned = applySpawnUnit(ctx.state, command);
      ctx.state = spawned.state;
      yield {
        type: "SPAWN_UNIT",
        unitId: command.unitId,
        instanceId: spawned.instanceId,
        x: command.x,
        y: command.y,
      };
      return { status: "completed" };
    }

    case "REMOVE_UNIT":
      yield {
        type: "REMOVE_UNIT",
        unitId: command.unitId,
        effect: command.effect,
      };
      ctx.state = applyRemoveUnit(ctx.state, command.unitId);
      return { status: "completed" };

    case "MOVE_UNIT":
      yield {
        type: "MOVE_UNIT",
        unitId: command.unitId,
        x: command.x,
        y: command.y,
        speed: command.speed,
      };
      ctx.state = applyMoveUnit(ctx.state, command.unitId, command.x, command.y);
      return { status: "completed" };

    case "CAMERA_FOCUS": {
      const target = resolveCameraTarget(ctx.state, command.target);
      if (target) {
        yield {
          type: "CAMERA_FOCUS",
          target,
          durationMs: command.durationMs,
        };
      }
      return { status: "completed" };
    }

    case "PLAY_BGM":
      yield {
        type: "PLAY_BGM",
        bgmId: command.bgmId,
        ...(command.fadeInMs !== undefined ? { fadeInMs: command.fadeInMs } : {}),
      };
      return { status: "completed" };

    case "PLAY_SE":
      yield { type: "PLAY_SE", seId: command.seId };
      return { status: "completed" };

    case "SCREEN_EFFECT":
      yield { type: "SCREEN_EFFECT", effect: command.effect };
      return { status: "completed" };

    case "CHANGE_OBJECTIVE":
      ctx.state = applyChangeObjective(ctx.state, command);
      return { status: "completed" };

    case "WAIT":
      yield { type: "WAIT", ms: command.ms };
      return { status: "completed" };

    case "GOTO_CHAPTER":
      return { status: "goto_chapter", chapterId: command.chapterId };

    default: {
      const _exhaustive: never = command;
      return _exhaustive;
    }
  }
}

/** イベントコマンド列を async generator として解釈する。 */
export function interpretEvent(
  commands: EventCommand[],
  ctx: EventInterpreterContext,
): AsyncGenerator<EventYield, EventResult, EventResume> {
  return executeCommands(commands, ctx);
}
