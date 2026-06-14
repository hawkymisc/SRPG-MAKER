import type { EventCommand } from "@srpg/shared";
import type { BattleState } from "@srpg/shared";

/** UI / 演出待ちの yield 種別(MVP)。 */
export type EventYield =
  | { type: "SHOW_MESSAGE"; speakerId?: string; faceId?: string; text: string }
  | { type: "SHOW_CHOICES"; choices: string[]; resultVar: string }
  | { type: "WAIT"; ms: number }
  | {
      type: "SCREEN_EFFECT";
      effect: Extract<EventCommand, { cmd: "SCREEN_EFFECT" }>["effect"];
    }
  | { type: "CAMERA_FOCUS"; target: { x: number; y: number }; durationMs: number }
  | { type: "PLAY_BGM"; bgmId: string; fadeInMs?: number }
  | { type: "PLAY_SE"; seId: string }
  | {
      type: "MOVE_UNIT";
      unitId: string;
      x: number;
      y: number;
      speed: number;
    }
  | {
      type: "SPAWN_UNIT";
      unitId: string;
      instanceId: string;
      x: number;
      y: number;
    }
  | {
      type: "REMOVE_UNIT";
      unitId: string;
      effect: "fade" | "warp" | "none";
    };

export type EventResult =
  | { status: "completed" }
  | { status: "goto_chapter"; chapterId: string };

export interface EventInterpreterContext {
  state: BattleState;
}

/** SHOW_CHOICES の resume 値は選択 index。それ以外は undefined。 */
export type EventResume = number | undefined;
