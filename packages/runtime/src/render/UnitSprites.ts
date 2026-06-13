import Phaser from "phaser";
import type { BattleUnit, Faction } from "@srpg/shared";
import { TILE_SIZE } from "../constants.js";

const FACTION_TEXTURE: Record<Faction, string> = {
  player: "unit_player",
  enemy: "unit_enemy",
  third: "unit_third",
};

interface UnitSpriteEntry {
  unitId: string;
  sprite: Phaser.GameObjects.Image;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBg: Phaser.GameObjects.Rectangle;
}

export class UnitSprites {
  private readonly scene: Phaser.Scene;
  private readonly entries = new Map<string, UnitSpriteEntry>();
  private readonly layer: Phaser.GameObjects.Layer;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.layer = scene.add.layer();
    this.layer.setDepth(20);
  }

  sync(units: BattleUnit[]): void {
    const alive = new Set(units.filter((u) => u.hp > 0).map((u) => u.instanceId));

    for (const id of [...this.entries.keys()]) {
      if (!alive.has(id)) {
        const entry = this.entries.get(id);
        entry?.sprite.destroy();
        entry?.hpBar.destroy();
        entry?.hpBg.destroy();
        this.entries.delete(id);
      }
    }

    for (const unit of units) {
      if (unit.hp <= 0) {
        continue;
      }
      let entry = this.entries.get(unit.instanceId);
      if (!entry) {
        const sprite = this.scene.add.image(0, 0, FACTION_TEXTURE[unit.faction]);
        const hpBg = this.scene.add.rectangle(0, 0, TILE_SIZE - 6, 4, 0x333333);
        const hpBar = this.scene.add.rectangle(0, 0, TILE_SIZE - 6, 4, 0x4caf50);
        hpBg.setOrigin(0.5, 0.5);
        hpBar.setOrigin(0, 0.5);
        this.layer.add([sprite, hpBg, hpBar]);
        entry = { unitId: unit.instanceId, sprite, hpBar, hpBg };
        this.entries.set(unit.instanceId, entry);
      }
      this.placeEntry(entry, unit);
    }
  }

  private placeEntry(entry: UnitSpriteEntry, unit: BattleUnit): void {
    const px = unit.x * TILE_SIZE + TILE_SIZE / 2;
    const py = unit.y * TILE_SIZE + TILE_SIZE / 2;
    entry.sprite.setPosition(px, py);
    entry.hpBg.setPosition(px, py - TILE_SIZE / 2 + 4);
    const ratio = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
    const barWidth = (TILE_SIZE - 6) * ratio;
    entry.hpBar.setPosition(px - (TILE_SIZE - 6) / 2, py - TILE_SIZE / 2 + 4);
    entry.hpBar.width = barWidth;
    entry.hpBar.fillColor = unit.faction === "player" ? 0x4caf50 : 0xff5722;
  }

  async animateMove(
    unitId: string,
    toX: number,
    toY: number,
    durationMs = 180,
  ): Promise<void> {
    const entry = this.entries.get(unitId);
    if (!entry) {
      return;
    }
    const targetX = toX * TILE_SIZE + TILE_SIZE / 2;
    const targetY = toY * TILE_SIZE + TILE_SIZE / 2;
    await new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: [entry.sprite, entry.hpBar, entry.hpBg],
        x: targetX,
        duration: durationMs,
        ease: "Linear",
        onUpdate: () => {
          entry.hpBar.x = entry.sprite.x - (TILE_SIZE - 6) / 2;
          entry.hpBg.x = entry.sprite.x;
        },
        onComplete: () => {
          entry.sprite.y = targetY;
          entry.hpBar.y = targetY - TILE_SIZE / 2 + 4;
          entry.hpBg.y = targetY - TILE_SIZE / 2 + 4;
          resolve();
        },
      });
      this.scene.tweens.add({
        targets: entry.sprite,
        y: targetY,
        duration: durationMs,
        ease: "Linear",
      });
    });
  }

  flashDamage(unitId: string): Promise<void> {
    const entry = this.entries.get(unitId);
    if (!entry) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: entry.sprite,
        alpha: 0.2,
        yoyo: true,
        repeat: 2,
        duration: 80,
        onComplete: () => resolve(),
      });
    });
  }

  getLayer(): Phaser.GameObjects.Layer {
    return this.layer;
  }
}
