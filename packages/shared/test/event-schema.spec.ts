import { describe, expect, it } from "vitest";
import {
  EventCommandSchema,
  EventConditionSchema,
  EventDefinitionSchema,
  EventTriggerSchema,
  EventsCollectionSchema,
  MAX_BRANCH_DEPTH,
  branchDepth,
  type EventCommand,
} from "../src/schemas/index.js";

function parseCmd(input: unknown) {
  return EventCommandSchema.parse(input);
}

describe("event commands (15 frozen)", () => {
  it("parses SHOW_MESSAGE", () => {
    const c = parseCmd({ cmd: "SHOW_MESSAGE", speakerId: "unit_alm", faceId: "face_alm", text: "hi" });
    expect(c.cmd).toBe("SHOW_MESSAGE");
  });

  it("parses SHOW_MESSAGE without optional fields", () => {
    expect(parseCmd({ cmd: "SHOW_MESSAGE", text: "yo" }).cmd).toBe("SHOW_MESSAGE");
  });

  it("parses SHOW_CHOICES", () => {
    const c = parseCmd({ cmd: "SHOW_CHOICES", choices: ["yes", "no"], resultVar: "var_choice" });
    expect(c.cmd).toBe("SHOW_CHOICES");
  });

  it("rejects SHOW_CHOICES with fewer than 2 choices", () => {
    expect(() => parseCmd({ cmd: "SHOW_CHOICES", choices: ["only"], resultVar: "v" })).toThrow();
  });

  it("parses SET_VARIABLE with literal value", () => {
    const c = parseCmd({ cmd: "SET_VARIABLE", varId: "var_gold", op: "+", operand: { value: 10 } });
    expect(c.cmd).toBe("SET_VARIABLE");
  });

  it("parses SET_VARIABLE with variable reference", () => {
    const c = parseCmd({ cmd: "SET_VARIABLE", varId: "var_a", op: "=", operand: { varRef: "var_b" } });
    expect(c.cmd).toBe("SET_VARIABLE");
  });

  it("rejects SET_VARIABLE with unknown op", () => {
    expect(() => parseCmd({ cmd: "SET_VARIABLE", varId: "v", op: "/", operand: { value: 1 } })).toThrow();
  });

  it("parses SET_SWITCH", () => {
    expect(parseCmd({ cmd: "SET_SWITCH", switchId: "sw_door", value: "toggle" }).cmd).toBe("SET_SWITCH");
  });

  it("parses SPAWN_UNIT", () => {
    const c = parseCmd({ cmd: "SPAWN_UNIT", unitId: "unit_foe", x: 3, y: 4, faction: "enemy", aiType: "charge" });
    expect(c.cmd).toBe("SPAWN_UNIT");
  });

  it("parses REMOVE_UNIT with default effect", () => {
    const c = parseCmd({ cmd: "REMOVE_UNIT", unitId: "unit_foe" });
    expect(c).toMatchObject({ cmd: "REMOVE_UNIT", effect: "none" });
  });

  it("parses MOVE_UNIT", () => {
    expect(parseCmd({ cmd: "MOVE_UNIT", unitId: "u", x: 1, y: 2, speed: 2 }).cmd).toBe("MOVE_UNIT");
  });

  it("parses CAMERA_FOCUS by coordinate", () => {
    expect(parseCmd({ cmd: "CAMERA_FOCUS", target: { x: 5, y: 5 }, durationMs: 300 }).cmd).toBe("CAMERA_FOCUS");
  });

  it("parses CAMERA_FOCUS by unit", () => {
    expect(parseCmd({ cmd: "CAMERA_FOCUS", target: { unitId: "u" } }).cmd).toBe("CAMERA_FOCUS");
  });

  it("parses PLAY_BGM", () => {
    expect(parseCmd({ cmd: "PLAY_BGM", bgmId: "bgm_battle", fadeInMs: 500 }).cmd).toBe("PLAY_BGM");
  });

  it("parses PLAY_SE", () => {
    expect(parseCmd({ cmd: "PLAY_SE", seId: "se_hit" }).cmd).toBe("PLAY_SE");
  });

  it("parses SCREEN_EFFECT shake", () => {
    expect(parseCmd({ cmd: "SCREEN_EFFECT", effect: { type: "shake", power: 2, durationMs: 200 } }).cmd).toBe(
      "SCREEN_EFFECT",
    );
  });

  it("parses SCREEN_EFFECT tint with hex color", () => {
    expect(parseCmd({ cmd: "SCREEN_EFFECT", effect: { type: "tint", color: "#ff0000" } }).cmd).toBe("SCREEN_EFFECT");
  });

  it("rejects SCREEN_EFFECT tint with invalid color", () => {
    expect(() => parseCmd({ cmd: "SCREEN_EFFECT", effect: { type: "tint", color: "red" } })).toThrow();
  });

  it("parses CHANGE_OBJECTIVE", () => {
    const c = parseCmd({ cmd: "CHANGE_OBJECTIVE", win: { type: "defeat_all_enemies" } });
    expect(c.cmd).toBe("CHANGE_OBJECTIVE");
  });

  it("parses WAIT", () => {
    expect(parseCmd({ cmd: "WAIT", ms: 1000 }).cmd).toBe("WAIT");
  });

  it("parses GOTO_CHAPTER", () => {
    expect(parseCmd({ cmd: "GOTO_CHAPTER", chapterId: "chapter02" }).cmd).toBe("GOTO_CHAPTER");
  });

  it("rejects an unknown command", () => {
    expect(() => parseCmd({ cmd: "EXPLODE", power: 9000 })).toThrow();
  });
});

