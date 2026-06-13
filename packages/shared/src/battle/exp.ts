import type { Rng } from "../rng.js";
import type { Growth, Stats } from "../schemas/stats.js";
import type { BattleConfig } from "./config.js";
import type { BattleLogEntry, BattleUnit } from "./types.js";

const STAT_KEYS: Array<keyof Growth> = [
  "hp",
  "str",
  "mag",
  "skl",
  "spd",
  "lck",
  "def",
  "res",
];

export function expToNextLevel(level: number, config: BattleConfig): number {
  return level * config.expPerLevel;
}

export function calcKillExp(defeated: BattleUnit, config: BattleConfig): number {
  return config.killExpBase + defeated.level * 10;
}

export function applyExpGain(
  unit: BattleUnit,
  amount: number,
  growth: Growth,
  config: BattleConfig,
  rng: Rng,
  turn: number,
  phase: BattleUnit["faction"],
): { unit: BattleUnit; logs: BattleLogEntry[] } {
  const logs: BattleLogEntry[] = [];
  let next = { ...unit, exp: unit.exp + amount };
  logs.push({
    kind: "exp",
    turn,
    phase,
    actor: unit.instanceId,
    value: amount,
    message: `${unit.name} gained ${amount} EXP`,
  });

  while (next.exp >= expToNextLevel(next.level, config)) {
    next = levelUp(next, growth, config, rng, turn, phase, logs);
  }
  return { unit: next, logs };
}

function levelUp(
  unit: BattleUnit,
  growth: Growth,
  config: BattleConfig,
  rng: Rng,
  turn: number,
  phase: BattleUnit["faction"],
  logs: BattleLogEntry[],
): BattleUnit {
  const threshold = expToNextLevel(unit.level, config);
  const newStats: Stats = { ...unit.stats };
  const growthLogs: string[] = [];
  const rolls: number[] = [];

  for (const key of STAT_KEYS) {
    const roll = rng.nextInt(0, 99);
    rolls.push(roll);
    if (roll < growth[key]) {
      newStats[key] += 1;
      growthLogs.push(`${key}+1`);
    }
  }

  const hpGain = newStats.hp - unit.stats.hp;
  const leveled: BattleUnit = {
    ...unit,
    level: unit.level + 1,
    exp: unit.exp - threshold,
    stats: newStats,
    maxHp: unit.maxHp + hpGain,
    hp: unit.hp + hpGain,
  };

  logs.push({
    kind: "level_up",
    turn,
    phase,
    actor: unit.instanceId,
    message: `${unit.name} reached Lv.${leveled.level} (${growthLogs.join(", ") || "no growth"})`,
    rngRolls: rolls,
  });

  return leveled;
}
