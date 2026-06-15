import type { BattleLogEntry, BattleUnit, Faction } from "@srpg/shared";
import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants.js";
import {
  defenderHpTimeline,
  extractStrikePlaybackSteps,
  type StrikePlaybackStep,
} from "../battle/battleStrikePlayback.js";
import {
  BATTLE_LEFT_X,
  BATTLE_LUNGE_OFFSET,
  BATTLE_OVERLAY_ALPHA,
  BATTLE_OVERLAY_COLOR,
  BATTLE_RIGHT_X,
  BATTLE_UNIT_Y,
  battleHpBarWidth,
} from "../battle/battleSceneLayout.js";
import {
  combatStrikeColor,
  formatCombatStrikeText,
} from "../render/combatFxStyle.js";

const FACTION_TEXTURE: Record<Faction, string> = {
  player: "unit_player",
  enemy: "unit_enemy",
  third: "unit_third",
};

export const BATTLE_SCENE_KEY = "Battle";
export const BATTLE_PLAYBACK_COMPLETE = "battle-playback-complete";

export interface BattleSceneData {
  logs: BattleLogEntry[];
  primaryTargetId: string;
  units: BattleUnit[];
  parentSceneKey?: string;
}

interface BattleUnitView {
  unit: BattleUnit;
  sprite: Phaser.GameObjects.Image;
  nameLabel: Phaser.GameObjects.Text;
  hpBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  slotX: number;
  facing: 1 | -1;
}

export class BattleScene extends Phaser.Scene {
  private payload!: BattleSceneData;
  private readonly unitViews = new Map<string, BattleUnitView>();
  private fxLayer!: Phaser.GameObjects.Layer;

  constructor() {
    super({ key: BATTLE_SCENE_KEY, active: false });
  }

  init(data: BattleSceneData): void {
    this.payload = data;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(BATTLE_OVERLAY_COLOR);
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, BATTLE_OVERLAY_COLOR)
      .setAlpha(BATTLE_OVERLAY_ALPHA)
      .setDepth(0);

    this.fxLayer = this.add.layer();
    this.fxLayer.setDepth(30);

    void this.runPlayback().finally(() => this.finish());
  }

  private finish(): void {
    const parentKey = this.payload.parentSceneKey ?? "BattleMap";
    const parent = this.scene.get(parentKey);
    parent?.events.emit(BATTLE_PLAYBACK_COMPLETE);
    this.scene.stop();
  }

  private async runPlayback(): Promise<void> {
    const steps = extractStrikePlaybackSteps(this.payload.logs);
    if (steps.length === 0) {
      return;
    }

    const actorId = steps[0]!.actorId;
    const targetId = steps[0]!.targetId;
    const actor = this.findUnit(actorId);
    const target = this.findUnit(targetId);
    if (!actor || !target) {
      return;
    }

    this.mountUnit(actor, "left");
    this.mountUnit(target, "right");

    const hpTimeline = defenderHpTimeline(target.hp, steps, targetId);
    let hpIndex = 0;
    this.setUnitHp(targetId, hpTimeline[hpIndex] ?? target.hp);

    for (const step of steps) {
      hpIndex += 1;
      await this.playStrikeStep(step);
      this.setUnitHp(step.targetId, hpTimeline[hpIndex] ?? this.findUnit(step.targetId)?.hp ?? 0);
    }
  }

  private findUnit(id: string): BattleUnit | undefined {
    return this.payload.units.find((u) => u.instanceId === id);
  }

  private mountUnit(unit: BattleUnit, side: "left" | "right"): void {
    const slotX = side === "left" ? BATTLE_LEFT_X : BATTLE_RIGHT_X;
    const facing: 1 | -1 = side === "left" ? 1 : -1;
    const sprite = this.add.image(slotX, BATTLE_UNIT_Y, FACTION_TEXTURE[unit.faction]);
    sprite.setFlipX(facing === -1);
    sprite.setDepth(10);

    const nameLabel = this.add.text(slotX, BATTLE_UNIT_Y - 40, unit.name, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#e0e0e0",
    });
    nameLabel.setOrigin(0.5, 0.5);
    nameLabel.setDepth(11);

    const barWidth = 72;
    const hpBg = this.add.rectangle(slotX, BATTLE_UNIT_Y + 28, barWidth, 6, 0x333333);
    const hpBar = this.add.rectangle(
      slotX - barWidth / 2,
      BATTLE_UNIT_Y + 28,
      battleHpBarWidth(unit.maxHp, unit.hp, barWidth),
      6,
      unit.faction === "player" ? 0x4caf50 : 0xff5722,
    );
    hpBar.setOrigin(0, 0.5);
    hpBg.setDepth(11);
    hpBar.setDepth(12);

    this.unitViews.set(unit.instanceId, {
      unit,
      sprite,
      nameLabel,
      hpBg,
      hpBar,
      slotX,
      facing,
    });
  }

  private setUnitHp(unitId: string, hp: number): void {
    const view = this.unitViews.get(unitId);
    if (!view) {
      return;
    }
    const barWidth = 72;
    view.hpBar.width = battleHpBarWidth(view.unit.maxHp, hp, barWidth);
  }

  private async playStrikeStep(step: StrikePlaybackStep): Promise<void> {
    const attacker = this.unitViews.get(step.actorId);
    const defender = this.unitViews.get(step.targetId);
    if (!attacker || !defender) {
      return;
    }

    const lungeX =
      attacker.slotX + attacker.facing * BATTLE_LUNGE_OFFSET;
    await this.tweenTo([attacker.sprite], {
      x: lungeX,
      duration: 110,
      yoyo: true,
      ease: "Quad.easeOut",
    });

    if (step.kind !== "miss") {
      await this.flashSprite(defender.sprite, step.kind === "crit");
    }

    const text = formatCombatStrikeText(step.kind, step.damage);
    if (text.length > 0) {
      await this.showFloatingText(defender.sprite.x, defender.sprite.y - 24, text, step.kind);
    }
  }

  private flashSprite(sprite: Phaser.GameObjects.Image, crit: boolean): Promise<void> {
    return new Promise((resolve) => {
      if (crit) {
        sprite.setTint(0xffd54f);
      }
      this.tweens.add({
        targets: sprite,
        alpha: 0.25,
        yoyo: true,
        repeat: crit ? 3 : 2,
        duration: crit ? 60 : 80,
        onComplete: () => {
          sprite.clearTint();
          sprite.setAlpha(1);
          resolve();
        },
      });
    });
  }

  private showFloatingText(
    x: number,
    y: number,
    text: string,
    kind: StrikePlaybackStep["kind"],
  ): Promise<void> {
    const color = combatStrikeColor(kind);
    const label = this.add.text(x, y, text, {
      fontFamily: "monospace",
      fontSize: "18px",
      color: `#${color.toString(16).padStart(6, "0")}`,
      stroke: "#000000",
      strokeThickness: 3,
    });
    label.setOrigin(0.5, 0.5);
    this.fxLayer.add(label);

    return this.tweenTo(label, {
      y: y - 36,
      alpha: 0,
      duration: 520,
      ease: "Cubic.easeOut",
    }).then(() => {
      label.destroy();
    });
  }

  private tweenTo(
    targets: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
    config: Omit<Phaser.Types.Tweens.TweenBuilderConfig, "targets">,
  ): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({
        targets,
        ...config,
        onComplete: () => resolve(),
      });
    });
  }
}
