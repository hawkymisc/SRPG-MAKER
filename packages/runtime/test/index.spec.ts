import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { RUNTIME_PACKAGE } from "../src/constants.js";
import { loadChapterFromDir } from "../src/data/loadChapter.node.js";
import { BattleSession } from "../src/game/BattleSession.js";

const testDir = dirname(fileURLToPath(import.meta.url));

describe("@srpg/runtime exports", () => {
  it("exports package identifier", () => {
    expect(RUNTIME_PACKAGE).toBe("@srpg/runtime");
  });

  it("loads sample chapter from filesystem", () => {
    const root = resolve(testDir, "../../../templates/sample");
    const chapter = loadChapterFromDir(root, "chapter01");
    expect(chapter.map.id).toBe("map_chapter01");
    expect(chapter.database.units.unit_alm).toBeDefined();
  });

  it("creates battle session from chapter", () => {
    const root = resolve(testDir, "../../../templates/sample");
    const chapter = loadChapterFromDir(root, "chapter01");
    const session = BattleSession.fromChapter(chapter);
    expect(session.state.units.length).toBe(4);
    expect(session.state.phase).toBe("player");
  });
});
