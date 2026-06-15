import { GAME_HEIGHT, GAME_WIDTH } from "../constants.js";

export const BATTLE_OVERLAY_COLOR = 0x0f0f23;
export const BATTLE_OVERLAY_ALPHA = 0.92;
export const BATTLE_UNIT_Y = GAME_HEIGHT / 2 - 8;
export const BATTLE_LEFT_X = 104;
export const BATTLE_RIGHT_X = GAME_WIDTH - 104;
export const BATTLE_LUNGE_OFFSET = 56;

export function battleHpBarWidth(maxHp: number, hp: number, maxWidth: number): number {
  if (maxHp <= 0) {
    return 0;
  }
  return maxWidth * Math.max(0, Math.min(1, hp / maxHp));
}

export function battleLayoutWidth(): number {
  return GAME_WIDTH;
}

export function battleLayoutHeight(): number {
  return GAME_HEIGHT;
}
