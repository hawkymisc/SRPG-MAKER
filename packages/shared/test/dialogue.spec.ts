import { describe, expect, it } from "vitest";
import {
  collectDialogueSteps,
  commandToDialogueStep,
  resolveSpeakerLabel,
} from "../src/event/dialogue.js";
import { EventCommandSchema } from "../src/schemas/event.js";
import { UnitSchema } from "../src/schemas/unit.js";
import { createDefaultStats } from "../src/schemas/stats.js";

describe("dialogue helpers", () => {
  const units = {
    unit_alm: UnitSchema.parse({
      id: "unit_alm",
      name: "アルム",
      classId: "class_lord",
      stats: createDefaultStats(),
      growth: { hp: 50, str: 40, mag: 0, skl: 40, spd: 40, lck: 30, def: 30, res: 10 },
    }),
  };

  it("resolveSpeakerLabel returns unit name", () => {
    expect(resolveSpeakerLabel("unit_alm", units)).toBe("アルム");
    expect(resolveSpeakerLabel(undefined, units)).toBe("");
    expect(resolveSpeakerLabel("unknown", units)).toBe("unknown");
  });

  it("commandToDialogueStep maps message and choices", () => {
    const message = EventCommandSchema.parse({
      cmd: "SHOW_MESSAGE",
      speakerId: "unit_alm",
      faceId: "face_alm",
      text: "hello",
    });
    expect(commandToDialogueStep(message)).toEqual({
      kind: "message",
      speakerId: "unit_alm",
      faceId: "face_alm",
      text: "hello",
    });

    const choices = EventCommandSchema.parse({
      cmd: "SHOW_CHOICES",
      choices: ["A", "B"],
      resultVar: "var_choice",
    });
    expect(commandToDialogueStep(choices)).toEqual({
      kind: "choices",
      choices: ["A", "B"],
      resultVar: "var_choice",
    });
  });

  it("collectDialogueSteps walks BRANCH children", () => {
    const branch = EventCommandSchema.parse({
      cmd: "BRANCH",
      condition: { type: "switch", switchId: "sw_a", value: true },
      then: [{ cmd: "SHOW_MESSAGE", text: "yes" }],
      else: [{ cmd: "SHOW_MESSAGE", text: "no" }],
    });
    const commands = [
      EventCommandSchema.parse({ cmd: "SHOW_MESSAGE", text: "start" }),
      branch,
      EventCommandSchema.parse({
        cmd: "SHOW_CHOICES",
        choices: ["x", "y"],
        resultVar: "var_choice",
      }),
    ];

    const steps = collectDialogueSteps(commands);
    expect(steps.map((s) => (s.kind === "message" ? s.text : s.choices.join("/")))).toEqual([
      "start",
      "yes",
      "no",
      "x/y",
    ]);
  });
});
