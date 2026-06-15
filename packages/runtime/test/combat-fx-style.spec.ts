import { describe, expect, it } from "vitest";
import {
  combatStrikeColor,
  formatCombatStrikeText,
} from "../src/render/combatFxStyle.js";

describe("combatFxStyle", () => {
  it("formats damage and crit text", () => {
    expect(formatCombatStrikeText("damage", 12)).toBe("12");
    expect(formatCombatStrikeText("crit", 18)).toBe("18!");
    expect(formatCombatStrikeText("miss")).toBe("MISS");
  });

  it("assigns distinct colors per strike kind", () => {
    expect(combatStrikeColor("damage")).not.toBe(combatStrikeColor("miss"));
    expect(combatStrikeColor("crit")).not.toBe(combatStrikeColor("damage"));
  });
});
