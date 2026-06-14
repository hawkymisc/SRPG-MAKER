import type { BattleDatabase } from "../battle/types.js";
import type { ClassDef } from "../schemas/class.js";
import type { ClassId } from "../schemas/ids.js";
import { RosterMemberSchema, type RosterMember } from "../schemas/campaign.js";
import { StatsSchema, type Stats } from "../schemas/stats.js";
import type { Unit } from "../schemas/unit.js";

export const DEFAULT_PROMOTION_MIN_LEVEL = 10;

const STAT_KEYS: Array<keyof Stats> = [
  "hp",
  "str",
  "mag",
  "skl",
  "spd",
  "lck",
  "def",
  "res",
  "mov",
];

export function effectiveClassId(member: RosterMember, unit: Unit): ClassId {
  return (member.classId ?? unit.classId) as ClassId;
}

export function effectiveStats(member: RosterMember, unit: Unit): Stats {
  return member.stats ?? unit.stats;
}

export type PromoteCheck =
  | { ok: true; targetClassId: ClassId }
  | { ok: false; reason: string };

export function canPromote(
  member: RosterMember,
  unit: Unit,
  classes: Record<string, ClassDef>,
  minLevel = DEFAULT_PROMOTION_MIN_LEVEL,
): PromoteCheck {
  if (member.hp <= 0) {
    return { ok: false, reason: "戦闘不能のユニットは転職できません" };
  }
  const currentClassId = effectiveClassId(member, unit);
  const currentClass = classes[currentClassId];
  if (!currentClass) {
    return { ok: false, reason: `不明なクラス: ${currentClassId}` };
  }
  if (!currentClass.promotionClassId) {
    return { ok: false, reason: "このクラスに転職先はありません" };
  }
  if (currentClassId === currentClass.promotionClassId) {
    return { ok: false, reason: "すでに最上位クラスです" };
  }
  if (member.level < minLevel) {
    return { ok: false, reason: `転職には Lv.${minLevel} 以上が必要です` };
  }
  const target = classes[currentClass.promotionClassId];
  if (!target) {
    return { ok: false, reason: `転職先クラスが見つかりません: ${currentClass.promotionClassId}` };
  }
  return { ok: true, targetClassId: currentClass.promotionClassId as ClassId };
}

export function applyPromotionStats(
  baseStats: Stats,
  fromClass: ClassDef,
  toClass: ClassDef,
): Stats {
  const next: Stats = { ...baseStats };
  for (const key of STAT_KEYS) {
    if (key === "mov") {
      next.mov = toClass.baseStats.mov;
    } else {
      next[key] = baseStats[key] + (toClass.baseStats[key] - fromClass.baseStats[key]);
    }
  }
  if (toClass.statCaps) {
    for (const key of STAT_KEYS) {
      if (key === "mov") continue;
      const cap = toClass.statCaps[key];
      if (cap !== undefined) {
        next[key] = Math.min(next[key], cap);
      }
    }
  }
  return StatsSchema.parse(next);
}

export function promoteMember(
  member: RosterMember,
  unit: Unit,
  classes: Record<string, ClassDef>,
  minLevel = DEFAULT_PROMOTION_MIN_LEVEL,
): { member: RosterMember; error?: string } {
  const check = canPromote(member, unit, classes, minLevel);
  if (!check.ok) {
    return { member, error: check.reason };
  }
  const currentClassId = effectiveClassId(member, unit);
  const currentClass = classes[currentClassId]!;
  const targetClass = classes[check.targetClassId]!;
  const baseStats = effectiveStats(member, unit);
  const stats = applyPromotionStats(baseStats, currentClass, targetClass);
  const hpGain = stats.hp - baseStats.hp;
  return {
    member: RosterMemberSchema.parse({
      ...member,
      classId: check.targetClassId,
      stats,
      maxHp: member.maxHp + hpGain,
      hp: member.hp + hpGain,
    }),
  };
}

export function listPromotableMembers(
  campaign: { roster: RosterMember[] },
  database: BattleDatabase,
  minLevel = DEFAULT_PROMOTION_MIN_LEVEL,
): Array<{ index: number; member: RosterMember; targetClassId: ClassId }> {
  const result: Array<{ index: number; member: RosterMember; targetClassId: ClassId }> = [];
  campaign.roster.forEach((member, index) => {
    const unit = database.units[member.ref];
    if (!unit) return;
    const check = canPromote(member, unit, database.classes, minLevel);
    if (check.ok) {
      result.push({ index, member, targetClassId: check.targetClassId });
    }
  });
  return result;
}
