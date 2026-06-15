import { describe, expect, it } from "vitest";
import type { BattleLogEntry } from "@srpg/shared";
import {
  defenderHpTimeline,
  extractStrikePlaybackSteps,
  shouldDelayAfterKill,
} from "../src/battle/battleStrikePlayback.js";

function strikeLog(
  kind: BattleLogEntry["kind"],
  actor: string,
  target: string,
  damage?: number,
): BattleLogEntry {
  const entry: BattleLogEntry = {
    kind,
    turn: 1,
    phase: "player",
    actor,
    target,
    message: "",
  };
  if (damage !== undefined) {
    entry.strike = {
      hit: kind !== "miss",
      crit: kind === "crit",
      damage,
      hitRoll: 0,
      hitRate: 80,
      critRate: 10,
      attackPower: 10,
    };
  }
  return entry;
}

describe("battleStrikePlayback", () => {
  it("extracts damage, crit, and miss steps in order", () => {
    const logs: BattleLogEntry[] = [
      { kind: "attack", turn: 1, phase: "player", message: "" },
      strikeLog("damage", "a1", "d1", 8),
      strikeLog("crit", "a1", "d1", 12),
      strikeLog("miss", "a1", "d1"),
      { kind: "kill", turn: 1, phase: "player", target: "d1", message: "" },
    ];
    expect(extractStrikePlaybackSteps(logs)).toEqual([
      { actorId: "a1", targetId: "d1", kind: "damage", damage: 8 },
      { actorId: "a1", targetId: "d1", kind: "crit", damage: 12 },
      { actorId: "a1", targetId: "d1", kind: "miss" },
    ]);
  });

  it("detects kill delay for primary target", () => {
    const logs: BattleLogEntry[] = [
      { kind: "kill", turn: 1, phase: "player", target: "d1", message: "" },
    ];
    expect(shouldDelayAfterKill(logs, "d1")).toBe(true);
    expect(shouldDelayAfterKill(logs, "other")).toBe(false);
  });

  it("builds defender HP timeline across multi-strike playback", () => {
    const steps = extractStrikePlaybackSteps([
      strikeLog("damage", "a1", "d1", 10),
      strikeLog("damage", "a1", "d1", 5),
    ]);
    expect(defenderHpTimeline(5, steps, "d1")).toEqual([20, 10, 5]);
  });
});
