import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BattleSession } from "../src/game/BattleSession.js";
import { loadChapterFromDir } from "../src/data/loadChapter.node.js";

const SAMPLE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../templates/sample");

function cloneSessionSteps(source: BattleSession, steps: number): BattleSession {
  const session = BattleSession.fromChapter(
    { map: source.state.context.map, database: source.state.context.database },
    source.seed,
  );
  for (let i = 0; i < steps; i += 1) {
    if (session.state.outcome !== "ongoing") {
      break;
    }
    const acted = session.runOnePhaseStep();
    if (!acted) {
      session.apply({ type: "EndPhase" });
    }
  }
  return session;
}

describe("save/load determinism", () => {
  it("mid-battle save continues with identical outcome as uninterrupted play", () => {
    const chapter = loadChapterFromDir(SAMPLE_ROOT, "chapter01");
    const seed = 77_007;

    const full = BattleSession.fromChapter(chapter, seed);
    full.runAutoPlay(100);

    const partial = BattleSession.fromChapter(chapter, seed);
    for (let i = 0; i < 24; i += 1) {
      if (partial.state.outcome !== "ongoing") {
        break;
      }
      const acted = partial.runOnePhaseStep();
      if (!acted) {
        partial.apply({ type: "EndPhase" });
      }
    }

    const save = partial.serialize();
    const restored = BattleSession.deserialize(save);
    restored.runAutoPlay(100);

    expect(restored.state.outcome).toBe(full.state.outcome);
    expect(restored.state.log.length).toBe(full.state.log.length);
    expect(restored.getRngConsumed()).toBe(full.getRngConsumed());
  });

  it("serialize round-trip preserves state and rng position", () => {
    const chapter = loadChapterFromDir(SAMPLE_ROOT, "chapter01");
    const session = cloneSessionSteps(BattleSession.fromChapter(chapter, 5), 12);
    const save = session.serialize();
    const loaded = BattleSession.deserialize(save);

    expect(loaded.state.turn).toBe(session.state.turn);
    expect(loaded.state.phase).toBe(session.state.phase);
    expect(loaded.getRngConsumed()).toBe(session.getRngConsumed());
    expect(loaded.state.units.map((u) => u.hp)).toEqual(session.state.units.map((u) => u.hp));

    loaded.runOnePhaseStep();
    session.runOnePhaseStep();
    expect(loaded.state.log.length).toBe(session.state.log.length);
  });
});
