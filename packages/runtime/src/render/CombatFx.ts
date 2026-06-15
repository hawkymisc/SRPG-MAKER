import Phaser from "phaser";
import { TILE_SIZE } from "../constants.js";
import type { UnitSprites } from "./UnitSprites.js";
import {
  combatStrikeColor,
  formatCombatStrikeText,
  type CombatStrikeKind,
} from "./combatFxStyle.js";

export class CombatFx {
  private readonly scene: Phaser.Scene;
  private readonly layer: Phaser.GameObjects.Layer;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.layer = scene.add.layer();
    this.layer.setDepth(40);
  }

  async playStrike(
    unitSprites: UnitSprites,
    attackerId: string,
    targetId: string,
    kind: CombatStrikeKind,
    damage?: number,
  ): Promise<void> {
    await unitSprites.animateLunge(attackerId, targetId);
    if (kind !== "miss") {
      await unitSprites.flashDamage(targetId, kind === "crit");
    }
    await this.showFloatingText(
      unitSprites,
      targetId,
      formatCombatStrikeText(kind, damage),
      combatStrikeColor(kind),
    );
  }

  private showFloatingText(
    unitSprites: UnitSprites,
    unitId: string,
    text: string,
    color: number,
  ): Promise<void> {
    const pos = unitSprites.getUnitCenter(unitId);
    if (!pos || text.length === 0) {
      return Promise.resolve();
    }

    const label = this.scene.add.text(pos.x, pos.y - TILE_SIZE / 2, text, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: `#${color.toString(16).padStart(6, "0")}`,
      stroke: "#000000",
      strokeThickness: 3,
    });
    label.setOrigin(0.5, 0.5);
    this.layer.add(label);

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: label,
        y: pos.y - TILE_SIZE,
        alpha: 0,
        duration: 520,
        ease: "Cubic.easeOut",
        onComplete: () => {
          label.destroy();
          resolve();
        },
      });
    });
  }

}
