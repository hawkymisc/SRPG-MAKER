export type CombatStrikeKind = "damage" | "crit" | "miss";

export function combatStrikeColor(kind: CombatStrikeKind): number {
  switch (kind) {
    case "crit":
      return 0xffd54f;
    case "miss":
      return 0x90a4ae;
    default:
      return 0xff5252;
  }
}

export function formatCombatStrikeText(kind: CombatStrikeKind, damage?: number): string {
  if (kind === "miss") {
    return "MISS";
  }
  if (damage === undefined) {
    return "";
  }
  return kind === "crit" ? `${damage}!` : String(damage);
}
