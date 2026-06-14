import { CampaignSession } from "../game/CampaignSession.js";
import { CAMPAIGN_SAVE_KEY } from "../constants.js";

export class CampaignSaveManager {
  static save(session: CampaignSession): void {
    localStorage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(session.serialize()));
  }

  static load(): CampaignSession | null {
    const raw = localStorage.getItem(CAMPAIGN_SAVE_KEY);
    if (!raw) {
      return null;
    }
    return CampaignSession.deserialize(JSON.parse(raw) as unknown);
  }

  static clear(): void {
    localStorage.removeItem(CAMPAIGN_SAVE_KEY);
  }

  static hasSave(): boolean {
    return localStorage.getItem(CAMPAIGN_SAVE_KEY) !== null;
  }
}
