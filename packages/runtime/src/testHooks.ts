import type { BattleState } from "@srpg/shared";
import type { BattleSession } from "./game/BattleSession.js";
import type { BattleMapScene } from "./scenes/BattleMapScene.js";
import type { BaseScene } from "./scenes/BaseScene.js";
import type { GameAudioCallLog } from "./audio/GameAudio.js";

export interface RuntimeTestApi {
  getSceneKey: () => string;
  isSceneActive: (key: string) => boolean;
  getBaseBodyText?: () => string;
  getState?: () => BattleState;
  getMode?: () => string;
  getSession?: () => BattleSession;
  setAutoPlayAll?: (enabled: boolean) => void;
  stepAutoPlay?: () => Promise<void>;
  runAutoPlay?: (maxTurns?: number) => ReturnType<BattleSession["runAutoPlay"]>;
  forceMode?: (mode: string) => void;
  selectUnitAt?: (x: number, y: number) => void;
  save?: () => void;
  load?: () => BattleSession | null;
  prepareScreenshot?: (view: "action_menu" | "combat_preview" | "battle_scene") => void;
  fireEventTrigger?: (trigger: import("@srpg/shared").EventTrigger) => Promise<void>;
  advanceMessage?: () => void;
  isMessageOpen?: () => boolean;
  getAudioLog?: () => GameAudioCallLog;
  performTestAttack?: () => Promise<{ battleScenePlayed: boolean }>;
  showBattleSceneSample?: () => void;
  dismissHeldBattleScene?: () => void;
  testScreenShake?: () => Promise<void>;
  playTestAudio?: (cmd: { bgm?: string; se?: string }) => Promise<void>;
}

declare global {
  interface Window {
    __RUNTIME_TEST__?: RuntimeTestApi;
  }
}

export function installRuntimeTestHooks(scene: BattleMapScene): void {
  window.__RUNTIME_TEST__ = scene.getTestApi();
}

export function installBaseTestHooks(scene: BaseScene): void {
  window.__RUNTIME_TEST__ = scene.getBaseTestApi();
}
