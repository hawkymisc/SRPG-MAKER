import type { EventCommand } from "../schemas/event.js";
import type { Unit } from "../schemas/unit.js";

export type DialogueStep =
  | { kind: "message"; speakerId?: string; faceId?: string; text: string }
  | { kind: "choices"; choices: string[]; resultVar: string };

export function resolveSpeakerLabel(
  speakerId: string | undefined,
  units: Record<string, Unit>,
): string {
  if (!speakerId) {
    return "";
  }
  return units[speakerId]?.name ?? speakerId;
}

export function commandToDialogueStep(command: EventCommand): DialogueStep | null {
  if (command.cmd === "SHOW_MESSAGE") {
    return {
      kind: "message",
      ...(command.speakerId !== undefined ? { speakerId: command.speakerId } : {}),
      ...(command.faceId !== undefined ? { faceId: command.faceId } : {}),
      text: command.text,
    };
  }
  if (command.cmd === "SHOW_CHOICES") {
    return { kind: "choices", choices: command.choices, resultVar: command.resultVar };
  }
  return null;
}

/** Depth-first collection of dialogue steps (includes BRANCH branches). */
export function collectDialogueSteps(commands: EventCommand[]): DialogueStep[] {
  const steps: DialogueStep[] = [];
  const walk = (list: EventCommand[]): void => {
    for (const command of list) {
      const step = commandToDialogueStep(command);
      if (step) {
        steps.push(step);
      }
      if (command.cmd === "BRANCH") {
        walk(command.then);
        if (command.else) {
          walk(command.else);
        }
      }
    }
  };
  walk(commands);
  return steps;
}
