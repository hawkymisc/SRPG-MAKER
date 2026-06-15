import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createInitialBattleState, type EventCommand, type ChapterId, type SwitchId, type VariableId } from "@srpg/shared";
import { loadChapterFromDir } from "../src/data/loadChapter.node.js";
import { interpretEvent } from "../src/event/EventInterpreter.js";
import { findMatchingEvents } from "../src/event/triggerMatch.js";
import {
  applySetSwitch,
  applySetVariable,
  evaluateEventCondition,
} from "../src/event/pureCommands.js";
import type { EventInterpreterContext, EventResume, EventYield } from "../src/event/types.js";

const SAMPLE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../templates/sample");

async function driveInterpreter(
  commands: EventCommand[],
  ctx: EventInterpreterContext,
  resumes: EventResume[] = [],
) {
  const gen = interpretEvent(commands, ctx);
  const yields: EventYield[] = [];
  let step = await gen.next();
  let resumeIndex = 0;
  while (!step.done) {
    yields.push(step.value);
    step = await gen.next(resumes[resumeIndex]);
    resumeIndex += 1;
  }
  return { yields, result: step.value };
}

describe("event pure commands", () => {
  it("evaluates variable and switch conditions", () => {
    const chapter = loadChapterFromDir(SAMPLE_ROOT, "chapter01");
    let state = createInitialBattleState({ map: chapter.map, database: chapter.database });
    state = applySetVariable(state, "var_gold" as VariableId, "=", { value: 50 });
    state = applySetSwitch(state, "sw_door" as SwitchId, "on");

    expect(
      evaluateEventCondition(state, { type: "variable", varId: "var_gold" as VariableId, op: ">=", value: 40 }),
    ).toBe(true);
    expect(
      evaluateEventCondition(state, { type: "switch", switchId: "sw_door" as SwitchId, value: true }),
    ).toBe(true);
  });
});

describe("interpretEvent generator", () => {
  it("yields SHOW_MESSAGE and completes", async () => {
    const chapter = loadChapterFromDir(SAMPLE_ROOT, "chapter01");
    const ctx: EventInterpreterContext = {
      state: createInitialBattleState({ map: chapter.map, database: chapter.database }),
    };
    const { yields, result } = await driveInterpreter(
      [{ cmd: "SHOW_MESSAGE", text: "hello" }],
      ctx,
    );
    expect(yields).toEqual([{ type: "SHOW_MESSAGE", text: "hello" }]);
    expect(result).toEqual({ status: "completed" });
  });

  it("SHOW_CHOICES stores selected index in variable", async () => {
    const chapter = loadChapterFromDir(SAMPLE_ROOT, "chapter01");
    const ctx: EventInterpreterContext = {
      state: createInitialBattleState({ map: chapter.map, database: chapter.database }),
    };
    const { yields, result } = await driveInterpreter(
      [{ cmd: "SHOW_CHOICES", choices: ["A", "B"], resultVar: "var_choice" as VariableId }],
      ctx,
      [1],
    );
    expect(yields[0]).toMatchObject({ type: "SHOW_CHOICES", choices: ["A", "B"] });
    expect((ctx.state.variables as Record<string, number>).var_choice).toBe(1);
    expect(result).toEqual({ status: "completed" });
  });

  it("BRANCH executes then/else based on condition", async () => {
    const chapter = loadChapterFromDir(SAMPLE_ROOT, "chapter01");
    const ctx: EventInterpreterContext = {
      state: createInitialBattleState({ map: chapter.map, database: chapter.database }),
    };
    ctx.state = applySetSwitch(ctx.state, "sw_flag", "on");

    const { yields } = await driveInterpreter(
      [
        {
          cmd: "BRANCH",
          condition: { type: "switch", switchId: "sw_flag" as SwitchId, value: true },
          then: [{ cmd: "SHOW_MESSAGE", text: "yes" }],
          else: [{ cmd: "SHOW_MESSAGE", text: "no" }],
        },
      ],
      ctx,
    );
    expect(yields).toEqual([{ type: "SHOW_MESSAGE", text: "yes" }]);
  });

  it("GOTO_CHAPTER stops with goto result", async () => {
    const chapter = loadChapterFromDir(SAMPLE_ROOT, "chapter01");
    const ctx: EventInterpreterContext = {
      state: createInitialBattleState({ map: chapter.map, database: chapter.database }),
    };
    const { yields, result } = await driveInterpreter(
      [
        { cmd: "SHOW_MESSAGE", text: "skip me" },
        { cmd: "GOTO_CHAPTER", chapterId: "chapter02" as ChapterId },
        { cmd: "WAIT", ms: 1 },
      ],
      ctx,
    );
    expect(yields).toHaveLength(1);
    expect(result).toEqual({ status: "goto_chapter", chapterId: "chapter02" });
  });

  it("yields PLAY_BGM and PLAY_SE", async () => {
    const chapter = loadChapterFromDir(SAMPLE_ROOT, "chapter01");
    const ctx: EventInterpreterContext = {
      state: createInitialBattleState({ map: chapter.map, database: chapter.database }),
    };
    const { yields } = await driveInterpreter(
      [
        { cmd: "PLAY_BGM", bgmId: "bgm_intro" as import("@srpg/shared").BgmId, fadeInMs: 300 },
        { cmd: "PLAY_SE", seId: "se_hit" as import("@srpg/shared").SeId },
      ],
      ctx,
    );
    expect(yields[0]).toEqual({ type: "PLAY_BGM", bgmId: "bgm_intro", fadeInMs: 300 });
    expect(yields[1]).toEqual({ type: "PLAY_SE", seId: "se_hit" });
  });

  it("SET_VARIABLE updates battle state variables", async () => {
    const chapter = loadChapterFromDir(SAMPLE_ROOT, "chapter01");
    const ctx: EventInterpreterContext = {
      state: createInitialBattleState({ map: chapter.map, database: chapter.database }),
    };
    await driveInterpreter(
      [{ cmd: "SET_VARIABLE", varId: "var_a" as VariableId, op: "+", operand: { value: 3 } }],
      ctx,
    );
    expect((ctx.state.variables as Record<string, number>).var_a).toBe(3);
  });
});

describe("trigger matching", () => {
  it("loads sample chapter events and matches chapterStart", () => {
    const chapter = loadChapterFromDir(SAMPLE_ROOT, "chapter01");
    expect(chapter.events.length).toBeGreaterThan(0);
    const matched = findMatchingEvents(chapter.events, { type: "chapterStart" });
    expect(matched.some((ev) => ev.id === "ev_chapter01_intro")).toBe(true);
  });
});
