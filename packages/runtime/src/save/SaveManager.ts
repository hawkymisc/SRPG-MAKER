import { BattleSession, type BattleSaveData } from "../game/BattleSession.js";
import { SAVE_KEY } from "../constants.js";

export class SaveManager {
  static save(session: BattleSession): void {
    const data = session.serialize();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  static load(): BattleSession | null {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw) as BattleSaveData;
    return BattleSession.deserialize(data);
  }

  static clear(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  static hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }
}
