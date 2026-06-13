import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BattleSession } from "../src/game/BattleSession.js";
import { loadChapterFromDir } from "../src/data/loadChapter.node.js";

const SAMPLE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../templates/sample");

describe("playthrough — sample chapter auto-play", () => {
  it("reaches win or lose within 100 turns when all factions use AI", () => {
    const chapter = loadChapterFromDir(SAMPLE_ROOT, "chapter01");
    const session = BattleSession.fromChapter(chapter, 42_001);
    const result = session.runAutoPlay(100);

    expect(["win", "lose"]).toContain(result.outcome);
    expect(result.outcome).not.toBe("ongoing");
    expect(result.turns).toBeLessThanOrEqual(100);
  });
});

describe("playthrough — deterministic replay", () => {
  it("same seed produces identical battle log length", () => {
    const chapter = loadChapterFromDir(SAMPLE_ROOT, "chapter01");
    const a = BattleSession.fromChapter(chapter, 99);
    const b = BattleSession.fromChapter(chapter, 99);
    const ra = a.runAutoPlay(100);
    const rb = b.runAutoPlay(100);

    expect(ra.outcome).toBe(rb.outcome);
    expect(ra.steps).toBe(rb.steps);
    expect(a.state.log.length).toBe(b.state.log.length);
  });
});
