import type { BattleState } from "@srpg/shared";
import type { BattleSession } from "./game/BattleSession.js";
import type { BattleMapScene } from "./scenes/BattleMapScene.js";

export interface RuntimeTestApi {
  getState: () => BattleState;
  getMode: () => string;
  getSession: () => BattleSession;
  setAutoPlayAll: (enabled: boolean) => void;
  stepAutoPlay: () => Promise<void>;
  runAutoPlay: (maxTurns?: number) => ReturnType<BattleSession["runAutoPlay"]>;
  forceMode: (mode: string) => void;
  selectUnitAt: (x: number, y: number) => void;
  save: () => void;
  load: () => BattleSession | null;
  /** E2E用: 行動メニュー・戦闘予測の表示状態を固定 */
  prepareScreenshot: (view: "action_menu" | "combat_preview") => void;
}

declare global {
  interface Window {
    __RUNTIME_TEST__?: RuntimeTestApi;
  }
}

export function installRuntimeTestHooks(scene: BattleMapScene): void {
  window.__RUNTIME_TEST__ = scene.getTestApi();
}
