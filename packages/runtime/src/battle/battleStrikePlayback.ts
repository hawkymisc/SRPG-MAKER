import type { BattleLogEntry } from "@srpg/shared";
import type { CombatStrikeKind } from "../render/combatFxStyle.js";

const STRIKE_KINDS = new Set<BattleLogEntry["kind"]>(["damage", "crit", "miss"]);

export interface StrikePlaybackStep {
  actorId: string;
  targetId: string;
  kind: CombatStrikeKind;
  damage?: number;
}

export function extractStrikePlaybackSteps(logs: BattleLogEntry[]): StrikePlaybackStep[] {
  const steps: StrikePlaybackStep[] = [];
  for (const log of logs) {
    if (!STRIKE_KINDS.has(log.kind) || !log.target || !log.actor) {
      continue;
    }
    steps.push({
      actorId: log.actor,
      targetId: log.target,
      kind: log.kind as CombatStrikeKind,
      ...(log.strike?.damage !== undefined ? { damage: log.strike.damage } : {}),
    });
  }
  return steps;
}

export function shouldDelayAfterKill(
  logs: BattleLogEntry[],
  primaryTargetId: string,
): boolean {
  return logs.some((l) => l.kind === "kill" && l.target === primaryTargetId);
}

/** HP values shown after each strike step (index 0 = before first strike). */
export function defenderHpTimeline(
  defenderHpAfterCombat: number,
  steps: StrikePlaybackStep[],
  defenderId: string,
): number[] {
  const totalDamage = steps
    .filter((s) => s.targetId === defenderId && s.kind !== "miss")
    .reduce((sum, s) => sum + (s.damage ?? 0), 0);
  let hp = defenderHpAfterCombat + totalDamage;
  const timeline = [hp];
  for (const step of steps) {
    if (step.targetId !== defenderId) {
      continue;
    }
    if (step.kind !== "miss" && step.damage !== undefined) {
      hp = Math.max(0, hp - step.damage);
    }
    timeline.push(hp);
  }
  return timeline;
}
