import { previewCombat, type BattleUnit } from "@srpg/shared";
import type { BattleState } from "@srpg/shared";

export class CombatPreviewPanel {
  private readonly root: HTMLDivElement;
  private visible = false;

  constructor(parent: HTMLElement, hudOffsetX: number) {
    this.root = document.createElement("div");
    this.root.className = "srpg-combat-preview";
    this.root.style.cssText = [
      "position:absolute",
      `left:${hudOffsetX}px`,
      "top:120px",
      "width:148px",
      "background:rgba(0,0,0,0.75)",
      "color:#fff",
      "padding:8px",
      "border:1px solid #888",
      "border-radius:4px",
      "font:12px monospace",
      "display:none",
      "z-index:15",
      "line-height:1.5",
    ].join(";");
    parent.appendChild(this.root);
  }

  show(state: BattleState, attacker: BattleUnit, defender: BattleUnit): void {
    if (!attacker.equip) {
      this.hide();
      return;
    }
    const weapon = state.context.database.weapons[attacker.equip.weaponId];
    if (!weapon) {
      this.hide();
      return;
    }
    const defenderWeapon = defender.equip
      ? (state.context.database.weapons[defender.equip.weaponId] ?? null)
      : null;
    const terrain = state.context.map.layers.bottom[defender.y * state.context.map.width + defender.x];
    const terrainDef = terrain ? state.context.database.terrain[terrain] : undefined;
    const preview = previewCombat(
      attacker,
      defender,
      weapon,
      defenderWeapon,
      terrainDef,
      state.context.config,
      state.context.combatHooks,
    );
    this.root.innerHTML = [
      `<div style="color:#ffd54f;margin-bottom:4px">戦闘予測</div>`,
      `与ダメ: ${preview.damage}`,
      `命中: ${preview.hitRate}%`,
      `必殺: ${preview.critRate}%`,
    ].join("<br>");
    this.root.style.display = "block";
    this.visible = true;
  }

  hide(): void {
    this.root.style.display = "none";
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }
}