describe("BRANCH command", () => {
  it("parses a BRANCH with variable condition and nested commands", () => {
    const c = parseCmd({
      cmd: "BRANCH",
      condition: { type: "variable", varId: "var_gold", op: ">=", value: 100 },
      then: [{ cmd: "WAIT", ms: 10 }],
      else: [{ cmd: "PLAY_SE", seId: "se_no" }],
    });
    expect(c.cmd).toBe("BRANCH");
  });

  it("parses switch and unit_alive conditions", () => {
    expect(EventConditionSchema.parse({ type: "switch", switchId: "sw_a", value: true }).type).toBe("switch");
    expect(EventConditionSchema.parse({ type: "unit_alive", unitId: "u" })).toMatchObject({ alive: true });
  });

  it("accepts BRANCH nested exactly to the max depth", () => {
    const make = (depth: number): EventCommand =>
      depth === 0
        ? { cmd: "WAIT", ms: 1 }
        : {
            cmd: "BRANCH",
            condition: { type: "switch", switchId: "sw" as never, value: true },
            then: [make(depth - 1)],
          };
    const def = {
      id: "ev_deep",
      trigger: { type: "chapterStart" },
      commands: [make(MAX_BRANCH_DEPTH)],
    };
    expect(() => EventDefinitionSchema.parse(def)).not.toThrow();
    expect(branchDepth(EventDefinitionSchema.parse(def).commands)).toBe(MAX_BRANCH_DEPTH);
  });

  it("rejects BRANCH nesting beyond the max depth", () => {
    const make = (depth: number): EventCommand =>
      depth === 0
        ? { cmd: "WAIT", ms: 1 }
        : {
            cmd: "BRANCH",
            condition: { type: "switch", switchId: "sw" as never, value: true },
            then: [make(depth - 1)],
          };
    const def = {
      id: "ev_too_deep",
      trigger: { type: "chapterStart" },
      commands: [make(MAX_BRANCH_DEPTH + 1)],
    };
    expect(() => EventDefinitionSchema.parse(def)).toThrow();
  });
});

describe("event triggers (7)", () => {
  const triggers: unknown[] = [
    { type: "chapterStart" },
    { type: "chapterEnd" },
    { type: "turnStart", turn: 3 },
    { type: "unitDefeated", unitId: "unit_boss" },
    { type: "tileReached", x: 1, y: 2 },
    { type: "tileReached", unitId: "u", x: 1, y: 2 },
    { type: "talk", unitA: "a", unitB: "b" },
    { type: "chestOpened", x: 4, y: 5 },
  ];

  it("parses all 7 trigger forms", () => {
    for (const t of triggers) {
      expect(() => EventTriggerSchema.parse(t)).not.toThrow();
    }
  });

  it("rejects turnStart with non-positive turn", () => {
    expect(() => EventTriggerSchema.parse({ type: "turnStart", turn: 0 })).toThrow();
  });

  it("rejects an unknown trigger type", () => {
    expect(() => EventTriggerSchema.parse({ type: "onLoad" })).toThrow();
  });
});

describe("EventDefinition and collection", () => {
  it("parses an event definition", () => {
    const def = EventDefinitionSchema.parse({
      id: "ev_intro",
      name: "オープニング",
      trigger: { type: "chapterStart" },
      commands: [
        { cmd: "PLAY_BGM", bgmId: "bgm_intro" },
        { cmd: "SHOW_MESSAGE", text: "始まりの物語" },
      ],
    });
    expect(def.id).toBe("ev_intro");
    expect(def.commands).toHaveLength(2);
  });

  it("parses an events collection record", () => {
    const collection = EventsCollectionSchema.parse({
      ev_a: { id: "ev_a", trigger: { type: "chapterEnd" }, commands: [{ cmd: "WAIT", ms: 1 }] },
    });
    expect(Object.keys(collection)).toEqual(["ev_a"]);
  });

  it("rejects an event with an empty id", () => {
    expect(() =>
      EventDefinitionSchema.parse({ id: "", trigger: { type: "chapterStart" }, commands: [] }),
    ).toThrow();
  });
});
