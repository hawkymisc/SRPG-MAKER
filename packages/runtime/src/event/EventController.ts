import type { EventDefinition, EventTrigger } from "@srpg/shared";
import type Phaser from "phaser";
import { TILE_SIZE } from "../constants.js";
import type { BattleSession } from "../game/BattleSession.js";
import { interpretEvent } from "./EventInterpreter.js";
import { findMatchingEvents, type TriggerContext } from "./triggerMatch.js";
import type { EventInterpreterContext, EventResult, EventResume, EventYield } from "./types.js";
import type { ChoiceDialog } from "../ui/ChoiceDialog.js";
import type { MessageWindow } from "../ui/MessageWindow.js";
import type { UnitSprites } from "../render/UnitSprites.js";

export interface EventHost {
  messageWindow: MessageWindow;
  choiceDialog: ChoiceDialog;
  unitSprites: UnitSprites;
  scene: Phaser.Scene;
  autoAdvanceEvents: boolean;
  onStateChanged: () => void;
  onGotoChapter: (chapterId: string) => Promise<void>;
}

export class EventController {
  private readonly events: EventDefinition[];
  private readonly session: BattleSession;
  private readonly host: EventHost;
  private running = false;

  constructor(events: EventDefinition[], session: BattleSession, host: EventHost) {
    this.events = events;
    this.session = session;
    this.host = host;
  }

  isRunning(): boolean {
    return this.running;
  }

  async fireTrigger(trigger: EventTrigger, ctx: TriggerContext = {}): Promise<EventResult | null> {
    const matched = findMatchingEvents(this.events, trigger, ctx);
    if (matched.length === 0) {
      return null;
    }

    for (const definition of matched) {
      const result = await this.runDefinition(definition);
      if (result.status === "goto_chapter") {
        return result;
      }
    }
    return { status: "completed" };
  }

  private async runDefinition(definition: EventDefinition): Promise<EventResult> {
    this.running = true;
    const ctx: EventInterpreterContext = { state: this.session.state };
    const gen = interpretEvent(definition.commands, ctx);

    try {
      let step = await gen.next();
      while (!step.done) {
        const resume = await this.handleYield(step.value, ctx);
        step = await gen.next(resume);
      }

      this.session.state = ctx.state;
      this.host.onStateChanged();

      if (step.value.status === "goto_chapter") {
        await this.host.onGotoChapter(step.value.chapterId);
      }
      return step.value;
    } finally {
      this.running = false;
      this.host.messageWindow.close();
      this.host.choiceDialog.close();
    }
  }

  private async handleYield(yieldValue: EventYield, ctx: EventInterpreterContext): Promise<EventResume> {
    const { host } = this;

    switch (yieldValue.type) {
      case "SHOW_MESSAGE":
        if (host.autoAdvanceEvents) {
          return undefined;
        }
        await host.messageWindow.show(yieldValue.text, yieldValue.speakerId);
        return undefined;

      case "SHOW_CHOICES":
        if (host.autoAdvanceEvents) {
          return 0;
        }
        return host.choiceDialog.show(yieldValue.choices);

      case "WAIT":
        await this.delay(host.autoAdvanceEvents ? Math.min(yieldValue.ms, 16) : yieldValue.ms);
        return undefined;

      case "SCREEN_EFFECT":
        await this.playScreenEffect(yieldValue.effect);
        return undefined;

      case "CAMERA_FOCUS":
        await this.focusCamera(yieldValue.target.x, yieldValue.target.y, yieldValue.durationMs);
        return undefined;

      case "PLAY_BGM":
      case "PLAY_SE":
        return undefined;

      case "MOVE_UNIT": {
        const unit = ctx.state.units.find(
          (u) => u.instanceId === yieldValue.unitId || u.ref === yieldValue.unitId,
        );
        if (unit) {
          await host.unitSprites.animateMove(unit.instanceId, yieldValue.x, yieldValue.y);
        }
        return undefined;
      }

      case "SPAWN_UNIT":
        host.onStateChanged();
        return undefined;

      case "REMOVE_UNIT":
        if (yieldValue.effect === "fade") {
          await this.delay(120);
        }
        host.onStateChanged();
        return undefined;

      default:
        return undefined;
    }
  }

  private async playScreenEffect(
    effect: Extract<EventYield, { type: "SCREEN_EFFECT" }>["effect"],
  ): Promise<void> {
    const cam = this.host.scene.cameras.main;
    switch (effect.type) {
      case "shake":
        cam.shake(effect.durationMs, effect.power * 0.002);
        await this.delay(effect.durationMs);
        break;
      case "fadeIn":
      case "fadeOut":
        await this.delay(effect.durationMs);
        break;
      case "tint":
        await this.delay(effect.durationMs);
        break;
    }
  }

  private async focusCamera(x: number, y: number, durationMs: number): Promise<void> {
    const px = x * TILE_SIZE + TILE_SIZE / 2;
    const py = y * TILE_SIZE + TILE_SIZE / 2;
    if (durationMs <= 0) {
      this.host.scene.cameras.main.centerOn(px, py);
      return;
    }
    this.host.scene.cameras.main.pan(px, py, durationMs, "Linear");
    await this.delay(durationMs);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.host.scene.time.delayedCall(ms, resolve);
    });
  }
}
